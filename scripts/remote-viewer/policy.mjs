// Itzel remote-viewer trust boundary. Original work, 2026-11-04.
export function authorized(request, allowedLogin, publicOrigin) {
  const host = request.headers.host;
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
  // Serve may retain the public Host or rewrite it to the loopback target.
  // Neither form bypasses the authenticated Tailscale identity check.
  return local && (host === new URL(publicOrigin).host || /^127\.0\.0\.1:\d+$/.test(host ?? '')) &&
    request.headers['tailscale-user-login'] === allowedLogin;
}

export function allowedOrigin(origin, publicOrigin, localPort) {
  return origin === publicOrigin || origin === `http://127.0.0.1:${localPort}`;
}

export function selectItzelPage(pages) {
  return pages.find(page => {
    try {
      const url = new URL(page.url);
      return page.type === 'page' && page.title === 'Itzel' && url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/' && !url.search;
    } catch { return false; }
  });
}

export function inputCommand(event) {
  if (!event || typeof event !== 'object') throw new Error('Invalid input');
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  if (event.type === 'text' && typeof event.text === 'string' && event.text.length <= 10000) {
    return ['Input.insertText', { text: event.text }];
  }
  if (event.type === 'pointer' && ['mousePressed', 'mouseReleased', 'mouseMoved', 'mouseWheel'].includes(event.action) &&
      Number.isFinite(event.x) && event.x >= 0 && event.x <= 1920 &&
      Number.isFinite(event.y) && event.y >= 0 && event.y <= 1200 &&
      ['none', 'left', 'middle', 'right'].includes(event.button) && integer(event.buttons, 0, 7)) {
    const params = { type: event.action, x: event.x, y: event.y, button: event.button, buttons: event.buttons };
    if (event.action === 'mousePressed' || event.action === 'mouseReleased') params.clickCount = 1;
    if (event.action === 'mouseWheel') {
      if (![event.deltaX, event.deltaY].every(n => Number.isFinite(n) && Math.abs(n) <= 3000)) throw new Error('Invalid scroll');
      Object.assign(params, { deltaX: event.deltaX, deltaY: event.deltaY });
    }
    return ['Input.dispatchMouseEvent', params];
  }
  if (event.type === 'key' && ['keyDown', 'keyUp'].includes(event.action) &&
      typeof event.key === 'string' && event.key.length <= 40 &&
      typeof event.code === 'string' && /^[A-Za-z0-9]{0,40}$/.test(event.code) &&
      integer(event.keyCode, 0, 255) && integer(event.modifiers, 0, 15)) {
    const params = { type: event.action, key: event.key, code: event.code,
      windowsVirtualKeyCode: event.keyCode, modifiers: event.modifiers };
    if (event.action === 'keyDown' && event.key.length === 1 && !(event.modifiers & 6)) params.text = event.key;
    return ['Input.dispatchKeyEvent', params];
  }
  throw new Error('Unsupported input');
}
