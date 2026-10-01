# Entorno de cliente: `clientId` + `commit` → Portal de Plugins corriendo en kind

Golden Path que, a partir de un **ID de cliente** y un **commit**, trae el
Portal de Plugins (`portal-plugins-project`: `backend/` + `frontend/`) en
ese commit exacto, lo construye y lo arranca en un namespace aislado del
clúster kind, accesible desde el navegador:

```
http://env-<clientid>-<sha7>.localtest.me:8080
```

`*.localtest.me` resuelve a `127.0.0.1`, así que no hay que tocar `/etc/hosts`.
Cada combinación cliente+commit es un namespace distinto, por lo que pueden
coexistir varios entornos (del mismo o de distintos clientes) en commits
diferentes.

## Cómo funciona

```
Backstage (formulario: Cliente [dropdown del catálogo], gitCommit, repoUrl)
   ├─ git:pull:commit  (plugin propio)
   │     trae el repo al commit exacto, resuelve el SHA completo y verifica
   │     backend/ + frontend/ y que clientId exista en backend/src/config/clients
   ├─ kube:apply  ──►  kind
                        └─ ns env-<clientid>-<sha7>
                             ├─ ConfigMap environment-metadata (CLIENT_ID, GIT_COMMIT, REPO_URL, PUBLIC_URL)
                             ├─ ConfigMap nginx-template
                             ├─ Deployment portal
                             │    init fetch          : git fetch --depth 1 <sha> + checkout
                             │    init build-backend  : npm ci --omit=dev
                             │    init build-frontend : npm ci + vite build (VITE_API_BASE_URL=PUBLIC_URL)
                             │    backend             : npm start en :4000
                             │    web (nginx)         : SPA + proxy /api → backend + /__entorno
                             ├─ Service portal
                             └─ Ingress env-<clientid>-<sha7>.localtest.me
   └─ http:wait  (plugin propio)
         espera a que /__entorno responda con ese commit; el resultado del
         template muestra el link de login: http://env-<clientid>-<sha7>.localtest.me:8080/login
```

- **Cliente**: se elige en un dropdown (`EntityPicker`) con las entidades
  `Resource` de tipo `cliente` del catálogo, que se generan desde el repo con
  `./scripts/sync-clients.sh` → `catalog/clientes.yaml`. Al agregar un
  cliente al portal, vuelve a ejecutarlo (Backstage relee el archivo solo).
  El template lee la entidad con `catalog:fetch` y toma el id exacto de su
  anotación `plataforma/client-id` (el nombre puede llegar en minúsculas).
  El `clientId` es el del portal (`BA-004821`, `NX-11029`, …).
  Se valida contra `backend/src/config/clients` **en ese commit**: por
  ejemplo, `NX-11029` no existe en `4c0045b` y el template falla antes de
  crear nada. El namespace usa el id en minúsculas (`env-ba-004821-…`).
- **Un solo cliente por entorno**: el backend arranca con `CLIENT_ID`; el
  login rechaza (403) a usuarios de otros clientes y `/api/v1/health`
  devuelve el cliente. Esto lo implementa el portal desde el commit
  `c509ccb` (rama `feature/client-id-entorno`); en commits anteriores el
  entorno sigue aceptando a todos los clientes (`"clientId": null` en el health).
- **Commit**: siempre un SHA (7-40 hex), nunca una rama, para que el entorno
  sea reproducible. El plugin lo resuelve al SHA completo y ese es el que
  usan el pod, las etiquetas y `/__entorno`.
- No se construyen imágenes Docker: el código se compila dentro del pod
  sobre `node:24-alpine`. Cada reinicio del pod vuelve a traer y construir.

En el navegador:

| URL | Qué es |
|---|---|
| `/login` | Login del portal (usuarios demo en `backend/src/data/users.js`) |
| `/__entorno` | JSON con el cliente, el commit y el repo de este entorno |
| `/api/v1/health` | Health de la API |

## Estructura

| Archivo | Para qué |
|---|---|
| `template.yaml` | Software Template de Backstage (formulario + `git:pull:commit` + `kube:apply`) |
| `backstage/plugins/scaffolder-backend-module-git-commit/` | **Plugin nuevo**: acciones `git:pull:commit` y `http:wait` |
| `k8s/entorno.yaml` | **Fuente única** de los manifiestos del entorno |
| `k8s/backstage-rbac.yaml` | ServiceAccount + permisos con los que Backstage crea entornos |
| `kind/kind-config.yaml` | Clúster de un nodo, puerto 8080 del Mac → 80 del ingress |
| `scripts/setup-kind.sh` | Crea el clúster, instala ingress-nginx y el RBAC; imprime URL+token |
| `scripts/deploy-env.sh` | Levanta un entorno sin Backstage (mismo manifiesto, misma validación) |
| `scripts/destroy-env.sh` / `list-envs.sh` | Borrar / listar entornos |
| `scripts/sync-template.sh` | Copia `k8s/entorno.yaml` dentro de `template.yaml` |
| `scripts/sync-clients.sh` | Genera `catalog/clientes.yaml` (clientes del dropdown) desde el repo |
| `catalog/clientes.yaml` | Entidades `Resource` tipo `cliente` (generado) |
| `backstage/` | Fragmento de `app-config` y cómo instalar las acciones |

`k8s/entorno.yaml` usa los mismos placeholders que Backstage
(`${{ parameters.clientId | lower }}`, `${{ steps['pull-commit'].output.commit }}`, …).
Si lo modificas, ejecuta `./scripts/sync-template.sh` para que el template
quede igual.

## 1. Preparar el clúster (una vez)

Requisitos: Docker Desktop, `kind`, `kubectl`, `git`, `perl`.

```bash
cd golden-path/entorno-cliente
chmod +x scripts/*.sh
./scripts/setup-kind.sh
```

Al final imprime `K8S_KIND_URL` y `K8S_KIND_TOKEN` para Backstage.
`kind create cluster` deja `kind-golden-path` como contexto actual de
kubectl; los scripts siempre usan `--context kind-golden-path`.

## 2. Probar sin Backstage

`deploy-env.sh` hace lo mismo que el plugin con `git` (resolver SHA,
validar cliente) y aplica el mismo manifiesto. El repo por defecto es el del
Portal de Plugins.

```bash
./scripts/deploy-env.sh BA-004821 4ea9ecb
./scripts/deploy-env.sh NX-11029 a4763ee          # en paralelo, otro cliente/commit
# otro repo / repo privado:
GIT_TOKEN=ghp_xxx ./scripts/deploy-env.sh BA-004821 4ea9ecb https://github.com/<usuario>/<repo>.git
```

Abre `http://env-ba-004821-4ea9ecb.localtest.me:8080` e inicia sesión con
`m.restrepo@bancoandino.com` / `Andino#2026`.

## 3. Usarlo desde Backstage

1. Instala el plugin (`git:pull:commit` + `http:wait`) y la acción `kube:apply` →
   `backstage/backend-index.patch.md`.
2. Copia `backstage/app-config.kubernetes.yaml` a tu `app-config.local.yaml`,
   exporta `K8S_KIND_URL` y `K8S_KIND_TOKEN` y arranca Backstage (`yarn start`).
3. Registra `entorno-cliente/template.yaml` y `entorno-cliente/catalog/clientes.yaml`
   (locations en el app-config, ver `backstage/app-config.kubernetes.yaml`).
4. **Create → Entorno del Portal de Plugins (clientId + commit)** y llena el
   formulario. La tarea no termina hasta que el portal responde (paso
   `http:wait`, normalmente 15-60 s); al final muestra el link
   **Iniciar sesión en el portal** → `http://env-<clientid>-<sha7>.localtest.me:8080/login`.

`http:wait` consulta esa URL desde el backend de Backstage, así que Backstage
debe correr en el mismo Mac que kind (`yarn start`).

Para repos privados, el plugin usa el token de `integrations.github`; el
pod necesita además el secret en el namespace del entorno (lo toma en su
siguiente reintento):
`kubectl -n env-<clientid>-<sha7> create secret generic git-credentials --from-literal=token=...`

## Diagnóstico

Si `yarn start` de Backstage falla con `IPC request 'DevDataStore.load' ... timed out`,
arranca backend y frontend por separado (en dos terminales):

```bash
yarn workspace backend start   # :7007
yarn workspace app start       # :3000
```

```bash
./scripts/list-envs.sh
kubectl --context kind-golden-path -n env-ba-004821-4ea9ecb get pods
kubectl --context kind-golden-path -n env-ba-004821-4ea9ecb logs deploy/portal -c fetch
kubectl --context kind-golden-path -n env-ba-004821-4ea9ecb logs deploy/portal -c build-backend
kubectl --context kind-golden-path -n env-ba-004821-4ea9ecb logs deploy/portal -c build-frontend
kubectl --context kind-golden-path -n env-ba-004821-4ea9ecb logs deploy/portal -c backend
```

- `404` de nginx en el navegador: el host no coincide; revisa `kubectl get ingress -A`.
- El frontend se construye con la URL pública del entorno como base de la
  API, así que hay que entrar por el host `*.localtest.me:8080` (un
  `port-forward` a otro puerto chocaría con CORS).

## Límites conocidos (laboratorio)

- `skipTLSVerify`, token de ServiceAccount de larga duración y `JWT_SECRET`
  fijo en el manifiesto: solo para local.
- El puerto `8080` está fijo en `PUBLIC_URL` (coincide con `kind-config.yaml`).
- ingress-nginx dejó de mantenerse en 2026; sirve para kind local. Para algo
  más duradero, migrar el Ingress a Gateway API.
