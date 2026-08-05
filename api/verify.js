export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { key, hwid } = req.body; // hwid lub unikalne ID przeglądarki
  const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL; // Ustawiasz w Vercelu

  // TUTAJ SPRAWDZENIE W BAZIE LUB TABLICY (przykład symulowany)
  // W normalnej aplikacji sprawdzasz w bazie Redis/SQL czy klucz istnieje i ma status 'unused'
  
  // Przykładowa symulacja sukcesu:
  const isKeyValid = true; // Zastąp logiką bazy danych
  const isKeyAlreadyUsed = false; // Sprawdzenie czy klucz był już użyty

  if (!isKeyValid || isKeyAlreadyUsed) {
    return res.status(400).json({ success: false, message: "Klucz jest nieprawidłowy lub został już wykorzystany!" });
  }

  // Oznaczamy klucz jako zużyty w bazie danych...

  // Wysyłanie powiadomienia na Discord Webhook
  if (DISCORD_WEBHOOK_URL) {
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🔑 **Użyto klucza licencyjnego!**\n> Klucz: \`${key}\`\n> Przeglądarka/ID: \`${hwid || 'Brak'}\``
        })
      });
    } catch (err) {
      console.error("Błąd wysyłania webhooka:", err);
    }
  }

  return res.status(200).json({ success: true, message: "Licencja aktywowana!" });
}