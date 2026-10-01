# scaffolder-backend-module-git-commit

Módulo de scaffolder de Backstage que agrega la acción **`git:pull:commit`**:
trae un repositorio git al workspace del scaffolder en un **commit exacto**
(HEAD desacoplado), resuelve el SHA completo y verifica que ese commit
contenga lo que el template necesita. Si algo no cuadra, el template falla
en este paso, antes de crear nada.

## Inputs

| Input | Obligatorio | Descripción |
|---|---|---|
| `repoUrl` | sí | URL `https://` del repositorio |
| `commit` | sí | SHA de 7 a 40 caracteres hex. Ramas y tags se rechazan: el resultado debe ser reproducible |
| `targetPath` | no | Carpeta dentro del workspace (default `source`) |
| `token` | no | Token para repos privados. Si se omite y el repo es de GitHub, se usa `integrations.github` del app-config |
| `requiredPaths` | no | Rutas que deben existir en el commit |
| `expectContent` | no | Lista de `{ path, contains }`: el texto debe aparecer en ese archivo o carpeta (recursivo) |

## Outputs

`commit` (SHA completo), `shortCommit`, `author`, `date`, `message`, `path`.

## Cómo trae el commit

- **SHA completo**: `git fetch --depth 1 origin <sha>`, solo ese commit
  (GitHub lo permite). Si el servidor no lo acepta, cae al caso siguiente.
- **SHA abreviado**: trae el historial sin blobs (`--filter=blob:none`) y lo
  resuelve con `git rev-parse`. Falla si no existe o si es ambiguo.
- El token viaja como cabecera HTTP (`http.extraHeader` por variables de
  entorno): no aparece en la URL, en los logs ni en `.git/config`.

## Ejemplo

```yaml
steps:
  - id: pull-commit
    action: git:pull:commit
    input:
      repoUrl: ${{ parameters.repoUrl }}
      commit: ${{ parameters.gitCommit }}
      requiredPaths: [backend/package.json, frontend/package.json]
      expectContent:
        - path: backend/src/config/clients
          contains: ${{ parameters.clientId }}

  - id: siguiente
    action: debug:log
    input:
      message: "SHA resuelto: ${{ steps['pull-commit'].output.commit }}"
```

## Acción `http:wait`

El mismo módulo agrega `http:wait`: consulta una URL hasta que responde con
el estado esperado y, opcionalmente, contiene un texto. El template del
entorno la usa para terminar solo cuando el portal ya abre en el navegador.

| Input | Default | Descripción |
|---|---|---|
| `url` | — | URL a consultar |
| `expectStatus` | `200` | Código HTTP esperado |
| `expectContains` | — | Texto que debe aparecer en el cuerpo |
| `timeoutSeconds` | `600` | Tiempo máximo de espera |
| `intervalSeconds` | `5` | Pausa entre intentos |

Outputs: `url`, `elapsedSeconds`.

## Instalación

Ver `../../backend-index.patch.md`.

## Pruebas

```bash
yarn --cwd plugins/scaffolder-backend-module-git-commit test
```

`src/git.test.ts` crea un repo local con dos commits y prueba SHA completo,
SHA abreviado, commit inexistente y rechazo de ramas.
