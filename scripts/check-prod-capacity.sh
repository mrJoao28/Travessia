#!/bin/bash
# Política conservadora de folga para acrescentar o worker sem substituir serviços atuais.
set -euo pipefail
meminfo=${TRAVESSIA_MEMINFO:-/proc/meminfo}
available_kib=$(awk '/^MemAvailable:/{print $2}' "$meminfo")
docker_root=$(docker info --format '{{.DockerRootDir}}')
available_mib=$(df -Pm "$docker_root" | awk 'NR==2{print $4}')
if [[ ! "$available_kib" =~ ^[0-9]+$ || ! "$available_mib" =~ ^[0-9]+$ ]]; then
  echo "Não foi possível conferir memória e disco do Docker. Publicação interrompida." >&2
  exit 1
fi
printf 'Folga do servidor: %s MiB de memória e %s MiB no disco do Docker.\n' "$((available_kib / 1024))" "$available_mib"
if (( available_kib < 1536 * 1024 || available_mib < 3072 )); then
  echo "Publicação interrompida antes de atualizar serviços: a política exige 1536 MiB de memória disponível e 3072 MiB de disco livre para preparar o worker." >&2
  exit 1
fi
