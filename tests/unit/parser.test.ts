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

  it('should handle count flag with single occurrence', () => {
    const schema = z.object({
      verbose: z
        .number()
        .default(0)
        .register(meta, { aliases: ['v'], count: true }),
    });

    const result = cli(schema, {
      argv: ['-v'],
    });

    expect(result).toEqual({ verbose: 1 });
  });

  it('should handle count flag with multiple short flags', () => {
    const schema = z.object({
      verbose: z
        .number()
        .default(0)
        .register(meta, { aliases: ['v'], count: true }),
    });

    const result = cli(schema, {
      argv: ['-vvv'],
    });

    expect(result).toEqual({ verbose: 3 });
  });

  it('should handle count flag with mixed occurrences', () => {
    const schema = z.object({
      verbose: z
        .number()
        .default(0)
        .register(meta, { aliases: ['v'], count: true }),
    });

    const result = cli(schema, {
      argv: ['-v', '--verbose', '-v'],
    });

    expect(result).toEqual({ verbose: 3 });
  });

  it('should handle count flag with no occurrences (default)', () => {
    const schema = z.object({
      verbose: z
        .number()
        .default(0)
        .register(meta, { aliases: ['v'], count: true }),
    });

    const result = cli(schema, {
      argv: [],
    });

    expect(result).toEqual({ verbose: 0 });
  });

  it('should coerce numeric array values using z.coerce.number()', () => {
    const schema = z.object({
      nums: z.array(z.coerce.number()).register(meta, { aliases: ['n'] }),
    });

    const result = cli(schema, {
      argv: ['--nums', '1', '-n', '2', '--nums', '3'],
    });

    // Values are grouped by key: name values first, then alias values
    expect(result).toEqual({ nums: [1, 3, 2] });
  });

  it('should handle mixed numeric array with coerce', () => {
    const schema = z.object({
      values: z.array(z.coerce.number()).register(meta, { aliases: ['v'] }),
    });

    const result = cli(schema, {
      argv: ['-v', '10', '-v', '20'],
    });

    expect(result).toEqual({ values: [10, 20] });
  });
});
