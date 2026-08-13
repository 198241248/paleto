import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, key, adminPass, duration, nick } = req.body;
  const loginTime = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

  // Zabezpieczenie po IP działa w tle (nic nie zmienia w bazie)
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip';
  const userAgent = req.headers['user-agent'] || 'unknown_agent';
  const deviceId = `${clientIP}_${Buffer.from(userAgent).toString('base64').substring(0, 15)}`;

  const WEBHOOK_LOGS = "https://discord.com/api/webhooks/1534882494602678464/Ku1s9nyNtcpxsnYi38fHCC_-Rx6m-B4N4apHUveS-_aLPleZbm54yt-7dRA86vBZn52-";

  const adminActions = ['generate', 'delete', 'extend', 'reset', 'info'];
  if (adminActions.includes(action) && adminPass !== "lxowqxeqxwekopxqwkoq") {
    return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
  }

  // 1. GENEROWANIE KLUCZA
  if (action === 'generate') {
    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `KEY-${randomPart1}-${randomPart2}`;
    
    let expiresAt = null;
    const now = Date.now();
    if (duration === '1h') expiresAt = now + 60 * 60 * 1000;
    else if (duration === '24h') expiresAt = now + 24 * 60 * 60 * 1000;
    else if (duration === '7d') expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    else if (duration === '30d') expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    else expiresAt = 'lifetime';

    await kv.hset(`key:${newKey}`, { 
      boundDevice: null,
      nick: null, 
      expiresAt: expiresAt,
      durationLabel: duration || 'lifetime'
    });

    try {
      await fetch(WEBHOOK_LOGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: `🔑 **Wygenerowano nowy klucz o ${loginTime}**\n> Klucz: \`${newKey}\`\n> Ważność: \`${duration || 'lifetime'}\`` 
        })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Klucz został wygenerowany!", key: newKey });
  }

  // 2. WERYFIKACJA KLUCZA
  if (action === 'verify') {
    if (!key) {
      return res.status(400).json({ success: false, message: "Wprowadź klucz!" });
    }

    const keyData = await kv.hgetall(`key:${key}`);

    if (!keyData || Object.keys(keyData).length === 0) {
      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    if (keyData.expiresAt !== 'lifetime' && Date.now() > Number(keyData.expiresAt)) {
      return res.status(400).json({ success: false, message: "Ten klucz wygasł!" });
    }

    if (keyData.boundDevice) {
      if (keyData.boundDevice !== deviceId) {
        return res.status(400).json({ success: false, message: "Ten klucz jest przypisany do innego urządzenia!" });
      }
      
      if (!keyData.nick) {
        return res.status(200).json({ success: false, needsRegistration: true });
      }

      try {
        await fetch(WEBHOOK_LOGS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: `✅ **Logowanie użytkownika o ${loginTime}**\n> Nick: \`${keyData.nick}\`\n> Klucz: \`${key}\`` 
          })
        });
      } catch(e) {}

      return res.status(200).json({ success: true, message: "Zalogowano pomyślnie!" });
    } else {
      return res.status(200).json({ success: false, needsRegistration: true });
    }
  }

  // 3. REJESTRACJA NICKU I POWIAZANIE URZĄDZENIA
  if (action === 'register') {
    if (!key || !nick) {
      return res.status(400).json({ success: false, message: "Wszystkie pola są wymagane!" });
    }

    const keyData = await kv.hgetall(`key:${key}`);
    if (!keyData || Object.keys(keyData).length === 0) {
      return res.status(400).json({ success: false, message: "Nie znaleziono klucza!" });
    }

    if (keyData.boundDevice && keyData.boundDevice !== deviceId) {
      return res.status(400).json({ success: false, message: "Klucz jest już zajęty przez inne urządzenie!" });
    }

    await kv.hset(`key:${key}`, { 
      boundDevice: deviceId,
      nick: nick,
      expiresAt: keyData.expiresAt,
      durationLabel: keyData.durationLabel
    });

    try {
      await fetch(WEBHOOK_LOGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: `📝 **Nowa rejestracja o ${loginTime}**\n> Nick: \`${nick}\`\n> Klucz: \`${key}\`` 
        })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Zarejestrowano pomyślnie!" });
  }

  // 4. INFORMACJE O KLUCZU (BEZ ŻADNYCH WZMINEK O IP / URZĄDZENIU)
  if (action === 'info') {
    if (!key) {
      return res.status(400).json({ success: false, message: "Podaj klucz!" });
    }

    const keyData = await kv.hgetall(`key:${key}`);
    if (!keyData || Object.keys(keyData).length === 0) {
      return res.status(404).json({ success: false, message: "Klucz nie istnieje w bazie!" });
    }

    let timeLeft = "Dożywotnio";
    if (keyData.expiresAt !== 'lifetime') {
      const remaining = Number(keyData.expiresAt) - Date.now();
      if (remaining > 0) {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        timeLeft = days > 0 ? `${days} dni (${hours}h)` : `${hours} godzin`;
      } else {
        timeLeft = "Wygasł!";
      }
    }

    // Czyste informacje bez IP
    const infoText = `📋 **Informacje o kluczu:**\n` +
                     `> Klucz: \`${key}\`\n` +
                     `> Nick: \`${keyData.nick || 'Brak (nieprzypisany)'}\`\n` +
                     `> Ważność: \`${keyData.durationLabel || 'lifetime'}\`\n` +
                     `> Pozostało czasu: \`${timeLeft}\``;

    return res.status(200).json({ success: true, message: infoText });
  }

  // 5. ZWOLNIENIE LICENCJI / RESET URZĄDZENIA I NICKU
  if (action === 'reset') {
    if (!key) {
      return res.status(400).json({ success: false, message: "Podaj klucz do zresetowania!" });
    }

    const keyData = await kv.hgetall(`key:${key}`);
    if (!keyData || Object.keys(keyData).length === 0) {
      return res.status(404).json({ success: false, message: "Klucz nie istnieje!" });
    }

    await kv.hset(`key:${key}`, {
      boundDevice: null,
      nick: null,
      expiresAt: keyData.expiresAt,
      durationLabel: keyData.durationLabel
    });

    return res.status(200).json({ success: true, message: `Zresetowano przypisanie dla klucza: ${key}` });
  }

  // 6. ZMIANA / PRZEDŁUŻENIE DATY WAŻNOŚCI
  if (action === 'extend') {
    if (!key || !duration) {
      return res.status(400).json({ success: false, message: "Podaj klucz oraz nowy czas ważności!" });
    }

    const keyData = await kv.hgetall(`key:${key}`);
    if (!keyData || Object.keys(keyData).length === 0) {
      return res.status(404).json({ success: false, message: "Klucz nie istnieje!" });
    }

    let expiresAt = null;
    const now = Date.now();
    if (duration === '1h') expiresAt = now + 60 * 60 * 1000;
    else if (duration === '24h') expiresAt = now + 24 * 60 * 60 * 1000;
    else if (duration === '7d') expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    else if (duration === '30d') expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    else expiresAt = 'lifetime';

    await kv.hset(`key:${key}`, {
      boundDevice: keyData.boundDevice,
      nick: keyData.nick,
      expiresAt: expiresAt,
      durationLabel: duration
    });

    return res.status(200).json({ success: true, message: `Zaktualizowano ważność klucza ${key} na: ${duration}` });
  }

  // 7. USUNIĘCIE KLUCZA
  if (action === 'delete') {
    if (!key) {
      return res.status(400).json({ success: false, message: "Podaj klucz do usunięcia!" });
    }

    const exists = await kv.exists(`key:${key}`);
    if (!exists) {
      return res.status(404).json({ success: false, message: "Klucz nie istnieje!" });
    }

    await kv.del(`key:${key}`);
    return res.status(200).json({ success: true, message: `Klucz ${key} został całkowicie usunięty z bazy.` });
  }

  return res.status(400).json({ error: 'Invalid action' });
}