# Event Modeling Tools

The project combines multiple tools helping you with Event Modeling, such as Domain Specific Language (DSL).

[![Discord channel](https://shields.io/static/v1?logo=discord&message=eventmodeling&label=chat&color=5865F2&logoColor=white)](https://discord.com/channels/1139074016448098375/1139074016448098378)
[![Build project](https://github.com/lgazo/event-modeling-tools/actions/workflows/event-modeling-ci.yml/badge.svg)](https://github.com/lgazo/event-modeling-tools/actions/workflows/event-modeling-ci.yml)

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

The command line interface can generate SVG file out of `.evml` text definition.

Just call the CLI script like this:

```bash
./packages/cli/bin/cli.js svg ./packages/layout-headless/test/multiple-source-frames.evml
```

## Obsidian Plugin

Obsidian plugin renders `evml` code blocks in Markdown in the default Markdown view. On top of it you can preview large Event Model in a separate view, zoom in/out, pan. Additionally you can export it to a separate text or SVG file.

## Features

- [x] Domain Specific Language parser
- [x] Extract rendering to SVG ([available only in Mermaid fork](https://github.com/lgazo/mermaid/tree/feature/event-modeling-diagram))
- [x] Obsidian Plugin
- [x] CLI
- [ ] CLI in npm store
- [ ] Obsidian Plugin in the Community store
- [ ] Expand DSL - Given-When-Then, Diagram configuration, Swimlane labels, Slices,...
- [ ] Completness check Langium Validator
- [x] Additional output to Draw.io XML
- [ ] VS Code Extension command support for different outputs

## Related Resources

[Development](./DEVELOPMENT.md)

[Examples of SVG output based on the DSL](https://github.com/lgazo/mermaid-eventmodeling-examples)
