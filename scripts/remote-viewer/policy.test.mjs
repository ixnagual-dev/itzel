// Protects the new remote-control boundary. Existing desktop tests do not cover
// this independent HTTP/WS process. Minimal regressions: another tailnet identity,
// a cross-site WebSocket, or a browser-supplied arbitrary CDP method. Tier: unit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorized, allowedOrigin, inputCommand, selectItzelPage } from './policy.mjs';
const origin = 'https://host.example.ts.net:8443';
const request = (login, host = 'host.example.ts.net:8443', ip = '127.0.0.1') => ({ headers: { host, 'tailscale-user-login': login }, socket: { remoteAddress: ip } });
test('only the configured Tailscale owner is accepted, including when Serve rewrites Host', () => {
  assert.equal(authorized(request('owner@example.com'), 'owner@example.com', origin), true);
  for (const candidate of [request('other@example.com'), request(undefined), request('owner@example.com', 'evil.example'), request('owner@example.com', 'host.example.ts.net:8443', '192.168.1.10')]) {
    assert.equal(authorized(candidate, 'owner@example.com', origin), false);
  }
  assert.equal(authorized(request(undefined, '127.0.0.1:8789'), 'owner@example.com', origin), false);
  assert.equal(authorized(request('owner@example.com', '127.0.0.1:8789'), 'owner@example.com', origin), true);
});
test('cross-site control connections are rejected', () => {
  assert.equal(allowedOrigin(origin, origin, 8789), true);
  assert.equal(allowedOrigin('https://evil.example', origin, 8789), false);
  assert.equal(allowedOrigin(undefined, origin, 8789), false);
});
test('streams the real main window instead of prewarmed auxiliary windows with the same title', () => {
  const auxiliary = { type: 'page', title: 'Itzel', url: 'http://localhost:5174/?resourceUsageWindow=1#/resource-usage-window' };
  const main = { type: 'page', title: 'Itzel', url: 'http://localhost:5174/#/cc-agent/new' };
  assert.equal(selectItzelPage([auxiliary, main]), main);
  assert.equal(selectItzelPage([auxiliary, { ...main, url: 'https://evil.example/' }]), undefined);
});
test('human inputs map to fixed CDP commands and discard caller methods or extra parameters', () => {
  assert.deepEqual(inputCommand({ type: 'text', text: 'Hello', method: 'Runtime.evaluate', expression: 'bad' }), ['Input.insertText', { text: 'Hello' }]);
  assert.deepEqual(inputCommand({ type: 'key', action: 'keyDown', key: 'Enter', code: 'Enter', keyCode: 13, modifiers: 0 }), ['Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 0 }]);
  for (const candidate of [{ method: 'Runtime.evaluate' }, { type: 'text', text: 'a'.repeat(10001) }, { type: 'pointer', action: 'mousePressed', x: -1, y: 1, button: 'left', buttons: 1 }, { type: 'key', action: 'keyDown', key: 'a', code: 'KeyA', keyCode: 65, modifiers: 99 }]) {
    assert.throws(() => inputCommand(candidate));
  }
});
test('pointer events reach controls beyond the virtual display on larger native windows', () => {
  assert.deepEqual(inputCommand({ type: 'pointer', action: 'mousePressed', x: 2200, y: 1400, button: 'left', buttons: 1 }),
    ['Input.dispatchMouseEvent', { type: 'mousePressed', x: 2200, y: 1400, button: 'left', buttons: 1, clickCount: 1 }]);
});
