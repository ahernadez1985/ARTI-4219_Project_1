#!/usr/bin/env bash
# Lista los entornos de cliente activos en el clúster.
source "$(dirname "$0")/_lib.sh"

kc get namespaces -l app.kubernetes.io/managed-by=golden-path-entorno-cliente \
  -L plataforma/client-id -L plataforma/git-commit
echo
echo "URL de cada entorno: http://<NAME>.localtest.me:$HOST_PORT"
