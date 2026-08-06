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

  const { action, key, adminPass } = req.body;
  
  const userAgent = req.headers['user-agent'] || 'unknown_agent';

  const WEBHOOK_SUCCESS = "https://discord.com/api/webhooks/1534552834865889443/RShDnyLUsf4T9_34u8Zd6lryFuuAsd0PgDQbMKfqhwRRgowiHLp3R0_h2mzIm-XLKl-3";
  const WEBHOOK_FAILED = "https://discord.com/api/webhooks/1534552787642486794/egrFJKtPXBSiJmakC7Y632A8JlGWs_ELLLXVdxUHO7PSXBRCdGK2DRaZGroOafBzLJvH";
  const loginTime = new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' });

  // Inicjalizacja domyślnych kluczy w bazie, jeśli jeszcze ich nie ma
  const defaultKeys = ["PALETO2026", "VIP-ACCESS"];
  for (const defKey of defaultKeys) {
    const exists = await kv.exists(`key:${defKey}`);
    if (!exists) {
      await kv.hset(`key:${defKey}`, { boundDevice: null });
    }
  }

  // 1. GENEROWANIE KLUCZA
  if (action === 'generate') {
    if (adminPass !== "lxowqxeqxwekopxqwkoq") { 
      return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
    }

    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `KEY-${randomPart1}-${randomPart2}`;
    
    // Zapisujemy nowy klucz w bazie KV (pusty boundDevice oznacza, że jeszcze nikt go nie użył)
    await kv.hset(`key:${newKey}`, { boundDevice: null });

    try {
      await fetch(WEBHOOK_SUCCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `🔑 **Wygenerowano nowy klucz o ${loginTime}**\n> Klucz: \`${newKey}\`` })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Klucz został wygenerowany i wysłany na Discorda!" });
  }

  // 2. WERYFIKACJA I PRZYPISANIE DO URZĄDZENIA
  if (action === 'verify') {
    // Sprawdzamy czy klucz istnieje w bazie KV
    const keyData = await kv.hgetall(`key:${key}`);

    if (!keyData) {
      try {
        await fetch(WEBHOOK_FAILED, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `❌ **Błędna próba logowania o ${loginTime}**\`\n> Klucz: \`${key}\`` })
        });
      } catch(e) {}

      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    // Sprawdzamy powiązanie urządzenia
    if (keyData.boundDevice) {
      if (keyData.boundDevice !== deviceId) {
        return res.status(400).json({ success: false, message: "Ten klucz jest przypisany do innego urządzenia!" });
      }
    } else {
      // Jeśli klucz nie miał jeszcze urządzenia, przypisujemy obecne
      await kv.hset(`key:${key}`, { boundDevice: deviceId });
    }

    try {
      await fetch(WEBHOOK_SUCCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `✅ **Udane logowanie o ${loginTime}**\`\n> Klucz: \`${key}\`` })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
  }

  return res.status(400).json({ error: 'Invalid action' });
}