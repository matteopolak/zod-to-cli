import pc from 'picocolors';
import { z } from 'zod';
import type { FlagDefinition, SchemaType } from './types.ts';
import { getDef, getCLIMeta } from './types.ts';

export class HelpGenerator {
  private colors: boolean;
  private programName: string;
  private programDescription: string | undefined;
  private version: string | undefined;

  constructor(colors = true, programName = 'cli', programDescription?: string, version?: string) {
    this.colors = colors;
    this.programName = programName;
    this.programDescription = programDescription;
    this.version = version;
  }

  private color(text: string, colorFn: (s: string) => string): string {
    return this.colors ? colorFn(text) : text;
  }

  generateHelp(schema: SchemaType): string {
    const lines: string[] = [];

    let header = this.color(this.programName, pc.bold);
    if (this.version) {
      header += ` ${this.color(this.version, pc.dim)}`;
    }
    lines.push(header);

    if (this.programDescription) {
      lines.push('');
      lines.push(this.programDescription);
    }

    lines.push('');
    lines.push(this.color('USAGE:', pc.bold));
    const usage = this.generateUsage(schema);
    lines.push(`  ${this.programName} ${usage}`);
    lines.push('');

    const flags = this.extractFlags(schema);
    if (flags.length > 0) {
      lines.push(this.color('OPTIONS:', pc.bold));

      const maxFlagWidth = Math.max(...flags.map((f) => this.formatFlagNames(f).length));

      for (const flag of flags) {
        const flagStr = this.formatFlagNames(flag).padEnd(maxFlagWidth + 2);
        const desc = flag.description ?? '';
        lines.push(`  ${flagStr}  ${desc}`);

        if (
          flag.defaultValue !== undefined &&
          flag.defaultValue !== '' &&
          typeof flag.defaultValue !== 'object'
        ) {
          lines.push(
            `${' '.repeat(maxFlagWidth + 6)}${this.color(
              `(default: ${String(flag.defaultValue as string | number | bigint | boolean | null | undefined)})`,
              pc.dim
            )}`
          );
        }
      }

      lines.push('');
    }

    lines.push(this.color('GLOBAL OPTIONS:', pc.bold));
    lines.push(`  ${this.color('-h, --help', pc.cyan)}     Show help`);
    lines.push(`  ${this.color('-v, --version', pc.cyan)}  Show version`);
    lines.push('');

    return lines.join('\n');
  }

  private generateUsage(schema: SchemaType): string {
    if (schema instanceof z.ZodTuple) {
      return this.generateTupleUsage(schema);
    }

    if (schema instanceof z.ZodDiscriminatedUnion) {
      return this.generateUnionUsage(schema);
    }

    return '[options]';
  }

  private generateTupleUsage(tuple: z.ZodType<unknown>): string {
    const def = getDef(
      tuple as unknown as { def: { items: z.ZodType<unknown>[]; rest: z.ZodType<unknown> | null } }
    );
    let usage = def.items
      .map((item, idx) => {
        const meta = getCLIMeta(item);
        const name = meta?.name ?? `arg${idx + 1}`;
        return item.isOptional() ? `[${name}]` : `<${name}>`;
      })
      .join(' ');

    if (def.rest) {
      usage += ' [extras...]';
    }

    return `${usage} [options]`;
  }

  private generateUnionUsage(union: z.ZodType<unknown>): string {
    const def = getDef(
      union as unknown as { def: { options: z.ZodObject<Record<string, z.ZodType<unknown>>>[] } }
    );
    const options = def.options.map((opt) => {
      const shape = opt.shape;
      const cmd = Object.entries(shape).find(([, v]) => v instanceof z.ZodLiteral);
      return cmd?.[1] instanceof z.ZodLiteral ? String(cmd[1].value) : 'unknown';
    });

    return `<${options.join('|')}> [options]`;
  }

  private extractFlags(schema: SchemaType): FlagDefinition[] {
    if (schema instanceof z.ZodObject) {
      return this.extractObjectFlags(schema);
    }

    if (schema instanceof z.ZodDiscriminatedUnion) {
      return this.extractUnionFlags(schema);
    }

    return [];
  }

  private extractObjectFlags(
    obj: z.ZodObject<Record<string, z.ZodType<unknown>>>
  ): FlagDefinition[] {
    const flags: FlagDefinition[] = [];
    const shape = obj.shape;

    for (const [name, schema] of Object.entries(shape)) {
      if (schema instanceof z.ZodLiteral) {
        continue; // Skip discriminant fields
      }

      const meta = getCLIMeta(schema);
      const aliases = meta?.aliases ?? [];

      let type: FlagDefinition['type'] = 'string';
      let defaultValue: unknown = undefined;
      let count = false;

      if (schema instanceof z.ZodBoolean) {
        type = 'boolean';
      } else if (schema instanceof z.ZodNumber) {
        type = 'number';
      } else if (schema instanceof z.ZodArray) {
        type = 'array';
      }

      if (meta?.count && type === 'boolean') {
        type = 'count';
        count = true;
      }

      // Check for default value
      if (schema instanceof z.ZodDefault) {
        const def = getDef(schema);
        const dv = def.defaultValue;
        defaultValue = typeof dv === 'function' ? (dv as () => unknown)() : dv;
      }

      flags.push({
        name,
        aliases,
        type,
        description: meta?.description,
        defaultValue,
        optional: schema.isOptional(),
        negation: meta?.booleanNegation !== false && type === 'boolean',
        count,
        schema,
      });
    }

    return flags;
  }

  private extractUnionFlags(union: z.ZodType<unknown>): FlagDefinition[] {
    const allFlags = new Map<string, FlagDefinition>();
    const def = getDef(
      union as unknown as { def: { options: z.ZodObject<Record<string, z.ZodType<unknown>>>[] } }
    );

    for (const option of def.options) {
      const flags = this.extractObjectFlags(option);
      for (const flag of flags) {
        if (!allFlags.has(flag.name)) {
          allFlags.set(flag.name, flag);
        }
      }
    }

    return Array.from(allFlags.values());
  }

  private formatFlagNames(flag: FlagDefinition): string {
    const parts: string[] = [];

    for (const alias of flag.aliases) {
      if (alias.length === 1) {
        parts.push(this.color(`-${alias}`, pc.cyan));
      } else {
        parts.push(this.color(`--${alias}`, pc.cyan));
      }
    }

    parts.push(this.color(`--${flag.name}`, pc.cyan));

    // Add value placeholder for non-boolean flags
    if (flag.type !== 'boolean' && flag.type !== 'count') {
      const placeholder = flag.name.toUpperCase();
      parts[parts.length - 1] += ` <${placeholder}>`;
    }

    return parts.join(', ');
  }
}
