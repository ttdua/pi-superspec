import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import {
	expectStockPrompt,
	STOCK_SKILL,
	type PromptCommand,
} from "./helpers/stock-prompt.ts";
import { flatSection, sentences, workflow, workflowSection } from "./helpers/workflow.ts";

const root = new URL("..", import.meta.url);
const rootPath = fileURLToPath(root);

const COMMANDS: readonly PromptCommand[] = ["explore", "new", "continue", "ff"];

function read(path: string): string {
	return readFileSync(new URL(path, root), "utf8");
}

function exists(path: string): boolean {
	return existsSync(new URL(path, root));
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

const gate = () => workflowSection("Review gate");

function inOrder(text: string, parts: string[]): void {
	let last = -1;
	for (const part of parts) {
		const at = text.indexOf(part);
		expect(at, part).toBeGreaterThan(-1);
		expect(at, part).toBeGreaterThan(last);
		last = at;
	}
}

describe("planning commands: package layout", () => {
	it("Only the generate-specs skill ships in skills/", () => {
		expect(readdirSync(new URL("skills", root)).sort()).toEqual(["opsx-generate-specs"]);
	});

	it("Prompts exist without package skills", () => {
		for (const c of COMMANDS) {
			expect(exists(`prompts/opsx-${c}.md`)).toBe(true);
			expect(exists(`skills/opsx-${c}`), c).toBe(false);
		}
	});

	it("Prompt maps to its stock skill", () => {
		for (const c of COMMANDS) {
			expectStockPrompt(read(`prompts/opsx-${c}.md`), c);
		}
		expectStockPrompt(read("prompts/opsx-ff.md"), "ff");
		expect(read("prompts/opsx-ff.md")).toContain("`openspec-ff-change`");
	});

	it("Mapped stock skill missing", () => {
		for (const c of COMMANDS) {
			const prompt = read(`prompts/opsx-${c}.md`);
			expect(prompt).toContain(`If \`${STOCK_SKILL[c]}\` is not in the available skills list`);
			expect(prompt).toContain("stop without");
		}
	});

	it("ships no placeholder resources", () => {
		expect(exists("skills/superspec-placeholder")).toBe(false);
		expect(exists("prompts/opsx-placeholder.md")).toBe(false);
	});

	it("contains no Claude tool names", () => {
		const files = [
			...walk(join(rootPath, "skills")),
			...walk(join(rootPath, "prompts")),
		];
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			expect(readFileSync(file, "utf8"), file).not.toMatch(
				/AskUserQuestion|TodoWrite|Task tool/,
			);
			expect(readFileSync(file, "utf8"), file).not.toMatch(
				/ask_user_question|plannotator/i,
			);
		}
	});

	it("frontmatter of every skill and prompt parses like pi does", () => {
		const skills = walk(join(rootPath, "skills")).filter((f) =>
			f.endsWith("SKILL.md"),
		);
		const prompts = walk(join(rootPath, "prompts")).filter((f) =>
			f.endsWith(".md"),
		);
		expect(skills.length).toBeGreaterThan(0);
		expect(prompts.length).toBeGreaterThan(0);
		for (const file of [...skills, ...prompts]) {
			const { frontmatter } = parseFrontmatter(readFileSync(file, "utf8"));
			expect(typeof frontmatter.description, file).toBe("string");
			expect(String(frontmatter.description).trim(), file).not.toBe("");
			if (skills.includes(file)) {
				expect(typeof frontmatter.name, file).toBe("string");
				expect(String(frontmatter.name).trim(), file).not.toBe("");
			}
		}
	});
});

describe("planning rules in workflow.md", () => {
	it("Questions defer to the channel", () => {
		const shared = flatSection("Shared rules");
		expect(shared).toContain("Interaction channel");
		expect(shared).toContain("numbered options");
	});

	describe("Superpowers-backed artifacts", () => {
		const rule = () => flatSection("Superpowers rule");

		it("Brainstorm redirected", () => {
			expect(rule()).toContain("superpowers:");
			expect(rule()).toContain("SKILL.md");
			expect(rule()).toContain("never under `docs/superpowers/`");
			expect(rule()).toContain("write output only where the instruction says");
		});

		it("Skill missing", () => {
			expect(rule()).toContain("STOP and tell the user to install Superpowers");
		});

		it("the brainstorm gate is the brainstorming skill's design-doc approval", () => {
			expect(rule()).toContain("the brainstorming skill's design-doc approval");
			expect(rule()).toContain("never ask for it separately");
		});
	});

	describe("New change creation", () => {
		const t = () => flatSection("new");

		it("Change created and stopped", () => {
			expect(t()).toContain("Create no artifact.");
			expect(t()).toContain("stop");
			const schemaSentences = sentences(t()).filter((s) => s.includes("--schema"));
			expect(schemaSentences.length).toBeGreaterThan(0);
			for (const s of schemaSentences) expect(s).toMatch(/never|Never|omit/);
		});

		it("Name exists", () => {
			expect(t()).toContain("`openspec list --json`");
			expect(t()).toContain("suggest `/opsx-continue <name>` and stop");
		});
	});

	describe("Continue advances after approval", () => {
		const t = () => flatSection("continue");

		it("Brainstorm then proposal", () => {
			inOrder(t(), [
				"Create exactly one artifact per gate",
				"Review gate",
				"On `approved`",
				"create the next ready artifact, then gate it, without a new command",
			]);
		});

		it("Gate before stop", () => {
			expect(t()).toContain("then run the Review gate on the file(s) written");
		});

		it("Approval does not advance", () => {
			expect(t()).toContain("Stop when planning is complete or the next ready artifact is `apply`");
			expect(t()).toContain("never create the `apply` artifact; point to `/opsx-apply`");
		});

		it("Changes requested", () => {
			const s = t().slice(t().indexOf("Only a human gate approval advances"));
			expect(sentences(s).slice(0, 2).join(" ")).toContain("`changes_requested`");
			expect(gate()).toContain("After `changes_requested`, always open the gate again.");
		});

		it("Dismissed", () => {
			expect(t()).toContain("`dismissed` do not advance");
			expect(gate()).toMatch(/`dismissed` outcome is not an approval, so ask the user/);
		});

		it("Meaningful note on approval", () => {
			expect(t()).toContain("`approved_with_notes` handled per the Review gate");
			expect(gate()).toContain("Otherwise open the gate again on the changed files. When unsure, reopen.");
		});

		it("Planning already complete", () => {
			expect(t()).toContain("Create nothing except a ready `finalize` artifact");
			expect(t()).toContain("otherwise point to `/opsx-apply`");
		});

		it("Planning completes mid-loop", () => {
			expect(t()).toContain("Repeat until planning is complete or the next ready artifact is `apply`.");
			expect(t()).toContain("`isPlanningComplete` is true");
		});

		it("the code review gate for finalize runs before the document gate", () => {
			inOrder(t(), [
				"Run the code review gate while creating `finalize`",
				"before the git-side closeout",
				"follow-up commit and push on the feature branch",
			]);
		});

		it("continue asks the user to choose among several changes", () => {
			expect(flatSection("Shared rules")).toContain("When several changes exist");
			expect(flatSection("Shared rules")).toContain("never guess");
		});

		it("continue closing prompts", () => {
			expect(t()).toContain('"Planning is complete. Run `/opsx-apply`, or tell me what to change."');
			expect(t()).toContain('"Run `/opsx-continue` again, or tell me what to change."');
		});
	});

	describe("review gate", () => {
		it("gate lists the four outcomes", () => {
			for (const o of ["approved", "approved_with_notes", "changes_requested", "dismissed"]) {
				expect(gate(), o).toContain(o);
			}
		});

		it("gate defers to the Interaction channel", () => {
			expect(gate()).toContain("Interaction channel");
			expect(gate()).toContain("Result on the channel");
		});

		it("gate falls back when the channel fails", () => {
			expect(gate()).toContain("fails to open");
			expect(gate()).toContain("fallback");
		});

		it("gate handles notes", () => {
			expect(gate()).toContain("wording");
			expect(gate()).toContain("short diff");
			expect(gate()).toContain("When unsure, reopen");
		});

		it("gate defines the cascade", () => {
			expect(gate()).toContain("openspec status --change");
			expect(gate()).toContain("only the files that changed");
		});

		it("code review uses the injected channel", () => {
			for (const s of [
				"code review",
				"before the feature branch",
				"Interaction channel",
				"feature branch recorded in `apply.md`",
				"`receiving-code-review`",
				"`/opsx-verify`",
			]) {
				expect(gate(), s).toContain(s);
			}
			expect(gate()).toMatch(/always reopens?/);
			expect(gate()).toMatch(/changed behaviour or a requirement/);
		});

		it("dismissed code review does not proceed", () => {
			expect(gate()).toMatch(/code review[^\n]*`dismissed`[^\n]*not approved/);
		});

		it("receipt records the channel as reviewer tier", () => {
			expect(gate()).toContain("reviewer tier");
			expect(gate()).toContain("channel");
		});

		it("gate keeps late brainstorm cascade and resume point explicit", () => {
			expect(gate()).toContain("open the next gate on every artifact that depends on it");
			expect(gate()).toContain("`brainstorm.md` plus all five");
			expect(gate()).toContain("at step 3");
			expect(gate()).toContain("not at step 2b");
		});

		it("gate does not depend on its position or on continue", () => {
			expect(gate()).not.toMatch(/\bbelow\b|\babove\b|\/opsx-continue/);
		});

		it("code review fixes update apply.md as a new iteration", () => {
			expect(gate()).not.toMatch(/append an iteration/i);
			expect(gate()).toContain("update `apply.md` as iteration N+1");
			expect(gate()).toContain("raise `Iteration:`");
			expect(gate()).toContain("gate outcome");
		});
	});

	describe("Fast-forward interaction boundary", () => {
		const t = () => flatSection("ff");

		it("Reaches plan and gates", () => {
			expect(t()).toContain("until every `applyRequires` artifact (`plan`) is done");
			expect(t()).toContain("Once `plan` is done, run the Review gate once on the final packet");
			expect(t()).toContain("Never create the `apply` artifact and do not start apply.");
		});

		it("Brainstorm gate first", () => {
			inOrder(t(), [
				"Right after `brainstorm.md` is written, run the Review gate on that one file.",
				"Create no later artifact until it is approved.",
				"create every remaining artifact in dependency order",
			]);
		});

		it("Final gate blocks apply pointer", () => {
			expect(t()).toContain("On `changes_requested`, revise, cascade per the Review gate and reopen it.");
			expect(t()).toContain("Point to `/opsx-apply` only after the final gate is approved.");
		});

		it("ff final gate lists the packet explicitly", () => {
			for (const s of [
				"`proposal.md`",
				"`design.md`",
				"every `specs/<capability>/spec.md`",
				"`tasks.md`",
				"`plan.md`",
				"explicit ordered list",
				"never a folder",
				"does not repeat `brainstorm.md`",
			]) {
				expect(t(), s).toContain(s);
			}
		});

		it("ff keeps the brainstorm interactive and asks only for missing input", () => {
			expect(t()).toContain("Run the `brainstorm` artifact interactively");
			expect(t()).toContain("never fabricate the user's answers or approval");
			expect(t()).toContain("Ask only when required input is missing");
			expect(t()).toContain("Do not ask the execution-handoff question");
		});

		it("ff confirms before continuing an existing change", () => {
			expect(t()).toContain("If the change already exists, tell the user and ask to confirm continuing it");
		});
	});

	describe("Fast-forward grounds and reports", () => {
		const t = () => flatSection("ff");

		it("Grounded tasks", () => {
			expect(t()).toContain("Inspect the relevant repository code, tests and docs before drafting");
			expect(t()).toContain('tasks reference real files or tests you found, never a generic "explore the codebase" step');
		});

		it("Design always created", () => {
			expect(t()).toContain(
				"Always create `design`, even if its `instruction` calls it optional, and the final gate packet still lists it",
			);
		});

		it("Skipped artifact reported", () => {
			expect(t()).toContain("Skip no other artifact unless `status` already reports it `skipped`");
			expect(t()).toContain("each other `skipped` artifact with its reason");
		});
	});

	describe("Explore writes no code", () => {
		const t = () => flatSection("explore");

		it("No implementation", () => {
			expect(t()).toContain("Never write code.");
		});

		it("Consent before writing", () => {
			expect(t()).toContain(
				"Reading is free, but before the first write name the file and the scope and wait for a yes, unless the user asked for the capture.",
			);
		});

		it("Schema edits refused", () => {
			expect(t()).toContain(
				"Editing a schema, a template or `config.yaml` counts as implementing: refuse it and point the user to creating a change",
			);
		});

		it("Scaffold and hand off", () => {
			expect(t()).toContain(
				"you may run `openspec new change <name>`. Never create `openspec/changes/` by hand. Then point to `/opsx-continue <name>`.",
			);
			expect(t()).toContain("do not write `brainstorm.md`");
			expect(t()).toContain("do not run a review gate in explore");
		});

		it("Plain diagrams", () => {
			expect(t()).toContain("Diagrams use ASCII characters only.");
			expect(workflow()).not.toMatch(/[^\x00-\x7F]/);
		});

		it("explore capture targets omit the gated artifacts", () => {
			expect(t()).toContain(
				"`brainstorm.md` and `plan.md` are never explore capture targets because they are written through `/opsx-continue <name>` with its review gate.",
			);
			for (const f of ["`proposal.md`", "`specs/<capability>/spec.md`", "`design.md`", "`tasks.md`"]) {
				expect(t(), f).toContain(f);
			}
		});
	});

	describe("Continue completes partial artifacts", () => {
		const t = () => flatSection("continue");

		it("Interrupted specs", () => {
			expect(t()).toContain("A `done` glob artifact such as `specs` can still miss files the proposal calls for.");
			expect(t()).toContain("Write only the missing files as that call's one artifact, then run the Review gate on them; after approval, continue.");
		});

		it("Planning complete", () => {
			expect(t()).toContain("Stop when planning is complete");
			expect(t()).toContain("point to `/opsx-apply`");
		});

		it("Older status output", () => {
			expect(t()).toContain("(fall back to `isComplete` when it is absent)");
		});

		it("Dependencies re-read", () => {
			expect(t()).toContain(
				"Before creating an artifact, re-read every dependency file from disk, not from conversation memory.",
			);
		});

		it("a skipped artifact is satisfied", () => {
			expect(t()).toContain("An artifact with status `skipped` is satisfied: never create it and do not look for its files.");
		});
	});
});

describe("planning specialist routing", () => {
	const REF = "[subagent routing](subagent-routing.md)";

	it("Explore with repository recon", () => {
		const t = flatSection("explore");
		expect(t).toContain("scout role");
		expect(t).toMatch(/evidence-only/i);
		expect(t).toMatch(/read-only/i);
		expect(t).toMatch(/never write[^.\n]*(code|schema|artifact)/i);
		expect(flatSection("Shared rules")).toContain(REF);
	});

	it("Small conceptual question", () => {
		const t = flatSection("explore");
		expect(t).toMatch(/small conceptual[^.\n]*inline/i);
		expect(t).toMatch(/availability (alone )?(does not|never)[^.\n]*(trigger|justif)/i);
		expect(t).toMatch(/user conversation[^.\n]*(parent|stays)/i);
	});

	it("Continue reviews one artifact", () => {
		const t = flatSection("continue");
		expect(t).toContain("spec reviewer role");
		expect(t).toContain("plan reviewer role");
		expect(t).toMatch(/existing dependency files/i);
		expect(t).toMatch(/re-review/i);
		expect(t).toMatch(/before the (existing )?human (review )?gate/i);
		expect(t).toMatch(/advisory[^.\n]*not (a )?(human )?approval/i);
		expect(t).toContain("Create exactly one artifact per gate");
		expect(t).toMatch(/neither does an internal review verdict/);
	});

	it("Fast-forward retains two planned stops", () => {
		const t = flatSection("ff");
		expect(t).toContain("internal check of the continue section");
		expect(t).toMatch(/internal reviews add no extra human stop or approval/i);
		expect(t).toContain("The brainstorm gate and the final gate are the only planned stops");
		expect(t).toMatch(/recon never moves the user conversation/i);
	});

	it("Planning review without subagents", () => {
		expect(flatSection("continue")).toMatch(/absent[^.\n]*inline self-check/i);
	});

	it("Continue passes main specs", () => {
		const t = flatSection("continue");
		expect(t).toContain(
			"the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename",
		);
		expect(t).toMatch(/no main spec[^.\n]*no baseline/i);
	});

	it("Fast-forward passes main specs", () => {
		// ff runs the continue section's internal check, which carries the baseline handoff.
		expect(flatSection("ff")).toContain("run the internal check of the continue section");
		expect(flatSection("continue")).toContain("every capability the deltas modify, remove or rename");
	});

	it("Inline check uses the baseline", () => {
		expect(flatSection("continue")).toMatch(/inline self-check[^.\n]*same main specs/i);
	});

	it("Delegation through the paragraph: workflow.md names roles, not plugins", () => {
		const forbidden = /pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./;
		expect(workflow()).not.toMatch(forbidden);
		for (const c of ["continue", "ff", "explore", "generate-specs"]) {
			expect(read(`prompts/opsx-${c}.md`), `prompt ${c}`).not.toMatch(forbidden);
		}
		expect(read("skills/opsx-generate-specs/SKILL.md")).not.toMatch(forbidden);
	});

	it("Delegation routes through the Subagent integration paragraph", () => {
		expect(flatSection("Shared rules")).toMatch(/routing note's Subagent integration paragraph/);
		expect(flatSection("explore")).toMatch(/collect the report as the Subagent integration paragraph describes/);
	});

	it("links the shared reference once without copying policy", () => {
		expect(workflow()).toContain(REF);
		expect(workflow()).not.toContain("## Availability");
		expect(workflow()).not.toContain("Helper-only");
		expect(exists("schema/superspec/subagent-routing.md")).toBe(true);
	});
});

describe("planning docs", () => {
	it("workflow doc describes the review gates", () => {
		const wf = read("docs/workflow.md");
		expect(wf).toContain("Review gate");
		expect(wf).toContain("plannotator");
		expect(wf).toContain("brainstorm.md");
		expect(wf).toContain("code review gate");
		expect(wf).not.toContain("ff runs unattended but brainstorming is interactive");
		const arch = read("docs/architecture.md");
		const rows = arch.split("\n").filter((l) => l.startsWith("|") && l.includes("`plannotator_inbox`"));
		expect(rows).toHaveLength(1);
		expect(rows[0]).toContain("detected");
		expect(rows[0]).toContain("Interaction channel");
		const order = ["inbox", "plannotator-tool", "plannotator-cli", "ask-tool", "plain"].map((c) =>
			wf.indexOf(`\`${c}\``),
		);
		expect(order[0]).toBeGreaterThanOrEqual(0);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
		expect(wf).toContain("stops before `apply`");
		const readmeRow = read("README.md")
			.split("\n")
			.find((l) => l.startsWith("|") && l.includes("`/opsx-continue`"));
		expect(readmeRow).toBeDefined();
		expect(readmeRow).not.toContain("then stops");
	});

	it("docs describe apply.md iterations and the brainstorm approval consistently", () => {
		const docs = ["docs/workflow.md", "docs/usage-guide.md", "docs/e2e-checklist.md"];
		for (const d of docs) {
			const t = read(d);
			expect(t, d).not.toMatch(/append (a|an) "?(post-PR )?iteration/i);
			expect(t, d).not.toContain("approve the design");
			expect(t, d).not.toContain("after you approve the design, a review gate");
		}
		const e2e = read("docs/e2e-checklist.md");
		expect(e2e).not.toContain("Then, with the gate approved: the project's tests run");
		const runB = e2e.slice(e2e.indexOf("## Run B"));
		const finalizeB = runB.split("\n").find((l) => l.includes("(step 9, finalize)"));
		expect(finalizeB).toContain("code review gate");
	});

	it("docs/workflow.md names specialist seats as advisory, beside unchanged gates", () => {
		const wf = read("docs/workflow.md");
		const seats = wf.slice(wf.indexOf("Optional specialist seats"), wf.indexOf("After a PR is open"));
		for (const role of ["scout role", "spec reviewer role", "plan reviewer role"]) {
			expect(seats).toContain(role);
		}
		expect(seats).toMatch(/bundled `superspec\.\*` agents are bundled candidates[^;]*no precedence/);
		expect(wf).not.toMatch(/`superspec\.(scout|spec-reviewer|plan-reviewer)`/);
		expect(wf).toMatch(/advisory[^.\n]*not (a )?human approval/i);
		expect(wf).toMatch(/two (planned )?(ff )?stops/i);
	});
});
