# Third-Party Notices

This project includes code derived from third-party open source software. The
original copyright and license notices are reproduced below.

## mermaid-js/mermaid

The following files contain code derived from
[mermaid-js/mermaid](https://github.com/mermaid-js/mermaid), specifically the
Event Modeling diagram subsystem authored by Yordis Prieto:

- `packages/language/src/event-modeling-validator.ts`
  - Imported from PR [#7588](https://github.com/mermaid-js/mermaid/pull/7588)
    (commit `d50c423`) and modified by PR
    [#7629](https://github.com/mermaid-js/mermaid/pull/7629) (commit `32c257e`).
- `packages/language/src/event-modeling.langium`
  - Modified by PR [#7629](https://github.com/mermaid-js/mermaid/pull/7629)
    (commit `32c257e`) — removal of `scn`/`screen` keywords in favour of `ui`.

Original license:

```
The MIT License (MIT)

Copyright (c) 2014 - 2022 Knut Sveidqvist

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
