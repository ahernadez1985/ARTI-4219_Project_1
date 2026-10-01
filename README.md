# Portal de Plugins — arquitectura desacoplada

Prototipo funcional del portal multi-cliente de plugins: autenticación básica,
carga dinámica de plugins/versiones por cliente, y backend y frontend como
proyectos completamente separados, comunicados solo por HTTP/JSON versionado.

## Estructura

```
portal-plugins-project/
  backend/     API en Node.js + Express (Banco Andino, NexaPay)
  frontend/    SPA en React + Vite que consume esa API
```

Son dos proyectos independientes: cada uno tiene su propio `package.json`,
sus propias dependencias y su propio ciclo de vida (se despliegan, escalan y
versionan por separado). El backend no sirve HTML ni conoce el frontend; el
frontend no contiene lógica de negocio ni datos "quemados" de ningún cliente.

## Autenticación

`POST /api/v1/auth/login` recibe `{ email, password }`, valida contra
usuarios simulados (contraseñas con hash `bcrypt`) y devuelve un JWT firmado
con `{ sub, email, clientId }`. Ese `clientId` es la pieza clave: todo lo
demás en el sistema (qué plugins ve el usuario, qué versión de API le
corresponde) se resuelve a partir de él, nunca de datos que envíe el
frontend.

Usuarios de demo (ver `backend/src/data/users.js`):

| Cliente       | Email                         | Contraseña   |
|---------------|-------------------------------|--------------|
| Banco Andino  | m.restrepo@bancoandino.com    | Andino#2026  |
| NexaPay       | s.lozano@nexapay.io           | Nexa#2026    |

## Cómo se sincronizan las APIs versionadas con el frontend

Este es el punto central de la arquitectura:

1. Al iniciar sesión, el frontend llama a `GET /api/v1/clients/me/plugins`.
   El backend responde con el **manifiesto del cliente**: qué plugins tiene
   habilitados, en qué versión, y la `baseUrl` exacta que debe usar para
   consumir cada uno. Ejemplo para Banco Andino:

   ```json
   {
     "clientId": "BA-004821",
     "plugins": [
       { "key": "transacciones", "version": "2.3", "baseUrl": "/api/plugins/transacciones/v2.3" },
       { "key": "certificados", "version": "1.8", "baseUrl": "/api/plugins/certificados/v1.8" }
     ]
   }
   ```

2. El frontend **nunca hardcodea** `/v2.3` ni `/v3.1` en su código: cada
   página de plugin (`PluginTransaccionesPage`, `PluginCertificadosPage`)
   lee la `baseUrl` de este manifiesto (`AuthContext.getPlugin(key)`) y
   construye la llamada a partir de ahí.

3. Cada endpoint versionado (`backend/src/routes/plugins/*.routes.js`)
   devuelve, además de los datos, metadatos que describen su forma
   (`meta.columns`, `meta.filters`, `meta.languages`, `meta.style`, etc.).
   El frontend usa esos metadatos para renderizarse de forma genérica
   (`DynamicTable`, ramas condicionales por `meta.style`/`meta.preview`), en
   vez de tener una plantilla distinta cableada a mano por cada versión.

4. Cada ruta versionada está protegida por dos middlewares
   (`backend/src/middleware/auth.js`):
   - `requireAuth`: exige un JWT válido.
   - `requirePluginVersion(pluginKey, version)`: exige que el manifiesto del
     cliente autenticado tenga **exactamente esa versión** habilitada.

   Así, si el manifiesto de un cliente cambia de versión (por ejemplo,
   Banco Andino migra de v2.3 a v2.4), el frontend deja de mostrar la ruta
   vieja porque ya no aparece en el manifiesto, y aunque alguien la llamara
   directamente, el backend la rechazaría con `403`. Backend y frontend
   quedan sincronizados por contrato, no por convención.

## Correr el proyecto localmente

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

Con ambos corriendo, abre `http://localhost:5173`, inicia sesión con
cualquiera de los usuarios de demo y navega el panel: los plugins que
aparecen y las pantallas a las que llevan dependen enteramente de lo que el
backend reporte para ese cliente.

## Modo de un solo cliente (`CLIENT_ID`)

Si el backend arranca con la variable `CLIENT_ID` (por ejemplo
`CLIENT_ID=BA-004821`), la instancia atiende solo a ese cliente:

- `POST /api/v1/auth/login` responde `403 client_not_allowed` a usuarios de
  otros clientes (el frontend muestra el mensaje en el login).
- Cualquier token de otro cliente (aunque esté firmado con el mismo
  `JWT_SECRET`) se rechaza con `403` en todas las rutas protegidas.
- `GET /api/v1/health` informa el cliente (`clientId`, o `null` en modo
  multi-cliente).
- Si `CLIENT_ID` no existe en `backend/src/config/clients`, el backend no
  arranca.

Sin la variable, el portal es multi-cliente como siempre. Los entornos
efímeros del Golden Path (`golden-path/entorno-cliente`) la definen con el
cliente elegido en Backstage.

## Qué es real y qué es simulado

- **Real**: autenticación con JWT + bcrypt, autorización por versión de
  plugin, separación completa de proyectos, contrato de API versionado.
- **Simulado (a propósito, para un prototipo)**: los usuarios y las
  transacciones/certificados viven en memoria (`backend/src/data/*.js`), no
  hay base de datos. Migrar esto a una base de datos real implica cambiar
  solo esos archivos de datos — ni las rutas, ni el frontend, ni el esquema
  de autenticación necesitan tocarse.

## Siguientes pasos sugeridos

- Reemplazar los datos en memoria por una base de datos (PostgreSQL, por
  ejemplo) detrás de un repositorio, manteniendo el mismo contrato de
  `meta` + `data`/`types` en cada endpoint versionado.
- Agregar refresh tokens y expiración corta del JWT de acceso.
- Añadir un endpoint de administración para dar de alta clientes y asignar
  versiones de plugin sin tocar código (hoy `backend/src/config/clients.js`
  es estático).
