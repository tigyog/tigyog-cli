import { describe, expect, it } from 'vitest';
import { smartDashes, smartQuotes } from './typography';

describe('smartQuotes', () => {
  it('should replace straight quotes with curly quotes', () => {
    const i = `"Hello, world," he said. 'It's a joy to be alive!'`;
    const o = `“Hello, world,” he said. ‘It’s a joy to be alive!’`;
    expect(smartQuotes(i)).toBe(o);
  });
});

describe('smartDashes', () => {
  it('should replace spaced double hyphens with em dashes', () => {
    const input = 'Yes, -- but no --';
    const expected = 'Yes, – but no –';
    expect(smartDashes(input)).toBe(expected);
  });

  it('should not replace hyphens in compound words', () => {
    const input = 'The well-known author';
    const expected = 'The well-known author';
    expect(smartDashes(input)).toBe(expected);
  });
});
