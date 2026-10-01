#!/usr/bin/env bash
# Genera catalog/clientes.yaml (una entidad Resource "cliente" por cliente)
# a partir de backend/src/config/clients del repo del portal, en su rama
# principal. Backstage lo usa para el dropdown "Cliente" del template.
#
#   ./scripts/sync-clients.sh [repoUrl]
source "$(dirname "$0")/_lib.sh"

REPO_URL="${1:-${REPO_URL:-$DEFAULT_REPO_URL}}"
OUT="$ROOT_DIR/catalog/clientes.yaml"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
GIT_TERMINAL_PROMPT=0 git clone --quiet --depth 1 "$REPO_URL" "$TMP/repo" \
  || die "no se pudo clonar $REPO_URL"
SHA="$(git -C "$TMP/repo" rev-parse --short HEAD)"

mkdir -p "$(dirname "$OUT")"
{
  echo "# GENERADO por scripts/sync-clients.sh desde $REPO_URL @ $SHA"
  echo "# ($CLIENT_CONFIG_PATH). No editar a mano: vuelve a ejecutar el script."
  count=0
  for f in "$TMP/repo/$CLIENT_CONFIG_PATH"/*.js; do
    id="$(perl -ne "print \$1 and exit if /clientId:\s*['\"]([^'\"]+)['\"]/" "$f")"
    [[ -n "$id" ]] || continue
    name="$(perl -ne "print \$1 and exit if /clientName:\s*['\"]([^'\"]+)['\"]/" "$f")"
    validate_client_id "$id"
    cat <<EOF
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: $id
  title: "${name:-$id} ($id)"
  description: "Cliente del Portal de Plugins (${f##*/})"
  tags: [cliente]
spec:
  type: cliente
  owner: group:default/plataforma
EOF
    count=$((count + 1))
  done
  [[ $count -gt 0 ]] || die "no se encontraron clientes en $CLIENT_CONFIG_PATH"
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo ">> $(grep -c '^kind: Resource' "$OUT") clientes -> $OUT"
grep '^  title:' "$OUT"
