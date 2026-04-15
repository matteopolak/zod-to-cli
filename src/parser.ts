import { z } from 'zod';
import type { CliOptions, ParsedArgs, FlagDefinition, SchemaType } from './types.js';
import { ErrorFormatter } from './error-formatter.js';
import { HelpGenerator } from './help-generator.js';
import { getDef, getCLIMeta } from './types.js';

export class Parser {
  private schema: SchemaType;
  private options: Required<CliOptions>;
  private errorFormatter: ErrorFormatter;

  constructor(schema: SchemaType, options: CliOptions = {}) {
    this.schema = schema;
    this.options = {
      colors: options.colors ?? true,
      argv: options.argv ?? process.argv.slice(2),
      name: options.name ?? 'cli',
      description: options.description ?? '',
      version: options.version ?? '',
      stdout: options.stdout ?? console.log,
      stderr: options.stderr ?? console.error,
      exit: options.exit ?? ((code: number): never => process.exit(code)),
    };
    this.errorFormatter = new ErrorFormatter(this.options.colors);
  }

  parse(): unknown {
    const { flags, positionals } = this.parseArgs();

    // Check for help/version only if not defined in schema
    const hasHelpFlag = this.hasSchemaFlag('help') || this.hasSchemaFlag('h');
    const hasVersionFlag = this.hasSchemaFlag('version') || this.hasSchemaFlag('v');

    if (!hasHelpFlag && (flags.has('help') || flags.has('h'))) {
      this.showHelp();
      this.options.exit(0);
    }

    if (!hasVersionFlag && (flags.has('version') || flags.has('v'))) {
      this.showVersion();
      this.options.exit(0);
    }

    if (this.schema instanceof z.ZodTuple) {
      return this.parseTuple(this.schema, flags, positionals);
    }

    if (this.schema instanceof z.ZodDiscriminatedUnion) {
      return this.parseDiscriminatedUnion(this.schema, flags, positionals);
    }

    if (this.schema instanceof z.ZodObject) {
      return this.parseObject(this.schema, flags, positionals);
    }

    // Fallback - just validate the flags against the schema
    const result = this.schema.safeParse(Object.fromEntries(flags));
    if (!result.success) {
      this.showError(result.error);
    }
    return result.data;
  }

  private parseArgs(): ParsedArgs {
    const flags = new Map<string, unknown>();
    const positionals: string[] = [];

    const args = this.options.argv;
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      if (!arg) {
        i++;
        continue;
      }

      if (arg === '--') {
        positionals.push(...args.slice(i + 1));
        break;
      }

      if (arg.startsWith('--')) {
        const equalIndex = arg.indexOf('=');
        if (equalIndex !== -1) {
          const name = arg.slice(2, equalIndex);
          const value = arg.slice(equalIndex + 1);
          this.setFlagValue(flags, name, value);
        } else {
          const name = arg.slice(2);
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            this.setFlagValue(flags, name, nextArg);
            i++;
          } else {
            this.setFlagValue(flags, name, true);
          }
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        const chars = arg.slice(1);

        if (chars.length === 1) {
          const name = chars;
          const nextArg = args[i + 1];
          if (nextArg && !nextArg.startsWith('-')) {
            this.setFlagValue(flags, name, nextArg);
            i++;
          } else {
            this.setFlagValue(flags, name, true);
          }
        } else {
          for (let j = 0; j < chars.length; j++) {
            const char = chars[j];
            if (!char) continue;

            if (j === chars.length - 1) {
              const nextArg = args[i + 1];
              if (nextArg && !nextArg.startsWith('-')) {
                this.setFlagValue(flags, char, nextArg);
                i++;
              } else {
                this.setFlagValue(flags, char, true);
              }
            } else {
              this.setFlagValue(flags, char, true);
            }
          }
        }
      } else {
        positionals.push(arg);
      }

      i++;
    }

    return { flags, positionals };
  }

  private setFlagValue(flags: Map<string, unknown>, name: string, value: unknown): void {
    if (name.startsWith('no-')) {
      const actualName = name.slice(3);
      flags.set(actualName, false);
      return;
    }

    const existing = flags.get(name);
    if (existing !== undefined) {
      if (typeof existing === 'number') {
        flags.set(name, existing + 1);
      } else if (Array.isArray(existing)) {
        flags.set(name, [...(existing as unknown[]), value]);
      } else {
        flags.set(name, [existing, value]);
      }
    } else {
      flags.set(name, value);
    }
  }

  private parseObject(
    schema: z.ZodObject<Record<string, z.ZodType<unknown>>>,
    flags: Map<string, unknown>,
    positionals: string[]
  ): unknown {
    if (positionals.length > 0) {
      this.showUnknownArg(positionals[0]);
    }

    const flagDefs = this.extractFlagDefinitions(schema);
    const processedFlags = this.processFlags(flagDefs, flags);

    const result = schema.safeParse(processedFlags);
    if (!result.success) {
      this.showError(result.error);
    }

    return result.data;
  }

  private parseTuple(
    schema: z.ZodType<unknown>,
    _flags: Map<string, unknown>,
    positionals: string[]
  ): unknown {
    const tuple = schema as unknown as {
      def: { items: z.ZodType<unknown>[]; rest: z.ZodType<unknown> | null };
    };
    const def = tuple.def;
    const items = def.items;
    const rest = def.rest;

    const requiredCount = items.filter((item) => !item.isOptional()).length;
    const hasRest = rest !== null;

    if (positionals.length < requiredCount) {
      this.showMissingArg('positional');
    }

    if (!hasRest && positionals.length > items.length) {
      this.showExtraPositional(positionals.length - items.length);
    }

    const parsedItems: unknown[] = [];

    for (let i = 0; i < items.length; i++) {
      const itemSchema = items[i];
      const value = positionals[i];

      const result = itemSchema.safeParse(value);
      if (!result.success) {
        this.showError(result.error);
      }
      parsedItems.push(result.data);
    }

    if (hasRest && positionals.length > items.length) {
      for (let i = items.length; i < positionals.length; i++) {
        const value = positionals[i];
        const result = rest.safeParse(value);
        if (!result.success) {
          this.showError(result.error);
        }
        parsedItems.push(result.data);
      }
    }

    return parsedItems;
  }

  private parseDiscriminatedUnion(
    schema: z.ZodType<unknown>,
    flags: Map<string, unknown>,
    positionals: string[]
  ): unknown {
    const union = schema as unknown as {
      def: {
        discriminator: string;
        options: z.ZodObject<Record<string, z.ZodType<unknown>>>[];
      };
    };
    const def = union.def;
    const discriminator = def.discriminator;
    const commandValue = flags.get(discriminator) ?? positionals[0];

    if (!commandValue) {
      this.showMissingArg('command');
    }

    let adjustedPositionals = positionals;
    if (positionals[0] === commandValue) {
      adjustedPositionals = positionals.slice(1);
    }

    const options = def.options;
    const option = options.find((opt) => {
      const shape = opt.shape;
      const discSchema = shape[discriminator];
      if (discSchema instanceof z.ZodLiteral) {
        return discSchema.value === commandValue;
      }
      return false;
    });

    if (!option) {
      this.showUnknownArg(
        String(commandValue as string | number | bigint | boolean | null | undefined)
      );
    }

    const adjustedFlags = new Map(flags);
    adjustedFlags.set(discriminator, commandValue);

    return this.parseObject(option, adjustedFlags, adjustedPositionals);
  }

  private unwrapSchema(schema: z.ZodType<unknown>): z.ZodType<unknown> {
    const def = getDef(
      schema as unknown as { def: { innerType?: z.ZodType<unknown>; defaultValue?: unknown } }
    );
    if (def.innerType) {
      return this.unwrapSchema(def.innerType);
    }
    return schema;
  }

  private extractFlagDefinitions(
    schema: z.ZodObject<Record<string, z.ZodType<unknown>>>
  ): FlagDefinition[] {
    const flags: FlagDefinition[] = [];
    const shape = schema.shape;

    for (const [name, schemaItem] of Object.entries(shape)) {
      const meta = getCLIMeta(schemaItem);
      const aliases = meta?.aliases ?? [];

      const innerSchema = this.unwrapSchema(schemaItem);
      let type: FlagDefinition['type'] = 'string';
      let count = false;

      if (innerSchema instanceof z.ZodBoolean) {
        type = 'boolean';
      } else if (innerSchema instanceof z.ZodNumber) {
        type = 'number';
      } else if (innerSchema instanceof z.ZodArray) {
        type = 'array';
      }

      if (meta?.count && type === 'boolean') {
        type = 'count';
        count = true;
      }

      flags.push({
        name,
        aliases,
        type,
        description: meta?.description,
        defaultValue: undefined,
        optional: schemaItem.isOptional(),
        negation: meta?.booleanNegation !== false && type === 'boolean',
        count,
        schema: schemaItem,
      });
    }

    return flags;
  }

  private processFlags(
    flagDefs: FlagDefinition[],
    flags: Map<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const def of flagDefs) {
      let value = this.findFlagValue(flags, def);

      if (value === undefined) {
        if (def.schema instanceof z.ZodDefault) {
          const innerDef = getDef(def.schema);
          const dv = innerDef.defaultValue;
          value = typeof dv === 'function' ? (dv as () => unknown)() : dv;
        } else if (def.optional) {
          continue;
        }
      }

      // Handle counting flags
      if (def.count && typeof value === 'boolean') {
        value = value ? 1 : 0;
      } else if (def.count && typeof value === 'number') {
      } else if (def.type === 'array') {
        if (!Array.isArray(value)) {
          value = value !== undefined ? [value] : [];
        }
      }

      // Coerce types for CLI input
      if (def.type === 'number' && typeof value === 'string') {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          value = num;
        }
      }

      result[def.name] = value;
    }

    return result;
  }

  private findFlagValue(flags: Map<string, unknown>, def: FlagDefinition): unknown {
    if (flags.has(def.name)) {
      return flags.get(def.name);
    }

    for (const alias of def.aliases) {
      if (flags.has(alias)) {
        return flags.get(alias);
      }
    }

    return undefined;
  }

  private showHelp(): void {
    const helpGen = new HelpGenerator(
      this.options.colors,
      this.options.name,
      this.options.description,
      this.options.version
    );
    this.options.stdout(helpGen.generateHelp(this.schema));
  }

  private showVersion(): void {
    this.options.stdout(this.options.version ?? '0.0.0');
  }

  private showError(error: z.ZodError<unknown>): never {
    this.options.stderr(this.errorFormatter.formatError(error, this.options.name));
    this.options.exit(1);
  }

  private showUnknownArg(arg: string): never {
    this.options.stderr(this.errorFormatter.formatUnknownArg(arg, this.options.name));
    this.options.exit(1);
  }

  private showMissingArg(name: string): never {
    this.options.stderr(this.errorFormatter.formatMissingRequiredArg(name, this.options.name));
    this.options.exit(1);
  }

  private showExtraPositional(count: number): never {
    this.options.stderr(this.errorFormatter.formatExtraPositional(count, this.options.name));
    this.options.exit(1);
  }

  private hasSchemaFlag(name: string): boolean {
    if (this.schema instanceof z.ZodObject) {
      const shape = this.schema.shape as Record<string, z.ZodType<unknown>>;
      if (name in shape) {
        return true;
      }
      // Check aliases
      for (const [, fieldSchema] of Object.entries(shape)) {
        const meta = getCLIMeta(fieldSchema);
        if (meta?.aliases?.includes(name)) {
          return true;
        }
      }
    }
    return false;
  }
}
