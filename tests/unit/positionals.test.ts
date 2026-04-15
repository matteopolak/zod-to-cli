import { describe, it, expect } from 'vitest';
import { z, meta, cli } from '../../src/index.js';

describe('positional arguments (tuple)', () => {
  it('should parse required positional arguments', () => {
    const schema = z.tuple([
      z.string().register(meta, { name: 'FILE' }),
      z.string().register(meta, { name: 'OUTPUT' }),
    ]);

    const result = cli(schema, {
      argv: ['input.txt', 'output.txt'],
    });

    expect(result).toEqual(['input.txt', 'output.txt']);
  });

  it('should parse optional positional arguments', () => {
    const schema = z.tuple([
      z.string().register(meta, { name: 'FILE' }),
      z.string().optional().register(meta, { name: 'OUTPUT' }),
    ]);

    const result = cli(schema, {
      argv: ['input.txt'],
    });

    expect(result).toEqual(['input.txt', undefined]);
  });

  it('should parse rest positionals', () => {
    const schema = z
      .tuple([z.string().register(meta, { name: 'PATTERN' })])
      .rest(z.string().register(meta, { name: 'FILES' }));

    const result = cli(schema, {
      argv: ['*.js', 'src/', 'lib/', 'tests/'],
    });

    expect(result).toEqual(['*.js', 'src/', 'lib/', 'tests/']);
  });

  it('should validate positional types', () => {
    const schema = z.tuple([
      z.number().register(meta, { name: 'COUNT' }),
      z.boolean().register(meta, { name: 'FORCE' }),
    ]);

    expect(() =>
      cli(schema, {
        argv: ['not-a-number', 'true'],
      })
    ).toThrow();
  });
});
