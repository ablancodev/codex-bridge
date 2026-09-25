const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Invoca `codex exec` (nueva sesión) o `codex exec resume` (turno siguiente).
 * Devuelve { answer, sessionId }.
 */
function runCodex({
  prompt,
  sessionId = null,
  mcps = [],
  mcpCatalog = {},
  cwd = process.cwd(),
  sandbox = 'read-only',
  ignoreUserConfig = true,
  codexBin = 'codex',
  extraArgs = [],
} = {}) {
  return new Promise((resolve, reject) => {
    if (!prompt || typeof prompt !== 'string') {
      return reject(new Error('prompt requerido (string)'));
    }
    const outFile = path.join(os.tmpdir(), `codex-${crypto.randomUUID()}.txt`);
    const mcpArgs = buildMcpOverrides(mcps, mcpCatalog);

    const base = [
      '--skip-git-repo-check',
      ...(ignoreUserConfig ? ['--ignore-user-config'] : []),
      ...mcpArgs,
      '-o', outFile,
      ...extraArgs,
    ];
    const args = sessionId
      ? ['exec', 'resume', ...base, sessionId, prompt]
      : ['exec', ...base, '-s', sandbox, '--color', 'never', prompt];

    const child = spawn(codexBin, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      let text = '';
      try { text = fs.readFileSync(outFile, 'utf8'); } catch {}
      try { fs.unlinkSync(outFile); } catch {}
      if (code !== 0 && !text) {
        return reject(new Error(`codex exit ${code}: ${stderr.slice(-500)}`));
      }
      const match = (stdout + stderr).match(/session id:\s*([0-9a-f-]{36})/i);
      resolve({ answer: text.trim(), sessionId: match ? match[1] : sessionId });
    });
  });
}

function buildMcpOverrides(names, catalog) {
  const args = [];
  for (const name of names || []) {
    const spec = catalog[name];
    if (!spec) continue;
    args.push('-c', `mcp_servers.${name}.command=${JSON.stringify(spec.command)}`);
    args.push('-c', `mcp_servers.${name}.args=${JSON.stringify(spec.args || [])}`);
    if (spec.env) {
      args.push('-c', `mcp_servers.${name}.env=${JSON.stringify(spec.env)}`);
    }
  }
  return args;
}

/**
 * Devuelve un handler `(req, res) => boolean` para montar en cualquier server http.
 * Maneja:
 *   GET  <basePath>/mcps  → { available: string[] }
 *   POST <basePath>/ask   → body { prompt, sessionId?, mcps? } → { answer, sessionId }
 * Devuelve true si atendió la petición; false para que el caller siga enrutando.
 */
function createHandler({ mcpCatalog = {}, basePath = '', runOptions = {} } = {}) {
  const prefix = basePath.replace(/\/$/, '');
  return function handler(req, res) {
    const url = req.url.split('?')[0];
    if (!url.startsWith(prefix)) return false;
    const route = url.slice(prefix.length) || '/';

    if (req.method === 'GET' && route === '/mcps') {
      json(res, 200, { available: Object.keys(mcpCatalog) });
      return true;
    }
    if (req.method === 'POST' && route === '/ask') {
      readBody(req).then(async body => {
        try {
          const { prompt, sessionId, mcps } = JSON.parse(body || '{}');
          const result = await runCodex({ prompt, sessionId, mcps, mcpCatalog, ...runOptions });
          json(res, 200, result);
        } catch (e) {
          json(res, 500, { error: String(e.message || e) });
        }
      }).catch(e => json(res, 400, { error: String(e.message || e) }));
      return true;
    }
    return false;
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(new Error('body too large')); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

module.exports = { runCodex, createHandler, buildMcpOverrides };
