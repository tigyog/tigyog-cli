import { describe, expect, it } from 'vitest';
import { smartQuotes } from './typography';

describe('smartQuotes', () => {
  it('should replace straight quotes with curly quotes', () => {
    const i = `"Hello, world," he said. 'It's a joy to be alive!'`;
    const o = `“Hello, world,” he said. ‘It’s a joy to be alive!’`;
    expect(smartQuotes(i)).toBe(o);
  });
});
