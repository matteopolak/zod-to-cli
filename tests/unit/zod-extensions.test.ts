import { describe, it, expect } from 'vitest';
import { z, meta, getCLIMeta } from '../../src/index.js';

describe('zod registry', () => {
  it('should register metadata on schema', () => {
    const schema = z.string().register(meta, { description: 'test' });
    const result = getCLIMeta(schema);

    expect(result).toBeDefined();
    expect(result?.description).toBe('test');
  });

  it('should add aliases to registry', () => {
    const schema = z.string().register(meta, { aliases: ['n', 'name'] });
    const result = getCLIMeta(schema);

    expect(result?.aliases).toEqual(['n', 'name']);
  });

  it('should retrieve all registered metadata', () => {
    const schema = z.string().register(meta, {
      description: 'A test field',
      aliases: ['t', 'test'],
      count: true,
    });
    const result = getCLIMeta(schema);

    expect(result).toEqual({
      description: 'A test field',
      aliases: ['t', 'test'],
      count: true,
    });
  });
});
