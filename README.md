<!-- Modified for the Itzel distribution, 2026-11-04. -->
<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="branding/itzel-wordmark-dark.svg"><img src="branding/itzel-wordmark-light.svg" width="280" alt="Itzel"></picture></p>

# Itzel

**Your tools. Your space.**

A local desktop workspace for Claude Code, Codex, and Pi. Obsidian surfaces, jade
accents, and an independent identity. Built on [Cindy](https://github.com/makecindy/cindy).

Itzel starts in account-free local mode and uses supported Claude Code and Codex
CLIs already installed on your PATH. Your model provider still handles requests
and billing. Cindy cloud account features are unavailable in this distribution.

## Run locally

Requirements: Node.js >=22.12, Git LFS, and supported Claude Code / Codex CLIs.
The exact pnpm version is selected by the command below; no global pnpm change is needed.

```sh
git clone https://github.com/ixnagual-dev/itzel.git
cd itzel
git lfs pull
npx --yes --package=pnpm@10.33.2 pnpm install --frozen-lockfile
npm start
```

Use Settings → Model Providers to connect an installed CLI subscription or your
own provider. The app has its own data directory and does not migrate Cindy data.
Cindy application updates are disabled; update Itzel from this fork.

## Branding

Editable assets live in [branding/](branding/). Export icons and wordmarks with
`python3 scripts/itzel-branding.py` (requires librsvg and ImageMagick).
Both dark and light variants use semantic theme tokens generated from DTCG sources.

See [Itzel distribution decisions](docs/ITZEL.md) and the
[upstream developer documentation](docs/UPSTREAM-README.md) for architecture and setup.

## License and attribution

Apache-2.0, except separately identified materials. Original copyright and
attribution notices remain in [LICENSE](LICENSE), [NOTICE](NOTICE), and
[third-party notices](docs/legal/notices/). Itzel is an independent fork, with
no claim of endorsement by Cindy or XD Inc.
