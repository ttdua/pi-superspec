import {
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	hasOpenspec,
	makeProject,
	SCHEMA_DIR,
	type TempProject,
} from "./helpers/project.js";
import { parseArtifactTable } from "./helpers/artifact-table.js";

const available = hasOpenspec();
if (!available) {
	console.warn("openspec >= 1.4 not found on PATH; skipping schema tests");
}
const run = available ? describe : describe.skip;

run("bundled schema", () => {
	let project: TempProject;
	beforeAll(() => {
		project = makeProject();
		const res = project.openspec(["new", "change", "x"]);
		if (res.status !== 0) throw new Error(res.stdout + res.stderr);
		const change = join(project.dir, "openspec", "changes", "x");
		writeFileSync(join(change, "plan.md"), "");
		writeFileSync(join(change, "tasks.md"), "- [ ] 1.1 placeholder\n");
	});
	afterAll(() => {
		project?.cleanup();
	});

	const schemaYaml = () =>
		readFileSync(join(SCHEMA_DIR, "schema.yaml"), "utf8");
	const schemaText = () => {
		const dir = join(SCHEMA_DIR, "templates");
		return [
			schemaYaml(),
			...readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")),
		].join("\n");
	};

	it("identity: name, version and marker", () => {
		const text = schemaYaml();
		expect(text).toMatch(/^name: superspec$/m);
		expect(text).toMatch(/^version: 5$/m);
		expect(text).toMatch(/^x-pi-superspec:\n\s+version: 5$/m);
	});

	it("openspec schema validate superspec passes", () => {
		const res = project.openspec(["schema", "validate", "superspec"]);
		expect(res.status, res.stdout + res.stderr).toBe(0);
	});

	it("credits upstream and ships LICENSE", () => {
		expect(existsSync(join(SCHEMA_DIR, "LICENSE"))).toBe(true);
		const text = schemaYaml();
		expect(text).toContain("Superspec");
		expect(text).toContain("e1c8f417");
	});

	it("schema text has no harness-specific tool names", () => {
		const text = schemaText();
		for (const term of [
			"AskUserQuestion",
			"rpiv-",
			"pi-subagents",
			"Skill tool",
			"/opsx:",
			"Claude Code",
			"Cursor",
			"OpenCode",
			"Task-tool",
		]) {
			expect(text, term).not.toContain(term);
		}
	});

	it("design instruction has the No design needed stub", () => {
		const out = project.openspec([
			"instructions",
			"design",
			"--change",
			"x",
			"--json",
		]);
		expect(out.status, out.stdout + out.stderr).toBe(0);
		const json = JSON.parse(out.stdout);
		expect(json.instruction).toContain("No design needed:");
	});

	describe("apply block", () => {
		const applyInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"apply",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};

		it("openspec instructions apply returns the apply block", () => {
			expect(applyInstruction()).toContain("worktree");
		});

		it("apply stops after final review without finishing-a-development-branch", () => {
			const text = applyInstruction();
			expect(text).toContain("stops after the final");
			expect(text).toMatch(
				/does NOT invoke[^.]*finishing-a-development-branch/,
			);
			const flat = text.replace(/\s+/g, " ");
			const hits = [...flat.matchAll(/finishing-a-development-branch/g)];
			expect(hits).toHaveLength(1);
			const before = flat.slice(0, hits[0].index);
			expect(before).toMatch(/does NOT invoke [`*\w:-]*$/);
			expect(text.toLowerCase()).not.toContain("verification");
		});

		it("apply names worktree branch and worktree authority", () => {
			const text = applyInstruction();
			expect(text).toContain("branch named <change-name>");
			expect(text).toContain("authoritative");
		});

		it("fallback executor still requests a whole-branch review", () => {
			const text = applyInstruction();
			const start = text.indexOf("2b.");
			const end = text.indexOf("3. **Receipt");
			expect(start).toBeGreaterThan(-1);
			expect(end).toBeGreaterThan(start);
			const flat = text.slice(start, end).replace(/\s+/g, " ");
			expect(flat).toContain("requesting-code-review");
			expect(flat).toContain("whole-branch review");
		});

		it("apply.md template records branch facts", () => {
			const tpl = readFileSync(
				join(SCHEMA_DIR, "templates", "apply.md"),
				"utf8",
			);
			for (const field of [
				"Worktree path",
				"Worktree branch",
				"Feature branch",
				"Base branch",
				"Range",
				"Iteration",
				"Executor",
				"Completed",
			]) {
				expect(tpl, field).toContain(field);
			}
		});
	});

	describe("verify artifact", () => {
		const verifyInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"verify",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};
		const verifyTemplate = () =>
			readFileSync(join(SCHEMA_DIR, "templates", "verify.md"), "utf8");

		it("verify has the six checks and no sync check", () => {
			const instruction = verifyInstruction();
			const template = verifyTemplate();
			for (const [name, text] of [
				["instruction", instruction],
				["template", template],
			]) {
				expect(text, name).toContain("openspec validate <change>");
				expect(text, name).not.toContain("--all");
				expect(text.toLowerCase(), name).not.toContain("delta spec sync");
			}
			expect(instruction).toContain("PASS_WITH_WARNINGS");
			expect(instruction).toContain("5 iterations");
			expect(instruction).toContain("systematic-debugging");
			for (let n = 1; n <= 6; n++) {
				expect(instruction, `check ${n}`).toMatch(
					new RegExp(`^\\s*${n}\\. \\*\\*`, "m"),
				);
				expect(template, `section ${n}`).toMatch(
					new RegExp(`^## ${n}\\. `, "m"),
				);
			}
			expect(template).not.toMatch(/^## 7\. /m);
			expect(template).toContain("## Overall Decision");
			expect(instruction.replace(/\s+/g, " ")).toContain(
				"project test command",
			);
		});

		it("sync check is deferred to archive", () => {
			const flat = verifyInstruction().replace(/\s+/g, " ");
			const sentences = flat.split(/(?<=\.)\s/);
			expect(
				sentences.some((s) => s.includes("/opsx-archive") && /sync/.test(s)),
			).toBe(true);
		});
	});

	describe("finalize artifact", () => {
		const finalizeInstruction = (): string => {
			const out = project.openspec([
				"instructions",
				"finalize",
				"--change",
				"x",
				"--json",
			]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};

		it("finalize reads apply.md, not git log", () => {
			const instruction = finalizeInstruction();
			expect(instruction).toContain("git worktree list --porcelain");
			expect(instruction).toContain("apply.md");
			expect(instruction).toContain("refs/heads/<change-name>");
			expect(instruction).not.toContain('git -C "$WORKTREE" log');
			expect(instruction).not.toContain("rev-list --count");
		});

		it("finalize honours AGENTS.md", () => {
			const instruction = finalizeInstruction();
			expect(instruction).toContain("AGENTS.md");
			expect(instruction).toContain("overrides");
		});

		it("finalize template points to archive and sync in one sentence", () => {
			const flat = readFileSync(
				join(SCHEMA_DIR, "templates", "finalize.md"),
				"utf8",
			).replace(/\s+/g, " ");
			const sentences = flat.split(/(?<=\.)\s/);
			expect(
				sentences.some((s) => s.includes("/opsx-archive") && /sync/.test(s)),
			).toBe(true);
		});
	});
	describe("artifact DAG", () => {
		const docsTable = () =>
			parseArtifactTable(
				readFileSync(
					new URL("../docs/domain-model.md", import.meta.url),
					"utf8",
				),
			);

		it("artifact DAG matches docs/domain-model.md", () => {
			const docs = docsTable();
			const res = project.openspec(["new", "change", "dag"]);
			expect(res.status, res.stdout + res.stderr).toBe(0);
			const st = project.openspec(["status", "--change", "dag", "--json"]);
			expect(st.status, st.stderr).toBe(0);
			const json = JSON.parse(st.stdout.slice(st.stdout.indexOf("{"))) as {
				artifacts: { id: string; status: string; missingDeps?: string[] }[];
			};
			expect(json.artifacts.map((a) => a.id).sort()).toEqual(
				[...docs.keys()].sort(),
			);
			// The CLI exposes no `requires`; on a fresh change nothing is done,
			// so each artifact's missingDeps equals its direct requires.
			const ready = json.artifacts.filter((a) => a.status === "ready");
			expect(ready.map((a) => a.id)).toEqual(["brainstorm"]);
			for (const a of json.artifacts) {
				expect([...(a.missingDeps ?? [])].sort(), a.id).toEqual(
					[...(docs.get(a.id) ?? [])].sort(),
				);
			}
			// Cross-check the schema file's own requires: lists.
			const fromYaml = new Map<string, string[]>();
			let cur = "";
			let inReq = false;
			for (const line of schemaYaml().split("\n")) {
				const idm = /^  - id: (\S+)/.exec(line);
				if (idm) {
					cur = idm[1];
					fromYaml.set(cur, []);
					inReq = false;
					continue;
				}
				if (/^    requires:\s*\[\]\s*$/.test(line)) {
					inReq = false;
				} else if (/^    requires:\s*$/.test(line)) {
					inReq = true;
				} else if (inReq && /^      - (\S+)/.test(line)) {
					fromYaml.get(cur)?.push(/^      - (\S+)/.exec(line)?.[1] ?? "");
				} else if (/^    \S/.test(line)) {
					inReq = false;
				}
			}
			for (const [id, req] of docs) {
				expect(fromYaml.get(id)?.slice().sort(), id).toEqual(
					req.slice().sort(),
				);
			}
			expect(fromYaml.size).toBe(docs.size);
			// design is required by no artifact.
			for (const req of docs.values()) expect(req).not.toContain("design");
		});

		it("every artifact template exists", () => {
			const templates = [...schemaYaml().matchAll(/^\s+template: (\S+)$/gm)].map(
				(m) => m[1],
			);
			expect(templates.length).toBe(docsTable().size);
			for (const t of templates) {
				expect(existsSync(join(SCHEMA_DIR, "templates", t)), t).toBe(true);
			}
		});
	});

	describe("final review findings", () => {
		const instructionFor = (id: string): string => {
			const out = project.openspec(["instructions", id, "--change", "x", "--json"]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return (JSON.parse(out.stdout).instruction as string).replace(/\s+/g, " ");
		};
		const tpl = (name: string) =>
			readFileSync(join(SCHEMA_DIR, "templates", name), "utf8");

		it("brainstorm keeps technical decisions out and does not hand off to writing-plans", () => {
			const text = instructionFor("brainstorm");
			expect(text).toContain(
				"Keep technical decisions out of brainstorm.md; they belong in design.md. The two must not repeat each other.",
			);
			expect(text).toContain(
				"do NOT invoke writing-plans or any other skill the brainstorming skill hands off to",
			);
			expect(text).toContain("the next artifact is proposal");
			expect(text).not.toContain("also write it to this change's `design.md`");
		});

		it("plan instruction carries the handoff, ID, scenario and spec rules", () => {
			const text = instructionFor("plan");
			expect(text).toContain(
				"Skip the skill's execution handoff; `/opsx-apply` chooses the executor.",
			);
			expect(text).toContain(
				"Every plan task names the tasks.md ID it implements (e.g. `Task 3 — implements 1.2`).",
			);
			expect(text).toContain(
				"List, for every `#### Scenario:` in specs/, the test that covers it.",
			);
			expect(text).toContain(
				"The plan header's spec reference points at this change's `specs/` and `design.md`.",
			);
		});

		it("plan template does not pre-select an executor", () => {
			const t = tpl("plan.md");
			expect(t).not.toContain("subagent-driven-development");
			expect(t).toContain("Executed via `/opsx-apply`, which chooses the executor.");
			expect(t).toMatch(/^## Task 1: .*implements X\.Y$/m);
			expect(t).toMatch(/^## Scenario → test$/m);
		});

		it("apply ticks tasks.md as official status and commits dirty change dirs", () => {
			const text = instructionFor("apply");
			expect(text).toContain(
				"When a plan task's review passes, tick its tasks.md box. tasks.md is the official status; the executor's ledger is for recovery only.",
			);
			expect(text).toContain(
				"If the output is non-empty (untracked `??` or modified entries), stage and commit ONLY this change's directory",
			);
			expect(text).not.toContain("contains untracked entries");
			expect(text).toContain("Skip the commit only when the output is empty");
			expect(text).not.toMatch(/only modifications/);
			expect(text).toContain(
				"then request a whole-branch review, write apply.md (step 3) and stop.",
			);
		});

		it("apply.md template has no hard-coded .worktrees path", () => {
			const t = tpl("apply.md");
			expect(t).not.toContain(".worktrees/");
			expect(t).toContain("<absolute worktree path>");
		});

		it("no dangling workflow-details or openspec-conventions references", () => {
			expect(schemaText()).not.toContain("workflow-details");
			expect(schemaText()).not.toContain("openspec-conventions");
			expect(tpl("brainstorm.md")).not.toContain("openspec/config.yaml");
		});

		it("verify instruction states precedence and loads verification-before-completion", () => {
			const text = instructionFor("verify");
			expect(text).toContain(
				"The six checks below replace the skill's own check list; if they differ, follow this list.",
			);
			expect(text).toContain("verification-before-completion");
			expect(text).toContain("record fresh command output as evidence");
		});

		it("verify template records outcomes and the iteration cap", () => {
			const t = tpl("verify.md");
			expect(t).toContain("PASS_WITH_WARNINGS");
			expect(t).toContain("5 iterations");
		});

		describe("finalize wording", () => {
			it("step 8 uses the branch variables", () => {
				const flat = instructionFor("finalize");
				expect(flat).toContain("Branch: $FEATURE_BRANCH");
				expect(flat).toContain("Base branch: $BASE_BRANCH");
				expect(flat).toContain('gh pr view "$FEATURE_BRANCH" --json url');
				const step8 = flat.slice(
					flat.indexOf("8. Write finalize.md"),
					flat.indexOf("9. Commit the receipt"),
				);
				expect(step8.length).toBeGreaterThan(0);
				expect(step8).not.toContain("<feature-branch>");
				expect(step8).not.toContain("<integration branch");
			});

			it("step 3 title is accurate", () => {
				const flat = instructionFor("finalize");
				expect(flat).toContain("3. Switch to the feature branch and pull:");
				expect(flat).not.toContain("Switch to feature branch in main checkout");
			});

			it("uses one PR-comment label and one failure form", () => {
				const all = schemaText();
				expect(all).not.toMatch(/PR comment:/);
				expect(all).not.toMatch(/\*\*Comment status\*\*/);
				expect(all).not.toContain("failed —");
				expect(tpl("finalize.md")).toContain("**PR comment status**");
				expect(tpl("finalize.md")).toContain("failed: <reason>");
				expect(tpl("finalize.md")).toContain("preserved (harness-owned)");
			});

			it("cleanup guard is portable", () => {
				const y = schemaYaml();
				expect(y).not.toContain("realpath --relative-to");
				expect(y).toContain("pwd -P");
				expect(y).toContain('"$MAIN_ROOT"/.worktrees/*|"$MAIN_ROOT"/worktrees/*) OWN=1');
				expect(y).toContain('"$HOME/.config/superpowers/worktrees/"*');
			});

			it("awk worktree parse survives spaces in paths", () => {
				const y = schemaYaml();
				expect(y).toContain("wt=substr($0,10)");
				expect(y).not.toContain("wt=$2");
			});
		});

	});
});
