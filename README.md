# Kudwa Competitive Content Lab (Phase 1)

Phase 1 implements a minimal, local-first pipeline for:

1. URL ingest into normalized source records
2. prompt-based classification into structured JSON
3. tiny eval harness over classified output
4. transparent pattern mining over classified data
5. idea transformation by account target
6. idea scoring + repetition checking

## Included in this phase

- TypeScript repo scaffold
- JSON schemas (`/schemas`)
- Prompt scaffold (`/prompts`)
- Local JSON storage (`/data`)
- CLI commands for `ingest`, `classify`, `eval`, `patterns`, `ideas`, and `score`

## Not included yet

- Draft post generation
- UI/web app

## Install

```bash
npm install
```

## Usage

### 1) Ingest

```bash
npm run ingest -- --input data/examples/urls.example.json --run demo
```

### 2) Classify

```bash
npm run classify -- --input data/runs/demo/source_records.jsonl
```

### 3) Eval

```bash
npm run eval -- --input data/classified/<file>.jsonl
```

### 4) Pattern miner

```bash
npm run patterns -- --input data/classified/<file>.jsonl
```

### 5) Idea transformer

```bash
npm run ideas -- --classified data/classified/<file>.jsonl --patterns data/patterns/<file>.json --account kudwa
```

### 6) Idea scoring + repetition check

```bash
npm run score -- --input data/ideas/<file>.json --recent data/ideas/recent.json --published data/ideas/published.json
```

Produces:

- `data/scored/scored_ideas_<timestamp>.json`

## Scoring fields

Each idea is scored on:

- hook_strength
- specificity
- payload
- account_fit
- distinctiveness
- repetition_risk
- save_share_value
- commercial_usefulness

And returns:

- overall_score
- keep / revise / kill
- critique
- rewrite_hint
- too_similar flag with reasons
