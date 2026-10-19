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
$SSH "$DOEL" 'export PATH=/opt/plesk/node/25/bin:$PATH; cd de-sneppe.be && H=$(sha1sum package-lock.json | cut -c1-40); [ "$H" = "$(cat node_modules/.lock-hash 2>/dev/null)" ] || { npm ci --no-audit --no-fund && echo $H > node_modules/.lock-hash; } && npx prisma generate >/dev/null && ./deploy.sh'
