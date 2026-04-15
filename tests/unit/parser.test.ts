import { describe, it, expect } from 'vitest';
import { z, meta, cli } from '../../src/index.js';

describe('cli parser', () => {
  it('should parse basic string flag', () => {
    const schema = z.object({
      name: z.string().register(meta, { aliases: ['n'] }),
    });

    const result = cli(schema, {
      argv: ['--name', 'test'],
    });

    expect(result).toEqual({ name: 'test' });
  });

  it('should parse short alias', () => {
    const schema = z.object({
      name: z.string().register(meta, { aliases: ['n'] }),
    });

    const result = cli(schema, {
      argv: ['-n', 'test'],
    });

    expect(result).toEqual({ name: 'test' });
  });

  it('should parse boolean flag', () => {
    const schema = z.object({
      verbose: z
        .boolean()
        .default(false)
        .register(meta, { aliases: ['v'] }),
    });

    const result = cli(schema, {
      argv: ['--verbose'],
    });

    expect(result).toEqual({ verbose: true });
  });

  it('should parse combined short flags', () => {
    const schema = z.object({
      verbose: z
        .boolean()
        .default(false)
        .register(meta, { aliases: ['v'] }),
      force: z
        .boolean()
        .default(false)
        .register(meta, { aliases: ['f'] }),
    });

    const result = cli(schema, {
      argv: ['-vf'],
    });

    expect(result).toEqual({ verbose: true, force: true });
  });

  it('should parse flag with equals syntax', () => {
    const schema = z.object({
      name: z.string().register(meta, { aliases: ['n'] }),
    });

    const result = cli(schema, {
      argv: ['--name=test'],
    });

    expect(result).toEqual({ name: 'test' });
  });

  it('should handle boolean negation', () => {
    const schema = z.object({
      verbose: z
        .boolean()
        .default(true)
        .register(meta, { aliases: ['v'] }),
    });

    const result = cli(schema, {
      argv: ['--no-verbose'],
    });

    expect(result).toEqual({ verbose: false });
  });

  it('should parse array values', () => {
    const schema = z.object({
      tag: z.array(z.string()).register(meta, { aliases: ['t'] }),
    });

    const result = cli(schema, {
      argv: ['--tag', 'a', '--tag', 'b'],
    });

    expect(result).toEqual({ tag: ['a', 'b'] });
  });

  it('should handle default values', () => {
    const schema = z.object({
      count: z
        .number()
        .default(10)
        .register(meta, { aliases: ['c'] }),
    });

    const result = cli(schema, {
      argv: [],
    });

    expect(result).toEqual({ count: 10 });
  });
});
