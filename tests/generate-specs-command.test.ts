import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);

function read(path: string): string {
	return readFileSync(new URL(path, root), "utf8");
}

function exists(path: string): boolean {
	return existsSync(new URL(path, root));
}

function frontmatter(text: string): string {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	return match ? match[1] : "";
}

const SKILL = "skills/opsx-generate-specs/SKILL.md";
const PROMPT = "prompts/opsx-generate-specs.md";

describe("opsx-generate-specs command", () => {
	it("has a skill and prompt pair with matching names", () => {
		expect(exists(SKILL)).toBe(true);
		expect(exists(PROMPT)).toBe(true);
		expect(frontmatter(read(SKILL))).toMatch(/^name: opsx-generate-specs\s*$/m);
	});

	it("Stops after specs: hands off to openspec-ff-change bootstrap-specs, no old step command", () => {
		for (const path of [SKILL, PROMPT]) {
			expect(read(path), path).not.toMatch(/\/opsx-(explore|new|continue|ff|apply|verify|sync|archive)\b/);
		}
		expect(read(SKILL)).toContain("/skill:openspec-ff-change bootstrap-specs");
	});

	it("keeps the prompt as a short delegation", () => {
		const prompt = read(PROMPT);
		expect(prompt).toContain("opsx-generate-specs");
		expect(prompt).toContain("$@");
		expect(prompt.split(/\r?\n/).length).toBeLessThan(12);
	});

	it("uses no Claude tool names", () => {
		for (const path of [SKILL, PROMPT]) {
			const text = read(path);
			for (const banned of ["AskUserQuestion", "TodoWrite", "Task tool"]) {
				expect(text, `${path} contains ${banned}`).not.toContain(banned);
			}
			expect(text, path).not.toMatch(/ask_user_question|plannotator/i);
		}
	});

	it("states the required rules and values", () => {
		const skill = read(SKILL);
		for (const needle of [
			"bootstrap-specs",
			"openspec-ff-change bootstrap-specs",
			"Evidence:",
			"Confidence: inferred",
			"No design needed:",
			"Subagent integration paragraph",
			"Interaction channel",
			"openspec/specs/",
			"node_modules",
			"openspec validate bootstrap-specs --strict",
			"`language:` from `openspec/config.yaml`",
			"at most 12 capability candidates",
		]) {
			expect(skill, `skill lacks ${needle}`).toContain(needle);
		}
	});

	it("defines the scout contract and language before dispatch and passes them on", () => {
		const skill = read(SKILL);
		const contract = skill.indexOf("**Scout contract**");
		const language = skill.indexOf("**Language**");
		const dispatch = skill.indexOf("**SCOUT each capability**");
		expect(contract).toBeGreaterThan(-1);
		expect(language).toBeGreaterThan(-1);
		expect(dispatch).toBeGreaterThan(-1);
		expect(contract).toBeLessThan(dispatch);
		expect(language).toBeLessThan(dispatch);
		const section = skill.slice(dispatch, skill.indexOf("**Write the other artifacts**"));
		expect(section).toContain("specs/<capability>/spec.md");
		expect(section).toMatch(/scout contract/i);
		expect(section).toMatch(/document language/i);
		expect(section).toMatch(/every scout/i);
	});

	it("gives the scout a literal requirement template in validating order", () => {
		const skill = read(SKILL);
		const header = skill.indexOf("### Requirement: <name>");
		expect(header).toBeGreaterThan(-1);
		const shall = skill.indexOf("SHALL", header);
		const evidence = skill.indexOf("Evidence: <", header);
		const scenario = skill.indexOf("#### Scenario: <name>", header);
		expect(shall).toBeGreaterThan(header);
		expect(shall).toBeLessThan(evidence);
		expect(evidence).toBeLessThan(scenario);
		expect(skill).toContain("first line of the requirement body");
	});

	it("resumes per capability file and re-applies the name filter after confirm", () => {
		const skill = read(SKILL);
		expect(skill).toContain("specs/<capability>/spec.md` is missing");
		expect(skill).toMatch(/never rewrite one that exists/i);
		expect(skill).toMatch(/after the user's edits[^]*openspec\/specs\//i);
	});

	it("states that no product code changes and follows artifact instructions", () => {
		const skill = read(SKILL);
		expect(skill).toContain("No product code changes; tasks verify each spec against the code and its evidence");
		expect(skill).toContain("openspec instructions");
		expect(skill).toContain("### New Capabilities");
	});

	it("checks for an existing change before creating one", () => {
		const skill = read(SKILL);
		expect(skill.indexOf("openspec list --json")).toBeLessThan(skill.indexOf("openspec new change"));
	});

	it("keeps the evidence and header tokens in English", () => {
		const skill = read(SKILL);
		const language = skill.slice(skill.indexOf("**Language**"), skill.indexOf("**SCOUT each capability**"));
		for (const token of ["Evidence:", "Confidence: inferred", "### Requirement:", "#### Scenario:"]) {
			expect(language).toContain(token);
		}
	});

	it("confirms before scouting", () => {
		const skill = read(SKILL);
		expect(skill.indexOf("**CONFIRM once**")).toBeLessThan(skill.indexOf("**SCOUT each capability**"));
	});

	it("never writes tasks.md", () => {
		expect(read(SKILL)).toContain("Do not write tasks.md");
	});

	it("lists every prompt command in a table row of both READMEs, and --generate and --force on the init row", () => {
		const names = readdirSync(new URL("prompts/", root))
			.filter((file) => /^opsx-.+\.md$/.test(file))
			.map((file) => file.replace(/\.md$/, ""));
		for (const readme of ["README.md", "README.vi.md"]) {
			const rows = read(readme)
				.split(/\r?\n/)
				.filter((line) => line.startsWith("|"));
			for (const name of names) {
				expect(
					rows.some((row) => row.includes(`\`/${name}\``)),
					`${readme} lacks a table row for /${name}`,
				).toBe(true);
			}
			const init = rows.find((row) => row.includes("`/opsx-init`"));
			expect(init, `${readme} lacks the init row`).toContain("--generate");
			expect(init, `${readme} init row lacks --force`).toContain("--force");
		}
	});
});

describe("generate-specs evidence-only scouts", () => {
	const skill = () => read(SKILL);
	const step = (from: string, to: string) => {
		const text = skill();
		return text.slice(text.indexOf(from), text.indexOf(to));
	};
	const map = () => step("**MAP the codebase**", "**Drop existing specs**");
	it("SA-G00 resolves the routing path against the project root in both reads", () => {
		expect(map()).toMatch(/relative to the activated project's root, not this skill's directory/);
		expect(dispatch()).toMatch(/relative to the activated project's root, not this skill's directory/);
	});
	const dispatch = () => step("**SCOUT each capability**", "**Write the other artifacts**");

	it("SA-G00 reads the shared routing reference before delegating", () => {
		expect(skill()).toContain("openspec/schemas/superspec/subagent-routing.md");
		expect(skill()).not.toContain("../references/");
		expect(skill()).toMatch(/relative to the activated project's root, not this skill's directory/);
		expect(skill()).not.toContain("## Availability");
		expect(skill()).not.toContain("Helper-only");
	});

	it("SA-G01 map returns at most 12 compound kebab-case candidates with purpose and directories", () => {
		const text = map();
		expect(text).toContain("at most 12 capability candidates");
		expect(text).toMatch(/kebab-case name of at least two words/);
		expect(text).toMatch(/one-line purpose/);
		expect(text).toMatch(/directories it covers/);
	});

	it("SA-G14 map skips ignored roots", () => {
		const text = map();
		for (const root of ["node_modules", "dist", "build", "vendor", ".git", "generated files"]) {
			expect(text).toContain(root);
		}
		expect(text).toMatch(/No candidate covers an ignored directory/);
	});

	it("SA-G02 map scout is one scout role on configured settings without model or thinking override", () => {
		const text = map();
		expect(text).toContain("scout role");
		expect(text).toMatch(/one map scout/i);
		expect(text).toMatch(/configured model/i);
		expect(text).toMatch(/as the Subagent integration paragraph describes/);
		expect(text).toMatch(/collect the report as the paragraph describes/);
		expect(text).toMatch(/no (per-(call|dispatch) )?model\/thinking override|without (a )?(per-(call|dispatch) )?model\/thinking override/i);
		expect(text).not.toMatch(/fast model/i);
		expect(skill()).not.toMatch(/fast model/i);
		expect(text).toMatch(/disabled or missing role or a failed map scout stops[^.]*named cause[^.]*no substitute[^.]*no silent inline/i);
	});

	it("SA-G03 map scout runs before confirmation and capability scouts only follow the confirmed list", () => {
		const text = skill();
		expect(text.indexOf("**MAP the codebase**")).toBeLessThan(text.indexOf("**CONFIRM once**"));
		const confirm = step("**CONFIRM once**", "**Create the bootstrap change**");
		expect(confirm).toMatch(/map scout is not a capability scout/i);
		expect(confirm).toMatch(/no capability scout runs before the user confirms/i);
		expect(dispatch()).toMatch(/only for the confirmed list/i);
	});

	it("SA-G15 cancellation creates no change and no capability scout", () => {
		const confirm = step("**CONFIRM once**", "**Create the bootstrap change**");
		expect(confirm).toMatch(/cancels[^]*Create no change/);
		expect(confirm).toMatch(/cancels[^]*no capability scout/i);
	});

	it("SA-G04 dispatches one evidence-only scout per confirmed missing capability and the parent writes official files", () => {
		const text = dispatch();
		expect(text).toMatch(/one evidence-only scout per confirmed capability[^.\n]*missing/i);
		expect(text).toMatch(/parent (alone )?writes[^.\n]*(official|spec)/i);
		expect(text).toMatch(/scouts? (never|must never|do not|must not) write[^.\n]*spec/i);
		expect(text).toMatch(/collect[^.]*report as the paragraph describes/i);
		expect(text).toMatch(/scratch|run-managed/i);
		expect(text).not.toMatch(/Scouts write their own files/i);
		expect(text).not.toMatch(/output path `openspec\/changes\/bootstrap-specs\/specs/);
	});

	it("SA-G05 absent integration scouts inline sequentially and writes each spec before the next", () => {
		const text = dispatch();
		expect(text).toMatch(/absent[^]*one after another[^]*write each spec[^.\n]*before (starting )?the next/i);
		expect(text).toMatch(/never (invent|fabricate)[^.\n]*(subagent|child)/i);
	});

	it("SA-G06 re-filters after rename and skips existing spec files and done artifacts", () => {
		const text = skill();
		expect(text).toMatch(/after the user's edits[^]*openspec\/specs\//i);
		expect(text).toMatch(/spec file already present in an existing `bootstrap-specs` change/);
		expect(text).toMatch(/skip every artifact that is `done`/);
		expect(text).toMatch(/never rewrite one that exists/i);
		expect(dispatch()).toMatch(/never (re-scout|overwrite)|not re-scout/i);
	});

	it("SA-G07..G11 scout evidence obligations: presence, content, inferred label, observable behaviour, tests and docs", () => {
		const contract = step("**Scout contract**", "**Language**");
		expect(contract).toMatch(/Every requirement has an `Evidence:` line/);
		expect(contract).toMatch(/naming the files \(with line numbers where known\), tests or documents/);
		expect(contract).toContain("Confidence: inferred");
		expect(contract).toMatch(/only when code alone backs the requirement/);
		expect(contract).toMatch(/observable behaviour, not module or function structure/);
		expect(contract).toMatch(/Read tests and documentation as well as source/);
		expect(dispatch()).toMatch(/Candidate behaviors/);
		expect(dispatch()).toMatch(/tests and documentation/i);
	});

	it("SA-G12 reviews drafts internally, then strict-validates, fixes and reruns, and keeps the ff handoff", () => {
		const text = skill();
		const review = text.search(/spec reviewer role/);
		const validate = text.indexOf("openspec validate bootstrap-specs --strict");
		const handoff = text.indexOf("/skill:openspec-ff-change bootstrap-specs`.\"");
		expect(review).toBeGreaterThan(text.indexOf("**SCOUT each capability**"));
		expect(review).toBeLessThan(validate);
		expect(validate).toBeLessThan(handoff);
		expect(text).toMatch(/no new human gate|without a new human gate/i);
		expect(text).toMatch(/fix the files and run it again until it passes/);
		expect(text).toMatch(/absent[^.\n]*inline/i);
	});

	it("SA-G12 step-8 review context uses only what exists and findings are all resolved", () => {
		const text = dispatch();
		const review = text.slice(text.indexOf("review the new drafts"));
		expect(review).not.toMatch(/proposal/i);
		expect(review).toMatch(/confirmed capability list/i);
		expect(review).toMatch(/scout evidence reports/i);
		expect(review).toMatch(/Resolve (all )?findings/);
		expect(review).not.toMatch(/substantive/i);
	});

	it("SA-G13 parent alone writes official artifacts; reports are run-managed scratch", () => {
		const text = skill();
		expect(text).toMatch(/parent (alone )?(writes|owns)[^.\n]*(official|artifact|spec)/i);
		expect(text).toMatch(/reports? (remain|stay|are)[^.\n]*(run-managed|scratch)/i);
		expect(text).toMatch(/Never let a (scout|child) write/i);
	});
});
