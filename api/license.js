// Globalna tablica kluczy w pamięci serwera Vercela (działa przy aktywnych instancjach)
global.activeKeys = global.activeKeys || ["PALETO2026", "VIP-ACCESS"];
global.usedKeys = global.usedKeys || [];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, key, adminPass, secretAdminKey } = req.body;
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  // AKCJA 1: GENEROWANIE KLUCZA
  if (action === 'generate') {
    // Sprawdzamy hasło admina (możesz ustawić zmienną środowiskową lub stałe dynamiczne)
    if (adminPass !== process.env.ADMIN_SECRET_PASS && adminPass !== "ADMIN123") {
      return res.status(401).json({ success: false, message: "Błędne hasło administratora!" });
    }

    const newKey = `PALETO-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    global.activeKeys.push(newKey);

    // Wysyłamy powiadomienie na Discord o wygenerowaniu klucza
    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🛠️ **Wygenerowano nowy klucz licencyjny!**\n> Klucz: \`${newKey}\``
        })
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, key: newKey });
  }

  // AKCJA 2: WERYFIKACIJA KLUCZA PRZEZ UŻYTKOWNIKA
  if (action === 'verify') {
    if (!global.activeKeys.includes(key)) {
      return res.status(400).json({ success: false, message: "Błędny klucz licencyjny!" });
    }

    if (global.usedKeys.includes(key)) {
      return res.status(400).json({ success: false, message: "Ten klucz został już wykorzystany!" });
    }

    // Zużywamy klucz (jedno użycie)
    global.usedKeys.push(key);

    // Wysyłamy powiadomienie na Discord o użyciu klucza
    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔑 **Użyto klucza licencyjnego!**\n> Klucz: \`${key}\``
        })
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
  }

  return res.status(400).json({ error: 'Invalid action' });
}