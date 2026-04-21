import fs from "node:fs";
import path from "node:path";
import { readJsonl } from "../io/jsonl";
import { validateWithSchema } from "../lib/schema";
import type { ClassifiedContentItem } from "../types";

const CLASSIFIED_SCHEMA = "schemas/classified_content_item.schema.json";
const PATTERN_SCHEMA = "schemas/pattern_report.schema.json";

interface CountRow {
  key: string;
  count: number;
  share: number;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildCounts(values: string[], total: number): CountRow[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const key = normalizeLabel(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function topRecurring(values: string[], total: number, minCount = 2): CountRow[] {
  return buildCounts(values, total).filter((row) => row.count >= minCount);
}

function mineStrongPatterns(items: ClassifiedContentItem[]): Array<{ pattern_key: string; count: number; why_strong: string }> {
  const comboValues = items.map((item) => `${item.format} | ${item.hook_type} | ${item.payload_type}`);
  const combos = topRecurring(comboValues, items.length, 2);

  return combos.slice(0, 5).map((row) => ({
    pattern_key: row.key,
    count: row.count,
    why_strong:
      "This pattern recurs across multiple competitor assets and pairs a repeatable format-hook-payload structure that can be adapted without copying."
  }));
}

function mineWeakPatterns(items: ClassifiedContentItem[]): Array<{ pattern_key: string; count: number; why_weak_or_overused: string }> {
  const topics = buildCounts(items.map((item) => item.topic), items.length);
  const weak: Array<{ pattern_key: string; count: number; why_weak_or_overused: string }> = [];

  topics
    .filter((row) => row.share >= 0.4)
    .forEach((row) => {
      weak.push({
        pattern_key: `topic:${row.key}`,
        count: row.count,
        why_weak_or_overused: "This topic dominates competitor output, increasing saturation risk and reducing differentiation."
      });
    });

  if (weak.length === 0 && topics.length > 0) {
    const top = topics[0];
    weak.push({
      pattern_key: `topic:${top.key}`,
      count: top.count,
      why_weak_or_overused: "Highest-frequency topic observed; avoid repeating the same framing without a differentiated angle."
    });
  }

  return weak.slice(0, 5);
}

function mineWhitespace(items: ClassifiedContentItem[]): Array<{ opportunity: string; rationale: string }> {
  const formatCounts = buildCounts(items.map((item) => item.format), items.length);
  const hookCounts = buildCounts(items.map((item) => item.hook_type), items.length);

  const lowFormats = formatCounts.filter((row) => row.count === 1).slice(0, 3);
  const lowHooks = hookCounts.filter((row) => row.count === 1).slice(0, 3);

  const opportunities: Array<{ opportunity: string; rationale: string }> = [];

  lowFormats.forEach((row) => {
    opportunities.push({
      opportunity: `Increase coverage of underused format: ${row.key}`,
      rationale: "Competitors rarely use this format in the sample, suggesting room for distinctive positioning."
    });
  });

  lowHooks.forEach((row) => {
    opportunities.push({
      opportunity: `Test underused hook style: ${row.key}`,
      rationale: "Low-frequency hook style indicates potential white-space for fresh message entry points."
    });
  });

  if (opportunities.length === 0) {
    opportunities.push({
      opportunity: "Mix strong format with less common hook and payload combinations",
      rationale: "No clear single white-space segment found; differentiation likely comes from novel combinations."
    });
  }

  return opportunities.slice(0, 5);
}

export function runPatternMiner(inputPath: string): { outputPath: string; totalItems: number } {
  const items = readJsonl<ClassifiedContentItem>(inputPath);
  items.forEach((item) => validateWithSchema<ClassifiedContentItem>(CLASSIFIED_SCHEMA, item));

  const total = items.length;
  const recurringTopics = topRecurring(items.map((item) => item.topic), total).map((row) => ({
    topic: row.key,
    count: row.count,
    share: row.share
  }));

  const recurringFormats = topRecurring(items.map((item) => item.format), total).map((row) => ({
    format: row.key,
    count: row.count,
    share: row.share
  }));

  const recurringHooks = topRecurring(items.map((item) => item.hook_type), total).map((row) => ({
    hook_style: row.key,
    count: row.count,
    share: row.share
  }));

  const report = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    input_path: inputPath,
    total_items: total,
    recurring_topics: recurringTopics,
    recurring_formats: recurringFormats,
    recurring_hook_styles: recurringHooks,
    strong_patterns: mineStrongPatterns(items),
    weak_or_overused_patterns: mineWeakPatterns(items),
    white_space_opportunities_for_kudwa: mineWhitespace(items)
  };

  validateWithSchema(PATTERN_SCHEMA, report);

  const outputDir = path.join(process.cwd(), "data", "patterns");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `patterns_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  return { outputPath, totalItems: total };
}
