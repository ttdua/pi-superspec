import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findProjectRoot, isActivated } from "../extensions/activation.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixture = (name: string) => join(fixtures, name);

const tmp = () => mkdtempSync(join(tmpdir(), "ps-"));

function writeSchema(root: string, content: string): void {
	const dir = join(root, "openspec", "schemas", "superspec");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "schema.yaml"), content);
}

describe("findProjectRoot", () => {
	it("returns cwd when it contains openspec/", () => {
		expect(findProjectRoot(fixture("marked"))).toBe(fixture("marked"));
	});

	it("returns an ancestor containing openspec/", () => {
		expect(findProjectRoot(join(fixture("marked"), "src", "nested"))).toBe(
			fixture("marked"),
		);
	});

	it("returns undefined when no ancestor has openspec/", () => {
		expect(findProjectRoot(tmp())).toBeUndefined();
	});

	it("prefers the nearest openspec/", () => {
		const root = tmp();
		mkdirSync(join(root, "a", "openspec"), { recursive: true });
		mkdirSync(join(root, "a", "b", "openspec"), { recursive: true });
		mkdirSync(join(root, "a", "b", "c"), { recursive: true });
		expect(findProjectRoot(join(root, "a", "b", "c"))).toBe(
			join(root, "a", "b"),
		);
	});

	it("ignores an openspec entry that is a file", () => {
		const root = tmp();
		writeFileSync(join(root, "openspec"), "");
		expect(findProjectRoot(root)).toBeUndefined();
	});

	it("returns undefined for a nonexistent cwd", () => {
		expect(findProjectRoot(join(tmp(), "missing"))).toBeUndefined();
	});
});

describe("isActivated", () => {
	it("is true for a top-level marker", () => {
		expect(isActivated(fixture("marked"))).toBe(true);
	});

	it("is false without the marker", () => {
		expect(isActivated(fixture("unmarked"))).toBe(false);
	});

	it("is false when the marker is only in a comment", () => {
		expect(isActivated(fixture("comment-only"))).toBe(false);
	});

	it("is false when the marker is only indented", () => {
		expect(isActivated(fixture("indented-only"))).toBe(false);
	});

	it("is false when the schema file is missing", () => {
		const root = tmp();
		mkdirSync(join(root, "openspec"));
		expect(isActivated(root)).toBe(false);
	});

	it("is false when schema.yaml is a directory", () => {
		const root = tmp();
		mkdirSync(join(root, "openspec", "schemas", "superspec", "schema.yaml"), {
			recursive: true,
		});
		expect(isActivated(root)).toBe(false);
	});

	it("is true for a marker with CRLF line endings", () => {
		const root = tmp();
		writeSchema(root, "name: superspec\r\nx-pi-superspec:\r\n  version: 5\r\n");
		expect(isActivated(root)).toBe(true);
	});

	it("is false for a key that only starts with the marker name", () => {
		const root = tmp();
		writeSchema(root, "x-pi-superspec-foo: 1\n");
		expect(isActivated(root)).toBe(false);
	});
});
