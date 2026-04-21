import fs from "node:fs";
import path from "node:path";
import { readJsonl, writeJsonl } from "../io/jsonl";
import { validateWithSchema } from "../lib/schema";
import { runClassificationPrompt } from "./promptRunner";
import type { ClassifiedContentItem, SourceRecord } from "../types";

const SOURCE_RECORD_SCHEMA = "schemas/source_record.schema.json";
const CLASSIFIED_SCHEMA = "schemas/classified_content_item.schema.json";

export function runClassify(inputPath: string): { count: number; outputPath: string } {
  const sourceRecords = readJsonl<SourceRecord>(inputPath);

  sourceRecords.forEach((record) => validateWithSchema<SourceRecord>(SOURCE_RECORD_SCHEMA, record));

  const items: ClassifiedContentItem[] = sourceRecords.map((record) => runClassificationPrompt(record));

  items.forEach((item) => validateWithSchema<ClassifiedContentItem>(CLASSIFIED_SCHEMA, item));

  const outputDir = path.join(process.cwd(), "data", "classified");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `classified_${Date.now()}.jsonl`);
  writeJsonl(outputPath, items);

  return { count: items.length, outputPath };
}
