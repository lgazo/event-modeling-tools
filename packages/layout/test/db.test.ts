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
    // Block notation: `data Foo {\n  ...lines...\n}`. The buggy version used
    // `lastIndexOf('}') - 1`, chopping the last character of the final line.
    const input = '{\n  item: string\n  quantity: number\n}';
    expect(stripBlockValue(input)).toBe('  item: string\n  quantity: number');
  });

  test('keeps single-line block content intact', () => {
    expect(stripBlockValue('{\n  field: value\n}')).toBe('  field: value');
  });

  test('drops the structural newline before the closing brace', () => {
    // The char immediately before `}` is always the newline that terminates
    // the last content line — it is part of the delimiter, not the content.
    // Keeping it renders as a trailing blank line inside <pre> and grows
    // every box by one line height.
    expect(stripBlockValue('{\n  price: number\n}')).not.toMatch(/\n$/);
  });

  test('preserves interior blank lines', () => {
    // Only the single trailing newline is structural; blank lines the author
    // wrote inside the block are content and must survive.
    expect(stripBlockValue('{\n  a: 1\n\n  b: 2\n}')).toBe('  a: 1\n\n  b: 2');
  });
});
