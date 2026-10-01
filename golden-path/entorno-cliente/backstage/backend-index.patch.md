# Habilitar `git:pull:commit`, `http:wait` y `kube:apply` en el backend de Backstage

El template usa tres acciones que no vienen con Backstage:

| Acción | Paquete |
|---|---|
| `git:pull:commit`, `http:wait` | plugin propio de este repo: `plugins/scaffolder-backend-module-git-commit` |
| `kube:apply` | `@devangelista/backstage-scaffolder-kubernetes` (npm) |

## 1. Plugin propio (`git:pull:commit` + `http:wait`)

En la raíz de tu app Backstage (la que tiene `plugins/*` en `workspaces`):

```bash
cp -R <este-repo>/golden-path/entorno-cliente/backstage/plugins/scaffolder-backend-module-git-commit plugins/
yarn install
yarn --cwd packages/backend add @internal/backstage-plugin-scaffolder-backend-module-git-commit@workspace:^
```

Requiere `git` (≥ 2.31) en el PATH de la máquina donde corre el backend.
Para repos privados de GitHub usa el token de `integrations.github` del
app-config (o el input `token` del paso).

## 2. Acción `kube:apply`

```bash
yarn --cwd packages/backend add @devangelista/backstage-scaffolder-kubernetes
```

## 3. Registrar ambos en `packages/backend/src/index.ts`

Junto a los demás `backend.add(...)` del scaffolder:

```ts
// git:pull:commit (commit exacto) + http:wait (esperar a que el entorno responda)
backend.add(import('@internal/backstage-plugin-scaffolder-backend-module-git-commit'));
// kube:apply / kube:delete / kube:job:wait
backend.add(import('@devangelista/backstage-scaffolder-kubernetes'));
```

Reinicia (`yarn start`) y verifica que `git:pull:commit`, `http:wait` y `kube:apply`
aparecen en `http://localhost:3000/create/actions`.

`kube:apply` usa los clusters de la sección `kubernetes:` del app-config
(ver `app-config.kubernetes.yaml`); `clusterName: kind-golden-path` en el
template debe coincidir con el `name` del cluster allí. Hace
create-or-patch, así que relanzar el template con el mismo cliente+commit
actualiza el entorno en vez de fallar.
