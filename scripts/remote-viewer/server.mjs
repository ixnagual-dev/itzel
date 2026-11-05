// Private, app-only Itzel viewer. Never forwards CDP methods from a browser.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import WebSocket, { WebSocketServer } from 'ws';
import { authorized, allowedOrigin, inputCommand, selectItzelPage } from './policy.mjs';

const port = Number(process.env.ITZEL_VIEWER_PORT || 8789);
const cdpPort = Number(process.env.XDT_CDP_PORT || 9238);
const publicOrigin = process.env.ITZEL_VIEWER_ORIGIN;
const allowedLogin = process.env.ITZEL_ALLOWED_LOGIN;
if (!publicOrigin || !allowedLogin || new URL(publicOrigin).protocol !== 'https:') {
  throw new Error('Set ITZEL_VIEWER_ORIGIN (HTTPS) and ITZEL_ALLOWED_LOGIN.');
}
let target, connecting = false, lastFrame, lastFrameAt = 0, capturing = false, sequence = 0;
const pending = new Map();
const viewers = new Set();
const ready = () => target?.readyState === WebSocket.OPEN;
function send(method, params = {}) {
  if (!ready()) return Promise.reject(new Error('Itzel is starting'));
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('App request timed out')); }, 8000);
    pending.set(id, { resolve, reject, timeout });
    target.send(JSON.stringify({ id, method, params }));
  });
}
function broadcast(message) {
  const data = JSON.stringify(message);
  for (const socket of viewers) if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 1024 * 1024) socket.send(data);
}
async function connect() {
  if (ready() || connecting) return;
  connecting = true;
  try {
    const response = await fetch(`http://127.0.0.1:${cdpPort}/json/list`, { signal: AbortSignal.timeout(2000) });
    const pages = await response.json();
    const page = selectItzelPage(pages);
    if (!page || !/^ws:\/\/127\.0\.0\.1:\d+\/devtools\/page\/[A-Za-z0-9-]+$/.test(page.webSocketDebuggerUrl)) return;
    target = new WebSocket(page.webSocketDebuggerUrl);
    target.on('error', () => {});
    target.on('close', () => {
      lastFrame = undefined;
      for (const entry of pending.values()) { clearTimeout(entry.timeout); entry.reject(new Error('Itzel restarted')); }
      pending.clear();
      broadcast({ type: 'status', text: 'Itzel is restarting…' });
    });
    target.on('message', raw => {
      const event = JSON.parse(raw.toString());
      if (event.id) {
        const entry = pending.get(event.id);
        if (entry) { pending.delete(event.id); clearTimeout(entry.timeout); event.error ? entry.reject(new Error(event.error.message)) : entry.resolve(event.result); }
      } else if (event.method === 'Page.screencastFrame') {
        const { data, metadata, sessionId } = event.params;
        lastFrame = { type: 'frame', data, width: metadata.deviceWidth, height: metadata.deviceHeight };
        lastFrameAt = Date.now();
        broadcast(lastFrame);
        void send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      }
    });
    await new Promise((resolve, reject) => { target.once('open', resolve); target.once('error', reject); });
    await send('Page.enable');
    await send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 1600, maxHeight: 1000, everyNthFrame: 1 });
    broadcast({ type: 'status', text: 'Connected to Itzel' });
    console.log('Itzel viewer connected to the app.');
  } catch {} finally { connecting = false; }
}

const files = { '/': ['index.html', 'text/html'], '/viewer.js': ['viewer.js', 'text/javascript'], '/viewer.css': ['viewer.css', 'text/css'] };
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  if (request.url === '/health' && request.method === 'GET' && request.headers.host === `127.0.0.1:${port}` &&
      ['127.0.0.1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress)) {
    response.writeHead(ready() ? 200 : 503, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ appConnected: ready(), viewers: viewers.size })); return;
  }
  if (!authorized(request, allowedLogin, publicOrigin)) { response.writeHead(403); response.end('Use your own Tailscale account to open Itzel.'); return; }
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  if (request.url === '/health') { response.writeHead(ready() ? 200 : 503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ appConnected: ready(), viewers: viewers.size })); return; }
  const file = files[request.url];
  if (!file) { response.writeHead(404); response.end(); return; }
  try { response.writeHead(200, { 'Content-Type': file[1] }); response.end(await readFile(new URL(file[0], import.meta.url))); }
  catch { response.destroy(); }
});
const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 32768 });
server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/view' || !authorized(request, allowedLogin, publicOrigin) ||
      !allowedOrigin(request.headers.origin, publicOrigin, port)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
  }
  websocketServer.handleUpgrade(request, socket, head, ws => websocketServer.emit('connection', ws));
});
websocketServer.on('connection', socket => {
  viewers.add(socket);
  socket.send(JSON.stringify({ type: 'status', text: ready() ? 'Connected to Itzel' : 'Waiting for Itzel to start…' }));
  if (lastFrame) socket.send(JSON.stringify(lastFrame));
  let count = 0, windowStart = Date.now();
  socket.on('message', raw => {
    if (Date.now() - windowStart > 1000) { windowStart = Date.now(); count = 0; }
    if (++count > 150) { socket.close(1008, 'Too many inputs'); return; }
    try {
      const [method, params] = inputCommand(JSON.parse(raw.toString()));
      void send(method, params).catch(() => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: 'status', text: 'Waiting for Itzel…' })));
    } catch { socket.close(1008, 'Unsupported input'); }
  });
  socket.on('close', () => viewers.delete(socket));
  socket.on('error', () => viewers.delete(socket));
});
setInterval(() => {
  void connect();
  if (!ready() || !viewers.size || capturing || Date.now() - lastFrameAt < 2000) return;
  capturing = true;
  void Promise.all([send('Page.captureScreenshot', { format: 'jpeg', quality: 75 }), send('Page.getLayoutMetrics')]).then(([result, metrics]) => {
    const viewport = metrics.cssLayoutViewport ?? metrics.layoutViewport;
    lastFrame = { type: 'frame', data: result.data, width: viewport.clientWidth, height: viewport.clientHeight };
    lastFrameAt = Date.now(); broadcast(lastFrame);
  }).catch(() => {}).finally(() => { capturing = false; });
}, 1500).unref();
server.listen(port, '127.0.0.1', () => { console.log(`Itzel viewer listening on 127.0.0.1:${port}`); void connect(); });
