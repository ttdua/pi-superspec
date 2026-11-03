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

	it("skills that ask the user state a plain-text fallback", () => {
		for (const c of ["new", "continue", "ff"]) {
			const text = skill(c);
			expect(text, c).toContain("ask_user_question");
			expect(text, c).toContain("numbered options");
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

	it("continue creates one artifact then stops", () => {
		const text = skill("continue");
		expect(text).toContain("exactly one");
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

		it("gate picks the reviewer in order", () => {
			inOrder(gate, [
				"`plannotator` tool",
				"command -v plannotator",
				"ask_user_question",
				"plain text",
			]);
		});

		it("gate falls through when a tier fails", () => {
			expect(gate).toMatch(/falls? to the next tier/);
			expect(gate).toContain("cannot run a background command");
		});

		it("gate runs the CLI with a fresh result file", () => {
			for (const s of [
				"plannotator annotate",
				"--gate",
				"--json",
				"--result-file",
				"does not exist yet",
				"fresh path for every gate",
			]) {
				expect(gate, s).toContain(s);
			}
			expect(gate).toMatch(/outside the change directory/);
		});

		it("gate classifies by decision only", () => {
			expect(gate).toContain("`decision`");
			expect(gate).toContain("never from message text");
			expect(gate).toContain("unknown `decision` is `dismissed`");
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

		it("gate covers code review", () => {
			for (const s of [
				"plannotator review",
				"stdout",
				"`git diff --stat`",
				"feature branch recorded in `apply.md`",
				"`receiving-code-review`",
				"`/opsx-verify`",
			]) {
				expect(gate, s).toContain(s);
			}
			expect(gate).toMatch(/always reopens?/);
			expect(gate).toMatch(/changed behaviour or a requirement/);
		});

		it("gate keeps review notes, late brainstorm cascade and resume point explicit", () => {
			expect(gate).toContain("Decide approve-or-not from `decision` only");
			expect(gate).toContain("use `message` as the reviewer's notes to apply");
			expect(gate).toContain("open the next gate on every artifact that depends on it");
			expect(gate).toContain("missing or unreadable");
			expect(gate).toContain("at step 3");
			expect(gate).toContain("not at step 2b");
		});

		it("gate does not depend on its position or on continue", () => {
			expect(gate).not.toMatch(/\bbelow\b|\babove\b|\/opsx-continue/);
		});

		it("continue runs the gate before it stops", () => {
			const start = text.indexOf("**Act based on status**");
			const end = text.indexOf("\n**Review gate**");
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			const step3 = text.slice(start, end);
			inOrder(step3, [
				"Create the artifact file",
				"Review gate",
				"STOP after creating that one artifact",
			]);
		});

		it("continue does not advance after approval", () => {
			const guard = text.slice(text.indexOf("**Guardrails**"));
			expect(guard).toContain("Approval does not create the next artifact");
		});

		it("continue runs the code review gate for finalize", () => {
			expect(text).toContain("finalize");
			expect(text.toLowerCase()).toContain("code review");
			expect(gate).toContain("finalize");
			expect(gate.toLowerCase()).toContain("code review");
		});

		it("code review CLI tier pins the full branch diff mode", () => {
			const tier2 = gate.split("\n").find((l) => l.includes("plannotator review --base"));
			expect(tier2).toBeDefined();
			expect(tier2).toContain("--diff-type merge-base");
		});

		it("code review tool tier asks to confirm the full branch diff", () => {
			const tier1 = gate.split("\n").find((l) => l.includes("`review` action"));
			expect(tier1).toBeDefined();
			expect(tier1).toContain("full branch diff");
			expect(tier1).toContain("fall to Tier 2");
		});

		it("code review CLI tier keeps approve with notes", () => {
			expect(gate).not.toContain("can only produce");
			expect(gate).toContain("When `decision` is `approved`, read `message`");
			expect(gate).toContain("Code review completed — no changes requested.");
			const tier2 = gate.split("\n").find((l) => l.includes("plannotator review --base"));
			expect(tier2).toContain("`approved_with_notes`");
		});

		it("tool tier takes its decision message as the result", () => {
			const classify = gate.split("\n").find((l) => l.includes("**Classify the result**"));
			expect(classify).toBeDefined();
			expect(classify).toContain("never from message text");
			expect(classify).toContain("the decision message is the result");
			expect(classify).toContain("ask the user in chat");
		});

		it("a non-zero exit without a result file is a tier failure", () => {
			const fail = gate.split("\n").find((l) => l.includes("**When a tier fails to open**"));
			expect(fail).toContain("non-zero and leaves no result file");
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
			expect(fm).toContain("run a review gate on it, then stop");
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
		});

		it("continue points to /opsx-apply when planning is complete", () => {
			expect(flat("continue")).toContain(
				"**If planning is complete (`isPlanningComplete: true`, or legacy `isComplete: true`) and no `done` glob artifact is missing files**",
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
			"you may run `openspec new change <name>` and never create `openspec/changes/` by hand, then point to `/opsx-continue <name>`.",
		);
		expect(t).toContain("Do not write `brainstorm.md` and do not run a review gate in explore.");
	});

	it("explore context checks list specs", () => {
		const t = skill("explore");
		expect(t).toContain("openspec list --specs");
		expect(t).toContain("openspec show <id> --type spec");
	});

	it("explore capture table uses the superspec artifact names", () => {
		const t = skill("explore");
		for (const row of [
			"| Scope changed              | `proposal.md`",
			"| Design decision made       | `design.md`",
			"| New work identified        | `tasks.md`",
			"| Plan changed               | `plan.md`",
			"| Problem or goal reframed   | `brainstorm.md`",
		]) {
			expect(t).toContain(row);
		}
		expect(t).not.toContain("default schema");
	});

	it("explore diagrams use ASCII only", () => {
		const t = skill("explore");
		expect(t).toContain("Diagrams use ASCII characters only.");
		expect(t).not.toMatch(/[\u2500-\u257F\u25A0-\u25FF\u2190-\u21FF\u2022\u2713\u2717\u2715]/);
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
		const row = arch.split("\n").find((l) => l.startsWith("|") && l.includes("`plannotator`"));
		expect(row).toBeDefined();
		expect(row).toContain("--result-file");
		expect(row).toContain("plannotator review");
		expect(row).toContain("stdout is redirected");
		expect(row).toContain("ask_user_question");
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
