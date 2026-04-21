import { createHash } from "node:crypto";
import { URL } from "node:url";
import type { SourceRecord, UrlInputItem } from "../types";

function stableRecordId(url: string): string {
  const digest = createHash("sha1").update(url).digest("hex");
  return `src_${digest.slice(0, 12)}`;
}

export function normalizeUrlItem(item: UrlInputItem): SourceRecord {
  const parsed = new URL(item.url);
  const normalizedUrl = parsed.toString();

  return {
    schema_version: "1.0.0",
    record_id: stableRecordId(normalizedUrl),
    url: normalizedUrl,
    domain: parsed.hostname,
    source_type_hint: item.source_type_hint ?? "unknown",
    ingested_at: new Date().toISOString(),
    status: "normalized",
    notes: item.notes,
    raw: {
      input_url: item.url,
      input_metadata: item.metadata
    }
  };
}
