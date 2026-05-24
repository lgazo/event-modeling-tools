import { describe, test, expect } from 'vitest';

import { stripInlineValue, stripBlockValue } from '../src/db.js';

describe('stripInlineValue', () => {
  test('keeps the last character of an inline data spec', () => {
    // Regression: previously `substring(0, lastIndexOf('}') - 1)` chopped
    // the last char, so "{item, quantity}" rendered as "item, quantit".
    expect(stripInlineValue('{item, quantity}')).toBe('item, quantity');
  });

  test('returns content verbatim for multi-field specs', () => {
    expect(stripInlineValue('{cartId, item, quantity}')).toBe('cartId, item, quantity');
  });

  test('handles a single-character content', () => {
    // Edge case where the off-by-one was easiest to spot: a single char
    // body became the empty string under the old behavior.
    expect(stripInlineValue('{x}')).toBe('x');
  });

  test('handles an empty body', () => {
    expect(stripInlineValue('{}')).toBe('');
  });

  test('preserves leading/trailing whitespace inside the braces', () => {
    expect(stripInlineValue('{ item, quantity }')).toBe(' item, quantity ');
  });
});

describe('stripBlockValue', () => {
  test('keeps the last character of a block data spec', () => {
    // Block notation: `data Foo {\n  ...lines...\n}`. The buggy version
    // chopped the trailing newline (and on the last line, the last char).
    const input = '{\n  item: string\n  quantity: number\n}';
    expect(stripBlockValue(input)).toBe('  item: string\n  quantity: number\n');
  });

  test('keeps single-line block content intact', () => {
    expect(stripBlockValue('{\n  field: value\n}')).toBe('  field: value\n');
  });
});
