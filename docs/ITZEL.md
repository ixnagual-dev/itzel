# Itzel

Itzel is an independent, local desktop fork of [Cindy](https://github.com/makecindy/cindy).
The owner selected an obsidian and jade identity on 2026-11-04.

## Distribution decisions

- Local mode opens automatically using the existing account-free owner boundary.
- Itzel has independent application IDs, data directories, and deep links. It does not
  import, migrate, or claim Cindy profiles or register Cindy's legacy links.
- Cindy application updates are disabled at startup, check, and apply boundaries.
  Update Itzel by rebuilding this checkout. No upstream release is published by this work.
- Claude Code, Codex, and Pi come from the user's PATH. Missing or unsupported CLIs produce
  an actionable error; Itzel does not silently install or replace the user's CLI.
- Existing internal package names, IPC contracts, plugin extensions, database schema,
  and provider identities remain compatible. They are implementation identifiers.
- The new Itzel theme family is the default. Original themes remain available.
- Original license, NOTICE, and third-party attributions remain applicable.

The fork changes display branding, desktop assets, distribution identity, local
startup, CLI selection, and update policy. Modified files carry notices; see the
working diff for the complete change set.

## Artwork

The canonical mark is a geometric jade aperture with a central obsidian opening.
Editable SVG sources and reproducible icon exports live in `branding/`.
Core artwork is vector based, so it remains legible at tray and launcher sizes.
No Cindy character artwork is used for the Itzel brand.

## Development

Use the pnpm version in package.json. Install Git LFS and run `git lfs pull` before
starting Electron; source checkouts contain LFS pointers for some runtime assets.

```sh
pnpm install --frozen-lockfile
npm start
```

The development launcher uses an isolated Itzel profile. Model requests still go
to the provider selected by the user; local operation does not make remote models
offline models. Cloud account features from upstream are unavailable in local mode.

## Upstream maintenance

`upstream` points to makecindy/cindy. Keep protocol changes separate from branding
when incorporating upstream fixes. Build and test before updating a user installation.
