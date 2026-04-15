import pc from 'picocolors';
import type { z } from 'zod';

export class ErrorFormatter {
  constructor(private colors = true) {}

  private color(text: string, colorFn: (s: string) => string): string {
    return this.colors ? colorFn(text) : text;
  }

  private header(programName: string, kind: string): string {
    return this.color(`${programName}:`, pc.red) + ' ' + this.color('error', pc.red) + ` - ${kind}`;
  }

  private helpHint(programName: string): string {
    return `Run ${this.color(`${programName} --help`, pc.cyan)} for usage information`;
  }

  private simpleError(programName: string, kind: string, detail: string): string {
    return [
      this.header(programName, kind),
      '',
      `  ${this.color(detail, pc.yellow)}`,
      '',
      this.helpHint(programName),
    ].join('\n');
  }

  formatError(error: z.ZodError<unknown>, programName = 'cli'): string {
    const lines: string[] = [this.header(programName, 'invalid arguments')];

    for (const issue of error.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'arguments';
      lines.push('', `${this.color(`  • ${path}:`, pc.yellow)} ${issue.message}`);
    }

    lines.push('', this.helpHint(programName));
    return lines.join('\n');
  }

  formatUnknownArg(arg: string, programName = 'cli'): string {
    return this.simpleError(programName, 'unknown argument', `${arg} is not a recognized flag`);
  }

  formatMissingRequiredArg(name: string, programName = 'cli'): string {
    return this.simpleError(programName, 'missing required argument', `${name} is required`);
  }

  formatExtraPositional(count: number, programName = 'cli'): string {
    return this.simpleError(
      programName,
      'too many positional arguments',
      `expected ${count} positional argument(s)`
    );
  }
}
