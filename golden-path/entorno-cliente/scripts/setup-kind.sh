#!/usr/bin/env bash
# Prepara el clúster kind una sola vez:
#   1. crea el clúster (puerto 8080 del Mac -> 80 del nodo)
#   2. instala ingress-nginx (variante kind, hostPort 80)
#   3. crea la ServiceAccount + RBAC que usará Backstage
#   4. imprime URL y token para app-config.local.yaml de Backstage
source "$(dirname "$0")/_lib.sh"

INGRESS_NGINX_VERSION="${INGRESS_NGINX_VERSION:-controller-v1.14.0}"

for bin in kind kubectl docker perl; do
  command -v "$bin" >/dev/null || die "falta '$bin' en el PATH"
done

if kind get clusters 2>/dev/null | grep -qx "$KIND_CLUSTER"; then
  echo ">> El clúster kind '$KIND_CLUSTER' ya existe"
else
  kind create cluster --name "$KIND_CLUSTER" --config "$ROOT_DIR/kind/kind-config.yaml"
fi

echo ">> Instalando ingress-nginx ($INGRESS_NGINX_VERSION)"
kc apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/$INGRESS_NGINX_VERSION/deploy/static/provider/kind/deploy.yaml"
kc -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=300s

echo ">> RBAC para Backstage"
kc apply -f "$ROOT_DIR/k8s/backstage-rbac.yaml"
# el token del Secret lo rellena el token-controller unos segundos después
for _ in $(seq 1 30); do
  TOKEN="$(kc -n backstage get secret backstage-scaffolder-token -o go-template='{{if .data.token}}{{.data.token | base64decode}}{{end}}' 2>/dev/null || true)"
  [[ -n "$TOKEN" ]] && break
  sleep 1
done
[[ -n "$TOKEN" ]] || die "no se generó el token de backstage-scaffolder"

SERVER="$(kubectl config view --minify --context "$KUBE_CONTEXT" -o jsonpath='{.clusters[0].cluster.server}')"

cat <<EOF

Clúster listo. Para Backstage (corriendo en tu Mac con 'yarn start'):

  export K8S_KIND_URL='$SERVER'
  export K8S_KIND_TOKEN='$TOKEN'

y usa entorno-cliente/backstage/app-config.kubernetes.yaml.

Probar sin Backstage:
  ./scripts/deploy-env.sh <clientId> <commit> <repoUrl>
EOF
