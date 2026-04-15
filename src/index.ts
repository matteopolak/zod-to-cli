import { z } from 'zod';
import { Parser } from './parser.js';
import { meta, type SchemaType, type CliOptions } from './types.js';

export { z, meta };

export function cli<T extends SchemaType>(schema: T, options?: CliOptions): z.infer<T> {
  return new Parser(schema, options).parse() as z.infer<T>;
}

export { getCLIMeta } from './types.js';
export type { CliOptions, MetaOptions, SchemaType } from './types.js';
