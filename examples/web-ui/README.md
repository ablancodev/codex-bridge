# Ejemplo · web-ui

Chat multi-turno en el navegador sobre `codex-local-server`.

## Arrancar

```bash
cd examples/web-ui
npm install
npm start
# abre http://localhost:5173
```

## Qué mirar

- **`server.js`** (20 líneas): crea el handler y sirve `index.html`. Aquí defines `MCP_CATALOG`.
- **`index.html`**: UI vanilla. Todo el contrato con el backend son dos endpoints:
  - `GET /mcps` → lista de MCPs disponibles.
  - `POST /ask` con `{prompt, sessionId?, mcps?}` → `{answer, sessionId}`.
- Cambia la UI por lo que quieras — sólo respeta esos dos endpoints.
