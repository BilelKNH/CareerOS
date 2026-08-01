# Reas

Assistant de carrière intelligent à **mémoire persistante** : suit ton évolution pro,
analyse le marché, récupère de vraies offres, calcule un score de matching, adapte ton CV,
prépare tes candidatures et te conseille — le tout piloté par un **agent autonome**.

Monorepo pnpm + Turborepo. **Les 5 phases sont livrées** (voir la feuille de route en bas),
plus le Career Agent autonome, l'auto-candidature, la source France Travail, le thème
clair/sombre et une page d'accueil.

## Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind (thème clair/sombre via tokens CSS), TanStack Query |
| Backend | NestJS 10, TypeScript, JWT, class-validator |
| DB | PostgreSQL 16 + **pgvector**, Prisma via **driver adapter `pg`** (sans moteur binaire) |
| IA | Anthropic (raisonnement) + OpenAI embeddings (1536d) — configurable |
| Jobs | BullMQ + Redis, @nestjs/schedule (Phase 3) |
| Infra | Docker Compose, pnpm workspaces |

## Arborescence

```
careeros/
├─ apps/
│  ├─ api/     NestJS — auth, user, experiences, skills, career-memory, career-journal,
│  │           ai-analysis (agents Mémoire/CV/Marché/Coach), scraping (JobSource + France
│  │           Travail), job-search (matching), applications (auto-candidature),
│  │           notifications, reports, orchestrator (Career Agent), scheduler, health
│  └─ web/     Next.js — landing + app (agent, dashboard, timeline, offres, matching,
│              candidatures, journal, rapports, notifications, paramètres) + thème clair/sombre
├─ packages/
│  └─ database/  Prisma schema (16 tables + pgvector) + seed
├─ e2e/         Playwright — parcours API + smoke UI
├─ .github/workflows/ci.yml
├─ docker-compose.yml
└─ .env.example
```

## Prérequis

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable`)
- Docker Desktop (pour Postgres+pgvector et Redis)

## Installation

```bash
# 1. Dépendances
pnpm install

# 2. Variables d'env
cp .env.example .env        # Windows PowerShell : copy .env.example .env
#   Obligatoire : JWT_SECRET / JWT_REFRESH_SECRET (chaînes longues aléatoires)
#   Optionnel (fallback sans clé sinon) :
#     ANTHROPIC_API_KEY / OPENAI_API_KEY .......... agents IA + embeddings
#     FRANCE_TRAVAIL_CLIENT_ID / _SECRET .......... vraies offres (sinon source échantillon)
#     RESEND_API_KEY / EMAIL_FROM ................. envoi email de l'auto-candidature

# 3. Base de données (Postgres + Redis)
docker compose up -d postgres redis

# 4. Schéma + client Prisma + données de démo
pnpm db:generate
pnpm --filter @careeros/database push   # crée les tables + active l'extension vector
pnpm db:seed                            # user bilelknh@gmail.com / mot de passe "careeros"

# 5. (optionnel) Index ANN pgvector, une fois qu'il y a des données mémoire
#    psql "$DATABASE_URL" -f packages/database/prisma/pgvector.sql
```

> `db push` synchronise le schéma sans fichiers de migration (idéal en dev). Pour un suivi
> versionné en prod, utilise plutôt `pnpm db:migrate` (génère des migrations Prisma).

### Choix data : Prisma + driver adapter `pg`

Le client Prisma est configuré avec le **driver adapter** `@prisma/adapter-pg`
(`previewFeatures = ["driverAdapters"]`, `new PrismaClient({ adapter })`) : les requêtes
passent par le driver `pg` (node-postgres). La mémoire vectorielle (pgvector) reste en SQL
brut (`$queryRaw`/`$executeRaw`).

Chargement du `.env` : les commandes Prisma tournent depuis `packages/database`, or le `.env`
est à la racine du monorepo. Les scripts (`generate`, `push`, `seed`…) utilisent donc
`dotenv-cli` (`dotenv -e ../../.env -- …`) pour le charger. En conteneur/CI (pas de fichier
`.env`), les variables viennent de l'environnement et Prisma est appelé directement.

À noter : avec le driver adapter, `prisma generate` doit être lancé **sans** `--no-engine`.
Génération et migrations passent par les binaires Prisma (téléchargés au build). Pour un
build 100 % hors-ligne, une couche data purement TypeScript (Drizzle/Kysely) serait le
meilleur choix — non nécessaire pour la V1.

## Lancement (dev)

```bash
# tout le monorepo
pnpm dev

# ou séparément
pnpm --filter @careeros/api dev     # http://localhost:3001/api
pnpm --filter @careeros/web dev     # http://localhost:3000
```

## Lancement (Docker, tout-en-un)

```bash
docker compose up --build
# web  -> http://localhost:3000
# api  -> http://localhost:3001/api
```

## Lancer en un clic (Windows)

Prérequis : **Docker Desktop**.

- Double-clique sur **`Reas.bat`** (racine du projet) : build + démarrage de tout le
  stack, init de la base, ouverture du navigateur. Arrêt : **`stop-careeros.bat`**.
- Pour un vrai **`Reas.exe`** : lance `launcher/build-careeros-exe.bat` (une fois), puis
  double-clique sur `Reas.exe`. Détails dans `launcher/README.md`.

## Endpoints (principaux)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion (access + refresh JWT) |
| POST | `/api/auth/refresh` | Renouveler le token |
| GET | `/api/auth/me` | Utilisateur courant |
| GET/PATCH | `/api/users/me` | Profil |
| GET/PUT | `/api/users/me/preferences` | Préférences d'emploi |
| GET/POST/PATCH/DELETE | `/api/experiences` | Expériences (recalcul auto des années) |
| GET/POST/PATCH/DELETE | `/api/skills` | Compétences (dédoublonnage par nom normalisé) |
| GET/POST | `/api/memory/snapshots` | Historique versionné du profil |
| POST | `/api/memory/query` | Recherche sémantique (pgvector) |
| GET | `/api/memory/context` | Reconstruction de contexte |
| GET/POST | `/api/journal` | Career Journal — POST extrait (preview) ou applique (`apply:true`) |
| POST | `/api/journal/:id/apply` | Fusionne l'extraction dans le profil |
| GET | `/api/dashboard` | Agrégats du dashboard |
| GET/POST | `/api/scraping/sources` · `/run` | Sources + lancement scraping |
| GET | `/api/jobs` · `/api/jobs/:id` | Offres + détail avec matching |
| GET/POST | `/api/matches` · `/matches/recompute` | Matchings triés · recalcul |
| POST | `/api/scheduler/run` | Pipeline scrape→match→notif (à la demande) |
| GET/PATCH | `/api/notifications` · `/:id/read` | Notifications + lecture |
| POST | `/api/ai/adapt-cv` | Agent CV : CV/LinkedIn/Malt/lettre + mots-clés ATS |
| GET | `/api/ai/market` | Agent Marché : tendances, salaires, TJM, couverture |
| GET | `/api/ai/coach` | Agent Coach : compétences prioritaires, certifs, projets, prépa |
| GET/POST | `/api/reports` · `/generate?type=weekly\|monthly` | Rapports |
| POST | `/api/agent/run` | Career Agent : lance un cycle autonome complet |
| GET | `/api/agent/digest` · `/runs` · `/runs/:id` | Dernier briefing · historique · détail |
| GET/POST | `/api/agent/settings` | Lire · activer/désactiver l'agent autonome planifié |
| GET | `/api/applications` · `/:id` | Candidatures + détail (CV + lettre générés) |
| POST | `/api/applications/prepare` | Préparer un dossier pour une offre |
| POST | `/api/applications/:id/approve` · `/skip` | Approuver (→ envoi) · ignorer |
| GET/POST | `/api/applications/settings` | Config auto-candidature (seuil, limite, canal) |
| GET | `/api/health` | Health check (public, statut DB) |
| GET | `/api/users/me/export` | RGPD : export complet des données |
| DELETE | `/api/users/me` | RGPD : suppression du compte (cascade) |

## Tests

```bash
# Unitaires (Jest) — extraction Agent Mémoire, normalisation, ownership…
pnpm --filter @careeros/api test

# End-to-end (Playwright) — parcours complet API + smoke UI
#   1) services up + schéma + seed
docker compose up -d postgres redis
pnpm db:generate && pnpm --filter @careeros/database push && pnpm db:seed
#   2a) laisser Playwright démarrer api+web :
E2E_MANAGE_SERVERS=1 pnpm --filter @careeros/e2e test
#   2b) …ou lancer `pnpm dev` dans un terminal puis :
pnpm --filter @careeros/e2e test
```

La suite e2e couvre : health check, register/login JWT, dédoublonnage des compétences,
extraction du Career Journal (l'exemple GitHub Actions → CI/CD/YAML/DevOps), pipeline
veille → matching → offres, génération de rapport, refus d'accès non authentifié, et
export + suppression RGPD. Un smoke UI vérifie la page de login.

## Principes appliqués

- **Faits vs hypothèses** : chaque donnée porte `source` (`user` / `ai_inferred` / `scraped`) et `confidence`.
- **Traçabilité** : `MemorySnapshot` versionne le profil à chaque changement — rien n'est écrasé.
- **Dédoublonnage** : `normalizedName` unique par utilisateur sur les compétences ; `contentHash` unique sur les offres.
- **Correction manuelle** : tous les champs restent éditables via les endpoints PATCH.

## Sources d'offres

L'ingestion passe par l'interface `JobSource`. Deux sources sont fournies :

- **France Travail** (API officielle « Offres d'emploi v2 ») — source réelle, conforme
  (OAuth2, pas de scraping). Active dès que `FRANCE_TRAVAIL_CLIENT_ID` et
  `FRANCE_TRAVAIL_CLIENT_SECRET` sont renseignés (crée une appli sur https://francetravail.io).
  Filtrage géographique automatique : les localisations de tes préférences (ex. « Lille »)
  sont mappées vers le département INSEE (59) et passées à l'API. L'email de contact des
  offres est extrait pour alimenter le canal d'auto-candidature.
- **Sample** — jeu d'offres déterministe offline, utilisé automatiquement **tant que**
  France Travail n'est pas configuré, pour que le pipeline tourne sans réseau.

Ajouter une source (Indeed, WTTJ, APEC…) = implémenter `JobSource` et l'enregistrer dans
`ScrapingService`. Préférer les API officielles ; réserver Playwright (base fournie) aux
sites sans API, en respectant CGU, robots.txt et throttling.

## Career Agent (orchestrateur autonome)

Le **Career Agent** est la couche autonome qui pilote tout. Chaque jour à 06:00 (ou à la
demande via `POST /api/agent/run`), pour chaque utilisateur qui l'a activé, il exécute un
cycle **percevoir → raisonner → agir** :

1. **Perçoit** — lance la veille (scraping) et le matching de chaque offre.
2. **Agit (interne, sûr)** — recalcule le score d'employabilité, émet les alertes > 90 %,
   pré-génère les CV adaptés pour les meilleures offres, écrit une trace en mémoire.
3. **Analyse** — Agent Marché (tendances, couverture) + Agent Coach (écarts prioritaires).
4. **Planifie** — produit un briefing + des actions priorisées (LLM si clé, sinon règles).
5. **Journalise** — chaque cycle est enregistré (`AgentRun`) avec métriques et digest.

**Garde-fous** : l'agent exécute seulement les actions internes réversibles. Toute action
externe (postuler, contacter un recruteur) est renvoyée en recommandation **à valider** —
l'humain reste dans la boucle. Les faits inférés restent distingués des faits explicites.
L'agent se coupe par utilisateur (`autonomousAgentEnabled`).

### Auto-candidature (opt-in)

À chaque cycle, l'agent **prépare** un dossier complet (CV + lettre sur-mesure via l'Agent CV)
pour tes meilleures offres et le met en `pending_review`. L'**envoi automatique est désactivé
par défaut** : tu dois l'activer explicitement (`autoApplyEnabled`), avec un **seuil de score**
(`autoApplyThreshold`, défaut 92), une **limite quotidienne** (`autoApplyDailyLimit`) et un
**canal** (`autoApplyChannel`). L'envoi passe par une interface `ApplicationChannelHandler` :

- `manual` (défaut) — ne soumet jamais ; produit un dossier prêt, tu postules via l'URL.
- `email` — envoi réel via **Resend** (`RESEND_API_KEY` + `EMAIL_FROM`) quand l'offre expose
  un email de contact ; l'email de contact est extrait automatiquement par la source France
  Travail. Sans provider configuré ou sans contact, le canal échoue proprement (jamais d'envoi
  « dans le vide »).
- `external_url` — enregistre le lien ; soumission manuelle (CGU/CAPTCHA des job boards).

Ce choix est délibéré : aucun bot n'est codé pour soumettre en masse sur des sites tiers en
violation de leurs CGU. La qualité et le contrôle priment.

## Feuille de route

- **Phase 1 ✅** Auth, DB, profil, expériences, compétences, mémoire persistante.
- **Phase 2 ✅** Agent Mémoire (extraction + expansion de compétences, fallback sans clé API), Career Journal (preview → apply), scoring d'employabilité déterministe, dashboard branché sur l'API, pages front (journal, skills, experiences).
- **Phase 3 ✅** Abstraction `JobSource` (source échantillon offline + base Playwright), scheduler quotidien (@nestjs/schedule, BullMQ en option scale-out), Agent Recruteur (matching /100 multi-critères + ATS, compétences manquantes, proba entretien, reco), notifications > 90 %, pages front jobs/détail/matching/notifications.
- **Phase 4 ✅** Agent CV (CV/LinkedIn/Malt/lettre + ATS), Agent Marché (tendances/salaires/TJM/couverture), Agent Coach (compétences prioritaires depuis les écarts de matching, certifs, projets, prépa entretien), rapports hebdo & mensuel + crons dédiés, pages front reports/timeline/settings + panneau CV sur le détail d'offre. Refactor : utilitaires partagés (`common/utils`), suppression des duplications d'ownership/normalisation, limites de pagination, config Prettier/EditorConfig.
- **Phase 5 ✅** Suite e2e Playwright (parcours API + smoke UI), sécurité (helmet, rate-limiting global via `@nestjs/throttler`, export/suppression RGPD), health check `/api/health`, logging structuré des requêtes, CI GitHub Actions (lint/test/build + e2e avec Postgres+Redis).

## Comptes de démo

`bilelknh@gmail.com` / `careeros` (créé par `pnpm db:seed`).
