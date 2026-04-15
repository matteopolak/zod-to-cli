#!/usr/bin/env node
import { z, meta, cli } from '../src/index.js';

// Example with subcommands
const schema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('build'),
    entry: z.string().register(meta, { description: 'Entry point file' }),
    watch: z
      .boolean()
      .default(false)
      .register(meta, { aliases: ['w'] }),
    output: z
      .string()
      .optional()
      .register(meta, { aliases: ['o'], description: 'Output directory' }),
  }),
  z.object({
    command: z.literal('dev'),
    port: z
      .number()
      .default(3000)
      .register(meta, { aliases: ['p'], description: 'Port to run on' }),
    host: z
      .string()
      .default('localhost')
      .register(meta, { aliases: ['h'] }),
  }),
  z.object({
    command: z.literal('test'),
    pattern: z.string().optional().register(meta, { description: 'Test pattern to match' }),
    coverage: z
      .boolean()
      .default(false)
      .register(meta, { aliases: ['c'] }),
  }),
]);

const args = cli(schema, {
  name: 'subcommand-example',
  description: 'A CLI with subcommands',
  version: '1.0.0',
});

console.log('Parsed command:', args.command);

// Type-safe access based on command
switch (args.command) {
  case 'build':
    console.log('Building from:', args.entry);
    console.log('Watch mode:', args.watch);
    break;
  case 'dev':
    console.log('Running dev server on:', `${args.host}:${args.port}`);
    break;
  case 'test':
    console.log('Running tests with pattern:', args.pattern ?? '*');
    console.log('Coverage enabled:', args.coverage);
    break;
}
