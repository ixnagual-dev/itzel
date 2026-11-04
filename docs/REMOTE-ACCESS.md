# Private browser access to Itzel

Itzel is an Electron application. Its development web server alone cannot run the
desktop interface because the app depends on Electron's local IPC services.

The remote viewer streams only the Itzel renderer and forwards a fixed set of
mouse, keyboard, scroll, and text-insertion events. It never accepts arbitrary
DevTools commands, JavaScript, file paths, or IPC calls from the browser.

## Deployment

Run `scripts/remote-viewer/start-desktop.sh` as a user service. It starts a dedicated
1280×900 Xvfb display and the existing safe `npm start` launcher, with software
rendering enabled. The local profile and installed CLI integrations remain in use.
Use a separate user service for `node scripts/remote-viewer/server.mjs` with:

```text
ITZEL_VIEWER_PORT=8789
XDT_CDP_PORT=9238
ITZEL_VIEWER_ORIGIN=https://YOUR-TAILSCALE-NAME:8443
ITZEL_ALLOWED_LOGIN=YOUR-TAILSCALE-LOGIN
```

The viewer listens only on `127.0.0.1`. Proxy it privately with:

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:8789
```

This adds a distinct listener and preserves existing Serve routes. Do not expose
the development server or DevTools port, and do not use Tailscale Funnel.
Tailscale Serve supplies the authenticated login header; the viewer restricts it
to the configured account and validates WebSocket origins. Direct loopback probes
are permitted for local health checks.

The work device must be connected to the same tailnet and allowed to reach this
port. Open the HTTPS address in a browser. Click the interface to interact. For
paste or mobile input, focus the desired field inside Itzel, enter text in the
viewer toolbar, and choose **Insert text**; **Enter** sends an Enter key.

This viewer does not implement native file dialogs, file transfer, audio, or
clipboard synchronization. Files and agent commands remain on the host computer.

## Checks and maintenance

```sh
node --test scripts/remote-viewer/policy.test.mjs
systemctl --user status itzel-desktop itzel-viewer
journalctl --user -u itzel-desktop -u itzel-viewer -n 60
curl http://127.0.0.1:8789/health
```

To stop sharing, stop `itzel-viewer.service` and remove only this listener:

```sh
tailscale serve --https=8443 off
```
