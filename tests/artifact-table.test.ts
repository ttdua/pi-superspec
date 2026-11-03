import { describe, expect, it } from "vitest";
import { parseArtifactTable } from "./helpers/artifact-table.js";

describe("parseArtifactTable", () => {
	it("parseArtifactTable throws without a table", () => {
		expect(() => parseArtifactTable("# Nothing\n\n## Other\n")).toThrow(
			"Artifact table not found in docs/domain-model.md",
		);
		expect(() => parseArtifactTable("## Artifact\n\nno table\n")).toThrow(
			"Artifact table not found in docs/domain-model.md",
		);
	});

	it("parses none as [] and comma lists as several ids", () => {
		const md = [
			"## Artifact",
			"",
			"| ID | File | Requires | Notes |",
			"|---|---|---|---|",
			"| `a` | `a.md` | — | first |",
			"| `b` | `b.md` | a | second |",
			"| `c` | `c.md` | `a`, b | third |",
			"",
			"## Next",
		].join("\n");
		const map = parseArtifactTable(md);
		expect(map.get("a")).toEqual([]);
		expect(map.get("b")).toEqual(["a"]);
		expect(map.get("c")).toEqual(["a", "b"]);
		expect([...map.keys()]).toEqual(["a", "b", "c"]);
	});
});
