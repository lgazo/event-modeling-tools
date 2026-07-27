# event-modeling-layout-headless

Headless (Node.js) renderer for [Event Modeling](https://eventmodeling.org/)
diagrams. Takes a laid-out model and writes SVG without a browser, using
`jsdom` for the DOM and `@napi-rs/canvas` for text measurement.

This package is primarily a building block for
[`event-modeling-cli`](https://www.npmjs.com/package/event-modeling-cli). It is
published so the CLI resolves from the registry; the API is not yet documented
for standalone use.

```bash
npm install event-modeling-layout-headless
```

Requires Node.js **>= 20.10.0**. Released in lockstep with the other
`event-modeling-*` packages — see
[RELEASING.md](https://github.com/lgazo/event-modeling-tools/blob/main/RELEASING.md).
