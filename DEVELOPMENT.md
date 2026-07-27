# Release

The four npm packages (`event-modeling-cli`, `event-modeling-language`,
`event-modeling-layout`, `event-modeling-layout-headless`) are released together
via changesets and published from CI on a `v*` tag. Do **not** bump their
versions by hand — see [RELEASING.md](./RELEASING.md).

```sh
pnpm changeset            # describe a change
pnpm run version-packages # bump all four + changelogs
```

The VS Code extension and Obsidian plugin are `private` and ship through their
own marketplaces, so they keep their manual flow:

Write VS Code Extension [changelog](packages/vscode-extension/CHANGELOG.md)

Update notable features in both [Obsidian plugin](packages/obsidian-plugin/README.md) and [VS Code extension](packages/vscode-extension/README.md).

# Testing

```sh
pnpm run build && pnpm run test
node scripts/verify-packages.mjs   # publish preflight, packs each package for real
```

`packages/layout-headless` asserts rendered SVG against committed snapshots in
`test/svg_snapshots/`. When a rendering change is intended:

```sh
pnpm --filter event-modeling-layout-headless run snapshots:update
```

It reports a per-model byte delta. **Read the resulting git diff before
committing** — those snapshots are the only guard on the SVG output, so
refreshing them blindly defeats the test.

# Git

Commit notes are being used to track AI co-author.

Fetch them regularly.
```
git fetch origin refs/notes/commits:refs/notes/commits
```

Don't forget to push them after standard push.
```
git push origin refs/notes/commits
```
