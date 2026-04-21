export type SourceTypeHint =
  | "blog"
  | "product_page"
  | "resource_hub"
  | "case_study"
  | "changelog"
  | "social_post"
  | "unknown";

export interface UrlInputItem {
  url: string;
  source_type_hint?: SourceTypeHint;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UrlInputFile {
  items: UrlInputItem[];
}

export interface SourceRecord {
  schema_version: "1.0.0";
  record_id: string;
  url: string;
  domain: string;
  source_type_hint: SourceTypeHint;
  ingested_at: string;
  status: "normalized" | "invalid";
  notes?: string;
  raw: {
    input_url: string;
    input_metadata?: Record<string, unknown>;
  };
}

export interface ClassifiedContentItem {
  schema_version: "1.0.0";
  item_id: string;
  source_record_id: string;
  classified_at: string;
  classifier_version: string;
  brand: string;
  source_type: SourceTypeHint;
  topic: string;
  subtopic: string;
  target_audience: string;
  format: string;
  hook_type: string;
  payload_type: string;
  tone: string;
  why_it_works: string;
  weaknesses: string[];
  reusable_for_kudwa: boolean;
  reusable_for_karl: boolean;
  reusable_for_sam: boolean;
}
