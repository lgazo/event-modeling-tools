# Event Modeling Tools

The project combines multiple tools helping you with Event Modeling, such as Domain Specific Language (DSL).

[![Discord channel](https://shields.io/static/v1?logo=discord&message=eventmodeling&label=chat&color=5865F2&logoColor=white)](https://discord.com/channels/1139074016448098375/1139074016448098378)
[![CI](https://github.com/lgazo/event-modeling-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/lgazo/event-modeling-tools/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/event-modeling-cli?label=event-modeling-cli)](https://www.npmjs.com/package/event-modeling-cli)

> [!NOTE]
> Previously the project's name was `event-modeling-dsl`.

## Domain Specific Language

Domain Specific Language (DSL) for writing [Event Modeling](https://eventmodeling.org/) models. The DSL in textual format can be translated to various outputs, mainly to a diagram.

Event Modeling model file is usually defined in a text with prefered `.evml` file extension or as a Markdown code block marked with `evml`.

## VS Code Extension

There is VS Code compatible extension published.

> [!NOTE]
> There is a deprecated extension available under `event-modeling-dsl` identifier. Use the one with `event-modeling-vscode-extension`.

For [VS Code](https://code.visualstudio.com/) use its [official Marketplace](https://marketplace.visualstudio.com/items?itemName=LadislavGazo.event-modeling-vscode-extension). Hit Ctrl+P and type:
```
ext install LadislavGazo.event-modeling-vscode-extension
```

For [VS Codium](https://vscodium.com/) use [Open VSX Registry](https://open-vsx.org/extension/LadislavGazo/event-modeling-vscode-extension).

## Command Line Interface

The command line interface generates an SVG or a Draw.io diagram out of an `.evml` text definition.

### Install

```bash
npm install -g event-modeling-cli
```

This puts a single stable binary named **`evml`** on your `PATH`.

### Usage

```bash
evml svg <file> [-d <dir>]      # generate SVG
evml drawio <file> [-d <dir>]   # generate Draw.io (mxGraph XML) diagram
evml --version
evml --help
```

`-d, --destination <dir>` sets the output directory; it is created if missing.
It defaults to a `generated/` directory next to the input file.

Both subcommands exit `0` on success and non-zero on failure, writing all
diagnostics to stderr. They are treated as **public API**: a breaking change to
either one, or to the `evml` binary name, is a major version bump.

### Use as a library

```bash
npm install event-modeling-language
```

```js
import { createEventModelingServices } from 'event-modeling-language';
```

`event-modeling-cli` and `event-modeling-language` are released together at
matching versions, so pinning `^1.0.0` on both can never produce a skewed pair.

Supported Node.js: **>= 20.10.0**.

## Obsidian Plugin

Obsidian plugin renders `evml` code blocks in Markdown in the default Markdown view. On top of it you can preview large Event Model in a separate view, zoom in/out, pan. Additionally you can export it to a separate text or SVG file.

## Features

- [x] Domain Specific Language parser
- [x] Extract rendering to SVG ([available only in Mermaid fork](https://github.com/lgazo/mermaid/tree/feature/event-modeling-diagram))
- [x] Obsidian Plugin
- [x] CLI
- [x] CLI in npm store
- [ ] Obsidian Plugin in the Community store
- [ ] Expand DSL - Given-When-Then, Diagram configuration, Swimlane labels, Slices,...
- [ ] Completness check Langium Validator
- [x] Additional output to Draw.io XML
- [ ] VS Code Extension command support for different outputs

## Related Resources

[Development](./DEVELOPMENT.md)

[Releasing](./RELEASING.md)

[Examples of SVG output based on the DSL](https://github.com/lgazo/mermaid-eventmodeling-examples)
