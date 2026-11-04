#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export DISPLAY=:96
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"
unset WAYLAND_DISPLAY
export XDG_SESSION_TYPE=x11
export ELECTRON_OZONE_PLATFORM_HINT=x11
export ITZEL_SOFTWARE_RENDERING=1
export XDT_CDP_PORT=9238
Xvfb :96 -screen 0 1280x900x24 -nolisten tcp &
itzel_display_pid=$!
trap 'kill "$itzel_display_pid" 2>/dev/null || true' EXIT
for attempt in {1..50}; do
  [[ -S /tmp/.X11-unix/X96 ]] && break
  sleep 0.1
done
npm start &
itzel_launcher_pid=$!
wait "$itzel_launcher_pid"
# The safe wrapper can return after readiness while Forge/Electron continue.
# A failed app is restarted by the service together with its private display.
itzel_failed_probes=0
while kill -0 "$itzel_display_pid" 2>/dev/null; do
  if curl -fsS --max-time 3 http://127.0.0.1:9238/json/version >/dev/null; then
    itzel_failed_probes=0
  else
    itzel_failed_probes=$((itzel_failed_probes + 1))
    (( itzel_failed_probes < 12 )) || exit 1
  fi
  sleep 5
done
exit 1
