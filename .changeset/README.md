# Changesets

This folder drives releases for the four published npm packages:

| package | kind |
| --- | --- |
| `event-modeling-cli` | binary (`evml`) |
| `event-modeling-language` | library |
| `event-modeling-layout` | library |
| `event-modeling-layout-headless` | library |

They are declared as a **fixed** group in `config.json`, so all four always
carry the same version number. A consumer that pins `event-modeling-cli@^1.2.0`
and `event-modeling-language@^1.2.0` can never end up with a skewed pair.

`event-modeling-vscode-extension` and `event-modeling-obsidian-plugin` are
`ignore`d — they are `private` and ship through their own marketplaces.

## Adding a changeset

```sh
pnpm changeset
```

Pick the bump level and describe the change. Commit the generated
`.changeset/*.md` file alongside the code change.

Bump levels for the packages consumers depend on:

- **major** — breaking the `svg` or `drawio` subcommand surface, renaming the
  `evml` binary, or a breaking change to the exported language API.
- **minor** — new subcommand, new option, new exported API.
- **patch** — bug fix, no surface change.

See `RELEASING.md` in the repository root for the full release procedure.
