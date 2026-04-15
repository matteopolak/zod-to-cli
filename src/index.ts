import { z } from 'zod';
import { Parser } from './parser.ts';
import { meta, type SchemaType, type CliOptions } from './types.ts';

export { z, meta };

export function cli<T extends SchemaType>(schema: T, options?: CliOptions): z.infer<T> {
  return new Parser(schema, options).parse() as z.infer<T>;
}

export { getCLIMeta } from './types.ts';
export type { CliOptions, MetaOptions, SchemaType } from './types.ts';
