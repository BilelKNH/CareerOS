# Frontend — statut Phase 1

Ce dossier `web` est le **shell** : layout + sidebar (10 pages du cahier des charges),
écran de login câblé sur `/api/auth/login`, et un dashboard avec cartes de score
(valeurs de démonstration).

Les pages listées dans la sidebar (timeline, experiences, skills, jobs, matching,
journal, reports, notifications, settings) sont créées au fil des phases :

- **Phase 2** : experiences, skills, journal, dashboard branché sur l’API.
- **Phase 3** : jobs, matching, notifications.
- **Phase 4** : reports, timeline enrichie.

Chaque page suit le même patron : `page.tsx` (server) → composants dans
`src/components/<domaine>/`, données via `src/lib/api-client.ts` + TanStack Query.
