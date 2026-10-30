#!/bin/bash
# Cria a configuração privada e o PostgreSQL exclusivo do Travessia.
# Não imprime senha, URL nem segredo. Não altera um .env.docker existente.
set -euo pipefail

if [[ -n "${TRAVESSIA_ROOT:-}" ]]; then
  ROOT=$TRAVESSIA_ROOT
else
  ROOT=$(cd "$(dirname "$0")/.." && pwd)
fi
cd "$ROOT"

if [[ ! -f compose.yaml ]]; then
  echo "compose.yaml não encontrado em $ROOT." >&2
  exit 1
fi

if [[ ! -f .env.docker ]]; then
  umask 077
  password=$(openssl rand -hex 24)
  secret=$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '\n=')
  cat > .env.docker <<EOF
APP_PUBLIC_ORIGIN=https://travessia.maisacessoconecta.com.br
WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=3020
ALLOW_LOCAL_HTTP=false
POSTGRES_USER=travessia
POSTGRES_DB=travessia
POSTGRES_PASSWORD=${password}
DATABASE_URL=postgresql://travessia:${password}@db:5432/travessia?schema=travessia&connection_limit=5&pool_timeout=10
BETTER_AUTH_SECRET=${secret}
DEMO_MODE=false
DEMO_ONLY=false
DEMO_USER_EMAIL=
DEMO_USER_PASSWORD=
AI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_PUBLIC_USE_APPROVED=false
SUPABASE_URL=
SUPABASE_STORAGE_SECRET=
EOF
  chmod 600 .env.docker
  unset password secret
  echo ".env.docker criado. Nenhum segredo foi exibido."
else
  echo ".env.docker preservado."
fi

if ! grep -q '^DEMO_MODE=false$' .env.docker || ! grep -q '^DEMO_ONLY=false$' .env.docker; then
  echo "Produção exige DEMO_MODE=false e DEMO_ONLY=false." >&2
  exit 1
fi
if ! grep -q '@db:5432/travessia?' .env.docker; then
  echo "DATABASE_URL precisa usar o banco isolado db:5432/travessia." >&2
  exit 1
fi

unset DATABASE_URL DIRECT_URL POSTGRES_PASSWORD BETTER_AUTH_SECRET POSTGRES_USER POSTGRES_DB APP_PUBLIC_ORIGIN
compose() {
  docker compose --project-directory "$ROOT" --env-file "$ROOT/.env.docker" "$@"
}

compose up -d --wait --wait-timeout 180 db
db_id=$(compose ps -q db)
bindings=$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$db_id")
if [[ "$bindings" != "null" && "$bindings" != "{}" ]]; then
  echo "O banco isolado publicou porta no host. Sobe interrompida." >&2
  exit 1
fi

schema_ready=0
for _ in 1 2 3 4 5; do
  if compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE SCHEMA IF NOT EXISTS travessia AUTHORIZATION ${POSTGRES_USER};"'; then
    schema_ready=1
    break
  fi
  sleep 2
done
if [[ "$schema_ready" != 1 ]]; then
  echo "Não foi possível criar o schema travessia." >&2
  exit 1
fi
echo "Banco isolado no ar, sem porta publicada, schema travessia pronto."
