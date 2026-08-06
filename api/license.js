global.activeKeys = global.activeKeys || ["PALETO2026", "VIP-ACCESS"];
global.keyBindings = global.keyBindings || {};

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
  
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip';
  const userAgent = req.headers['user-agent'] || 'unknown_agent';
  const deviceId = `${clientIP}_${Buffer.from(userAgent).toString('base64').substring(0, 15)}`;

  const WEBHOOK_SUCCESS = "https://discord.com/api/webhooks/1534552834865889443/RShDnyLUsf4T9_34u8Zd6lryFuuAsd0PgDQbMKfqhwRRgowiHLp3R0_h2mzIm-XLKl-3";
  const WEBHOOK_FAILED = "https://discord.com/api/webhooks/1534552787642486794/egrFJKtPXBSiJmakC7Y632A8JlGWs_ELLLXVdxUHO7PSXBRCdGK2DRaZGroOafBzLJvH";
  const loginTime = new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' });

  // 1. GENEROWANIE KLUCZA
  if (action === 'generate') {
    if (adminPass !== "lxowqxeqxwekopxqwkoq") { 
      return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
    }

    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = `KEY-${randomPart1}-${randomPart2}`;
    
    global.activeKeys.push(newKey);

    try {
      await fetch(WEBHOOK_SUCCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `🔑 **Wygenerowano nowy klucz o ${loginTime}**\n> Klucz: \`${newKey}\`` })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, key: newKey, message: "Klucz został wygenerowany pomyślnie!" });
  }

  // 2. WERYFIKACJA I PRZYPISANIE DO URZĄDZENIA
  if (action === 'verify') {
    if (!global.activeKeys.includes(key)) {
      try {
        await fetch(WEBHOOK_FAILED, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `❌ **Błędna próba logowania o ${loginTime}**\n> IP: \`${clientIP}\`\n> Klucz: \`${key}\`` })
        });
      } catch(e) {}

      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    if (global.keyBindings[key]) {
      if (global.keyBindings[key] !== deviceId) {
        return res.status(400).json({ success: false, message: "Ten klucz jest przypisany do innego urządzenia!" });
      }
    } else {
      global.keyBindings[key] = deviceId;
    }

    try {
      await fetch(WEBHOOK_SUCCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `✅ **Udane logowanie o ${loginTime}**\n> IP: \`${clientIP}\`\n> Klucz: \`${key}\`` })
      });
    } catch(e) {}

    return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
  }

  return res.status(400).json({ error: 'Invalid action' });
}