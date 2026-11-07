import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);

const AGENTS = [
	"scout",
	"spec-reviewer",
	"plan-reviewer",
	"implementer",
	"task-reviewer",
	"verifier",
] as const;
type AgentName = (typeof AGENTS)[number];

const REVIEWERS = ["spec-reviewer", "plan-reviewer", "task-reviewer"] as const;

function load(name: string) {
	const text = readFileSync(new URL(`agents/${name}.md`, root), "utf8");
	const { frontmatter, body } = parseFrontmatter<Record<string, unknown>>(text);
	return { frontmatter, body };
}

function list(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim());
	if (typeof value !== "string") return [];
	return value
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

function bool(value: unknown): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

const RECON_TOOLS = ["read", "grep", "find", "ls", "bash", "contact_supervisor"];
const REVIEW_TOOLS = ["read", "grep", "find", "ls", "contact_supervisor"];
const IMPLEMENT_TOOLS = [
	"read",
	"grep",
	"find",
	"ls",
	"bash",
	"edit",
	"write",
	"contact_supervisor",
];
const TOOLS: Record<AgentName, string[]> = {
	scout: RECON_TOOLS,
	"spec-reviewer": REVIEW_TOOLS,
	"plan-reviewer": REVIEW_TOOLS,
	"task-reviewer": REVIEW_TOOLS,
	implementer: IMPLEMENT_TOOLS,
	verifier: RECON_TOOLS,
};

describe("bundled agent identities (SA-A01)", () => {
	it("ships exactly the six agent files", () => {
		const files = existsSync(new URL("agents", root))
			? readdirSync(new URL("agents", root)).sort()
			: [];
		expect(files).toEqual(AGENTS.map((n) => `${n}.md`).sort());
	});

	it.each(AGENTS)("%s has local name, superspec package, description, no alias", (name) => {
		const { frontmatter } = load(name);
		expect(frontmatter.name).toBe(name);
		expect(frontmatter.package).toBe("superspec");
		expect(String(frontmatter.description ?? "").trim()).not.toBe("");
		expect(bool(frontmatter.advertise)).toBe(false);
		expect(frontmatter.alias).toBeUndefined();
		expect(frontmatter.aliases).toBeUndefined();
	});
});

describe("bundled agent defaults and tools (SA-A02)", () => {
	it.each(AGENTS)("%s has exact shared flags and tool set", (name) => {
		const { frontmatter: f } = load(name);
		expect(f.systemPromptMode).toBe("replace");
		expect(f.defaultContext).toBe("fresh");
		expect(bool(f.inheritProjectContext)).toBe(true);
		expect(bool(f.inheritGlobalContext)).toBe(true);
		expect(bool(f.inheritSkills)).toBe(false);
		expect(bool(f.defaultProgress)).toBe(false);
		expect(bool(f.allowNestedSubagents)).toBe(false);
		expect(f.acceptanceRole).toBe(name === "implementer" ? "writer" : "read-only");
		for (const key of [
			"model",
			"thinking",
			"output",
			"defaultReads",
			"extensions",
			"memory",
		]) {
			expect(f[key], key).toBeUndefined();
		}
		expect(list(f.tools).sort()).toEqual([...TOOLS[name]].sort());
		expect(list(f.tools)).not.toContain("subagent");
	});

	it("selects explicit skills per role", () => {
		expect(list(load("implementer").frontmatter.skills)).toEqual([
			"test-driven-development",
			"verification-before-completion",
			"systematic-debugging",
			"coding-standards",
		]);
		expect(list(load("verifier").frontmatter.skills)).toEqual([
			"verification-before-completion",
		]);
		expect(list(load("task-reviewer").frontmatter.skills)).toEqual(["coding-standards"]);
		expect(list(load("plan-reviewer").frontmatter.skills)).toEqual(["coding-standards"]);
		for (const name of ["scout", "spec-reviewer"] as const) {
			expect(load(name).frontmatter.skills, name).toBeUndefined();
		}
	});
});

describe("coding standard in code-facing roles", () => {
	const CODE_FACING = ["implementer", "task-reviewer", "plan-reviewer"] as const;

	it.each(CODE_FACING)("coding standard is optional for %s", (name) => {
		const { body } = load(name);
		expect(body).toContain("coding-standards");
		expect(body).toMatch(/Limitations/);
		expect(body).toMatch(/project conventions/i);
	});

	it.each(["task-reviewer", "plan-reviewer"] as const)(
		"%s does not return INCOMPLETE for a missing standard",
		(name) => {
			expect(load(name).body).toMatch(
				/not[^.]*INCOMPLETE[^.]*(missing|unavailable)|(missing|unavailable)[^.]*not[^.]*INCOMPLETE/i,
			);
		},
	);

	it("implementer applies the coding standard at refactor", () => {
		const { body } = load("implementer");
		expect(body).toMatch(/refactor/i);
		expect(body).toMatch(/(do not|never) defer/i);
		const escalation = body.split("## Escalation")[1]?.split(/\n## /)[0] ?? "";
		expect(escalation).toMatch(/except[^.]*`coding-standards`/);
	});

	it("task-reviewer reviews code quality and structure", () => {
		const { body } = load("task-reviewer");
		expect(body).toMatch(/code quality/i);
		expect(body).toMatch(/structure/i);
		expect(body).toMatch(/coding standard rule/i);
		expect(body).toMatch(/CHANGES_REQUESTED[^.]*structure|structure[^.]*CHANGES_REQUESTED/i);
	});

	it("plan-reviewer checks decomposition by responsibility", () => {
		const { body } = load("plan-reviewer");
		expect(body).toMatch(/responsibilit/i);
		expect(body).toMatch(/before[^.]*contracts?[^.]*fixed/i);
		expect(body).toMatch(/entry point/i);
	});

	it.each(["task-reviewer", "plan-reviewer"] as const)(
		"%s prompt states no numeric thresholds",
		(name) => {
			expect(load(name).body).not.toMatch(
				/\d+\s*(lines|complexity)|(lines|complexity)\D{0,12}\d/i,
			);
		},
	);

	it("package ships no coding-standards skill", () => {
		const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as {
			files: string[];
		};
		for (const entry of pkg.files) {
			const dir = new URL(entry, root);
			if (!existsSync(dir)) continue;
			for (const path of readdirSync(dir, { recursive: true }) as string[]) {
				expect(String(path).split(/[\\/]/), `${entry}/${path}`).not.toContain(
					"coding-standards",
				);
			}
		}
	});
});

describe("scout contract (SA-A03)", () => {
	const { body } = load("scout");
	it("requires the scout report headings", () => {
		for (const h of [
			"## Summary",
			"## Evidence",
			"## Findings",
			"## Limitations",
			"## Candidate behaviors",
			"## Start here",
		]) {
			expect(body).toContain(h);
		}
	});
	it("is evidence-only and inspection-only", () => {
		expect(body).toMatch(/do not (edit|modify)[^.]*product files/i);
		expect(body).toMatch(/official artifacts?/i);
		expect(body).toMatch(/inspection/i);
		expect(body).toMatch(/not a sandbox/i);
		expect(body).toMatch(/path[^.]*line/i);
		expect(body).toMatch(/contact_supervisor/);
	});
});

describe("reviewer contract (SA-A04)", () => {
	it.each(REVIEWERS)("%s reports findings, verdict and limitations", (name) => {
		const { body, frontmatter } = load(name);
		for (const h of [
			"## Summary",
			"## Evidence",
			"## Findings",
			"## Limitations",
			"## Verdict",
		]) {
			expect(body, h).toContain(h);
		}
		for (const field of ["criterion", "severity", "recommendation"]) {
			expect(body.toLowerCase(), field).toContain(field);
		}
		for (const v of ["PASS", "CHANGES_REQUESTED", "INCOMPLETE"]) {
			expect(body, v).toContain(v);
		}
		expect(body).toMatch(/advisory/i);
		expect(body).toMatch(/human (gate|approval)/i);
		expect(list(frontmatter.tools)).not.toContain("bash");
		expect(list(frontmatter.tools)).not.toContain("write");
		expect(list(frontmatter.tools)).not.toContain("edit");
	});

	it("spec-reviewer compares deltas with the supplied baseline", () => {
		const { body } = load("spec-reviewer");
		expect(body).toContain("## Baseline comparison");
		expect(body).toMatch(/header[^.\n]*no exact match[^.\n]*main spec/i);
		expect(body).toMatch(/scenario[^.\n]*missing from a `MODIFIED` block[^.\n]*intentional/i);
		expect(body).toMatch(/main spec[^.\n]*not supplied[^.\n]*Limitations/i);
		expect(body).toMatch(/never report the comparison as passed/i);
	});

	it("task-reviewer supports exact per-task and whole-branch ranges and never claims an unavailable diff", () => {
		const { body } = load("task-reviewer");
		expect(body).toMatch(/per-task/i);
		expect(body).toMatch(/whole-branch/i);
		expect(body).toMatch(/BASE\.\.HEAD/);
		expect(body).toMatch(/unavailable/i);
		expect(body).toMatch(/INCOMPLETE/);
	});
});

describe("implementer contract (SA-A05)", () => {
	const { body } = load("implementer");
	it("follows TDD in the assigned worktree within authorized edits", () => {
		expect(body).toMatch(/test-driven-development/);
		expect(body).toMatch(/failing test|RED/i);
		expect(body).toMatch(/allowed edits|authorized/i);
		expect(body).toMatch(/assigned worktree/i);
	});
	it("reports required sections", () => {
		for (const h of [
			"## Summary",
			"## Evidence",
			"## Findings",
			"## Limitations",
			"## Changes",
			"## Validation",
			"## Contract deviations",
		]) {
			expect(body).toContain(h);
		}
		expect(body).toMatch(/BASE\.\.HEAD/);
		expect(body).toMatch(/cwd/);
		expect(body).toMatch(/exit/i);
	});
	it("escalates and refuses publication and official artifact edits", () => {
		expect(body).toMatch(/contact_supervisor/);
		expect(body).toMatch(/unapproved/i);
		expect(body).toMatch(/do not (push|publish)/i);
		expect(body).toMatch(/official[^.]*(artifact|planning|progress|receipt)/i);
		expect(body).toMatch(/do not (dispatch|delegate)/i);
	});
});

describe("verifier contract (SA-A06)", () => {
	const { body } = load("verifier");
	it("covers all six checks with per-check status", () => {
		for (const check of [
			"Structural validation",
			"Task completion",
			"Requirement evidence",
			"Scenario coverage",
			"Design and contract coherence",
			"Clean tree",
		]) {
			expect(body).toContain(check);
		}
		for (const status of ["verified", "failed", "not verified"]) {
			expect(body).toContain(status);
		}
	});
	it("requires validation fields and forbids fixes and receipts", () => {
		for (const h of ["## Checks", "## Validation", "## Summary", "## Evidence", "## Findings", "## Limitations"]) {
			expect(body).toContain(h);
		}
		expect(body).toMatch(/cwd/);
		expect(body).toMatch(/exit/i);
		expect(body).toMatch(/do not fix/i);
		expect(body).toMatch(/verify\.md|receipt/i);
		expect(body).toMatch(/not a sandbox/i);
	});
});
