const http = require('http');
const fs = require('fs');
const path = require('path');
const { createHandler } = require('@ablancodev/codex-bridge');

const PORT = process.env.PORT || 5173;

// MCPs disponibles para este proyecto. Añade lo que necesites.
// Cada uno se muestra como checkbox en la UI; sólo se activan al abrir sesión.
const MCP_CATALOG = {
  // filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', process.env.HOME] },
  // fetch: { command: 'uvx', args: ['mcp-server-fetch'] },
};

const codex = createHandler({ mcpCatalog: MCP_CATALOG });
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

http.createServer((req, res) => {
  if (codex(req, res)) return;
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(INDEX);
  }
  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log(`example-web-ui on http://localhost:${PORT}`));
