import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const referenceUrl = new URL("schema/superspec/subagent-routing.md", root);
const workflowUrl = new URL("schema/superspec/workflow.md", root);

const SECTIONS = [
	"Roles",
	"Availability",
	"Selection",
	"Handoff",
	"Lanes",
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
	it("SA-R00 exists as a plain reference with eight sections and no registration", () => {
		expect(existsSync(referenceUrl)).toBe(true);
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

	it("Integration policy loaded: workflow.md links the reference relatively", () => {
		const link = /\]\((subagent-routing\.md)\)/.exec(readFileSync(workflowUrl, "utf8"));
		expect(link, "workflow.md lacks the shared reference link").not.toBeNull();
		expect(new URL(link![1], workflowUrl).href).toBe(referenceUrl.href);
		expect(existsSync(new URL(link![1], workflowUrl))).toBe(true);
	});

	it("Plugin-neutral reference", () => {
		expect(reference()).not.toMatch(
			/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|ask_parent|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(|superspec\./,
		);
	});

	it("Role requirements listed", () => {
		const rows = section("Roles")
			.split("\n")
			.filter((line) => line.trim().startsWith("|"))
			.map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
		expect(rows[0]).toEqual(["Role", "Access", "Required tools", "Skills", "Report"]);
		const body = rows.slice(2);
		expect(body).toHaveLength(6);
		const access = Object.fromEntries(body.map((row) => [row[0].toLowerCase(), row[1]]));
		for (const role of ["scout", "spec reviewer", "plan reviewer", "task reviewer", "verifier"]) {
			expect(access[role]).toBe("read-only");
		}
		expect(access.implementer).toBe("writer");
		const byRole = Object.fromEntries(body.map((row) => [row[0].toLowerCase(), row]));
		for (const row of body) {
			expect(row[2], `${row[0]} tools`).not.toBe("");
			expect(row[3], `${row[0]} skills`).not.toBe("");
			expect(row[4], `${row[0]} report`).not.toBe("");
		}
		expect(byRole.implementer[2]).toMatch(/\bedit\b/);
		expect(byRole.implementer[2]).toMatch(/\bwrite\b/);
		expect(byRole.implementer[3]).toContain("test-driven-development");
		for (const role of ["scout", "spec reviewer", "plan reviewer", "task reviewer", "verifier"]) {
			expect(byRole[role][2], `${role} tools`).not.toMatch(/\b(edit|write)\b/);
		}
		expect(byRole.verifier[3]).toContain("verification-before-completion");
		for (const role of ["implementer", "task reviewer", "plan reviewer"]) {
			expect(byRole[role][3], `${role} skills`).toMatch(/`coding-standards` \(optional\)/);
		}
	});

	it("Lazy tool activation", () => {
		const text = section("Availability");
		expect(text).toMatch(/Subagent integration paragraph[^.]*activat[^.]*next (model )?turn/i);
		expect(text).toMatch(/list[^.]*agents[^.]*before[^.]*dispatch/i);
	});

	it("Optional integration absent", () => {
		const text = section("Availability");
		expect(text).toMatch(/unavailable[^.]*inline/i);
		expect(text).toMatch(/announce/i);
		expect(text).toMatch(/gates[^.]*evidence/i);
		expect(text).toMatch(/do not (?:invent|fabricate)[^.]*(?:call|dispatch)/i);
	});

	it("Selection by requirements", () => {
		const text = section("Selection");
		expect(text).toMatch(/no precedence/i);
		expect(text).toMatch(/announce[^.]*(chosen|agent)/i);
	});

	it("Disabled or incompatible agent", () => {
		const text = section("Selection");
		expect(text).toMatch(/known tool set[^.]*no (edit|write)/i);
		expect(text).toMatch(/report[^.]*role[^.]*missing requirement/i);
		expect(text).toMatch(/stop/i);
		expect(text).toMatch(/(no|never|without)[^.]*(settings|bypass)/i);
		expect(text).toMatch(/never chooses[^.]*silently[^.]*user decides/i);
	});

	it("Optional skill missing", () => {
		const avail = section("Availability");
		expect(avail).toMatch(/optional/i);
		expect(avail).toContain("`coding-standards`");
		expect(avail).toMatch(/once per stage/i);
		expect(avail).toMatch(/dispatch/i);
		expect(avail).toMatch(/project conventions/i);
		expect(avail).toMatch(/not found|skill:coding-standards/);
		expect(avail).toMatch(/only optional/i);
		expect(avail).toMatch(/(does not|not) stop/i);
		expect(avail).toMatch(/no settings/i);
		expect(section("Failures")).toMatch(/optional skill[^.]*does not stop/i);
	});

	it("Recoverable bounded handoff", () => {
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
			/escalation/i,
		]) {
			expect(text).toMatch(field);
		}
		expect(text).toMatch(/^- report destination:/im);
		expect(text).not.toMatch(/`output`/);
		expect(text).toMatch(/Subagent integration paragraph/);
	});

	it("Global no-model rule", () => {
		const text = `${section("Handoff")}\n${section("Authority")}`;
		expect(text).toMatch(/every dispatch[^.]*(no|never|omit)[^.]*model|(no|never|omit)[^.]*model[^.]*every dispatch/i);
		expect(text).toMatch(/thinking[^.]*(only|sole)[^.]*difficulty|difficulty[^.]*only[^.]*thinking/i);
	});

	it("Report kept as scratch artifact", () => {
		const text = section("Handoff");
		expect(text).toMatch(/scratch/i);
		expect(text).toMatch(/write[^.]*itself/i);
	});

	it("Escalation answered", () => {
		const text = section("Handoff");
		expect(text).toMatch(/escalat[^.]*(waiting|not[^.]*complete)/i);
		expect(text).toMatch(/not (merge|tick)/i);
		expect(text).toMatch(
			/answer[^.]*(paragraph's answer mechanism|as the paragraph describes)[^.]*or ask the user/i,
		);
	});

	it("Incomplete report", () => {
		expect(section("Failures")).toContain("Record the gap and treat the task as not complete");
		const text = section("Authority");
		expect(text).toMatch(/missing (?:required )?(?:evidence|section)/i);
		expect(text).toMatch(/incomplete/i);
		expect(text).toMatch(/process (?:exit|status)/i);
		expect(text).toMatch(/headings alone/i);
	});

	it("Failed child lane", () => {
		const text = section("Failures");
		for (const cause of [/disabled/i, /missing/i, /discovery/i, /skills?/i, /tools?/i]) {
			expect(text).toMatch(cause);
		}
		expect(text).toMatch(/named cause/i);
		expect(text).toMatch(/stop the affected (?:delegated )?stage/i);
		expect(text).toMatch(/do not (?:rewrite|write)[^.]*settings/i);
		expect(text).toMatch(/generic agent/i);
		expect(text).toMatch(/CLI/);
		expect(text).toMatch(/inline/i);
		expect(text).toMatch(/exact error/i);
		expect(text).toMatch(/run (?:id|identity)/i);
		expect(text).toMatch(/cwd|worktree/i);
		expect(text).toMatch(/partial state/i);
		expect(text).toMatch(/stop the lane/i);
		expect(text).toMatch(/no (?:alternate|hidden)|do not (?:retry|switch)/i);
	});

	it("One review seat and one writer", () => {
		const text = section("Authority");
		expect(text).toMatch(/one implementation writer per worktree/i);
		expect(text).toMatch(/fresh (?:child )?context/i);
		expect(text).toMatch(/no nested/i);
		expect(text).toMatch(/existing review seats?/i);
		expect(text).toMatch(/generic Superpowers reviewer/i);
		expect(text).toMatch(/parallel[^.]*independent/i);
		expect(text).toMatch(/wait[^.]*as the Subagent integration paragraph describes/i);
		expect(text).toMatch(/(no|do not)[^.]*(short )?poll/i);
	});

	it("Report is not authority", () => {
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

	it("Parallel writers isolated", () => {
		const text = section("Authority");
		expect(text).toMatch(/one implementation writer per worktree/i);
		expect(text).toMatch(/separate worktrees?/i);
	});

	describe("Lanes", () => {
		const lanes = () => section("Lanes");

		it("Independent tasks ready together", () => {
			expect(lanes()).toMatch(/ready[^.]*every[^.]*Blocked by[^.]*merged/i);
			expect(lanes()).toMatch(/`Blocked by: none`|no `Blocked by`[^.]*ready/i);
		});

		it("Blocked task waits", () => {
			expect(lanes()).toMatch(/ready[^.]*every[^.]*Blocked by[^.]*merged/i);
			expect(lanes()).toMatch(/not (yet )?merged[^.]*(not started|waits)/i);
		});

		it("Lanes recorded in apply.md", () => {
			const text = lanes();
			expect(text).toContain("apply.md");
			expect(text).toContain("## Lanes");
			for (const field of [/task ID/i, /lane branch or `sequential`/i, /lane commit range/i, /task review verdict/i, /merge commit/i]) {
				expect(text).toMatch(field);
			}
			expect(text).toMatch(/one commit range[^.]*<change-name>[^.]*merges/i);
			expect(text).toMatch(/finalize[^.]*code review gate[^.]*read/i);
		});

		it("One lane per group", () => {
			expect(lanes()).toMatch(/one lane[^.]*(whole )?(task )?group/i);
			expect(lanes()).toMatch(/same (implementer|agent)[^.]*in order/i);
			expect(lanes()).toMatch(/(not|never)[^.]*separate lanes/i);
		});

		it("Overlapping files", () => {
			expect(lanes()).toMatch(/files of two ready tasks overlap[^.]*(not|never)[^.]*same time/i);
			expect(lanes()).toMatch(/no (declared )?file list[^.]*overlaps every other task/i);
		});

		it("Two parallel writers", () => {
			expect(lanes()).toMatch(/own (child )?worktree[^.]*<change-name>--task-<N>/);
		});

		it("Lane cap", () => {
			expect(lanes()).toMatch(/at most three writer lanes/i);
		});

		it("Review gates the merge", () => {
			expect(lanes()).toMatch(/merge[^.]*only after[^.]*review/i);
		});

		it("Final review covers merges", () => {
			expect(lanes()).toMatch(/final whole-branch review[^.]*merges/i);
		});

		it("Conflict re-run", () => {
			expect(lanes()).toMatch(/abort[^.]*merge[^.]*alone[^.]*new HEAD/i);
		});

		it("Second conflict", () => {
			expect(lanes()).toMatch(/second conflict[^.]*(stop|ask)/i);
		});

		it("Hard task", () => {
			for (const row of ["Easy | low", "Normal | medium", "Hard | high", "Very Hard | xhigh"]) {
				expect(lanes()).toContain(row);
			}
			expect(lanes()).toMatch(/implementer and (the )?task reviewer/i);
			expect(lanes()).toMatch(/no model/i);
		});

		it("Adapter without per-call thinking", () => {
			expect(lanes()).toMatch(/paragraph says[^.]*no thinking[^.]*(pass|send) none/i);
		});

		it("Legacy plan", () => {
			expect(lanes()).toMatch(/without[^.]*Blocked by[^.]*one after another/i);
			expect(lanes()).toMatch(/plan[^.]*governs/i);
		});

		it("Escalated lane waits", () => {
			expect(lanes()).toMatch(/escalat[^.]*(neither|not)[^.]*(merge|tick)/i);
		});
	});

	it("documents compatibility truthfully", () => {
		const text = section("Compatibility");
		expect(text).toContain("docs/architecture.md");
		expect(text).toContain("docs/e2e-checklist.md");
		expect(text).toMatch(/not claim[^.]*untested/i);
	});

	it("Compatibility links survive the copy", () => {
		const links = [...section("Compatibility").matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
		expect(links).toEqual([
			"https://github.com/ttdua/pi-superspec/blob/main/docs/architecture.md",
			"https://github.com/ttdua/pi-superspec/blob/main/docs/e2e-checklist.md",
		]);
		for (const link of links) expect(link).toMatch(/^https:\/\/github\.com\/ttdua\/pi-superspec\//);
	});
});

describe("architecture compatibility note", () => {
	const architecture = readFileSync(new URL("docs/architecture.md", root), "utf8");

	const compatibility = (): string => {
		const start = architecture.indexOf("### Subagent compatibility");
		expect(start).toBeGreaterThanOrEqual(0);
		const rest = architecture.slice(start);
		const next = rest.slice(3).search(/\n#{1,3} /);
		return next < 0 ? rest : rest.slice(0, next + 3);
	};
	const row = (plugin: string): string => {
		const found = compatibility()
			.split("\n")
			.find((l) => l.startsWith("|") && l.includes(`\`${plugin}\``));
		expect(found, `${plugin} row`).toBeDefined();
		return found ?? "";
	};

	it("links the routing reference and states no proven minimum", () => {
		expect(architecture).toMatch(/skills\/references\/subagent-routing\.md/);
		expect(compatibility()).toMatch(/not a proven minimum/i);
	});

	it("records pi-subagents as smoke-tested at its commit", () => {
		const r = row("pi-subagents");
		expect(r).toContain("d9f8f8c9a709a23adf5f323bb046f3fa91517d4c");
		expect(r).toContain("smoke-tested");
	});

	it("records @tintinweb/pi-subagents as inspected at its commit", () => {
		const r = row("@tintinweb/pi-subagents");
		expect(r).toContain("50460b5df6934c4237983a504808a04ee0f8a0a0");
		expect(r).toContain("inspected");
	});

	it("records @gotgenes/pi-subagents 25.0.5 as inspected at its commit", () => {
		const r = row("@gotgenes/pi-subagents");
		expect(r).toContain("25.0.5");
		expect(r).toContain("52854c12d590142e61a4f6a6947be9084035300d");
		expect(r).toContain("inspected");
	});
});
