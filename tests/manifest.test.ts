import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("package manifest", () => {
	it("declares the pi-package keyword", () => {
		expect(pkg.keywords).toContain("pi-package");
	});

	it("declares extensions only in the pi block", () => {
		expect(pkg.pi.extensions).toEqual(["./extensions/superspec.ts"]);
		expect(pkg.pi.skills).toBeUndefined();
		expect(pkg.pi.prompts).toBeUndefined();
		expect(pkg.pi.themes).toBeUndefined();
	});

	it("lists the host package as a wildcard peer dependency", () => {
		expect(pkg.peerDependencies["@earendil-works/pi-coding-agent"]).toBe("*");
	});

	it("has no runtime dependencies", () => {
		expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
	});

	it("publishes extensions, skills, prompts and schema but not tests", () => {
		expect(pkg.files).toEqual(
			expect.arrayContaining(["extensions", "skills", "prompts", "schema"]),
		);
		expect(pkg.files).not.toContain("tests");
	});
});
