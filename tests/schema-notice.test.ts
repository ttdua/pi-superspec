import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashTree } from "../extensions/init/schema-install.ts";
import { schemaNotice } from "../extensions/schema-notice.ts";
import { project } from "./helpers/notice-project.ts";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("schemaNotice", () => {
	it("tells an upgradable schema to run /opsx-init", () => {
		const { root, schema } = project("upgradable");
		const before = hashTree(schema);
		const text = schemaNotice(root, PACKAGE_ROOT);
		expect(text).toMatch(/^Schema superspec v6 is older than the bundled v\d+\. Run \/opsx-init to upgrade\.$/);
		expect(text).not.toContain("--force");
		expect(hashTree(schema)).toEqual(before);
	});

	it("tells an older schema with local edits to use --force", () => {
		const { root, schema } = project("older");
		const before = hashTree(schema);
		expect(schemaNotice(root, PACKAGE_ROOT)).toMatch(
			/^Schema superspec v6 is older than the bundled v\d+ and has local edits\. Run \/opsx-init --force to replace it \(a backup is kept\)\.$/,
		);
		expect(hashTree(schema)).toEqual(before);
	});

	it("tells an edited current schema to use --force", () => {
		const { root, schema } = project("edited");
		const before = hashTree(schema);
		expect(schemaNotice(root, PACKAGE_ROOT)).toMatch(
			/^Schema superspec differs from the bundled v\d+ \(local edits\)\. Run \/opsx-init --force to replace it \(a backup is kept\)\.$/,
		);
		expect(hashTree(schema)).toEqual(before);
	});

	it("says nothing for an identical schema", () => {
		const { root, schema } = project("identical");
		const before = hashTree(schema);
		expect(schemaNotice(root, PACKAGE_ROOT)).toBeUndefined();
		expect(hashTree(schema)).toEqual(before);
	});

	it("says nothing when the schema is absent", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-superspec-notice-"));
		expect(schemaNotice(root, PACKAGE_ROOT)).toBeUndefined();
	});
});
