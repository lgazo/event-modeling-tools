# Event Modeling CLI

[![Discord channel](https://shields.io/static/v1?logo=discord&message=eventmodeling&label=chat&color=5865F2&logoColor=white)](https://discord.com/channels/1139074016448098375/1139074016448098378)

Render [Event Modeling](https://eventmodeling.org/) models written in the
`.evml` DSL to SVG or Draw.io diagrams.

## Install

```bash
npm install -g event-modeling-cli
```

Installs a single binary named **`evml`** on your `PATH`.

## Usage

```bash
evml svg <file> [-d <dir>]      # generate SVG
evml drawio <file> [-d <dir>]   # generate Draw.io (mxGraph XML) diagram
evml --version
evml --help
```

`-d, --destination <dir>` sets the output directory and is created if missing.
It defaults to a `generated/` directory next to the input file.

```bash
evml svg model.evml -d out
# SVG generated successfully: out/model.svg
```

## Stability

`evml svg` and `evml drawio` are public API:

- exit code `0` on success, non-zero on any failure
- diagnostics on stderr, success message on stdout
- breaking either subcommand, or the `evml` binary name, is a major bump

Released in lockstep with
[`event-modeling-language`](https://www.npmjs.com/package/event-modeling-language)
at matching versions.

Requires Node.js **>= 20.10.0**.

## Links

- [Repository](https://github.com/lgazo/event-modeling-tools)
- [Releasing / versioning policy](https://github.com/lgazo/event-modeling-tools/blob/main/RELEASING.md)
