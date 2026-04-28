import fs from "node:fs";
import path from "node:path";

export function resolveRunId(run?: string): string {
  if (run && run.trim().length > 0) {
    return run.trim();
  }

  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function ensureRunDir(runId: string): string {
  const runDir = path.join(process.cwd(), "data", "runs", runId);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
}

export function writeRunManifest(runDir: string, payload: Record<string, unknown>): void {
  const manifestPath = path.join(runDir, "run_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), "utf8");
}
