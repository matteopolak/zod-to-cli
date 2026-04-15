import { describe, it, expect } from 'vitest';
import { z, meta, cli } from '../../src/index.js';

describe('subcommands (discriminated union)', () => {
  it('should parse a simple subcommand', () => {
    const schema = z.discriminatedUnion('command', [
      z.object({
        command: z.literal('build'),
        entry: z.string(),
      }),
      z.object({
        command: z.literal('test'),
        pattern: z.string().optional(),
      }),
    ]);

    const result = cli(schema, {
      argv: ['build', '--entry', './src/index.ts'],
    });

    expect(result).toEqual({
      command: 'build',
      entry: './src/index.ts',
    });
  });

  it('should parse subcommand as positional argument', () => {
    const schema = z.discriminatedUnion('command', [
      z.object({
        command: z.literal('dev'),
        port: z
          .number()
          .default(3000)
          .register(meta, { aliases: ['p'] }),
      }),
      z.object({
        command: z.literal('start'),
        production: z.boolean().default(false),
      }),
    ]);

    const result = cli(schema, {
      argv: ['dev', '-p', '8080'],
      exit: (code: number): never => {
        throw new Error(`Exit called with code ${code}`);
      },
    });

    expect(result).toEqual({
      command: 'dev',
      port: 8080,
    });
  });

  it('should handle different subcommands', () => {
    const schema = z.discriminatedUnion('command', [
      z.object({
        command: z.literal('init'),
        template: z.string().default('default'),
      }),
      z.object({
        command: z.literal('install'),
        packages: z.array(z.string()),
      }),
    ]);

    const installResult = cli(schema, {
      argv: ['install', '--packages', 'react', '--packages', 'react-dom'],
    });

    expect(installResult).toEqual({
      command: 'install',
      packages: ['react', 'react-dom'],
    });
  });
});
