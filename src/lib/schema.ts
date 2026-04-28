import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true, strict: true });

export function loadSchema(schemaPath: string): object {
  const fullPath = path.resolve(schemaPath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
}

export function validateWithSchema<T>(schemaPath: string, data: unknown): T {
  const schema = loadSchema(schemaPath);
  const validate = ajv.compile<T>(schema);

  if (!validate(data)) {
    const details = (validate.errors ?? [])
      .map((err) => `${err.instancePath || "/"} ${err.message ?? "validation error"}`)
      .join("; ");
    throw new Error(`Schema validation failed for ${schemaPath}: ${details}`);
  }

  return data as T;
}
