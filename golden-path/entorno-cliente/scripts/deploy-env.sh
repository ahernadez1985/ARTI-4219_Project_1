#!/usr/bin/env bash
# Levanta (o actualiza) el Portal de Plugins de un cliente en un commit exacto.
#
#   ./scripts/deploy-env.sh <clientId> <commit> [repoUrl]
#   ./scripts/deploy-env.sh BA-004821 4ea9ecb
#
# Variables opcionales:
#   REPO_URL            repo si no se pasa como 3er argumento (default: Portal de Plugins)
#   GIT_TOKEN           token para clonar repos privados (se guarda como Secret)
#   SKIP_CLIENT_CHECK=1 no verificar que el cliente exista en ese commit
#   KIND_CLUSTER        nombre del clúster kind (default golden-path)
#   NO_WAIT=1           no esperar a que el pod quede listo
source "$(dirname "$0")/_lib.sh"

[[ $# -ge 2 ]] || die "uso: $0 <clientId> <commit> [repoUrl]"
CLIENT_ID="$1"
GIT_COMMIT="$2"
REPO_URL="${3:-${REPO_URL:-$DEFAULT_REPO_URL}}"

validate_client_id "$CLIENT_ID"
validate_commit "$GIT_COMMIT"

if [[ -n "${GIT_TOKEN:-}" ]]; then
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader
  GIT_CONFIG_VALUE_0="Authorization: Basic $(printf 'x-access-token:%s' "$GIT_TOKEN" | base64 | tr -d '\n')"
  export GIT_CONFIG_VALUE_0
fi
FULL_COMMIT="$(resolve_commit "$REPO_URL" "$GIT_COMMIT" "$CLIENT_ID")"
NS="$(env_name "$CLIENT_ID" "$FULL_COMMIT")"

echo ">> Entorno $NS  (cliente=$CLIENT_ID commit=$FULL_COMMIT)"

RENDERED="$(render_manifest "$CLIENT_ID" "$FULL_COMMIT" "$REPO_URL")"

# El namespace va primero para poder crear el Secret antes que el pod.
kc create namespace "$NS" --dry-run=client -o yaml | kc apply -f - >/dev/null
if [[ -n "${GIT_TOKEN:-}" ]]; then
  kc -n "$NS" create secret generic git-credentials \
    --from-literal=token="$GIT_TOKEN" --dry-run=client -o yaml | kc apply -f - >/dev/null
  echo ">> Secret git-credentials creado"
fi

printf '%s\n' "$RENDERED" | kc apply -f -

URL="http://$NS.localtest.me:$HOST_PORT"
if [[ "${NO_WAIT:-0}" != "1" ]]; then
  echo ">> Esperando fetch + build + arranque (puede tardar 1-3 min)..."
  if ! kc -n "$NS" rollout status deploy/portal --timeout=10m; then
    echo ">> El entorno no quedó listo. Diagnóstico:"
    kc -n "$NS" get pods
    for c in fetch build-backend build-frontend; do
      echo "   kubectl --context $KUBE_CONTEXT -n $NS logs deploy/portal -c $c"
    done
    exit 1
  fi
  # El ingress tarda unos segundos en enrutar al pod recién listo
  for _ in $(seq 1 30); do
    curl -fsS "$URL/__entorno" 2>/dev/null | grep -q "$FULL_COMMIT" && break
    sleep 2
  done
  if ! curl -fsS "$URL/api/v1/health" 2>/dev/null | grep -q '"clientId":"'; then
    echo ">> AVISO: este commit no soporta CLIENT_ID (anterior a c509ccb): el portal acepta a todos los clientes"
  fi
fi

cat <<EOF

Entorno listo. Inicia sesión en:

  $URL/login

  entorno:      $URL/__entorno
  api health:   $URL/api/v1/health
  logs:         kubectl --context $KUBE_CONTEXT -n $NS logs deploy/portal -c backend -f
  borrar:       ./scripts/destroy-env.sh $CLIENT_ID $GIT_COMMIT
EOF
