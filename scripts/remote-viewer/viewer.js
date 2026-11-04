const frame = document.querySelector('#frame');
const screen = document.querySelector('#screen');
const status = document.querySelector('#status');
let socket, width = 1280, height = 900;
const send = event => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event)); };
function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/view`);
  socket.onmessage = ({ data }) => {
    const event = JSON.parse(data);
    if (event.type === 'status') status.textContent = event.text;
    if (event.type === 'frame') {
      width = event.width; height = event.height;
      frame.src = `data:image/jpeg;base64,${event.data}`;
      status.textContent = 'Connected · click the interface to control';
    }
  };
  socket.onclose = () => { status.textContent = 'Reconnecting…'; setTimeout(connect, 1500); };
  socket.onerror = () => { status.textContent = 'Connection unavailable. Check Tailscale.'; };
}
const button = index => ['left', 'middle', 'right'][index] || 'none';
function pointer(event, action) {
  const rect = frame.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  send({ type: 'pointer', action,
    x: Math.max(0, Math.min(width, (event.clientX - rect.left) / rect.width * width)),
    y: Math.max(0, Math.min(height, (event.clientY - rect.top) / rect.height * height)),
    button: action === 'mouseMoved' || action === 'mouseWheel' ? 'none' : button(event.button),
    buttons: event.buttons ?? 0, deltaX: Math.max(-3000, Math.min(3000, event.deltaX ?? 0)),
    deltaY: Math.max(-3000, Math.min(3000, event.deltaY ?? 0)) });
}
frame.addEventListener('pointerdown', event => { event.preventDefault(); screen.focus(); frame.setPointerCapture(event.pointerId); pointer(event, 'mousePressed'); });
frame.addEventListener('pointerup', event => { event.preventDefault(); pointer(event, 'mouseReleased'); });
let lastMove = 0;
frame.addEventListener('pointermove', event => { if (Date.now() - lastMove > 32) { lastMove = Date.now(); pointer(event, 'mouseMoved'); } });
frame.addEventListener('wheel', event => { event.preventDefault(); pointer(event, 'mouseWheel'); }, { passive: false });
frame.addEventListener('contextmenu', event => event.preventDefault());
function key(event, action) {
  event.preventDefault();
  send({ type: 'key', action, key: event.key, code: event.code,
    keyCode: event.keyCode, modifiers: (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0) });
}
screen.addEventListener('keydown', event => key(event, 'keyDown'));
screen.addEventListener('keyup', event => key(event, 'keyUp'));
document.querySelector('#insert').onclick = () => {
  const input = document.querySelector('#text');
  if (input.value) { send({ type: 'text', text: input.value }); input.value = ''; screen.focus(); }
};
document.querySelector('#enter').onclick = () => {
  for (const action of ['keyDown', 'keyUp']) send({ type: 'key', action, key: 'Enter', code: 'Enter', keyCode: 13, modifiers: 0 });
  screen.focus();
};
document.querySelector('#fit').onclick = () => { const native = screen.classList.toggle('native'); document.querySelector('#fit').textContent = native ? 'Fit screen' : 'Actual size'; };
connect();
