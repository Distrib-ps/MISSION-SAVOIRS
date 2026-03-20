# Mission Savoirs

Plateforme de quiz pédagogique adaptative pour les élèves du CP au CM2 (6-10 ans).

## Stack technique

- **Frontend** : React + TypeScript + Vite + TailwindCSS
- **Backend** : Node.js + Express + TypeScript
- **ORM** : Prisma
- **Base de données** : PostgreSQL (Supabase)
- **Auth** : JWT + bcrypt

## Installation

```bash
# Installer toutes les dépendances
npm run install:all

# Configurer la base de données
cp server/.env.example server/.env
# Remplir les variables dans server/.env

# Lancer les migrations
cd server && npx prisma migrate dev

# Lancer le projet (front + back)
npm run dev
```

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le frontend et le backend en parallèle |
| `npm run dev:client` | Lance uniquement le frontend (port 5173) |
| `npm run dev:server` | Lance uniquement le backend (port 3001) |
| `npm run build:client` | Build le frontend |
| `npm run build:server` | Build le backend |

## Structure du projet

```
mission-savoirs/
├── client/          # Frontend React + Vite
│   └── src/
├── server/          # Backend Express
│   ├── src/
│   └── prisma/      # Schéma et migrations
└── package.json     # Scripts racine
```
