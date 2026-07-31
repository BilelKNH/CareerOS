# Lanceur CareerOS (Windows)

Deux façons de lancer le projet en « un clic ». Les deux s'appuient sur **Docker Desktop**
(qui fournit Postgres, Redis, l'API et le web) — c'est le seul prérequis.

## Option 1 — le plus simple : le `.bat` (aucune compilation)

À la racine du projet, double-clique sur **`CareerOS.bat`**. Il :

1. vérifie que Docker est installé ;
2. crée `.env` depuis `.env.example` au premier lancement ;
3. build + démarre les conteneurs (`docker compose up -d --build`) ;
4. initialise la base (schéma + données de démo) ;
5. ouvre le navigateur sur http://localhost:3000.

Pour arrêter : double-clique sur **`stop-careeros.bat`**.

## Option 2 — un vrai `CareerOS.exe`

Si tu veux l'icône exécutable :

1. double-clique sur **`launcher/build-careeros-exe.bat`** (nécessite Node.js installé) ;
2. ça produit **`CareerOS.exe`** à la racine du projet ;
3. double-clique sur `CareerOS.exe` pour lancer — même comportement que le `.bat`.

En ligne de commande, équivalent :

```bash
cd launcher
npx @yao-pkg/pkg@5.16.1 launch.js --targets node18-win-x64 --output ../CareerOS.exe
```

## Pourquoi pas un `.exe` 100 % autonome ?

Un seul binaire ne peut pas embarquer PostgreSQL + Redis + Node de façon fiable. Le lanceur
orchestre donc Docker : c'est l'approche standard et robuste pour un stack full-stack. Le
`.exe` produit est un **lanceur** (il démarre les conteneurs et ouvre l'app), pas l'app
elle-même empaquetée.

> Astuce : tu peux créer un raccourci de `CareerOS.exe` (ou `CareerOS.bat`) sur le Bureau,
> clic droit → Propriétés → Changer d'icône, pour un vrai lancement de bureau.
