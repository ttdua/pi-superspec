import { appendFileSync, cpSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCHEMA_DIR, asV6 } from "./project.ts";

export type State = "upgradable" | "older" | "edited" | "identical";

/** Temp project whose schema is built from the bundled one plus the asV6/edit mutations. */
export function project(state: State): { root: string; schema: string } {
	const root = mkdtempSync(join(tmpdir(), "pi-superspec-notice-"));
	const schema = join(root, "openspec", "schemas", "superspec");
	mkdirSync(schema, { recursive: true });
	cpSync(SCHEMA_DIR, schema, { recursive: true });
	if (state === "upgradable" || state === "older") asV6(schema);
	if (state === "older" || state === "edited") appendFileSync(join(schema, "schema.yaml"), "\n# local edit\n");
	return { root, schema };
}
