#!/bin/bash
# Publica API e frontend a partir da branch prod. O banco já isolado é reutilizado.
set -euo pipefail

if [[ -n "${TRAVESSIA_ROOT:-}" ]]; then
  ROOT=$TRAVESSIA_ROOT
else
  ROOT=$(cd "$(dirname "$0")/.." && pwd)
fi
cd "$ROOT"

mkdir -p "$ROOT"
exec 9>"$ROOT/.deploy.lock"
if ! flock -n 9; then
  echo "Outro deploy do Travessia já está em andamento." >&2
  exit 1
fi

bash "$ROOT/scripts/provision-prod-env.sh"

unset DATABASE_URL DIRECT_URL POSTGRES_PASSWORD BETTER_AUTH_SECRET POSTGRES_USER POSTGRES_DB APP_PUBLIC_ORIGIN
compose() {
  docker compose --project-directory "$ROOT" --env-file "$ROOT/.env.docker" "$@"
}

compose build
compose run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma
compose up -d --wait --wait-timeout 180

for service in db api; do
  service_id=$(compose ps -q "$service")
  bindings=$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$service_id")
  if [[ "$bindings" != "null" && "$bindings" != "{}" ]]; then
    echo "O serviço ${service} publicou porta no host. Deploy interrompido." >&2
    exit 1
  fi
done

frontend_id=$(compose ps -q frontend)
frontend_bindings=$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$frontend_id")
if [[ "$frontend_bindings" != *127.0.0.1* || "$frontend_bindings" == *0.0.0.0* ]]; then
  echo "O frontend precisa permanecer só em 127.0.0.1." >&2
  exit 1
fi

bash "$ROOT/scripts/install-travessia-nginx.sh"
curl --fail --silent --show-error --max-time 20 http://127.0.0.1:3020/login >/dev/null
echo "API e frontend publicados. Nginx usa travessia.maisacessoconecta.com.br; a API não tem domínio próprio."
