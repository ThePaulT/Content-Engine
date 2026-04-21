#!/usr/bin/env node
import { parseArgs } from "./lib/args";
import { runIngest } from "./ingest/runIngest";
import { runClassify } from "./classify/runClassify";
import { runEval } from "./eval/runEval";
import { runPatternMiner } from "./patterns/runPatternMiner";
import { runIdeaTransformer } from "./ideas/runIdeaTransformer";

function printHelp(): void {
  console.log(`Kudwa Competitive Content Lab CLI

Usage:
  kudwa-lab ingest --input <file> [--run <run-id>]
  kudwa-lab classify --input <source-records-jsonl>
  kudwa-lab eval --input <classified-jsonl>
  kudwa-lab patterns --input <classified-jsonl>
  kudwa-lab ideas --classified <classified-jsonl> --patterns <pattern-report-json> --account <kudwa|karl|sam>`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === "--help" || args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "ingest") {
    if (!args.input) {
      throw new Error("Missing required --input argument for ingest command.");
    }

    const result = runIngest(args.input, args.run);
    console.log(`Ingest complete. Run: ${result.runId}`);
    console.log(`Records: ${result.count}`);
    console.log(`Output: ${result.outputPath}`);
    return;
  }

  if (args.command === "classify") {
    if (!args.input) {
      throw new Error("Missing required --input argument for classify command.");
    }

    const result = runClassify(args.input);
    console.log(`Classify complete.`);
    console.log(`Items: ${result.count}`);
    console.log(`Output: ${result.outputPath}`);
    return;
  }

  if (args.command === "eval") {
    if (!args.input) {
      throw new Error("Missing required --input argument for eval command.");
    }

    const result = runEval(args.input);
    console.log(`Eval complete. Passed: ${result.passed}`);
    console.log(`Output: ${result.outputPath}`);
    result.results.forEach((item) => {
      console.log(`- ${item.pass ? "PASS" : "FAIL"}: ${item.check}`);
    });
    return;
  }

  if (args.command === "patterns") {
    if (!args.input) {
      throw new Error("Missing required --input argument for patterns command.");
    }

    const result = runPatternMiner(args.input);
    console.log("Pattern mining complete.");
    console.log(`Items analyzed: ${result.totalItems}`);
    console.log(`Output: ${result.outputPath}`);
    return;
  }

  if (args.command === "ideas") {
    if (!args.classified || !args.patterns || !args.account) {
      throw new Error("ideas command requires --classified, --patterns, and --account.");
    }

    const result = runIdeaTransformer(args.classified, args.patterns, args.account);
    console.log("Idea transformer complete.");
    console.log(`Ideas generated: ${result.totalIdeas}`);
    console.log(`Output: ${result.outputPath}`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Error: ${message}`);
  process.exit(1);
}
