#!/usr/bin/env bash
# Back up quiesced application data, or rehearse restoring it in an isolated project.
set -euo pipefail
umask 077
root=$(cd "$(dirname "$0")/.." && pwd)
mode=${1:-}
bundle=${2:-}
if [[ $# != 2 || -z "$bundle" || ( "$mode" != backup && "$mode" != verify ) ]]; then
  echo "Uso: $0 {backup|verify} DIRETORIO" >&2
  exit 2
fi
compose() {
  docker compose --project-directory "$root" --env-file "$root/.env.docker" "$@"
}

if [[ "$mode" == backup ]]; then
  mkdir -- "$bundle"
  bundle=$(cd "$bundle" && pwd)
  # Share the deployment lock to avoid taking a snapshot during a migration.
  exec 9>"$root/.deploy.lock"
  flock -n 9
  running=$(compose ps --services --status running api material-worker)
  mapfile -t writers < <(printf '%s\n' "$running" | sed '/^$/d')
  resume() {
    if (("${#writers[@]}")); then compose start "${writers[@]}" >/dev/null; fi
  }
  trap resume EXIT
  if (("${#writers[@]}")); then compose stop "${writers[@]}" >&2; fi
  compose exec -T db sh -ec 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$bundle/database.dump"
  compose run --rm --no-deps -T --entrypoint tar api -C /data/materials -cf - . > "$bundle/materials.tar"
  resume
  trap - EXIT
  (cd "$bundle" && sha256sum database.dump materials.tar > SHA256SUMS)
  echo "Backup criado em $bundle"
else
  bundle=$(cd "$bundle" && pwd)
  (cd "$bundle" && sha256sum database.dump materials.tar | cmp - SHA256SUMS)
  project="travessia-restore-$(cat /proc/sys/kernel/random/uuid)"
  isolated() { compose -p "$project" "$@"; }
  cleanup() { isolated down --volumes >&2; }
  trap cleanup EXIT
  isolated up -d --wait --wait-timeout 120 db >&2
  isolated exec -T db sh -ec 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$bundle/database.dump"
  isolated run --rm --no-deps -T --user 0 --entrypoint tar api -C /data/materials -xpf - < "$bundle/materials.tar"
  isolated run --rm --no-deps -T --entrypoint tar api -C /data/materials -df - < "$bundle/materials.tar"
  cleanup
  trap - EXIT
  echo "Restauração do banco e dos arquivos verificada em projeto isolado."
fi
