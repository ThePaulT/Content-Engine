import fs from "node:fs";
import path from "node:path";
import { readJsonl } from "../io/jsonl";
import { validateWithSchema } from "../lib/schema";
import type { ClassifiedContentItem } from "../types";

const CLASSIFIED_SCHEMA = "schemas/classified_content_item.schema.json";
const EVAL_CASES_PATH = path.join(process.cwd(), "data", "eval", "cases.basic.json");
const VAGUE_TERMS = ["generic", "general", "misc", "n/a", "none", "various", "stuff", "things"];

interface EvalResult {
  check: string;
  pass: boolean;
  details: string;
}

interface EvalCaseDefinition {
  id: string;
  description: string;
}

function isVague(value: string): boolean {
  const low = value.toLowerCase().trim();
  return low.length < 30 || VAGUE_TERMS.some((term) => low === term || low.includes(` ${term} `));
}

function loadEvalCases(): EvalCaseDefinition[] {
  const raw = fs.readFileSync(EVAL_CASES_PATH, "utf8");
  const parsed = JSON.parse(raw) as { cases?: EvalCaseDefinition[] };
  if (!parsed.cases || parsed.cases.length !== 5) {
    throw new Error("Eval cases file must contain exactly 5 cases.");
  }
  return parsed.cases;
}

export function runEval(inputPath: string): { results: EvalResult[]; outputPath: string; passed: boolean } {
  const cases = loadEvalCases();
  const items = readJsonl<ClassifiedContentItem>(inputPath);

  const results: EvalResult[] = [];

  const schemaPass = items.every((item) => {
    try {
      validateWithSchema<ClassifiedContentItem>(CLASSIFIED_SCHEMA, item);
      return true;
    } catch {
      return false;
    }
  });
  results.push({
    check: "valid schema",
    pass: schemaPass,
    details: schemaPass ? "All items conform to schema." : "One or more items failed schema validation."
  });

  const topicPass = items.every((item) => item.topic.trim().length > 0);
  results.push({
    check: "non-empty topic",
    pass: topicPass,
    details: topicPass ? "All topics are non-empty." : "Found empty topic values."
  });

  const payloadPass = items.every((item) => item.payload_type.trim().length > 0);
  results.push({
    check: "non-empty payload_type",
    pass: payloadPass,
    details: payloadPass ? "All payload_type values are non-empty." : "Found empty payload_type values."
  });

  const reusableFlagsPass = items.every(
    (item) =>
      typeof item.reusable_for_kudwa === "boolean" &&
      typeof item.reusable_for_karl === "boolean" &&
      typeof item.reusable_for_sam === "boolean"
  );
  results.push({
    check: "reusable flags present",
    pass: reusableFlagsPass,
    details: reusableFlagsPass ? "All reusable flags are present and boolean." : "Missing or invalid reusable flags found."
  });

  const nonVaguePass = items.every(
    (item) =>
      !isVague(item.why_it_works) &&
      !isVague(item.topic) &&
      !isVague(item.payload_type) &&
      !isVague(item.hook_type)
  );
  results.push({
    check: "classifier output is not vague",
    pass: nonVaguePass,
    details: nonVaguePass ? "Classifier output avoids vague labels/summaries." : "Detected vague labels or summaries."
  });

  const passed = results.every((r) => r.pass);
  const output = {
    generated_at: new Date().toISOString(),
    input_path: inputPath,
    total_items: items.length,
    case_count: cases.length,
    passed,
    results
  };

  const outputPath = path.join(process.cwd(), "data", "eval", `eval_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  return { results, outputPath, passed };
}
