import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const rootPath = fileURLToPath(root);

const COMMANDS = ["explore", "new", "continue", "ff"] as const;

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

function frontmatter(text: string): string {
	const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
	return match ? match[1] : "";
}

const skill = (c: string) => read(`skills/opsx-${c}/SKILL.md`);

function reviewGate(text: string): string {
	const lines = text.split("\n");
	const start = lines.findIndex((l) => l.trim() === "**Review gate**");
	if (start === -1) return "";
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		if (/^\*\*[^*\n]+\*\*$/.test(lines[i].trim())) {
			end = i;
			break;
		}
	}
	return lines.slice(start, end).join("\n").trim();
}

function inOrder(text: string, parts: string[]): void {
	let last = -1;
	for (const part of parts) {
		const at = text.indexOf(part);
		expect(at, part).toBeGreaterThan(-1);
		expect(at, part).toBeGreaterThan(last);
		last = at;
	}
}

describe("planning commands", () => {
	it("ships all four skill and prompt pairs", () => {
		for (const c of COMMANDS) {
			expect(exists(`skills/opsx-${c}/SKILL.md`)).toBe(true);
			expect(exists(`prompts/opsx-${c}.md`)).toBe(true);
			const fm = frontmatter(skill(c));
			expect(fm).toMatch(new RegExp(`^name: opsx-${c}\\s*$`, "m"));
			expect(fm).toMatch(/^description:\s*\S+/m);
		}
	});

	it("prompts delegate to their skill and pass $@", () => {
		for (const c of COMMANDS) {
			const prompt = read(`prompts/opsx-${c}.md`);
			expect(prompt).toContain(`opsx-${c}`);
			expect(prompt).toContain("SKILL.md");
			expect(prompt).toContain("$@");
			expect(prompt.trimEnd().split("\n").length).toBeLessThanOrEqual(15);
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

	it("skills ask through the Interaction channel", () => {
		for (const c of ["new", "continue", "ff"]) {
			const text = skill(c);
			expect(text, c).toContain("Interaction channel");
			expect(text, c).toContain("numbered options");
		}
	});

	it("explore asks through the Interaction channel", () => {
		expect(skill("explore")).toContain("Interaction channel");
	});

	it("provenance headers record the 1.16.0 sync and what was not adopted", () => {
		const upstream: Record<string, string> = {
			explore: "openspec-explore",
			new: "openspec-new-change",
			continue: "openspec-continue-change",
			ff: "openspec-ff-change",
			apply: "openspec-apply-change",
			verify: "openspec-verify-change",
			sync: "openspec-sync-specs",
			archive: "openspec-archive-change",
		};
		for (const [c, name] of Object.entries(upstream)) {
			const line = skill(c).split("\n")[5];
			expect(line, c).toBe(
				`<!-- Adapted from OpenSpec 1.4.1 ${name} (MIT) for pi, synced with 1.16.0. Not adopted: store selection, project-root guard, optionalWorkflow handoffs, mv archive. -->`,
			);
		}
	});

	it("continue and ff carry the Superpowers artifact rule", () => {
		for (const c of ["continue", "ff"]) {
			const text = skill(c);
			expect(text, c).toContain("superpowers:");
			expect(text, c).toContain("SKILL.md");
			expect(text, c).toContain("STOP and tell the user to install Superpowers");
			expect(text, c).toContain("docs/superpowers");
			expect(text, c).toContain("STOP");
		}
	});

	it("new creates without --schema, stops, and suggests continue", () => {
		const text = skill("new");
		expect(text).toContain("openspec new change");
		expect(text).toContain("Do NOT create any artifacts");
		expect(text).toContain("/opsx-continue");
		const schemaLines = text.split("\n").filter((l) => l.includes("--schema"));
		for (const line of schemaLines) {
			expect(line).toMatch(/omit|Omit|never/);
		}
	});

	it("continue creates one artifact per gate", () => {
		const text = skill("continue");
		expect(text).toContain("exactly one artifact per gate");
		expect(text).toContain("STOP");
	});

	describe("continue review gate", () => {
		const text = skill("continue");
		const gate = reviewGate(text);

		it("continue has a review gate section", () => {
			expect(gate.length).toBeGreaterThan(0);
		});

		it("gate lists the four outcomes", () => {
			for (const o of [
				"approved",
				"approved_with_notes",
				"changes_requested",
				"dismissed",
			]) {
				expect(gate, o).toContain(o);
			}
			const sentence = gate
				.split(/(?<=\.)\s/)
				.find((s) => s.includes("dismissed") && s.includes("not an approval"));
			expect(sentence).toBeDefined();
			expect(sentence).toContain("ask");
		});

		it("gate defers to the Interaction channel", () => {
			expect(gate).toContain("Interaction channel");
			expect(gate).toContain("Result on the channel");
		});

		it("gate falls back when the channel fails", () => {
			expect(gate).toContain("fails to open");
			expect(gate).toContain("fallback");
		});

		it("gate section has no tool names", () => {
			expect(gate).not.toMatch(/plannotator/i);
			expect(gate).not.toContain("ask_user_question");
		});

		it("gate handles notes", () => {
			expect(gate).toContain("wording");
			expect(gate).toContain("short diff");
			expect(gate).toContain("When unsure, reopen");
		});

		it("gate defines the cascade", () => {
			expect(gate).toContain("openspec status --change");
			expect(gate).toContain("only the files that changed");
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
				expect(gate, s).toContain(s);
			}
			expect(gate).toMatch(/always reopens?/);
			expect(gate).toMatch(/changed behaviour or a requirement/);
		});

		it("dismissed code review does not proceed", () => {
			expect(gate).toMatch(/code review[^\n]*`dismissed`[^\n]*not approved/);
		});

		it("receipt records the channel as reviewer tier", () => {
			expect(gate).toContain("reviewer tier");
			expect(gate).toContain("channel");
		});

		it("gate keeps late brainstorm cascade and resume point explicit", () => {
			expect(gate).toContain("open the next gate on every artifact that depends on it");
			expect(gate).toContain("at step 3");
			expect(gate).toContain("not at step 2b");
		});

		it("gate does not depend on its position or on continue", () => {
			expect(gate).not.toMatch(/\bbelow\b|\babove\b|\/opsx-continue/);
		});

		it("continue runs the gate before advancing", () => {
			const start = text.indexOf("**Act based on status**");
			const end = text.indexOf("\n**Review gate**");
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			const step3 = text.slice(start, end);
			inOrder(step3, [
				"Create the artifact file",
				"Review gate",
				"On `approved`",
				"next ready artifact",
			]);
		});

		it("continue stops before apply", () => {
			const guard = text.slice(text.indexOf("**Guardrails**"));
			expect(guard).toContain("Only a human gate approval advances");
			expect(guard).toContain(
				"STOP when planning is complete or the next ready artifact is `apply`",
			);
			expect(guard).toContain("Do NOT create an `apply` artifact");
			const sentence = guard
				.split(/(?<=\.)\s/)
				.find((s) => s.includes("Only a human gate approval advances"));
			expect(sentence).toBeDefined();
			expect(sentence).toContain("changes_requested");
			expect(sentence).toContain("dismissed");
		});

		it("continue runs the code review gate for finalize", () => {
			expect(text).toContain("finalize");
			expect(text.toLowerCase()).toContain("code review");
			expect(gate).toContain("finalize");
			expect(gate.toLowerCase()).toContain("code review");
		});

		it("code review fixes update apply.md as a new iteration", () => {
			expect(gate).not.toMatch(/append an iteration/i);
			expect(gate).toContain("update `apply.md` as iteration N+1");
			expect(gate).toContain("raise `Iteration:`");
			expect(gate).toContain("gate outcome");
		});

		it("late brainstorm revision reopens brainstorm.md plus all five", () => {
			expect(gate).toContain("`brainstorm.md` plus all five");
		});

		it("continue runs the finalize code review gate before the document gate", () => {
			const start = text.indexOf("**Act based on status**");
			const end = text.indexOf("\n**Review gate**");
			const step3 = text.slice(start, end);
			inOrder(step3, [
				"If the artifact is `finalize`",
				"before the git-side closeout",
				"Run the **Review gate** on the written file(s)",
				"follow-up commit and push on the feature branch",
			]);
		});

		it("continue artifact rule makes the brainstorm gate the design-doc approval", () => {
			const rule = text.slice(
				text.indexOf("\n**Superpowers artifact rule**\n"),
				text.indexOf("\n**Review gate**\n"),
			);
			expect(rule).toContain("the brainstorming skill's design-doc approval");
			expect(rule).toContain("do not ask for it separately");
		});

		it("continue frontmatter mentions the review gate", () => {
			const fm = text.split("---")[1];
			expect(fm).toContain(
				"run a review gate on it, and after approval continue until apply",
			);
			expect(fm).not.toContain("then stop");
			expect(fm).not.toContain("then stop for review");
		});
	});

	it("ff stops before apply and points to /opsx-apply", () => {
		const text = skill("ff");
		expect(text).toContain("/opsx-apply");
		expect(text).toContain("Do NOT start apply");
		expect(text).toContain("interactively");
	});

	describe("ff review gates", () => {
		const text = skill("ff");

		it("ff and continue share an identical review gate", () => {
			const gate = reviewGate(text);
			expect(gate.length).toBeGreaterThan(0);
			expect(gate).toBe(reviewGate(skill("continue")));
		});

		it("ff gates brainstorm.md before later artifacts", () => {
			const gateAt = text.indexOf("Review gate");
			const laterAt = text.indexOf("create every remaining artifact");
			expect(gateAt).toBeGreaterThan(-1);
			expect(laterAt).toBeGreaterThan(-1);
			expect(gateAt).toBeLessThan(laterAt);
			expect(text.slice(gateAt, laterAt)).toContain("brainstorm.md");
		});

		it("ff final gate lists the packet explicitly", () => {
			for (const s of [
				"proposal.md",
				"design.md",
				"every `specs/<capability>/spec.md`",
				"tasks.md",
				"plan.md",
				"explicit ordered list",
				"never a folder",
				"does not repeat `brainstorm.md`",
			]) {
				expect(text, s).toContain(s);
			}
		});

		it("ff points to /opsx-apply only after the final gate", () => {
			const prompt = text.indexOf('Prompt: "Run `/opsx-apply`');
			const guard = text.indexOf("only after the final gate is approved");
			expect(prompt).toBeGreaterThan(-1);
			expect(guard).toBeGreaterThan(-1);
			expect(guard).toBeLessThan(prompt);
		});

		it("ff artifact rule no longer forbids the gate", () => {
			expect(text).not.toContain("must not cause a stop before the plan is written");
			const rule = text.slice(
				text.indexOf("**Superpowers artifact rule**"),
				text.indexOf("\n**Review gate**\n"),
			);
			expect(rule.length).toBeGreaterThan(0);
			expect(rule).toContain("review gate");
		});

		it("ff reopens everything when brainstorm changes late", () => {
			expect(text).toContain("all five");
		});

		it("ff artifact rule makes the brainstorm gate the design-doc approval", () => {
			const rule = text.slice(
				text.indexOf("\n**Superpowers artifact rule**\n"),
				text.indexOf("\n**Review gate**\n"),
			);
			expect(rule).toContain("the brainstorming skill's design-doc approval");
			expect(rule).toContain("do not ask for it separately");
		});

		it("ff frontmatter and guardrail reflect the gates", () => {
			const fm = text.split("---")[1];
			expect(fm).not.toContain("without stopping");
			expect(fm).toContain("unattended");
			const guard = text.slice(text.indexOf("**Guardrails**"));
			expect(guard).toContain("stop after the final gate");
			expect(guard).not.toContain("stop after the artifacts");
		});
	});

	describe("partial artifacts and skipped reporting", () => {
		const flat = (c: string) => skill(c).replace(/\s+/g, " ");

		it("continue reads isPlanningComplete and falls back to isComplete", () => {
			expect(flat("continue")).toContain(
				"`isPlanningComplete`: Whether all planning artifacts are complete; older CLI versions expose the same value as `isComplete`, so fall back to `isComplete` when `isPlanningComplete` is absent",
			);
		});

		it("continue treats a skipped artifact as satisfied", () => {
			expect(flat("continue")).toContain(
				'An artifact with status "skipped" is satisfied: it has no files, so never create it and do not look for its files',
			);
		});

		it("continue completes a partial glob artifact with only the missing files", () => {
			const t = flat("continue");
			expect(t).toContain(
				"compare the files the proposal calls for with `artifactPaths.<id>.existingOutputPaths`",
			);
			expect(t).toContain(
				"write only the missing files as that call's one artifact, then run the Review gate",
			);
			expect(t).toContain("after approval, continue");
		});

		it("continue points to /opsx-apply when planning is complete", () => {
			expect(flat("continue")).toContain(
				"**If planning is complete (`isPlanningComplete: true`, or legacy `isComplete: true`) and no `done` glob artifact is missing files**",
			);
			expect(flat("continue")).toContain(
				"create a ready `finalize`",
			);
		});

		it("continue always re-reads dependencies from disk", () => {
			expect(flat("continue")).toContain(
				"always re-read them from disk, even if you saw them earlier in the conversation",
			);
		});

		it("ff inspects the repository before drafting and avoids generic tasks", () => {
			const t = flat("ff");
			expect(t).toContain(
				"Inspect the relevant repository code, tests and docs before drafting",
			);
			expect(t).toContain(
				'tasks reference real files or tests you found, never a generic "explore the codebase" step',
			);
		});

		it("ff always creates design even though its instruction calls it optional", () => {
			expect(flat("ff")).toContain(
				"Always create `design`, even if its `instruction` calls it optional, and the final gate packet still lists it",
			);
		});

		it("ff lists each other skipped artifact with its reason", () => {
			const t = flat("ff");
			expect(t).toContain(
				'skip no other artifact unless `status` already reports it `skipped`',
			);
			expect(t).toContain(
				"list each other `skipped` artifact with its reason in the final summary",
			);
		});
	});

	it("explore forbids writing implementation code", () => {
		expect(skill("explore")).toContain("Do NOT write code");
	});

	const flatExplore = () => skill("explore").replace(/\s+/g, " ");

	it("explore asks consent before the first write and names file and scope", () => {
		expect(flatExplore()).toContain(
			"Reading is free, but before the first write name the file and the scope and wait for a yes, unless the user asked for the capture.",
		);
	});

	it("explore refuses schema, template and config.yaml edits as implementing", () => {
		expect(flatExplore()).toContain(
			"Editing a schema, a template or `config.yaml` counts as implementing: refuse it and point the user to creating a change.",
		);
	});

	it("explore scaffolds a change and hands off to /opsx-continue without writing brainstorm.md", () => {
		const t = flatExplore();
		expect(t).toContain(
			"you may run `openspec new change <name>`. Never create `openspec/changes/` by hand. Then point to `/opsx-continue <name>`.",
		);
		expect(t).toContain("Do not write `brainstorm.md` and do not run a review gate in explore.");
	});

	it("explore context checks list specs", () => {
		const t = skill("explore");
		expect(t).toContain("openspec list --specs");
		expect(t).toContain("openspec show <id> --type spec");
	});

	it("explore capture table uses the superspec artifact names and omits gated artifacts", () => {
		const rows = skill("explore")
			.split("\n")
			.filter((l) => l.trim().startsWith("|"))
			.map((l) => l.replace(/\s+/g, " ").trim());
		for (const row of [
			"| Scope changed | `proposal.md` |",
			"| New requirement discovered | `specs/<capability>/spec.md` |",
			"| Requirement changed | `specs/<capability>/spec.md` |",
			"| Design decision made | `design.md` |",
			"| New work identified | `tasks.md` |",
		]) {
			expect(rows).toContain(row);
		}
		expect(rows.join("\n")).not.toMatch(/brainstorm\.md|plan\.md/);
		expect(flatExplore()).toContain(
			"`brainstorm.md` and `plan.md` are never explore capture targets because they are written through `/opsx-continue <name>` with its review gate.",
		);
	});

	it("explore diagrams use ASCII only", () => {
		const t = skill("explore");
		const body = t.slice(t.indexOf("---", 3) + 3);
		expect(t).toContain("Diagrams use ASCII characters only.");
		expect(body).not.toMatch(/[^\x00-\x7F]/);
	});

	it("new asks for a kebab-case name and continue handles several changes", () => {
		const text = skill("new");
		expect(text).toContain("kebab-case");
		expect(text).toContain("ask for a valid name");
		expect(skill("continue")).toContain("several");
	});

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
});

describe("planning specialist routing", () => {
	const REF = "../references/subagent-routing.md";

	it("SA-P01 explore offers an optional evidence-only scout via the shared reference", () => {
		const t = skill("explore");
		expect(t).toContain(REF);
		expect(t).toContain("scout role");
		expect(t).toMatch(/evidence-only/i);
		expect(t).toMatch(/no-write|read-only/i);
		expect(t).toMatch(/never (write|create)[^.\n]*(code|schema|artifact)/i);
	});

	it("SA-P02 explore stays inline for small conceptual work", () => {
		const t = skill("explore");
		expect(t).toMatch(/small conceptual[^.\n]*inline/i);
		expect(t).toMatch(/availability (alone )?(does not|never)[^.\n]*(trigger|justif)/i);
		expect(t).toMatch(/user conversation[^.\n]*(parent|stays)/i);
	});

	it("SA-P03 continue reviews the completed artifact before the gate, without a second artifact", () => {
		const t = skill("continue");
		expect(t).toContain(REF);
		expect(t).toContain("spec reviewer role");
		expect(t).toContain("plan reviewer role");
		expect(t).toMatch(/existing dependency files/i);
		expect(t).toMatch(/re-review/i);
		expect(t).toMatch(/before the (existing )?human (review )?gate/i);
		expect(t).toMatch(/advisory[^.\n]*not (a )?(human )?approval/i);
		expect(t).toContain("Create exactly one artifact per gate");
		expect(t).toMatch(/(verdict|internal review)[^.\n]*(does not|never) advance/i);
	});

	it("SA-P04 ff runs internal reviews unattended and keeps its two stops", () => {
		const t = skill("ff");
		expect(t).toContain(REF);
		expect(t).toContain("spec reviewer role");
		expect(t).toContain("plan reviewer role");
		expect(t).toMatch(/internal (spec|review)[^.\n]*(no|without)[^.\n]*(extra|additional|another)[^.\n]*(human )?(stop|approval)/i);
		expect(t).toContain("The brainstorm gate and the final gate are the only planned stops");
		expect(t).toMatch(/recon never moves the user conversation/i);
	});

	it("SA-P05 planning skills fall back to an inline self-check when integration is absent", () => {
		for (const c of ["continue", "ff"] as const) {
			expect(skill(c), c).toMatch(/absent[^.\n]*inline (self-)?check/i);
		}
	});

	it("SA-P06 spec review receives the baseline main specs", () => {
		for (const c of ["continue", "ff"] as const) {
			const t = skill(c);
			expect(t, c).toContain("the main spec `openspec/specs/<capability>/spec.md` of every capability the deltas modify, remove or rename");
			expect(t, c).toMatch(/no main spec[^.\n]*no baseline/i);
			expect(t, c).toMatch(/inline self-check[^.\n]*same main specs/i);
		}
	});

	it("Delegation through the paragraph: skills and prompts name roles, not plugins", () => {
		const forbidden = /pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./;
		for (const c of ["continue", "ff", "explore", "generate-specs"]) {
			expect(read(`skills/opsx-${c}/SKILL.md`), `skill ${c}`).not.toMatch(forbidden);
			expect(read(`prompts/opsx-${c}.md`), `prompt ${c}`).not.toMatch(forbidden);
		}
	});

	it("Delegation routes through the Subagent integration paragraph", () => {
		for (const c of ["continue", "ff", "explore"] as const) {
			expect(skill(c), c).toMatch(/as the Subagent integration paragraph describes/);
		}
		const recon = skill("explore");
		const section = recon.slice(recon.indexOf("Before any delegation"));
		expect(section).toMatch(/collect the report as the paragraph describes/);
	});

	it("links the shared reference from the three current planning consumers without copying policy", () => {
		for (const c of ["explore", "continue", "ff"] as const) {
			const t = skill(c);
			expect(t, c).toContain(REF);
			expect(t, c).not.toContain("## Availability");
			expect(t, c).not.toContain("Helper-only");
		}
		expect(exists("skills/references/subagent-routing.md")).toBe(true);
	});

	it("docs/workflow.md names specialist seats as advisory, beside unchanged gates", () => {
		const wf = read("docs/workflow.md");
		for (const role of ["scout", "spec reviewer", "plan reviewer"]) {
			expect(wf.toLowerCase()).toContain(role);
		}
		// Bundled agent names appear only as candidates for a role.
		expect(wf).toMatch(/bundled candidates?/i);
		expect(wf).toMatch(/advisory[^.\n]*not (a )?human approval/i);
		expect(wf).toMatch(/two (planned )?(ff )?stops/i);
	});
});
