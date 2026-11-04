#!/usr/bin/env python3
"""Itzel artwork and identity exports. Original work for this fork, 2026-11-04."""
from pathlib import Path
import subprocess
import struct

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'branding'
OUT.mkdir(exist_ok=True)
JADE = '#79d9b1'
INK = '#101817'
MARK = 'M12 1.5 22.5 12 12 22.5 1.5 12Z M12 6 6 12 12 18 18 12Z'

def svg(body, width=1024, height=1024, view='0 0 1024 1024'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{view}">{body}</svg>\n'

def write(name, content):
    path = OUT / name
    path.write_text(content)
    return path

def render(source, dest, width, height=None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['rsvg-convert', '-w', str(width), '-h', str(height or width), '-o', str(dest), str(source)], check=True)

mark = write('itzel-mark.svg', svg(f'<path d="{MARK}" fill="{JADE}" fill-rule="evenodd"/>', 24, 24, '0 0 24 24'))
icon = write('itzel-icon.svg', svg(f'<rect x="40" y="40" width="944" height="944" rx="238" fill="{INK}"/><path d="{MARK}" fill="{JADE}" fill-rule="evenodd" transform="translate(188 188) scale(27)"/>'))
hero = write('itzel-hero.svg', svg(f'<circle cx="512" cy="512" r="420" fill="{JADE}" opacity=".045"/><circle cx="512" cy="512" r="325" fill="none" stroke="{JADE}" opacity=".15"/><path d="{MARK}" fill="{JADE}" fill-rule="evenodd" transform="translate(248 248) scale(22)"/>'))

assets = ROOT / 'apps/desktop/src/renderer/assets'
resources = ROOT / 'apps/desktop/resources'
for mode, fg in [('light', INK), ('dark', '#edf7f1')]:
    wordmark = write(f'itzel-wordmark-{mode}.svg', svg(f'<path d="{MARK}" fill="{JADE if mode == "dark" else "#16775b"}" fill-rule="evenodd" transform="translate(2 22) scale(4)"/><text x="123" y="109" font-family="Inter, sans-serif" font-size="108" font-weight="600" letter-spacing="-4" fill="{fg}">Itzel</text>', 423, 145, '0 0 423 145'))
    for name in [f'logo-{mode}.png', f'cindy-logo-{mode}.png']:
        render(wordmark, assets / name, 846, 290)
    logotype = write(f'itzel-logotype-{mode}.svg', svg(f'<text x="0" y="109" font-family="Inter, sans-serif" font-size="108" font-weight="600" letter-spacing="-4" fill="{fg}">Itzel</text>', 300, 145, '0 0 300 145'))
    (assets / f'itzel-logotype-{mode}.svg').write_text(logotype.read_text())
    for scale, suffix in [(1, ''), (2, '@2x')]:
        render(wordmark, assets / 'login' / f'wordmark{"-dark" if mode == "dark" else ""}{suffix}.png', 423*scale, 145*scale)
    slogan = write(f'itzel-slogan-{mode}.svg', svg(f'<text x="8" y="52" font-family="Inter, sans-serif" font-size="38" font-weight="500" letter-spacing="-1" fill="{fg}">Your tools.</text><text x="8" y="104" font-family="Inter, sans-serif" font-size="38" font-weight="500" letter-spacing="-1" fill="{fg}">Your space.</text>', 453, 130, '0 0 453 130'))
    for scale, suffix in [(1, ''), (2, '@2x')]:
        render(slogan, assets / 'login' / f'slogan{"-dark" if mode == "dark" else ""}{suffix}.png', 453*scale, 130*scale)
for name, size in [('icon.png', 512), ('icon-master-1024.png', 1024), ('icon-dock.png', 1024)]:
    render(icon, resources / name, size)
for scale, suffix in [(1, ''), (2, '@2x')]:
    render(hero, assets / 'login' / f'hero{suffix}.png', 934*scale)
(assets / 'login/hero-mask.svg').write_text(svg('<rect width="1024" height="1024" fill="white"/>'))
for state in ['success', 'neutral', 'failure']:
    for scale, suffix in [(1, ''), (2, '@2x'), (3, '@3x')]:
        render(mark, assets / 'login/chibi' / f'chibi-{state}{suffix}.png', 128*scale)
# Replace secondary brand surfaces: share cards, privacy screen, and companion
# previews. Keep existing canvas sizes so their consumers retain layout geometry.
for relative, source in [
    ('head-image-dark.png', icon), ('head-image-light.png', icon),
    ('cindy-avatar-lockup.png', icon), ('cindy-avatar-account.png', icon),
    ('bot-presets/cindy.png', icon), ('agent-island-cindy.png', icon),
    ('cindy-share-character.jpg', hero), ('splash/illustration.webp', hero),
    ('splash/wordmark.png', OUT / 'itzel-wordmark-dark.svg'),
    ('splash/wordmark-light.png', OUT / 'itzel-wordmark-light.svg'),
    ('splash/script.png', OUT / 'itzel-slogan-dark.svg'),
]:
    dest = assets / relative
    if not dest.exists():
        continue
    dims = subprocess.check_output(['identify', '-format', '%w %h', str(dest)], text=True).split()
    width, height = map(int, dims[:2])
    if dest.suffix == '.png':
        render(source, dest, width, height)
    else:
        temporary = OUT / 'secondary.png'
        render(source, temporary, width, height)
        subprocess.run(['magick', str(temporary), str(dest)], check=True)
        temporary.unlink()
subprocess.run(['convert', str(resources / 'icon-master-1024.png'), '-define', 'icon:auto-resize=256,128,64,48,32,16', str(resources / 'icon.ico')], check=True)
# ICNS supports PNG payloads at these standard resolutions.
chunks = []
for code, size in [(b'ic07', 128), (b'ic08', 256), (b'ic09', 512), (b'ic10', 1024)]:
    dest = OUT / f'icon-{size}.png'
    render(icon, dest, size)
    data = dest.read_bytes()
    chunks.append(code + struct.pack('>I', len(data) + 8) + data)
payload = b''.join(chunks)
(resources / 'icon.icns').write_bytes(b'icns' + struct.pack('>I', len(payload) + 8) + payload)
print('Itzel SVG sources and desktop artwork exported.')
