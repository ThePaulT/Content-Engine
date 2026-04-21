# Content Classifier Prompt (Phase 1)

You are given a normalized competitor `source_record`.

Return exactly one JSON object matching `classified_content_item` schema.

Required fields:
- brand
- source_type
- topic
- subtopic
- target_audience
- format
- hook_type
- payload_type
- tone
- why_it_works
- weaknesses
- reusable_for_kudwa
- reusable_for_karl
- reusable_for_sam

Quality bar:
- Use specific labels (no placeholders like "generic", "general", "misc", "n/a", "unknown" unless source_type itself is unknown).
- why_it_works must be concrete and actionable (minimum ~30 chars).
- weaknesses should be concrete, not filler.
- Do not return markdown.
- Return JSON only.
