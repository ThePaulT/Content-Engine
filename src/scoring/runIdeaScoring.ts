import fs from "node:fs";
import path from "node:path";
import { validateWithSchema } from "../lib/schema";

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

interface IdeaReport {
  account_target?: string;
  ideas: IdeaItem[];
}

interface HistoricalItem {
  title?: string;
  hook?: string;
  phrase?: string;
  text?: string;
}

interface ScoreBreakdown {
  hook_strength: number;
  specificity: number;
  payload: number;
  account_fit: number;
  distinctiveness: number;
  repetition_risk: number;
  save_share_value: number;
  commercial_usefulness: number;
}

const IDEA_REPORT_SCHEMA = "schemas/idea_report.schema.json";
const SCORED_SCHEMA = "schemas/scored_ideas_report.schema.json";

function clampScore(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 2);
}

function jaccard(a: string, b: string): number {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 && sb.size === 0) return 0;
  let intersection = 0;
  sa.forEach((t) => {
    if (sb.has(t)) intersection += 1;
  });
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : intersection / union;
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(path.resolve(filePath), "utf8");
  return JSON.parse(raw) as T;
}

function loadHistory(filePath?: string): HistoricalItem[] {
  if (!filePath) return [];
  const parsed = readJson<unknown>(filePath);

  if (Array.isArray(parsed)) return parsed as HistoricalItem[];
  if (typeof parsed === "object" && parsed !== null && "ideas" in parsed) {
    const obj = parsed as { ideas?: IdeaItem[] };
    return (obj.ideas ?? []).map((x) => ({ title: x.working_title, hook: x.hook, text: x.core_angle }));
  }

  return [];
}

function scoreHookStrength(idea: IdeaItem): number {
  const hasColon = idea.hook.includes(":");
  const hasStrongVerb = /(prove|breakdown|misread|reveal|fix|win|lose|avoid)/i.test(idea.hook);
  return clampScore(5 + (hasColon ? 2 : 0) + (hasStrongVerb ? 2 : 0) + (idea.hook.length > 90 ? 1 : 0));
}

function scoreSpecificity(idea: IdeaItem): number {
  const tokens = new Set(tokenize(`${idea.working_title} ${idea.core_angle} ${idea.hook}`));
  return clampScore(3 + Math.min(7, Math.floor(tokens.size / 4)));
}

function scorePayload(idea: IdeaItem): number {
  const hasFramework = /(framework|step|map|table|checklist|breakdown|playbook)/i.test(idea.payload_type + " " + idea.core_angle);
  const visualDepth = idea.visual_needs.length >= 2 ? 2 : 1;
  return clampScore(4 + (hasFramework ? 4 : 2) + visualDepth);
}

function scoreAccountFit(idea: IdeaItem, account: string): number {
  if (account === "kudwa") {
    const fit = /(proof|visual|structured|useful)/i.test(`${idea.core_angle} ${idea.hook} ${idea.why_it_works}`);
    return clampScore(fit ? 9 : 6);
  }
  if (account === "karl") {
    const fit = /(hot take|operator|provocative|correction)/i.test(`${idea.hook} ${idea.core_angle}`);
    return clampScore(fit ? 9 : 6);
  }
  const fit = /(structural|system|constraint|infrastructure|data|product)/i.test(`${idea.hook} ${idea.core_angle}`);
  return clampScore(fit ? 9 : 6);
}

function detectSimilarity(
  idea: IdeaItem,
  recent: HistoricalItem[],
  published: HistoricalItem[],
  repeatedHooks: Map<string, number>,
  repeatedPhrases: Map<string, number>
): { tooSimilar: boolean; reasons: string[]; repetitionRisk: number; distinctiveness: number } {
  const reasons: string[] = [];
  let maxSim = 0;

  [...recent, ...published].forEach((item) => {
    const basis = `${item.title ?? ""} ${item.hook ?? ""} ${item.text ?? ""}`.trim();
    if (!basis) return;
    maxSim = Math.max(maxSim, jaccard(`${idea.working_title} ${idea.hook} ${idea.core_angle}`, basis));
  });

  if (maxSim >= 0.65) reasons.push(`High textual overlap with history (${maxSim.toFixed(2)}).`);

  const hookKey = idea.hook.toLowerCase();
  const hookCount = repeatedHooks.get(hookKey) ?? 0;
  if (hookCount > 1) reasons.push(`Hook pattern repeated ${hookCount} times.`);

  const phraseTokens = tokenize(`${idea.working_title} ${idea.hook} ${idea.core_angle}`);
  let repeatedPhraseHits = 0;
  phraseTokens.forEach((token) => {
    if ((repeatedPhrases.get(token) ?? 0) >= 5) repeatedPhraseHits += 1;
  });
  if (repeatedPhraseHits >= 4) reasons.push("Multiple repeated phrases detected.");

  const tooSimilar = reasons.length > 0;
  const repetitionRisk = clampScore(2 + Math.round(maxSim * 8) + (hookCount > 1 ? 2 : 0) + (repeatedPhraseHits >= 4 ? 2 : 0));
  const distinctiveness = clampScore(10 - repetitionRisk + (idea.content_lane.includes("provoke") ? 1 : 0));

  return { tooSimilar, reasons, repetitionRisk, distinctiveness };
}

function scoreSaveShareValue(idea: IdeaItem): number {
  const actionable = /(checklist|steps|playbook|framework|map|template)/i.test(`${idea.payload_type} ${idea.core_angle}`);
  const visual = idea.visual_needs.length >= 2;
  return clampScore(4 + (actionable ? 3 : 1) + (visual ? 3 : 1));
}

function scoreCommercialUsefulness(idea: IdeaItem): number {
  const commercialSignals = /(decision|buyer|adoption|conversion|retention|proof|implementation|outcome)/i.test(
    `${idea.core_angle} ${idea.why_it_works}`
  );
  return clampScore(commercialSignals ? 8 : 5);
}

function buildCritique(scores: ScoreBreakdown, tooSimilar: boolean, reasons: string[]): { critique: string; rewriteHint: string } {
  const weakFields = Object.entries(scores)
    .filter(([, val]) => val <= 6)
    .map(([k]) => k);

  const critique =
    weakFields.length === 0 && !tooSimilar
      ? "Strong idea with clear hook, practical payload, and good account fit."
      : `Needs work on: ${weakFields.join(", ") || "distinctiveness"}. ${reasons.join(" ")}`.trim();

  const rewriteHint =
    tooSimilar
      ? "Change the hook angle and swap to a different payload structure; anchor the post in a new proof point or case context."
      : "Increase specificity with one concrete scenario, one metric, and a clearer action sequence in the payload.";

  return { critique, rewriteHint };
}

export function runIdeaScoring(inputIdeasPath: string, recentPath?: string, publishedPath?: string): { outputPath: string; count: number } {
  const ideaReport = readJson<IdeaReport>(inputIdeasPath);
  validateWithSchema(IDEA_REPORT_SCHEMA, ideaReport);

  const recent = loadHistory(recentPath);
  const published = loadHistory(publishedPath);

  const repeatedHooks = new Map<string, number>();
  const repeatedPhrases = new Map<string, number>();

  ideaReport.ideas.forEach((idea) => {
    const hk = idea.hook.toLowerCase();
    repeatedHooks.set(hk, (repeatedHooks.get(hk) ?? 0) + 1);

    tokenize(`${idea.working_title} ${idea.hook} ${idea.core_angle}`).forEach((token) => {
      repeatedPhrases.set(token, (repeatedPhrases.get(token) ?? 0) + 1);
    });
  });

  const results = ideaReport.ideas.map((idea) => {
    const similarity = detectSimilarity(idea, recent, published, repeatedHooks, repeatedPhrases);

    const scores: ScoreBreakdown = {
      hook_strength: scoreHookStrength(idea),
      specificity: scoreSpecificity(idea),
      payload: scorePayload(idea),
      account_fit: scoreAccountFit(idea, ideaReport.account_target ?? "kudwa"),
      distinctiveness: similarity.distinctiveness,
      repetition_risk: similarity.repetitionRisk,
      save_share_value: scoreSaveShareValue(idea),
      commercial_usefulness: scoreCommercialUsefulness(idea)
    };

    const overall =
      (scores.hook_strength +
        scores.specificity +
        scores.payload +
        scores.account_fit +
        scores.distinctiveness +
        (10 - scores.repetition_risk) +
        scores.save_share_value +
        scores.commercial_usefulness) /
      8;

    const decision = similarity.tooSimilar ? "revise" : overall >= 8 ? "keep" : overall >= 6 ? "revise" : "kill";
    const critique = buildCritique(scores, similarity.tooSimilar, similarity.reasons);

    return {
      working_title: idea.working_title,
      scores,
      overall_score: Math.round(overall * 10) / 10,
      decision,
      critique: critique.critique,
      rewrite_hint: critique.rewriteHint,
      too_similar: similarity.tooSimilar,
      similarity_reasons: similarity.reasons
    };
  });

  const report = {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    input_paths: {
      ideas: inputIdeasPath,
      recent_ideas: recentPath,
      published_history: publishedPath
    },
    results
  };

  validateWithSchema(SCORED_SCHEMA, report);

  const outDir = path.join(process.cwd(), "data", "scored");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `scored_ideas_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  return { outputPath, count: results.length };
}
