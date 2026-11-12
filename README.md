# Pierre-Papier-Ciseaux

Un jeu en ligne **multijoueur** de Pierre-Papier-Ciseaux, développé avec :

- 🧩 **Frontend** : React + Vite
- 🛠 **Backend** : Node.js + Express
- 🔌 **WebSocket** : communication temps réel via Socket.IO
- 🏷️ **Chambres privées** : gestion via OTP unique par session

## Fonctionnalités

- Mode solo contre un bot (hors ligne)
- Mode multijoueur temps réel avec code de partie à 4 chiffres
- Modèles 3D procéduraux (three.js / react-three-fiber)
- Combats animés à chaque manche : la pierre fracasse les ciseaux, les ciseaux découpent le papier, le papier étouffe la pierre

## Architecture

```
pierre-papier-ciseaux/
├── Backend/                      # Node.js + Express + Socket.IO, architecture modulaire
│   ├── server.js                 # point d'entrée (charge src/main.js)
│   ├── src/
│   │   ├── main.js               # composition : http, socket, modules
│   │   ├── config/               # variables d'environnement
│   │   ├── core/                 # création serveur HTTP et Socket.IO
│   │   ├── shared/               # logger
│   │   └── modules/
│   │       ├── game/
│   │       │   ├── domain/       # Room, règles, choix (aucune dépendance technique)
│   │       │   ├── application/  # GameService : cas d'usage
│   │       │   ├── infrastructure/ # dépôt en mémoire, générateur de code
│   │       │   └── interfaces/   # gateway Socket.IO, routes HTTP, contrat d'événements
│   │       ├── player/
│   │       └── health/
│   └── test/                     # node:test
└── Frontend/                     # React + Vite + Tailwind, architecture feature-based
    └── src/
        ├── app/                  # shell, en-tête, styles globaux
        ├── shared/               # config, utilitaires, composants UI de base
        ├── entities/
        │   ├── choice/           # règles, modèles 3D et combats animés (ui/three/battle)
        │   └── match/            # contrat MatchController commun aux modes
        └── features/
            ├── home/             # page d'accueil
            ├── match/            # écrans de manche (choix, compte à rebours, résultat)
            ├── bot/              # partie contre le bot
            └── multiplayer/      # client Socket.IO, modale créer / rejoindre
```

Chaque mode de jeu (bot, multijoueur) expose un `MatchController` ; l'interface de manche
(`features/match`) ne connaît pas le mode qui la pilote.

### Variables d'environnement

| Projet   | Variable          | Défaut                         |
|----------|-------------------|--------------------------------|
| Backend  | `PORT`            | `5555`                         |
| Backend  | `HOST`            | `0.0.0.0`                      |
| Backend  | `CORS_ORIGINS`    | front Render + localhost       |
| Backend  | `REVEAL_DELAY_MS` | `3000`                         |
| Frontend | `VITE_SERVER_URL` | URL du backend                 |

## 🚀 Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) (version 18 ou plus recommandé)
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)

### 1. Cloner le dépôt

```bash
git clone https://github.com/Mikajy01/pierre-papier-ciseaux.git
cd pierre-papier-ciseaux
```

### 2. Lancer le backend
```bash
cd Backend
npm install
npm start      # ou npm run dev
npm test       # tests unitaires
```

### 3. lancer le frontend
```bash
cd ../Frontend
npm install
npm run dev
```



