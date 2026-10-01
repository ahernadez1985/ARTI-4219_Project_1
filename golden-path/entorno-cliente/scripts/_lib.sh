#!/usr/bin/env bash
# Funciones compartidas por los scripts de entorno-cliente.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/k8s/entorno.yaml"
KIND_CLUSTER="${KIND_CLUSTER:-golden-path}"
KUBE_CONTEXT="${KUBE_CONTEXT:-kind-$KIND_CLUSTER}"
HOST_PORT="${HOST_PORT:-8080}"
# Proyecto que se construye por defecto (Portal de Plugins)
DEFAULT_REPO_URL="https://github.com/ahernadez1985/ARTI-4219_Project_1.git"
# Dónde vive la configuración de clientes dentro del repo (para validar clientId)
CLIENT_CONFIG_PATH="${CLIENT_CONFIG_PATH:-backend/src/config/clients}"

kc() { kubectl --context "$KUBE_CONTEXT" "$@"; }

die() { echo "ERROR: $*" >&2; exit 1; }

lower() { tr '[:upper:]' '[:lower:]' <<<"$1"; }

# Mismas reglas que el formulario de Backstage (template.yaml)
validate_client_id() {
  [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,38}[A-Za-z0-9])?$ ]] \
    || die "clientId inválido '$1' (letras, números y guiones; 1-40 chars). Ej: BA-004821"
}
validate_commit() {
  [[ "$1" =~ ^[0-9a-f]{7,40}$ ]] \
    || die "commit inválido '$1' (SHA hexadecimal de 7 a 40 chars; nunca una rama)"
}

env_name() { echo "env-$(lower "$1")-${2:0:7}"; }

# Equivalente en shell de la acción git:pull:commit del plugin de Backstage:
# trae el repo (sin blobs) a un directorio temporal, resuelve el SHA completo
# y verifica que el cliente exista en ese commit. Imprime el SHA completo.
resolve_commit() {
  local repo_url="$1" commit="$2" client_id="$3" tmp sha
  tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT   # siempre se llama dentro de $(...)
  echo ">> Resolviendo $commit en $repo_url" >&2
  GIT_TERMINAL_PROMPT=0 git clone --quiet --bare --filter=blob:none "$repo_url" "$tmp/repo" >&2 \
    || die "no se pudo clonar $repo_url"
  sha="$(git -C "$tmp/repo" rev-parse --verify --quiet "$commit^{commit}")" \
    || die "el commit $commit no existe en $repo_url (o el SHA abreviado es ambiguo)"
  echo ">> Commit $sha — $(git -C "$tmp/repo" log -1 --format=%s "$sha")" >&2
  if [[ "${SKIP_CLIENT_CHECK:-0}" != "1" ]]; then
    git -C "$tmp/repo" grep -q -F "$client_id" "$sha" -- "$CLIENT_CONFIG_PATH" \
      || die "el cliente '$client_id' no existe en $CLIENT_CONFIG_PATH en el commit ${sha:0:7} (SKIP_CLIENT_CHECK=1 para omitir)"
    echo ">> Cliente $client_id encontrado en $CLIENT_CONFIG_PATH" >&2
  fi
  echo "$sha"
}

# Renderiza k8s/entorno.yaml sustituyendo los placeholders de Backstage
# (${{ parameters.* }} y ${{ steps['pull-commit'].output.* }}) por valores
# (clientId llega del EntityPicker como resource:default/<ID>; aquí, el ID).
# literales (perl: sin escapes raros). $commit debe ser el SHA completo.
render_manifest() {
  local client_id="$1" commit="$2" repo_url="$3"
  local out
  out=$(CID="$client_id" CIDL="$(lower "$client_id")" SHA="$commit" SHORT="${commit:0:7}" REPO="$repo_url" perl -pe '
    s/\$\{\{ parameters\.clientId \| parseEntityRef \| pick\(.name.\) \| lower \}\}/$ENV{CIDL}/g;
    s/\$\{\{ parameters\.clientId \| parseEntityRef \| pick\(.name.\) \}\}/$ENV{CID}/g;
    s/\$\{\{ steps\[.pull-commit.\]\.output\.shortCommit \}\}/$ENV{SHORT}/g;
    s/\$\{\{ steps\[.pull-commit.\]\.output\.commit \}\}/$ENV{SHA}/g;
    s/\$\{\{ parameters\.repoUrl \}\}/$ENV{REPO}/g;
  ' "$MANIFEST" | grep -v '^#')
  if grep -q '\${{' <<<"$out"; then
    die "quedaron placeholders sin resolver en $MANIFEST: $(grep -o '\${{[^}]*}}' <<<"$out" | sort -u | tr '\n' ' ')"
  fi
  printf '%s\n' "$out"
}
