# Itzel identity

Original artwork for this fork, 2026-11-04. Licensed under Apache-2.0.

The aperture mark suggests an open workspace. Its opposing inner contour works
with both nonzero and evenodd SVG fills and stays legible at small sizes.

- Obsidian: `#101817`
- Jade on dark surfaces: `#79d9b1`
- Jade on light surfaces: `#176c50`
- Wordmark: Inter, 600 weight
- Tagline: **Your tools. Your space.**

The SVG files are editable sources. `scripts/itzel-branding.py` exports the
desktop assets, including PNG, ICO, and ICNS. UI theme values are maintained in
`packages/design-tokens/src/reference/themes.json` and generated through the
existing Terrazzo pipeline. The logo and app icons do not require a GPU model.

Product screenshots belong in `artifacts/` and must come from the real renderer.
