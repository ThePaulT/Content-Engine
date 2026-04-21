import fs from "node:fs";
import path from "node:path";
import type { SourceRecord } from "../types";

const PROMPT_PATH = path.join(process.cwd(), "prompts", "content_classifier.md");

export function buildClassifierPrompt(record: SourceRecord): string {
  const template = fs.readFileSync(PROMPT_PATH, "utf8");
  return [
    template,
    "\nInput source_record:",
    JSON.stringify(record, null, 2),
    "\nReturn JSON now:"
  ].join("\n");
}
