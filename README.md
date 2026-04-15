# zod to cli

Type-safe CLI argument parsing using Zod schemas.

Define your CLI interface with a Zod schema, get back typed arguments. Supports flags, aliases, arrays, booleans, numbers, and automatic help generation.

## Install

```bash
pnpm add zod-to-cli zod
```

## Quick Example

```typescript
import { z, meta, cli } from 'zod-to-cli';

const schema = z.object({
  name: z.string().register(meta, {
    description: 'Your name',
    aliases: ['n'],
  }),
  verbose: z.boolean().default(false).register(meta, {
    description: 'Enable verbose output',
    aliases: ['v'],
  }),
});

const args = cli(schema, {
  name: 'my-cli',
  description: 'A simple CLI tool',
  version: '1.0.0',
});

// args is fully typed: { name: string, verbose: boolean }
console.log(args.name, args.verbose);
```

Run it:

```bash
$ my-cli --name Alice -v
Alice true

$ my-cli --help
my-cli v1.0.0

A simple CLI tool

USAGE:
  my-cli [OPTIONS]

OPTIONS:
  -n, --name <string>     Your name (required)
  -v, --verbose           Enable verbose output
  -h, --help              Show help
  --version               Show version
```

## Features

- **Type-safe**: Arguments are parsed and validated against your Zod schema
- **Flag aliases**: Short flags like `-n` for `--name`
- **Arrays**: Collect multiple values with `--tag foo --tag bar`
- **Booleans**: Supports negation (`--no-verbose`)
- **Count flags**: `-vvv` for verbosity levels
- **Help generation**: Automatic `--help` and `--version`
- **Validation**: Uses Zod's built-in validation (min/max, email, etc.)

## More Examples

See the `examples/` directory for:
- [basic.ts](examples/basic.ts) - flags and options
- [positional.ts](examples/positional.ts) - positional arguments
- [subcommands.ts](examples/subcommands.ts) - git-style subcommands

## Requirements

- Node.js >= 20.0.0
- Zod ^4.0.0 (peer dependency)

## License

MIT
