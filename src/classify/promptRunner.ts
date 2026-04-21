import { createHash } from "node:crypto";
import { URL } from "node:url";
import type { ClassifiedContentItem, SourceRecord } from "../types";
import { buildClassifierPrompt } from "./prompt";

const VAGUE_TERMS = ["generic", "general", "misc", "n/a", "none", "various", "stuff", "things"];

function slugToWords(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitle(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferTopic(urlValue: string): { topic: string; subtopic: string } {
  const parsed = new URL(urlValue);
  const pieces = parsed.pathname.split("/").filter(Boolean);

  if (pieces.length === 0) {
    return { topic: "Homepage Positioning", subtopic: "Core Value Narrative" };
  }

  const topicRaw = slugToWords(pieces[pieces.length - 1]);
  const subtopicRaw = pieces.length > 1 ? slugToWords(pieces[pieces.length - 2]) : "Editorial Track";

  return {
    topic: toTitle(topicRaw || "Primary Narrative"),
    subtopic: toTitle(subtopicRaw || "Editorial Track")
  };
}

function inferFormat(sourceType: SourceRecord["source_type_hint"]): string {
  const map: Record<SourceRecord["source_type_hint"], string> = {
    blog: "Long-form educational article",
    product_page: "Product landing page",
    resource_hub: "Resource index page",
    case_study: "Case study narrative",
    changelog: "Release note",
    social_post: "Native social post",
    unknown: "Web content page"
  };
  return map[sourceType];
}

function inferHookType(sourceType: SourceRecord["source_type_hint"]): string {
  if (sourceType === "changelog") return "What changed and why now";
  if (sourceType === "case_study") return "Proof via outcomes";
  if (sourceType === "social_post") return "Opinion-led insight";
  if (sourceType === "product_page") return "Value proposition promise";
  return "Problem-to-solution framing";
}

function inferPayloadType(sourceType: SourceRecord["source_type_hint"]): string {
  if (sourceType === "changelog") return "Feature delta with impact notes";
  if (sourceType === "case_study") return "Before-after-results structure";
  if (sourceType === "social_post") return "Single-message short-form argument";
  if (sourceType === "product_page") return "Capabilities to outcomes mapping";
  if (sourceType === "resource_hub") return "Curated asset directory";
  return "Stepwise framework explanation";
}

function inferTone(sourceType: SourceRecord["source_type_hint"]): string {
  if (sourceType === "changelog") return "Direct and release-oriented";
  if (sourceType === "case_study") return "Evidence-forward and confident";
  if (sourceType === "social_post") return "Conversational and punchy";
  if (sourceType === "product_page") return "Benefit-led and persuasive";
  return "Educational and pragmatic";
}

function inferAudience(sourceType: SourceRecord["source_type_hint"]): string {
  if (sourceType === "product_page") return "Evaluation-stage buyers and team leads";
  if (sourceType === "case_study") return "Decision makers seeking implementation proof";
  if (sourceType === "changelog") return "Existing customers and active evaluators";
  if (sourceType === "social_post") return "Practitioners following category conversations";
  return "Operators researching repeatable growth tactics";
}

function inferBrand(domain: string): string {
  const head = domain.split(".")[0] ?? "unknown";
  return toTitle(head);
}

function inferReusableFlags(sourceType: SourceRecord["source_type_hint"]): {
  reusable_for_kudwa: boolean;
  reusable_for_karl: boolean;
  reusable_for_sam: boolean;
} {
  if (sourceType === "changelog") {
    return { reusable_for_kudwa: true, reusable_for_karl: false, reusable_for_sam: true };
  }

  if (sourceType === "social_post") {
    return { reusable_for_kudwa: true, reusable_for_karl: true, reusable_for_sam: true };
  }

  return { reusable_for_kudwa: true, reusable_for_karl: true, reusable_for_sam: false };
}

function deterministicItemId(recordId: string): string {
  const digest = createHash("sha1").update(recordId).digest("hex");
  return `cls_${digest.slice(0, 12)}`;
}

function assertNotVague(label: string, value: string): void {
  const low = value.trim().toLowerCase();
  if (low.length === 0) {
    throw new Error(`Classifier produced empty ${label}.`);
  }
  if (VAGUE_TERMS.some((term) => low === term || low.includes(` ${term} `))) {
    throw new Error(`Classifier produced vague ${label}: ${value}`);
  }
}

function enforceQuality(item: ClassifiedContentItem): void {
  assertNotVague("topic", item.topic);
  assertNotVague("subtopic", item.subtopic);
  assertNotVague("payload_type", item.payload_type);
  assertNotVague("hook_type", item.hook_type);
  assertNotVague("tone", item.tone);

  if (item.why_it_works.trim().length < 30) {
    throw new Error("Classifier produced weak why_it_works summary.");
  }

  if (item.weaknesses.some((entry) => entry.trim().length < 10)) {
    throw new Error("Classifier produced weak weaknesses entries.");
  }
}

export function runClassificationPrompt(record: SourceRecord): ClassifiedContentItem {
  // Phase 1 prompt call boundary; future versions can swap in live model invocation.
  const _prompt = buildClassifierPrompt(record);
  const { topic, subtopic } = inferTopic(record.url);
  const flags = inferReusableFlags(record.source_type_hint);

  const item: ClassifiedContentItem = {
    schema_version: "1.0.0",
    item_id: deterministicItemId(record.record_id),
    source_record_id: record.record_id,
    classified_at: new Date().toISOString(),
    classifier_version: "prompt-runner-v2",
    brand: inferBrand(record.domain),
    source_type: record.source_type_hint,
    topic,
    subtopic,
    target_audience: inferAudience(record.source_type_hint),
    format: inferFormat(record.source_type_hint),
    hook_type: inferHookType(record.source_type_hint),
    payload_type: inferPayloadType(record.source_type_hint),
    tone: inferTone(record.source_type_hint),
    why_it_works:
      `The piece pairs a ${inferHookType(record.source_type_hint).toLowerCase()} with a ${inferPayloadType(record.source_type_hint).toLowerCase()}, helping the target audience quickly understand relevance and next action.`,
    weaknesses: [
      "Narrative may rely on claims without enough quantitative evidence for skeptical readers.",
      "Content can feel repetitive if competitors use similar structure and angle."
    ],
    reusable_for_kudwa: flags.reusable_for_kudwa,
    reusable_for_karl: flags.reusable_for_karl,
    reusable_for_sam: flags.reusable_for_sam
  };

  enforceQuality(item);
  return item;
}
