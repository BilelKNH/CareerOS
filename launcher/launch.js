/* CareerOS launcher — orchestrates the Docker stack and opens the browser.
 * Pure Node built-ins so it compiles cleanly to a standalone .exe with pkg.
 * Build:  npm run build:exe   (produces ../CareerOS.exe)
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// When packaged with pkg, resolve the project dir from the .exe location.
// In dev (plain node), use the repo root (one level above /launcher).
const PROJECT_DIR = process.pkg ? path.dirname(process.execPath) : path.resolve(__dirname, '..');
const WEB_URL = 'http://localhost:3000';

function log(msg) {
  process.stdout.write(msg + '\n');
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: PROJECT_DIR, stdio: 'inherit', shell: true, ...opts });
}

function hasDocker() {
  const r = spawnSync('docker', ['--version'], { stdio: 'ignore', shell: true });
  return r.status === 0;
}

function waitForWeb(retries = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const tick = () => {
      const req = http.get(WEB_URL, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve(true);
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (++attempts >= retries) return resolve(false);
      setTimeout(tick, 2000);
    };
    tick();
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true });
  else if (process.platform === 'darwin') spawn('open', [url], { detached: true });
  else spawn('xdg-open', [url], { detached: true });
}

function pause() {
  log('\n(Laisse cette fenêtre ouverte. Appuie sur Entrée pour quitter le launcher — les conteneurs continuent de tourner.)');
  try {
    require('child_process').execSync('pause', { stdio: 'inherit', shell: true });
  } catch {
    /* ignore */
  }
}

async function main() {
  log('============================================');
  log('            Lancement de CareerOS');
  log('============================================\n');

  if (!hasDocker()) {
    log('[ERREUR] Docker Desktop est requis et introuvable.');
    log('Installe-le : https://www.docker.com/products/docker-desktop/');
    return pause();
  }

  const envPath = path.join(PROJECT_DIR, '.env');
  const examplePath = path.join(PROJECT_DIR, '.env.example');
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('Premier lancement : .env créé depuis .env.example.');
    log('  > Renseigne JWT_SECRET / JWT_REFRESH_SECRET dans .env.\n');
  }

  log('Construction et démarrage des conteneurs (Postgres, Redis, API, Web)...');
  const up = run('docker', ['compose', 'up', '-d', '--build']);
  if (up.status !== 0) {
    log('\n[ERREUR] Démarrage échoué. Vérifie que Docker Desktop tourne.');
    return pause();
  }

  log('\nInitialisation de la base (schéma + données de démo)...');
  run('docker', [
    'compose', 'exec', '-T', 'api',
    'sh', '-lc',
    '"cd /app && pnpm --filter @careeros/database exec prisma db push --accept-data-loss && pnpm --filter @careeros/database exec tsx prisma/seed.ts"',
  ]);

  log('\nAttente du démarrage du front...');
  const ready = await waitForWeb();

  log('\n============================================');
  log(ready ? '  CareerOS est lancé !' : '  Conteneurs démarrés (le front finit de démarrer).');
  log('  Web  : ' + WEB_URL);
  log('  API  : http://localhost:3001/api');
  log('  Démo : bilelknh@gmail.com / careeros');
  log('============================================');
  openBrowser(WEB_URL);
  pause();
}

main().catch((e) => {
  log('Erreur : ' + (e && e.message ? e.message : String(e)));
  pause();
});
