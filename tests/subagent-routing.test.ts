import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const referenceUrl = new URL("skills/references/subagent-routing.md", root);

const SECTIONS = [
	"Availability",
	"Handoff",
	"Authority",
	"Failures",
	"Compatibility",
] as const;

function reference(): string {
	return readFileSync(referenceUrl, "utf8");
}

function section(name: (typeof SECTIONS)[number]): string {
	const text = reference();
	const match = new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m").exec(
		text,
	);
	if (!match) throw new Error(`missing section ${name}`);
	return match[1];
}

describe("subagent routing reference", () => {
	it("SA-R00 exists as a plain reference with five sections and no registration", () => {
		expect(existsSync(referenceUrl)).toBe(true);
		expect(existsSync(new URL("skills/references/SKILL.md", root))).toBe(false);
		const text = reference();
		for (const name of SECTIONS) {
			expect(text).toMatch(new RegExp(`^## ${name}$`, "m"));
		}
		expect(text).not.toMatch(/^---\n/);
		expect(text).toMatch(/does not register/i);
		expect(text).toMatch(/settings/i);
		expect(text).toMatch(/install/i);
		expect(text).toMatch(/schema/i);
		expect(text).not.toMatch(/\bregisterAgent\b|npm install|bun add/);
	});

	it.each([
		"opsx-explore",
		"opsx-continue",
		"opsx-ff",
		"opsx-apply",
		"opsx-verify",
		"opsx-generate-specs",
	])("SA-R00 %s links the shared reference to the packaged file", (name) => {
		const skillUrl = new URL(`skills/${name}/SKILL.md`, root);
		const link = /\]\((\.\.\/references\/subagent-routing\.md)\)/.exec(
			readFileSync(skillUrl, "utf8"),
		);
		expect(link, `${name} lacks the shared reference link`).not.toBeNull();
		expect(new URL(link![1], skillUrl).href).toBe(referenceUrl.href);
		expect(existsSync(new URL(link![1], skillUrl))).toBe(true);
	});

	it("SA-R01 pins helper-only enable, next-turn re-evaluation, then management and role check", () => {
		const text = section("Availability");
		const enable = text.search(/subagents_enable/);
		const next = text.search(/next model turn/i);
		const inspect = text.search(/list|inspect/i);
		const canonical = text.search(/canonical/i);
		expect(enable).toBeGreaterThanOrEqual(0);
		expect(enable).toBeLessThan(next);
		expect(next).toBeLessThan(inspect);
		expect(inspect).toBeLessThan(canonical);
		expect(text).toMatch(/helper-only|only `subagents_enable`/i);
		expect(text).toMatch(/not disabled/i);
		expect(text).toMatch(/only the roles (?:the|this) (?:current )?stage requires|required roles for the current stage/i);
	});

	it("SA-R02 pins announced inline fallback only for absent integration", () => {
		const text = section("Availability");
		expect(text).toMatch(/neither the tool nor (?:its|the) (?:activation )?helper/i);
		expect(text).toMatch(/announce[^.]*once/i);
		expect(text).toMatch(/existing inline path/i);
		expect(text).toMatch(/gates[^.]*evidence/i);
		expect(text).toMatch(/do not (?:invent|fabricate)[^.]*(?:call|dispatch)/i);
		expect(text).toMatch(/absent[^.]*distinct[^.]*(?:unsupported|incompatible)|(?:unsupported|incompatible)[^.]*distinct[^.]*absent/i);
	});

	it("SA-R03 stops on disabled, missing or incompatible roles without bypass", () => {
		const text = section("Failures");
		for (const cause of [
			/disabled/i,
			/missing/i,
			/discovery/i,
			/skills?/i,
			/tools?/i,
		]) {
			expect(text).toMatch(cause);
		}
		expect(text).toMatch(/named cause/i);
		expect(text).toMatch(/never chooses[^.]*silently[^.]*user decides/i);
		expect(text).toMatch(/stop the affected (?:delegated )?stage/i);
		expect(text).toMatch(/do not (?:rewrite|write)[^.]*settings/i);
		expect(text).toMatch(/generic agent/i);
		expect(text).toMatch(/CLI/);
		expect(text).toMatch(/inline/i);
	});

	it("SA-R04 retains exact failure state and stops the lane", () => {
		const text = section("Failures");
		expect(text).toMatch(/exact error/i);
		expect(text).toMatch(/run (?:id|identity)/i);
		expect(text).toMatch(/cwd|worktree/i);
		expect(text).toMatch(/partial state/i);
		expect(text).toMatch(/stop the lane/i);
		expect(text).toMatch(/no (?:alternate|hidden)|do not (?:retry|switch)/i);
	});

	it("SA-R05 pins every handoff field and output binding", () => {
		const text = section("Handoff");
		for (const field of [
			/goal/i,
			/authoritative cwd/i,
			/change ?root/i,
			/resolved input paths/i,
			/task(?:\/| or | and )?(?:criterion )?IDs?|task\/criterion IDs/i,
			/refs? or diff package|refs\/diff/i,
			/constraints/i,
			/allowed edits/i,
			/acceptance criteria/i,
			/validation/i,
			/stop conditions/i,
			/report contract/i,
			/`output`/,
		]) {
			expect(text).toMatch(field);
		}
		expect(text).toMatch(/run-managed|scratch/i);
		expect(text).toMatch(/path in prose[^.]*(?:does not|not)[^.]*bind/i);
		expect(text).toMatch(/installed pi-subagents guidance/i);
		expect(text).toMatch(/agent:\s*"superspec\./);
		expect(text).toMatch(/context:\s*"fresh"/);
		expect(text).toMatch(/cwd:/);
		expect(text).toMatch(/output:/);
		const example = /```[\s\S]*?```/.exec(text)?.[0] ?? "";
		expect(example).not.toMatch(/model|thinking/i);
	});

	it("SA-R06 treats missing evidence as incomplete", () => {
		const text = section("Authority");
		expect(text).toMatch(/missing (?:required )?(?:evidence|section)/i);
		expect(text).toMatch(/incomplete/i);
		expect(text).toMatch(/process (?:exit|status)/i);
		expect(text).toMatch(/headings alone/i);
	});

	it("SA-R07 pins writer, context, nesting, model and review-seat rules", () => {
		const text = reference();
		expect(text).toMatch(/one implementation writer per worktree/i);
		expect(text).toMatch(/fresh (?:child )?context/i);
		expect(text).toMatch(/no nested/i);
		expect(text).toMatch(/model[^.]*thinking[^.]*override|override[^.]*model/i);
		expect(text).toMatch(/existing review seats?/i);
		expect(text).toMatch(/generic Superpowers reviewer/i);
		expect(text).toMatch(/parallel[^.]*independent/i);
		expect(text).toMatch(/wakes the parent/i);
		expect(text).toMatch(/no (?:short )?polling|do not poll/i);
		expect(text).toMatch(/bg_wait/);
	});

	it("SA-R08 keeps official authority with the parent", () => {
		const text = section("Authority");
		for (const owned of [
			/official artifact/i,
			/checkbox/i,
			/receipt outcomes?/i,
			/human gates?/i,
			/publication/i,
		]) {
			expect(text).toMatch(owned);
		}
		expect(text).toMatch(/inspect|check[^.]*evidence/i);
		expect(text).toMatch(/push|merge|pull request|PR/);
		expect(text).toMatch(/availability[^.]*not[^.]*permission|does not authorize/i);
	});

	it("documents compatibility truthfully", () => {
		const text = section("Compatibility");
		for (const capability of [/discovery/i, /namespace/i, /override/i, /selected[- ]skill/i, /`output`/]) {
			expect(text).toMatch(capability);
		}
		expect(text).toMatch(/0\.84\.0/);
		expect(text).toMatch(/d9f8f8c9a709a23adf5f323bb046f3fa91517d4c/);
		expect(text).toMatch(/not smoke-tested/i);
		expect(text).toMatch(/not a proven minimum/i);
	});
});

describe("architecture compatibility note", () => {
	const architecture = readFileSync(new URL("docs/architecture.md", root), "utf8");

	it("records the inspected reference build without a proven minimum", () => {
		expect(architecture).toMatch(/skills\/references\/subagent-routing\.md/);
		expect(architecture).toMatch(/0\.84\.0/);
		expect(architecture).toMatch(/d9f8f8c9a709a23adf5f323bb046f3fa91517d4c/);
		expect(architecture).toMatch(/inspected, not smoke-tested/i);
		expect(architecture).toMatch(/not a proven minimum/i);
	});
});
