export interface CliArgs {
  command?: string;
  input?: string;
  run?: string;
  classified?: string;
  patterns?: string;
  account?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const [command, ...rest] = argv;
  const parsed: CliArgs = { command };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    const next = rest[i + 1];

    if (token === "--input" && next) {
      parsed.input = next;
      i += 1;
      continue;
    }

    if (token === "--run" && next) {
      parsed.run = next;
      i += 1;
      continue;
    }

    if (token === "--classified" && next) {
      parsed.classified = next;
      i += 1;
      continue;
    }

    if (token === "--patterns" && next) {
      parsed.patterns = next;
      i += 1;
      continue;
    }

    if (token === "--account" && next) {
      parsed.account = next;
      i += 1;
      continue;
    }
  }

  return parsed;
}
