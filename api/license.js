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

  const { action, key, adminPass } = req.body;
  const WEBHOOK_SUCCESS = "https://discord.com/api/webhooks/1534552834865889443/RShDnyLUsf4T9_34u8Zd6lryFuuAsd0PgDQbMKfqhwRRgowiHLp3R0_h2mzIm-XLKl-3";
  const WEBHOOK_FAILED = "https://discord.com/api/webhooks/1534552787642486794/egrFJKtPXBSiJmakC7Y632A8JlGWs_ELLLXVdxUHO7PSXBRCdGK2DRaZGroOafBzLJvH";

  const loginTime = new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' });

  // GENEROWANIE KLUCZA
  if (action === 'generate') {
    if (adminPass !== "ADMIN123") {
      return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
    }

    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `PALETO-${randomPart1}-${randomPart2}`;
    
    global.activeKeys.push(newKey);

    return res.status(200).json({ success: true, key: newKey });
  }

  // WERYFIKACJA KLUCZA
  if (action === 'verify') {
    if (!global.activeKeys.includes(key)) {
      try {
        await fetch(WEBHOOK_FAILED, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `❌ **Błędna próba logowania o godzinie ${loginTime}**\n> Wprowadzony klucz: \`${key}\`` })
        });
      } catch(e) {}

      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    if (global.usedKeys.includes(key)) {
      return res.status(400).json({ success: false, message: "Ten klucz został już wykorzystany!" });
    }

    global.usedKeys.push(key);

    try {
      await fetch(WEBHOOK_SUCCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `✅ **Nowe logowanie o godzinie ${loginTime}**\n> Użyty klucz: \`${key}\`` })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
  }

  return res.status(400).json({ error: 'Invalid action' });
}