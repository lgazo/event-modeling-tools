# event-modeling-layout

Layout engine for [Event Modeling](https://eventmodeling.org/) diagrams. Turns a
parsed `.evml` model into positioned frames, swimlanes and connectors.

This package is primarily a building block for
[`event-modeling-layout-headless`](https://www.npmjs.com/package/event-modeling-layout-headless)
and [`event-modeling-cli`](https://www.npmjs.com/package/event-modeling-cli). It
is published so those packages resolve from the registry; the API is not yet
documented for standalone use.

```bash
npm install event-modeling-layout
```

Requires Node.js **>= 20.10.0**. Released in lockstep with the other
`event-modeling-*` packages — see
[RELEASING.md](https://github.com/lgazo/event-modeling-tools/blob/main/RELEASING.md).
