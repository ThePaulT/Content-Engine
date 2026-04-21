import fs from "node:fs";
import path from "node:path";
import { ensureRunDir, resolveRunId, writeRunManifest } from "../io/runs";
import { writeJsonl } from "../io/jsonl";
import { normalizeUrlItem } from "./normalize";
import { validateWithSchema } from "../lib/schema";
import type { SourceRecord, UrlInputFile } from "../types";

const URL_INPUT_SCHEMA = "schemas/url_input.schema.json";
const SOURCE_RECORD_SCHEMA = "schemas/source_record.schema.json";

export function runIngest(inputPath: string, run?: string): { runId: string; count: number; outputPath: string } {
  const rawInput = fs.readFileSync(path.resolve(inputPath), "utf8");
  const parsedInput = JSON.parse(rawInput) as unknown;
  const input = validateWithSchema<UrlInputFile>(URL_INPUT_SCHEMA, parsedInput);

  const records: SourceRecord[] = input.items.map((item) => normalizeUrlItem(item));
  records.forEach((record) => validateWithSchema<SourceRecord>(SOURCE_RECORD_SCHEMA, record));

  const runId = resolveRunId(run);
  const runDir = ensureRunDir(runId);
  const outputPath = path.join(runDir, "source_records.jsonl");

  writeJsonl(outputPath, records);
  writeRunManifest(runDir, {
    run_id: runId,
    created_at: new Date().toISOString(),
    command: "ingest",
    input_path: inputPath,
    record_count: records.length,
    output_files: ["source_records.jsonl"]
  });

  return { runId, count: records.length, outputPath };
}
