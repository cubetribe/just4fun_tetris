# Mobile Tetris Challenge

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://mobile-tetris-community.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Modernes, mobile-first Tetris als Web-App mit Swipe-Steuerung, Gyro-Support, Sound, Highscores und Admin-Konfiguration für Challenge-Parameter und Gutschein-Codes.

## Live Demo

- Game: [https://mobile-tetris-community.vercel.app](https://mobile-tetris-community.vercel.app)
- Admin: [https://mobile-tetris-community.vercel.app/admin](https://mobile-tetris-community.vercel.app/admin)

## Features

- Klassisches Tetris-Gameplay mit 10 Leveln
- Extra-Härte in Level 9/10 (konfigurierbar)
- Mobile Swipe-Steuerung
- Optionale Gyro-Steuerung
- WebAudio Sound FX (togglebar)
- Highscores (Top 20) via LocalStorage
- Admin-Bereich für:
  - Difficulty-Parameter
  - Gutschein-Code-Slots (10)
  - Claim-Tracking
  - JSON-Export
  - PIN-Änderung

## Controls (Mobile)

- Swipe links/rechts: Stein bewegen
- Swipe nach oben: Rotieren
- Langsam nach unten ziehen: kontinuierlicher Soft Drop
- Schneller Flick nach unten: Hard Drop

## Admin Access

- URL: `/admin`
- Standard-PIN: `1234`
- Empfehlung: PIN direkt nach dem ersten Login ändern

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- Canvas API
- LocalStorage
- Vercel (Static Hosting)

## Projektstruktur

```text
.
├── index.html       # Game UI
├── app.js           # Tetris Engine + Input Handling
├── admin.html       # Admin UI
├── admin.js         # Admin Logic
├── storage.js       # LocalStorage Layer
├── styles.css       # Mobile-first Design System
├── vercel.json      # Routing/Deploy Config
└── README.md
```

## Local Development

Voraussetzungen:

- Node.js 18+ (empfohlen) oder Python 3.x

Starten:

```bash
# Option 1
npx serve .

# Option 2
python3 -m http.server 4173
```

Öffnen:

- `http://localhost:4173/`
- `http://localhost:4173/admin`

## Deployment

```bash
vercel --prod --yes
```

## Sicherheit & Datenhaltung

Diese Version ist absichtlich komplett client-seitig (Hobby/MVP). Das bedeutet:

- Daten liegen nur im Browser (LocalStorage)
- Keine serverseitige Verifikation von Scores/Claims
- Nicht manipulationssicher für echte Gewinnspiele

Für produktive Nutzung mit realen Gutscheinen wird ein Backend mit Authentifizierung, serverseitiger Claim-Logik und Audit-Logging empfohlen.

## Roadmap

- Server-side Claims & Anti-Cheat
- Multiplayer/Challenge-Modus
- PWA-Offline-Support
- Gerätespezifische Touch-Sensitivitätsprofile

## Contributing

Contributions sind willkommen. Details in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Lizenz

MIT License. Siehe [LICENSE](./LICENSE).
