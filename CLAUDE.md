# CLAUDE.md

## Project intent

Kudwa Competitive Content Lab builds structured analysis from publicly available competitor URLs.

## Phase 1 implementation boundaries

Only build:
- scaffold
- schemas
- ingest pipeline for public URL lists
- classifier prompt scaffold
- minimal eval scaffold

Do not build idea generation yet.

## Engineering principles

- Keep dependencies minimal
- Prefer deterministic local JSON outputs
- Favor simple and explicit modules over abstraction
- Validate data at boundaries
- Keep schemas versioned and strict

## Output principles

- Every pipeline stage writes machine-readable artifacts
- Keep run outputs immutable under `data/runs/<run_id>/...`
- Include timestamps and schema version in emitted records
