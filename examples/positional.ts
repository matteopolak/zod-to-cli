#!/usr/bin/env node
import { z, meta, cli } from '../src/index.js';

// Example with positional arguments
const schema = z
  .tuple([
    z.string().register(meta, { name: 'SOURCE', description: 'Source file' }),
    z.string().register(meta, { name: 'DEST', description: 'Destination file' }),
  ])
  .rest(z.string().register(meta, { name: 'EXTRA', description: 'Additional files' }));

const args = cli(schema, {
  name: 'positional-example',
  description: 'A CLI with positional arguments',
  version: '1.0.0',
});

console.log('Source:', args[0]);
console.log('Destination:', args[1]);
if (args.length > 2) {
  console.log('Extra files:', args.slice(2));
}
