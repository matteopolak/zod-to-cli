#!/usr/bin/env node
import { z, meta, cli } from '../src/index.js';

// Example 1: Simple CLI with flags
const schema = z.object({
  name: z
    .string()
    .min(1)
    .register(meta, {
      description: 'Your name',
      aliases: ['n'],
    }),
  age: z
    .number()
    .min(0)
    .max(150)
    .optional()
    .register(meta, {
      description: 'Your age',
      aliases: ['a'],
    }),
  verbose: z
    .boolean()
    .default(false)
    .register(meta, {
      description: 'Enable verbose output',
      aliases: ['v'],
      count: true,
    }),
  tags: z.array(z.string()).register(meta, {
    description: 'Tags to apply',
    aliases: ['t'],
  }),
});

const args = cli(schema, {
  name: 'basic-example',
  description: 'A basic CLI example',
  version: '1.0.0',
});

console.log('Parsed arguments:', args);
console.log('Type-safe access:', args.name, args.verbose);
