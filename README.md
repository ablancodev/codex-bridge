# codex-bridge

> Habla con Codex CLI desde tu app web. Usa tu **suscripción de ChatGPT** (login vía `codex login`), no la API de OpenAI. **Cero coste por token.**

Como si llamaras a la API de OpenAI, pero apuntando a tu Codex local:

```js
const { runCodex } = require('codex-bridge');

const { answer, sessionId } = await runCodex({ prompt: 'Hola' });
const { answer: a2 }        = await runCodex({ prompt: 'Y qué te pregunté?', sessionId });
```

- ✅ Multi-turno (session id gestionada automáticamente)
- ✅ MCPs por proyecto (subset del catálogo que tú definas)
- ✅ Cero dependencias · Framework-agnóstico
- ✅ Node ≥ 18 · Requiere `codex` en el PATH y autenticado (`codex login`)

---

## Instalación

```bash
npm i github:ablancodev/codex-bridge
```

## Ejemplo listo para arrancar

En [`examples/web-ui/`](./examples/web-ui) tienes una app web mínima (chat en el navegador, multi-turno, selector de MCPs).

```bash
git clone https://github.com/ablancodev/codex-bridge
cd codex-bridge/examples/web-ui
npm install
npm start
# http://localhost:5173
```

Cópialo como plantilla para tus propias apps: sólo cambias `index.html` (tu UI) y `MCP_CATALOG` en `server.js`.

---

## API

### `runCodex(options) → Promise<{ answer, sessionId }>`

| opción             | tipo               | default         | descripción |
| ------------------ | ------------------ | --------------- | ----------- |
| `prompt`           | string             | —               | Requerido. |
| `sessionId`        | string \| null     | `null`          | Si se pasa, reusa la conversación (`codex exec resume`). |
| `mcps`             | string[]           | `[]`            | Nombres a habilitar (subset de `mcpCatalog`). Sólo aplica al **primer turno**. |
| `mcpCatalog`       | object             | `{}`            | `{ nombre: { command, args, env? } }`. |
| `cwd`              | string             | `process.cwd()` | Directorio de trabajo del agente. |
| `sandbox`          | string             | `'read-only'`   | `read-only` \| `workspace-write` \| `danger-full-access`. |
| `ignoreUserConfig` | boolean            | `true`          | Si `true`, ignora `~/.codex/config.toml` (evita cargar todos tus MCPs globales). |
| `codexBin`         | string             | `'codex'`       | Ruta al binario si no está en PATH. |
| `extraArgs`        | string[]           | `[]`            | Flags extra al final. |

### `createHandler({ mcpCatalog?, basePath?, runOptions? }) → (req, res) => boolean`

Handler HTTP framework-agnóstico. Devuelve `true` si atendió, `false` si no (para que sigas enrutando tú).

Rutas expuestas:

- `GET  <basePath>/mcps` → `{ available: string[] }`
- `POST <basePath>/ask`  → body `{ prompt, sessionId?, mcps? }` → `{ answer, sessionId }`

```js
const http = require('http');
const { createHandler } = require('codex-bridge');

const codex = createHandler({
  basePath: '/api',
  mcpCatalog: {
    filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', process.env.HOME] },
    fetch:      { command: 'uvx', args: ['mcp-server-fetch'] },
  },
});

http.createServer((req, res) => {
  if (codex(req, res)) return;
  // ...tus rutas / estáticos aquí...
  res.writeHead(404); res.end();
}).listen(5173);
```

Desde el frontend:

```js
const r = await fetch('/api/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'hola', mcps: ['fetch'] }),
});
const { answer, sessionId } = await r.json();

// siguiente turno
await fetch('/api/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'sigue…', sessionId }),
});
```

---

## Notas

- **Primer turno** tarda unos segundos (arranque del agente + carga de MCPs). Los siguientes son más rápidos.
- Los MCPs se congelan al abrir la sesión. Para cambiarlos, empieza una conversación nueva (`sessionId = null`).
- Por defecto `sandbox: 'read-only'`. Si necesitas que el agente escriba en disco, sube a `workspace-write` (con cuidado).
- El login es el de `codex` — mismo binario, misma cuenta ChatGPT. No hay claves de API en juego.

## Licencia

MIT
