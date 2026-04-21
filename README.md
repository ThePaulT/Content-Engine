# Kudwa Competitive Content Lab (Phase 1)

Phase 1 implements a minimal, local-first pipeline for:

1. URL ingest into normalized source records
2. prompt-based classification into structured JSON
3. tiny eval harness over classified output
4. transparent pattern mining over classified data
5. idea transformation by account target

## Included in this phase

- TypeScript repo scaffold
- JSON schemas (`/schemas`)
- Prompt scaffold (`/prompts`)
- Local JSON storage (`/data`)
- CLI commands for `ingest`, `classify`, `eval`, `patterns`, and `ideas`

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

Produces:

- `data/ideas/ideas_<account>_<timestamp>.json`

## Idea output fields

Each idea includes:

- working_title
- content_lane
- format
- hook
- payload_type
- core_angle
- why_it_works
- visual_needs

Rules enforced in transformer:

- teach / prove / provoke / entertain orientation
- account voice separation (kudwa / karl / sam)
- anti-generic checks (rejects vague industry-insight filler)
- minimum 10 ideas per account per run
