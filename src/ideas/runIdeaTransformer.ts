import fs from "node:fs";
import path from "node:path";
import { readJsonl } from "../io/jsonl";
import { validateWithSchema } from "../lib/schema";
import type { ClassifiedContentItem } from "../types";

type AccountTarget = "kudwa" | "karl" | "sam";

interface PatternReport {
  recurring_topics: Array<{ topic: string; count: number; share: number }>;
  recurring_formats: Array<{ format: string; count: number; share: number }>;
  recurring_hook_styles: Array<{ hook_style: string; count: number; share: number }>;
  white_space_opportunities_for_kudwa: Array<{ opportunity: string; rationale: string }>;
}

interface IdeaItem {
  working_title: string;
  content_lane: string;
  format: string;
  hook: string;
  payload_type: string;
  core_angle: string;
  why_it_works: string;
  visual_needs: string[];
}

const CLASSIFIED_SCHEMA = "schemas/classified_content_item.schema.json";
const IDEA_REPORT_SCHEMA = "schemas/idea_report.schema.json";
const ACCOUNT_SET = new Set<AccountTarget>(["kudwa", "karl", "sam"]);
const MOTIVES = ["teach", "prove", "provoke", "entertain"] as const;

function readPatternReport(patternPath: string): PatternReport {
  const raw = fs.readFileSync(path.resolve(patternPath), "utf8");
  return JSON.parse(raw) as PatternReport;
}

function pick<T>(arr: T[], idx: number, fallback: T): T {
  if (arr.length === 0) {
    return fallback;
  }
  return arr[idx % arr.length];
}

function accountVoice(account: AccountTarget): { style: string; lanePrefix: string; visuals: string[] } {
  if (account === "kudwa") {
    return {
      style: "structured, useful, visual, proof-led",
      lanePrefix: "proof_system",
      visuals: ["before/after chart", "framework diagram", "evidence screenshot"]
    };
  }

  if (account === "karl") {
    return {
      style: "sharp, concrete, founder/operator, provocative",
      lanePrefix: "operator_take",
      visuals: ["hard metric callout", "mistake-to-playbook card", "decision tree graphic"]
    };
  }

  return {
    style: "systems/product/data/infrastructure, calm, structural",
    lanePrefix: "system_design_note",
    visuals: ["architecture sketch", "flow diagram", "metric table"]
  };
}

function ensureNonGeneric(value: string, field: string): void {
  const low = value.toLowerCase();
  if (low.includes("industry insight") || low.includes("generic") || low.trim().length < 8) {
    throw new Error(`Idea field '${field}' is too generic: ${value}`);
  }
}

function buildIdea(
  account: AccountTarget,
  idx: number,
  item: ClassifiedContentItem,
  pattern: PatternReport,
  recurringFormat: string,
  recurringHook: string
): IdeaItem {
  const motive = MOTIVES[idx % MOTIVES.length];
  const voice = accountVoice(account);
  const topic = item.topic;
  const whitespace = pick(
    pattern.white_space_opportunities_for_kudwa,
    idx,
    { opportunity: "Combine underused format and hook", rationale: "Creates differentiation via composition." }
  );

  const title = `${topic}: ${toTitle(motive)} Through ${toTitle(account)} Lens #${idx + 1}`;
  const hook =
    account === "karl"
      ? `Hot take: most teams misread ${topic}; here's the operator-level correction.`
      : account === "sam"
        ? `Structural view: what ${topic} reveals about system constraints and design tradeoffs.`
        : `Proof-led breakdown: what actually works in ${topic} and how to apply it visually.`;

  const coreAngle =
    `Use competitor pattern '${recurringFormat}' + '${recurringHook}' as input signal, then reframe using ${voice.style} to produce original guidance focused on ${whitespace.opportunity.toLowerCase()}.`;

  const whyItWorks =
    `This ${motive}-oriented concept transforms observed market patterns into a distinct ${account} point of view while staying concrete, practical, and non-derivative.`;

  const idea: IdeaItem = {
    working_title: title,
    content_lane: `${voice.lanePrefix}_${motive}`,
    format: recurringFormat,
    hook,
    payload_type: item.payload_type,
    core_angle: coreAngle,
    why_it_works: whyItWorks,
    visual_needs: voice.visuals
  };

  ensureNonGeneric(idea.working_title, "working_title");
  ensureNonGeneric(idea.hook, "hook");
  ensureNonGeneric(idea.core_angle, "core_angle");
  ensureNonGeneric(idea.why_it_works, "why_it_works");

  return idea;
}

function toTitle(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function runIdeaTransformer(
  classifiedPath: string,
  patternPath: string,
  accountInput: string
): { outputPath: string; totalIdeas: number } {
  const account = accountInput.toLowerCase() as AccountTarget;
  if (!ACCOUNT_SET.has(account)) {
    throw new Error("--account must be one of: kudwa, karl, sam");
  }

  const classified = readJsonl<ClassifiedContentItem>(path.resolve(classifiedPath));
  classified.forEach((item) => validateWithSchema<ClassifiedContentItem>(CLASSIFIED_SCHEMA, item));

  const patterns = readPatternReport(patternPath);

  const recurringFormats = patterns.recurring_formats.map((x) => x.format);
  const recurringHooks = patterns.recurring_hook_styles.map((x) => x.hook_style);

  const seedItems = classified.length === 0 ? [fallbackClassified()] : classified;
  const ideas: IdeaItem[] = [];

  for (let i = 0; i < 10; i += 1) {
    const source = pick(seedItems, i, fallbackClassified());
    const format = pick(recurringFormats, i, source.format);
    const hook = pick(recurringHooks, i, source.hook_type);
    ideas.push(buildIdea(account, i, source, patterns, format, hook));
  }

  const report = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    account_target: account,
    input_paths: {
      classified: classifiedPath,
      patterns: patternPath
    },
    ideas
  };

  validateWithSchema(IDEA_REPORT_SCHEMA, report);

  const outputDir = path.join(process.cwd(), "data", "ideas");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `ideas_${account}_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  return { outputPath, totalIdeas: ideas.length };
}

function fallbackClassified(): ClassifiedContentItem {
  return {
    schema_version: "1.0.0",
    item_id: "fallback",
    source_record_id: "fallback",
    classified_at: new Date().toISOString(),
    classifier_version: "fallback",
    brand: "fallback",
    source_type: "unknown",
    topic: "Content Differentiation",
    subtopic: "Positioning",
    target_audience: "Marketing operators",
    format: "Long-form educational article",
    hook_type: "Problem-to-solution framing",
    payload_type: "Stepwise framework explanation",
    tone: "Educational and pragmatic",
    why_it_works: "Fallback record for deterministic pipeline continuity.",
    weaknesses: ["Fallback item should be replaced by real classified data when available."],
    reusable_for_kudwa: true,
    reusable_for_karl: true,
    reusable_for_sam: true
  };
}
