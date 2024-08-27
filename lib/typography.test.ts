import { describe, expect, it } from 'vitest';
import { smartQuotes } from './typography';

describe('smartQuotes', () => {
  it('should replace straight double quotes with curly quotes', () => {
    expect(smartQuotes('"Hello, world!", he said. "What\'s up?"')).toBe(
      "“Hello, world!”, he said. “What's up?”",
    );
  });
});
