import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { markerVersion, treeDigest } from "../extensions/init/schema-install.ts";
import { SCHEMA_DIR } from "./helpers/project.ts";

const fixture: Record<string, string> = JSON.parse(
	readFileSync(fileURLToPath(new URL("./fixtures/schema-checksums.json", import.meta.url)), "utf8"),
);

describe("bundled schema version pin", () => {
	const v = markerVersion(SCHEMA_DIR)!;
	const digest = treeDigest(SCHEMA_DIR);

	it("records a checksum for the current version", () => {
		expect(
			fixture[String(v)],
			`No checksum recorded for schema version ${v}. Add "${v}": "${digest}" to tests/fixtures/schema-checksums.json.`,
		).toBeDefined();
	});

	it("matches the recorded checksum", () => {
		expect(
			digest,
			`schema/superspec/ changed but version is still ${v}. Bump version and x-pi-superspec.version, then record the new digest.`,
		).toBe(fixture[String(v)]);
	});

	it("has no checksum for a newer version", () => {
		const newer = Object.keys(fixture).filter((k) => Number(k) > v);
		expect(newer).toEqual([]);
	});
});
