// Prosta symulacja bazy licencji (klucz -> pozostałe logowania)
const licenses = {
  "PALETO-VIP-2026": { loginsLeft: 2 },
  "TESTOWY-KLUCZ": { loginsLeft: 1 }
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { licenseKey } = req.body;

  if (!licenses[licenseKey]) {
    return res.status(401).json({ success: false, message: "Nieprawidłowy klucz licencyjny!" });
  }

  let license = licenses[licenseKey];

  if (license.loginsLeft <= 0) {
    return res.status(403).json({ success: false, message: "Licencja wygasła (wykorzystano limit logowań)!" });
  }

  // Zmniejszamy licznik logowań na serwerie!
  license.loginsLeft--;

  return res.status(200).json({ 
    success: true, 
    message: "Licencja zweryfikowana pomyślnie.",
    loginsLeft: license.loginsLeft 
  });
}