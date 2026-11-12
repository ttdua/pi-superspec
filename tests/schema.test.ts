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
	console.warn("openspec schema validator not found on PATH; skipping schema tests");
}
const run = available ? describe : describe.skip;

const POINTER =
	"Follow openspec/schemas/superspec/workflow.md for the command you are running; it overrides the running skill where they differ.";

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

	it("Identity fields: name, version 9 and marker", () => {
		const text = schemaYaml();
		expect(text).toMatch(/^name: superspec$/m);
		expect(text).toMatch(/^version: 9$/m);
		expect(text).toMatch(/^x-pi-superspec:\n\s+version: 9$/m);
		expect(text.split("\n")[0]).toBe("# Superspec schema v9 for pi-superspec.");
	});

	it("No artifact ID changes: keeps the nine artifact IDs of versions 7 and 8", () => {
		const ids = [...schemaYaml().matchAll(/^  - id: (\S+)/gm)].map((m) => m[1]);
		expect(ids).toEqual([
			"brainstorm",
			"proposal",
			"design",
			"specs",
			"tasks",
			"plan",
			"apply",
			"verify",
			"finalize",
		]);
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

	it("File shipped: workflow.md and subagent-routing.md sit in the schema directory", () => {
		expect(existsSync(join(SCHEMA_DIR, "workflow.md"))).toBe(true);
		expect(existsSync(join(SCHEMA_DIR, "subagent-routing.md"))).toBe(true);
		expect(existsSync(new URL("../skills/references/subagent-routing.md", import.meta.url))).toBe(false);
	});

	it("Every instruction points to it: every artifact and the apply instruction start with the pointer", () => {
		for (const id of ["brainstorm", "proposal", "design", "specs", "tasks", "plan", "apply", "verify", "finalize"]) {
			const out = project.openspec(["instructions", id, "--change", "x", "--json"]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			const first = (JSON.parse(out.stdout).instruction as string).trimStart().split("\n")[0];
			expect(first, id).toBe(POINTER);
		}
		const yamlInstructions = [...schemaYaml().matchAll(/^ +instruction: \|\n( +)(.*)$/gm)];
		expect(yamlInstructions).toHaveLength(10);
		for (const m of yamlInstructions) expect(m[2]).toBe(POINTER);
	}, 60_000);

	it("Still valid: the schema directory with workflow.md validates", () => {
		const res = project.openspec(["schema", "validate", "superspec"]);
		expect(res.status, res.stdout + res.stderr).toBe(0);
	});

	it("No tool names: schema, templates, workflow.md and subagent-routing.md", () => {
		const text = [
			schemaText(),
			readFileSync(join(SCHEMA_DIR, "workflow.md"), "utf8"),
			readFileSync(join(SCHEMA_DIR, "subagent-routing.md"), "utf8"),
		].join("\n");
		for (const term of ["AskUserQuestion", "rpiv-", "pi-subagents", "Skill tool", "/opsx:"]) {
			expect(text, term).not.toContain(term);
		}
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

		const planInstruction = (): string => {
			const out = project.openspec(["instructions", "plan", "--change", "x", "--json"]);
			expect(out.status, out.stdout + out.stderr).toBe(0);
			return JSON.parse(out.stdout).instruction as string;
		};

		it("parallel rule present", () => {
			const text = applyInstruction().replace(/\s+/g, " ");
			expect(text).toMatch(/one writer per worktree/i);
			expect(text).toMatch(/merged? (back )?after[^.]*review/i);
			expect(text).toMatch(/without dependency metadata[^.]*one after another/i);
		});

		it("parallel readiness: dependencies merged, files disjoint, lane cut from the change branch", () => {
			const text = applyInstruction().replace(/\s+/g, " ");
			expect(text).toMatch(/dependencies are all merged/i);
			expect(text).toMatch(/files do not overlap/i);
			expect(text).toMatch(/worktree on branch `<change-name>--task-<N>`, cut from the current `<change-name>` HEAD/);
		});

		it("lane rules: own worktree, cap, second conflict", () => {
			const text = applyInstruction().replace(/\s+/g, " ");
			expect(text).toMatch(/each writer lane that runs beside another writer lane gets its own worktree/i);
			expect(text).toMatch(/at most three writer lanes run at once unless project instructions set a lower limit/i);
			expect(text).toMatch(/second conflict for the same task stops apply and asks the user/i);
		});

		it("plan tasks list files; no list overlaps everything", () => {
			const text = planInstruction().replace(/\s+/g, " ");
			expect(text).toMatch(/lists the files it creates or modifies/i);
			expect(text).toMatch(/without a file list is treated as overlapping every other task/i);
		});

		it("lanes table is recorded per plan task", () => {
			const text = applyInstruction().replace(/\s+/g, " ");
			expect(text).toMatch(/Lanes[^.]*each (plan )?task/i);
			expect(text).toMatch(/commit range[^.]*(covers|including)[^.]*merge/i);
		});

		it("apply.md template has the Lanes section", () => {
			const tpl = readFileSync(join(SCHEMA_DIR, "templates", "apply.md"), "utf8");
			expect(tpl).toContain("## Lanes");
			const lanes = tpl.slice(tpl.indexOf("## Lanes"));
			for (const col of ["Task", "Lane branch", "Lane range", "Review", "Merge commit"]) {
				expect(lanes, col).toContain(col);
			}
			expect(tpl).toContain("## Contract deviations");
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

		it("apply instruction orders each task around the Contracts", () => {
			const text = applyInstruction().replace(/\s+/g, " ");
			const start = text.indexOf("Contracts rule");
			expect(start).toBeGreaterThan(-1);
			let at = start + "Contracts rule".length;
			for (const word of [
				"declarations or stubs",
				"typecheck",
				"failing test",
				"implementation",
			]) {
				const i = text.indexOf(word, at);
				expect(i, word).toBeGreaterThan(-1);
				at = i;
			}
			expect(text).not.toContain("all contracts first");
		});

		it("apply instruction stops on a contract change", () => {
			const text = applyInstruction();
			const rule = text.indexOf("Contracts rule");
			expect(rule).toBeGreaterThan(-1);
			expect(rule).toBeLessThan(text.indexOf("2a."));
			expect(rule).toBeLessThan(text.indexOf("2b."));
			const flat = text.slice(rule, text.indexOf("2. **Executor**")).replace(/\s+/g, " ");
			expect(flat).toMatch(/public[^.]*ask the user/);
			expect(flat).toMatch(/internal[^.]*plan\.md[^.]*reason/);
			expect(flat).toMatch(/only after the user decides[^.]*plan\.md[^.]*reason/);
			expect(flat).toContain("Contract deviations");
			expect(text.slice(text.indexOf("3. **Receipt"))).toContain(
				"Contract deviations",
			);
		});

		it("apply.md template has Contract deviations before Next step", () => {
			const tpl = readFileSync(
				join(SCHEMA_DIR, "templates", "apply.md"),
				"utf8",
			);
			const dev = tpl.indexOf("## Contract deviations");
			expect(dev).toBeGreaterThan(-1);
			const next = tpl.indexOf("## Next step");
			expect(next).toBeGreaterThanOrEqual(0);
			expect(dev).toBeLessThan(next);
			expect(tpl.slice(dev, next)).toContain("none");
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

		it("verify check 5 compares design decisions and plan Contracts", () => {
			const flat = verifyInstruction().replace(/\s+/g, " ");
			for (const text of [
				"5. **Design and contract coherence**",
				"Contract deviations",
				"never a FAIL by itself",
				"not verified with its reason",
				"no Contracts section",
			]) {
				expect(flat, text).toContain(text);
			}
			const template = verifyTemplate();
			expect(template).toContain(
				"## 5. Design and Contract Coherence (warning only)",
			);
			expect(template).toContain("Contracts in plan.md");
			expect(template).toContain("Not verified");
		});

		it("verify handles REMOVED/RENAMED and skipped checks", () => {
			const flat = verifyInstruction().replace(/\s+/g, " ");
			for (const word of [
				"REMOVED",
				"RENAMED",
				"baseline",
				"not verified",
				"not applicable",
			]) {
				expect(flat, word).toContain(word);
			}
			expect(flat).toContain("fall back to git history");
			expect(flat).toContain("Scenarios under a REMOVED requirement are skipped");
			const tpl = verifyTemplate();
			expect(tpl).toContain("Not verified");
			expect(tpl).toContain("Not applicable");
		});

		it("sync check is deferred to archive", () => {
			const flat = verifyInstruction().replace(/\s+/g, " ");
			const sentences = flat.split(/(?<=\.)\s/);
			expect(
				sentences.some((s) => s.includes("openspec-archive-change") && /sync/.test(s)),
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
				sentences.some((s) => s.includes("openspec-archive-change") && /sync/.test(s)),
			).toBe(true);
		});
	});
	describe("no step commands", () => {
		const OLD_STEP_COMMAND = /\/opsx-(explore|new|continue|ff|apply|verify|sync|archive)\b/;

		it("No step commands: schema.yaml and templates name no /opsx-<step> command", () => {
			const files = [
				join(SCHEMA_DIR, "schema.yaml"),
				...readdirSync(join(SCHEMA_DIR, "templates")).map((f) => join(SCHEMA_DIR, "templates", f)),
			];
			for (const file of files) {
				expect(readFileSync(file, "utf8"), file).not.toMatch(OLD_STEP_COMMAND);
			}
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

		it("brainstorm reads the baseline specs of touched capabilities", () => {
			const text = instructionFor("brainstorm");
			expect(text).toContain("read the living spec in `openspec/specs/` of each capability the change plausibly touches");
			expect(text).toContain("cite the existing requirements involved");
			expect(text).toContain("state explicitly when the change alters a specified requirement");
			for (const t of ["plannotator", "AskUserQuestion", "ask_user_question"]) expect(text).not.toContain(t);
		});

		it("proposal confirms modified capabilities in the living spec", () => {
			expect(instructionFor("proposal")).toContain(
				"List a capability here only after confirming in its living spec that existing requirements change.",
			);
		});

		it("specs start MODIFIED from the baseline block with exact headers", () => {
			const text = instructionFor("specs");
			expect(text).toContain("copy the full current requirement block from `openspec/specs/<capability>/spec.md`");
			expect(text).toContain("`MODIFIED`, `REMOVED` and `RENAMED` `FROM` headers MUST match the main spec header exactly");
			expect(text).toContain("name the dropped scenario as intentional in the requirement text or the proposal");
		});

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

		it("brainstorm approves the written file before returning to the flow", () => {
			const text = instructionFor("brainstorm");
			const written = text.indexOf("`brainstorm.md` first");
			const approve = text.indexOf("approve that file");
			const back = text.indexOf("Return to the OpenSpec flow");
			expect(written).toBeGreaterThan(-1);
			expect(approve).toBeGreaterThan(written);
			expect(back).toBeGreaterThan(approve);
			expect(text).toContain(
				"Keep technical decisions out of brainstorm.md; they belong in design.md. The two must not repeat each other.",
			);
			expect(text).toContain(
				"do NOT invoke writing-plans or any other skill the brainstorming skill hands off to",
			);
		});

		it("brainstorm and finalize instructions name no review tool", () => {
			for (const id of ["brainstorm", "finalize"]) {
				expect(instructionFor(id), id).not.toMatch(
					/plannotator|AskUserQuestion|ask_user_question|rpiv-|pi-subagents|Skill tool/,
				);
			}
		});

		it("finalize step 2b stops, updates apply.md and defines skipped", () => {
			const flat = instructionFor("finalize");
			const gate = flat.slice(
				flat.indexOf("2b."),
				flat.indexOf("3. Switch to the feature branch and pull:"),
			);
			expect(gate).toContain("do not run step 3");
			expect(gate).toContain("or when unsure");
			expect(gate).not.toMatch(/append an iteration/i);
			expect(gate).toContain("update apply.md as iteration N+1");
			expect(gate).toContain("gate outcome");
			expect(gate).toContain("`skipped (<reason>)` is allowed only");
		});

		it("finalize escape hatch runs the code review gate before Options 1 and 2", () => {
			const flat = instructionFor("finalize");
			const hatch = flat.slice(flat.indexOf("Escape hatch: manual skill invocation"));
			expect(hatch).toContain("code review gate");
			expect(hatch).toContain("step 2b");
			expect(hatch).toContain("Option 1 or Option 2");
			expect(hatch).toContain("`skipped (<reason>)` only for Options 3 and 4");
		});

		it("finalize step 8 and template point to step 2b for skipped", () => {
			const flat = instructionFor("finalize");
			const eight = flat.slice(
				flat.indexOf("8. Write finalize.md"),
				flat.indexOf("9. Commit the receipt"),
			);
			expect(eight).toContain("as step 2b allows");
			expect(tpl("finalize.md")).toContain("finalize step 2b");
		});

		it("finalize step 2b sits between the worktree tests and the checkout", () => {
			const flat = instructionFor("finalize");
			const two = flat.indexOf("2. Verify tests pass in the worktree");
			const twoB = flat.indexOf("2b.");
			const three = flat.indexOf("3. Switch to the feature branch and pull:");
			expect(two).toBeGreaterThan(-1);
			expect(twoB).toBeGreaterThan(two);
			expect(three).toBeGreaterThan(twoB);
			const gate = flat.slice(twoB, three);
			expect(gate).toContain("$FEATURE_BRANCH");
			expect(gate).toContain("apply.md");
			expect(gate).toContain("approved with notes");
			expect(gate).toContain("never treat");
		});

		it("finalize template records the code review", () => {
			const t = tpl("finalize.md");
			expect(t).toContain("Code review");
			expect(t).toContain("Reviewer tier");
			expect(t).toContain("Commit range reviewed");
		});

		it("plan instruction carries the handoff, ID, scenario and spec rules", () => {
			const text = instructionFor("plan");
			expect(text).toContain(
				"Skip the skill's execution handoff; `openspec-apply-change` chooses the executor.",
			);
			expect(text).toContain(
				"Every plan task names the tasks.md group it implements (e.g. `Task 3 — implements 3`)",
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
			expect(t).toContain("Executed via `openspec-apply-change`, which chooses the executor.");
			expect(t).toMatch(/^## Task 1: .*implements N$/m);
			expect(t).toMatch(/^## Scenario → test$/m);
		});

		it("plan template has the metadata fields", () => {
			const t = tpl("plan.md");
			for (const f of ["**Covers:**", "**Difficulty:**", "**Blocked by:**"]) {
				expect(t, f).toContain(f);
			}
		});

		it("plan instruction requires the metadata and lists difficulties", () => {
			const text = instructionFor("plan");
			for (const d of ["Easy", "Normal", "Hard", "Very Hard"]) expect(text, d).toContain(d);
			expect(text).toContain("**Difficulty:**");
			expect(text).toContain("**Blocked by:**");
		});

		it("plan dropped dependency needs a reason", () => {
			expect(instructionFor("plan")).toMatch(
				/carry[^.]*tasks\.md[^.]*dependenc[^.]*reason/i,
			);
		});

		it("tasks instruction states the unit of work", () => {
			const text = instructionFor("tasks");
			expect(text).toContain("`## N. <name>`");
			expect(text).toMatch(/group/i);
			expect(text).toMatch(/unit handed to one agent/i);
			expect(text).toMatch(/independent[^.]*own group/i);
			expect(text).toMatch(/checkboxes in order/i);
			expect(text).toMatch(/that agent does its checkboxes/i);
		});

		it("plan task N implements exactly group N", () => {
			const text = instructionFor("plan");
			expect(text).toContain("Plan task N implements exactly group N.");
			expect(text).toContain("`**Covers:**`");
		});

		it("plan metadata purpose and dropped-dependency reporting", () => {
			const text = instructionFor("plan");
			expect(text).toContain(
				"used to choose task order, parallel execution, agent and effort",
			);
			expect(text).toMatch(
				/plan reviewer reports a dropped dependency without a reason/i,
			);
		});

		it("tasks instruction allows group numbers only", () => {
			expect(instructionFor("tasks")).toMatch(/Blocked by[^.]*group numbers/i);
		});

		it("tasks template shows the Blocked by line under each group", () => {
			const lines = tpl("tasks.md").split("\n");
			let groups = 0;
			lines.forEach((line, i) => {
				if (/^## \d+\./.test(line)) {
					groups++;
					const next = lines[i + 1] === "" ? lines[i + 2] : lines[i + 1];
					expect(next, line).toMatch(/^Blocked by: /);
				}
				if (/^- \[ \]/.test(line)) {
					expect(lines[i + 1] ?? "", line).not.toMatch(/Blocked by/);
				}
			});
			expect(groups).toBeGreaterThan(0);
		});

		it("task progress ignores Blocked by metadata", () => {
			const boxes = '- [ ] 1.1 a\n- [ ] 1.2 b\n';
			const variants: Record<string, string> = {
				filled: `## 1. A\n\nBlocked by: none\n\n${boxes}\n## 2. B\n\nBlocked by: 1\n\n- [ ] 2.1 c\n`,
				legacy: "## 1. A\n\n- [ ] 1.1 a\n  - Blocked by: nothing\n- [ ] 1.2 b\n  - Blocked by: 1.1\n- [ ] 2.1 c\n",
				none: `${boxes}- [ ] 2.1 c\n`,
			};
			for (const [name, text] of Object.entries(variants)) {
				const id = `prog-${name}`;
				const res = project.openspec(["new", "change", id]);
				expect(res.status, res.stdout + res.stderr).toBe(0);
				const dir = join(project.dir, "openspec", "changes", id);
				writeFileSync(join(dir, "plan.md"), "");
				writeFileSync(join(dir, "tasks.md"), text);
				const out = project.openspec(["instructions", "apply", "--change", id, "--json"]);
				expect(out.status, out.stdout + out.stderr).toBe(0);
				const total = (text.match(/^\s*- \[ \]/gm) ?? []).length;
				expect(JSON.parse(out.stdout).progress.total, name).toBe(total);
			}
		}, 30_000);

		it("plan template has a Contracts section before Task 1", () => {
			const t = tpl("plan.md");
			expect(t).toContain("## Contracts");
			expect(t.indexOf("## Contracts")).toBeLessThan(t.indexOf("## Task 1"));
			expect(t).toContain("| Name | new / modified | Shape | public |");
			expect(t).toContain("None – <reason>");
			expect(t).not.toContain("TypeScript");
		});

		it("plan instruction requires Contracts, a reason after None and name references", () => {
			const text = instructionFor("plan");
			expect(text).toContain("## Contracts");
			expect(text).toMatch(/None – <reason>/);
			expect(text).toContain("refer to contract names");
			expect(text).not.toMatch(/TypeScript/);
			for (const kind of [
				"type",
				"schema",
				"signature",
				"CLI argument",
				"config key",
				"file format",
			]) {
				expect(text, kind).toContain(kind);
			}
		});

		it("design instruction and template point contract shapes to the plan", () => {
			const text = instructionFor("design");
			const t = tpl("design.md");
			for (const src of [text, t]) {
				expect(src).toContain("public");
				expect(src).toContain("Contracts");
			}
			expect(text).toContain("No design needed:");
		});

		it("apply ticks tasks.md as official status and commits dirty change dirs", () => {
			const text = instructionFor("apply");
			expect(text).toContain(
				"When a plan task's review passes, tick the tasks.md boxes of its group. tasks.md is the official status; the executor's ledger is for recovery only.",
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
