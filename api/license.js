global.activeKeys = global.activeKeys || ["PALETO2026", "VIP-ACCESS"];
global.usedKeys = global.usedKeys || [];

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

  const { action, key, adminPass, clientInfo } = req.body;
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  // Pobieranie IP użytkownika z nagłówków Vercela
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Nieznane IP';

  // AKCJA 1: GENEROWANIE KLUCZA
  if (action === 'generate') {
    if (adminPass !== process.env.ADMIN_SECRET_PASS && adminPass !== "ADMIN123") {
      return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
    }

    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `PALETO-${randomPart1}-${randomPart2}`;
    
    global.activeKeys.push(newKey);

    if (DISCORD_WEBHOOK_URL) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🛠️ **Wygenerowano nowy klucz licencyjny!**\n> Klucz: \`${newKey}\`\n> IP Admina: \`${ip}\``
          })
        });
      } catch (err) {}
    }

    return res.status(200).json({ success: true, key: newKey });
  }

  // AKCJA 2: WERYFIKACIJA KLUCZA + LOGI
  if (action === 'verify') {
    if (!global.activeKeys.includes(key)) {
      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    if (global.usedKeys.includes(key)) {
      return res.status(400).json({ success: false, message: "Ten klucz został już wykorzystany!" });
    }

    global.usedKeys.push(key);

    const loginTime = new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

    if (DISCORD_WEBHOOK_URL) {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🚨 **UDANE LOGOWANIE DO SYSTEMU!**\n` +
                     `> 🔑 Klucz: \`${key}\`\n` +
                     `> 🌐 Adres IP: \`${ip}\`\n` +
                     `> 💻 Urządzenie/Przeglądarka: \`${clientInfo || 'Brak danych'}\`\n` +
                     `> ⏰ Godzina: \`${loginTime}\``
          })
        });
      } catch (err) {}
    }

    return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
  }

  return res.status(400).json({ error: 'Invalid action' });
}