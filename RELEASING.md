# Releasing

Four packages are published to **public npmjs.com**, unscoped, always at the
same version:

| package | role | consumed as |
| --- | --- | --- |
| `event-modeling-cli` | the `evml` binary | `npm i -g event-modeling-cli` |
| `event-modeling-language` | DSL parser / AST | library |
| `event-modeling-layout` | layout engine | transitive dependency |
| `event-modeling-layout-headless` | Node renderer | transitive dependency |

`event-modeling-cli` runtime-depends on `event-modeling-layout-headless`, which
depends on `event-modeling-layout` — so all four must be on the registry for
`npm i -g event-modeling-cli` to resolve. `pnpm publish` rewrites the
`workspace:*` specifiers to the concrete version at pack time.

`event-modeling-vscode-extension` and `event-modeling-obsidian-plugin` are
`private: true` and ship through their own marketplaces. They are never
published to npm.

## One-time setup

1. Create an **automation** access token on npmjs.com (Access Tokens →
   Generate New Token → Granular / Automation). It must have publish rights for
   the four package names.
2. Add it to the GitHub repository as the secret **`NPM_TOKEN`**
   (Settings → Secrets and variables → Actions).

Nothing else is needed — publishing runs entirely in CI and never uses a
developer's local npm credentials.

## Cutting a release

```sh
# 1. describe the change (once per meaningful change, on the feature branch)
pnpm changeset

# 2. on main, apply the pending changesets
pnpm run version-packages     # bumps all four + writes CHANGELOG.md entries
git add -A
git commit -m "chore(release): vX.Y.Z"

# 3. tag and push — CI does the rest
git tag vX.Y.Z
git push origin main --follow-tags
```

The `Release` workflow triggers on the `v*` tag and will:

1. install, build clean, run tests
2. run `scripts/verify-packages.mjs` — packs each package for real and asserts
   the tarball is self-contained
3. run `scripts/verify-release-tag.mjs` — refuses to publish if the tag does not
   match the version in every manifest
4. `pnpm -r publish --access public --provenance`

`workflow_dispatch` on the same workflow runs everything except the publish
step, which is a useful dry run.

## Versioning policy

All four packages are a **fixed** changesets group (`.changeset/config.json`),
so their versions move together. Consumers can pin `^1.0.0` on both the CLI and
the language package and never see a skew.

Bump levels, from the consumer's point of view:

- **major** — the `evml` binary is renamed, or the `svg` / `drawio` subcommand
  surface changes incompatibly (arguments, exit codes, output location), or an
  exported language API breaks.
- **minor** — a new subcommand, a new option, a new exported API.
- **patch** — a bug fix with no surface change.

The first public release is **1.0.0**, not `0.x`, deliberately: a caret range on
a `0.x` version (`^0.1.0`) only admits patch releases, which would defeat
consumers pinning with a caret.

## Public CLI surface

Treated as API and covered by the policy above:

```
evml svg <file> [-d <dir>]
evml drawio <file> [-d <dir>]
evml --version
evml --help
```

- exit code `0` on success, non-zero on any failure
- all diagnostics on stderr, success message on stdout
- the destination directory is created if it does not exist

## Local verification

```sh
pnpm run build
pnpm run test
node scripts/verify-packages.mjs
```

`verify-packages.mjs` is the guard that catches the mistakes that are otherwise
invisible until a consumer installs: a published package depending on a private
one, a `files` allowlist that drops `out/`, a stray `postinstall`, an
unresolved `workspace:` specifier, or versions drifting out of lockstep.
