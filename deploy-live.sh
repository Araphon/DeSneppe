#!/usr/bin/env bash
# Deploy naar productie (de-sneppe.be, systeemgebruiker desneppe).
# Zet de broncode over (zonder .env, uploads, node_modules, .next) en bouwt daar via deploy.sh.
set -euo pipefail
cd "$(dirname "$0")"
SSH="ssh -i $HOME/.ssh/desneppe_migratie -o IdentitiesOnly=yes"
DOEL=desneppe@localhost
rsync -a --delete -e "$SSH" \
  --exclude .env --exclude uploads --exclude node_modules --exclude .next --exclude tmp --exclude _plesk \
  --exclude .php-ini --exclude .php-version --exclude tsconfig.tsbuildinfo \
  --exclude 'android*/app/build' --exclude .gradle --exclude 'ios*/App/build' \
  ./ "$DOEL:de-sneppe.be/"
$SSH "$DOEL" 'export PATH=/opt/plesk/node/25/bin:$PATH; cd de-sneppe.be && (cmp -s package-lock.json node_modules/.package-lock.json || npm ci --no-audit --no-fund) && npx prisma generate >/dev/null && ./deploy.sh'
