# event-modeling-layout

## 1.0.0

First public release on npmjs.com.

- Published as a public, unscoped package on npmjs.com. No token is required to
  install it.
- Released in lockstep with the other `event-modeling-*` packages: all four
  always carry the same version, so a caret pin can never produce a skewed pair.
- Declares `engines.node >= 20.10.0`.
- The published tarball is self-contained: built output is committed to the
  `files` allowlist and rebuilt by `prepublishOnly`. There is no
  `postinstall` step and nothing assumes a git checkout is present.
