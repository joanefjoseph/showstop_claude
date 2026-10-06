import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { demoConfig } from '../config.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../../public');
/** Only the headers the bridge routes actually use are forwarded. */
const FORWARD_REQUEST_HEADERS = ['content-type', 'x-membership-id', 'idempotency-key', 'x-request-id'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'x-request-id', 'cache-control'];
const app = express();
app.disable('x-powered-by');
/** Lets the page show the real bridge URL (used for "Copy as curl"). */
app.get('/console-config', (_req, res) => {
  res.json({ bridgeUrl: demoConfig.bridgeUrl });
});
/**
 * Same-origin proxy: /bridge/<path> -> BRIDGE_URL/<path>
 * The body is forwarded as raw bytes so malformed JSON can also be tested.
 */
app.use('/bridge', express.raw({ type: () => true, limit: '64kb' }), async (req, res) => {
  const target = `${demoConfig.bridgeUrl}${req.url}`;
  const headers: Record<string, string> = {};
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.header(name);
    if (value) headers[name] = value;
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
    });
    res.status(upstream.status);
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.status(502).json({
      error: {
        code: 'BRIDGE_UNREACHABLE',
        message: `Could not reach the bridge at ${demoConfig.bridgeUrl}. Is it running?`,
        details: { cause: (err as Error).message },
      },
    });
  }
});
app.use(express.static(publicDir));
app.listen(demoConfig.consolePort, () => {
  console.log(`API console -> http://localhost:${demoConfig.consolePort}  (proxying to ${demoConfig.bridgeUrl})`);
});