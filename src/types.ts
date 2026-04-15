import { registry } from 'zod';
import type { z } from 'zod';

export interface MetaOptions {
  description?: string;
  aliases?: string[];
  count?: boolean;
  booleanNegation?: boolean;
  name?: string;
}

export interface CliOptions {
  colors?: boolean;
  argv?: string[];
  name?: string;
  description?: string;
  version?: string;
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
  exit?: (code: number) => never;
}

export interface ParsedArgs {
  flags: Map<string, unknown>;
  positionals: string[];
}

export interface FlagDefinition {
  name: string;
  aliases: string[];
  type: 'string' | 'boolean' | 'number' | 'array' | 'count';
  description?: string;
  defaultValue?: unknown;
  optional: boolean;
  negation: boolean;
  count: boolean;
  schema: z.ZodType<unknown>;
}

export type SchemaType = z.ZodType<unknown>;

export const meta = registry<MetaOptions>();

export function getDef<T>(schema: { def: T }): T {
  return schema.def;
}

export function getCLIMeta(schema: z.ZodType<unknown>): MetaOptions | undefined {
  return meta.get(schema);
}

export function findFlagDefinition(
  flags: FlagDefinition[],
  name: string
): FlagDefinition | undefined {
  const normalized = name.replace(/^-+/, '');
  return flags.find(
    (f) => f.name === normalized || f.aliases.some((alias) => alias === normalized)
  );
}
