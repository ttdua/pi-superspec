import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

describe("package manifest", () => {
	it("declares the pi-package keyword", () => {
		expect(pkg.keywords).toContain("pi-package");
	});

	it("declares extensions only in the pi block", () => {
		expect(Object.keys(pkg.pi).sort()).toEqual(["extensions", "subagents"]);
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

	it("SA-M01 declares optional package-agent discovery without changing pi resources", () => {
		expect(pkg["pi-subagents"].agents).toEqual(["./agents"]);
		expect(pkg.pi.subagents.agents).toEqual(["./agents"]);
		expect(pkg.pi.extensions).toEqual(["./extensions/superspec.ts"]);
		expect(pkg.pi.skills).toBeUndefined();
		expect(pkg.pi.prompts).toBeUndefined();
		expect(pkg.pi.themes).toBeUndefined();
	});

	it("Metadata added only", () => {
		expect(pkg.scripts).toEqual({ test: "vitest run", typecheck: "tsc --noEmit" });
		expect(pkg.dependencies).toBeUndefined();
		expect(pkg.files).toEqual(["extensions", "skills", "prompts", "schema", "agents"]);
	});

	it("SA-M02 publishes the agents directory and keeps zero runtime dependencies", () => {
		expect(pkg.files).toEqual(
			expect.arrayContaining([
				"extensions",
				"skills",
				"prompts",
				"schema",
				"agents",
			]),
		);
		expect(pkg.files).not.toContain("tests");
		expect(existsSync(new URL("../agents", import.meta.url))).toBe(true);
		expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
	});
});
