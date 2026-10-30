#!/bin/bash
# Publica só o frontend em travessia.maisacessoconecta.com.br.
# A API permanece na rede Docker, sem vhost próprio.
set -euo pipefail

if [[ -n "${TRAVESSIA_ROOT:-}" ]]; then
  ROOT=$TRAVESSIA_ROOT
else
  ROOT=$(cd "$(dirname "$0")/.." && pwd)
fi
TEMPLATE_DIR=${TRAVESSIA_NGINX_DIR:-$ROOT/deploy/nginx}
SITE=/etc/nginx/sites-enabled/travessia.maisacessoconecta.com.br
DOMAIN=travessia.maisacessoconecta.com.br
WEBROOT=/var/www/travessia
CERT_DIR=/etc/ssl/travessia
CERT_VOLUME=${TRAVESSIA_CERT_VOLUME:-/home/cloud/travessia-certs}

install_site() {
  local template=$1
  local fallback=${2:-}
  sudo -n sed -n "w ${SITE}" "$template"
  if ! sudo -n nginx -t; then
    if [[ -n "$fallback" ]]; then
      sudo -n sed -n "w ${SITE}" "$fallback"
      sudo -n nginx -t
      sudo -n nginx -s reload
    else
      sudo -n sed -i 'd' "$SITE"
    fi
    echo "Nginx rejeitou $(basename "$template")." >&2
    return 1
  fi
  sudo -n nginx -s reload
}

docker run --rm -v "$WEBROOT:/webroot" alpine:3.20 chmod 755 /webroot

if [[ ! -f "$TEMPLATE_DIR/travessia.http.conf" || ! -f "$TEMPLATE_DIR/travessia.https.conf" ]]; then
  echo "Modelos de nginx ausentes em $TEMPLATE_DIR." >&2
  exit 1
fi

have_cert() {
  sudo -n sed -n '1p' "$CERT_DIR/fullchain.pem" >/dev/null 2>&1 \
    && sudo -n sed -n '1p' "$CERT_DIR/privkey.pem" >/dev/null 2>&1
}

if have_cert; then
  install_site "$TEMPLATE_DIR/travessia.https.conf" "$TEMPLATE_DIR/travessia.http.conf"
else
  install_site "$TEMPLATE_DIR/travessia.http.conf"
fi

mkdir -p "$CERT_VOLUME"
chmod 700 "$CERT_VOLUME"
if docker run --rm \
  -v "$WEBROOT:/var/www/travessia" \
  -v "$CERT_VOLUME:/etc/letsencrypt" \
  certbot/certbot certonly --webroot -w /var/www/travessia \
  -d "$DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email \
  --keep-until-expiring; then
  www_gid=$(getent group www-data | cut -d: -f3)
  docker run --rm \
    -v "$CERT_VOLUME:/letsencrypt:ro" \
    -v "$CERT_DIR:/dest" \
    alpine:3.20 sh -c "cp -L /letsencrypt/live/${DOMAIN}/fullchain.pem /dest/fullchain.pem && cp -L /letsencrypt/live/${DOMAIN}/privkey.pem /dest/privkey.pem && chown root:${www_gid} /dest/privkey.pem && chmod 644 /dest/fullchain.pem && chmod 640 /dest/privkey.pem && chmod 755 /dest"
  install_site "$TEMPLATE_DIR/travessia.https.conf" "$TEMPLATE_DIR/travessia.http.conf"
  echo "Nginx encaminha https://${DOMAIN} para o frontend em 127.0.0.1:3020."
elif have_cert; then
  echo "Renovação não concluída. O certificado atual de ${DOMAIN} permanece." >&2
else
  echo "Certificado ainda não emitido. O nginx permanece em HTTP para ${DOMAIN}; a origem pública da aplicação continua https://${DOMAIN}." >&2
fi
