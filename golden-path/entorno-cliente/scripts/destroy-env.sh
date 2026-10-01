#!/usr/bin/env bash
# Elimina el entorno de un cliente+commit (borra su namespace completo).
#   ./scripts/destroy-env.sh <clientId> <commit>
source "$(dirname "$0")/_lib.sh"

[[ $# -eq 2 ]] || die "uso: $0 <clientId> <commit>"
validate_client_id "$1"
validate_commit "$2"
NS="$(env_name "$1" "$2")"
kc delete namespace "$NS" --wait=false
echo ">> $NS marcado para borrado"
