import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (file: string): string => readFileSync(resolve(root, file), "utf8");

function section(text: string, heading: string): string {
	const start = text.indexOf(heading);
	expect(start, `${heading} present`).toBeGreaterThanOrEqual(0);
	const rest = text.slice(start + heading.length);
	const next = rest.indexOf("\n## ");
	return next < 0 ? rest : rest.slice(0, next);
}

describe("README prerequisites", () => {
	it("READMEs name the coding-standards prerequisite", () => {
		const en = section(read("README.md"), "## Prerequisites");
		expect(en).toContain("coding-standards");
		expect(en).toMatch(/implementer/i);
		expect(en).toMatch(/reviewer/i);
		expect(en).toContain(".agents/skills/");
		expect(en).toMatch(/project conventions/i);
		expect(en).toMatch(/(does not|never) stop/i);

		const vi = section(read("README.vi.md"), "## Yêu cầu");
		expect(vi).toContain("coding-standards");
		expect(vi).toContain(".agents/skills/");
		expect(vi).toMatch(/implementer/i);
		expect(vi).toMatch(/reviewer/i);
		expect(vi).toMatch(/convention của project/i);
		expect(vi).toMatch(/không dừng/i);
	});

	it("architecture and workflow docs mention coding-standards", () => {
		expect(read("docs/architecture.md")).toContain("coding-standards");
		expect(read("docs/workflow.md")).toContain("coding-standards");
	});
});

const BUNDLED_AGENT = "`superspec\\.(\\*|scout|spec-reviewer|plan-reviewer|implementer|task-reviewer|verifier)`";
const REQUIRED_BEFORE = new RegExp(
	`(\\b(must|requires?|required|always)\\b|phải|bắt buộc|luôn)[^.\\n]*${BUNDLED_AGENT}`,
	"i",
);
const REQUIRED_AFTER = new RegExp(`${BUNDLED_AGENT}[^.\\n]*(\\b(is|are) required\\b|\\bmandatory\\b|bắt buộc)`, "i");

function makesBundledAgentsRequired(line: string): boolean {
	return REQUIRED_BEFORE.test(line) || REQUIRED_AFTER.test(line);
}

describe("README install and optional packages", () => {
	const en = read("README.md");
	const vi = read("README.vi.md");

	it("Required install commands present", () => {
		const install = section(en, "## Install");
		const order = [
			"brew install openspec",
			"pi install git:github.com/obra/superpowers",
			"pi install https://github.com/ttdua/pi-superspec",
		].map((cmd) => install.indexOf(cmd));
		for (const at of order) expect(at).toBeGreaterThanOrEqual(0);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it("Optional packages explained", () => {
		const fallbacks: Record<string, RegExp> = {
			"@tintinweb/pi-subagents": /executing-plans/,
			"pi-subagents": /executing-plans/,
			"@gotgenes/pi-subagents": /executing-plans/,
			"rpiv-ask-user-question": /(plain question|câu hỏi thường)[^|]*(numbered|đánh số)/,
			"rpiv-todo": /(checklist)/,
			"Plannotator": /ask_user_question[^|]*(numbered|đánh số)/,
		};
		for (const [name, text] of [["README.md", en], ["README.vi.md", vi]] as const) {
			for (const [pkg, fallback] of Object.entries(fallbacks)) {
				const row = text.split("\n").find((l) => l.startsWith(`| \`${pkg}\``) || l.startsWith(`| ${pkg} (`));
				expect(row, `${name} ${pkg} row`).toBeDefined();
				expect(row, `${name} ${pkg} fallback`).toMatch(fallback);
			}
		}
	});

	it("Subagent plugin support stated", () => {
		const rowOf = (text: string, pkg: string): string => text.split("\n").find((l) => l.startsWith(`| \`${pkg}\``)) ?? "";
		expect(rowOf(en, "@tintinweb/pi-subagents")).toMatch(/bundled agents are supplied/);
		expect(rowOf(en, "pi-subagents")).toMatch(/bundled agents are supplied/);
		expect(rowOf(en, "@gotgenes/pi-subagents")).toMatch(/no bundled agents[^|]*own agents/i);
		expect(rowOf(vi, "@tintinweb/pi-subagents")).toMatch(/agent đi kèm được cấp/);
		expect(rowOf(vi, "pi-subagents")).toMatch(/agent đi kèm được cấp/);
		expect(rowOf(vi, "@gotgenes/pi-subagents")).toMatch(/không nhận agent đi kèm[^|]*agent riêng/i);
		expect(en).toMatch(/gotgenes[^\n]*own agents/i);
		expect(vi).toMatch(/gotgenes[^\n]*agent (riêng|của nó)/i);
	});

	it("inline fallback follows the integration paragraph, not the subagent tool", () => {
		const bullet = (text: string, start: string): string => text.split("\n").find((l) => l.startsWith(start)) ?? "";
		const en1 = bullet(en, "- **Absent versus");
		expect(en1).toMatch(/Only when the Subagent integration paragraph reports that delegation is unavailable[^.]*announce the inline fallback/);
		expect(en1).toMatch(/If only an activation helper is present, the stage activates it and re-evaluates on the next turn/);
		expect(en1).not.toMatch(/`subagent` tool/);
		const vi1 = bullet(vi, "- **Vắng mặt");
		expect(vi1).toMatch(/Chỉ khi đoạn Subagent integration báo rằng ủy quyền không khả dụng[^.]*phương án inline/);
		expect(vi1).toMatch(/Nếu chỉ có helper kích hoạt, stage kích hoạt nó rồi đánh giá lại ở lượt kế tiếp/);
		expect(vi1).not.toMatch(/`subagent`/);
	});

	it("no doc sentence makes the bundled agents required", () => {
		for (const file of ["README.md", "README.vi.md", "docs/usage-guide.md", "docs/workflow.md", "docs/architecture.md"]) {
			for (const line of read(file).split("\n")) {
				expect(makesBundledAgentsRequired(line), `${file}: ${line.slice(0, 80)}`).toBe(false);
			}
		}
	});

	it("the required-wording detector catches English and Vietnamese phrasings", () => {
		const bad = [
			"Workflows must use `superspec.*`.",
			"The apply stage requires `superspec.implementer`.",
			"`superspec.scout` is required.",
			"Always use the bundled `superspec.task-reviewer` agent.",
			"Workflow phải dùng `superspec.*`.",
			"Bắt buộc dùng `superspec.verifier` cho bước verify.",
			"`superspec.scout` là bắt buộc.",
		];
		for (const line of bad) expect(makesBundledAgentsRequired(line), line).toBe(true);
		const good = [
			"The bundled candidates are `superspec.scout` and `superspec.verifier`.",
			"Workflows ask for roles, not agent names.",
			"Các ứng viên đi kèm là `superspec.scout`.",
		];
		for (const line of good) expect(makesBundledAgentsRequired(line), line).toBe(false);
	});

	it("READMEs keep the same headings in the same order", () => {
		const headings = (text: string): string[] => text.split("\n").filter((l) => /^#{1,6} /.test(l));
		const map: Record<string, string> = {
			"# pi-superspec": "# pi-superspec",
			"## What it is": "## Giới thiệu",
			"## Prerequisites": "## Yêu cầu",
			"## Install": "## Cài đặt",
			"## Optional subagent integration": "## Tích hợp subagent tùy chọn",
			"## Quick start": "## Bắt đầu nhanh",
			"## Commands": "## Các lệnh",
			"## Uninstall": "## Gỡ cài đặt",
			"## Credits and license": "## Ghi công và giấy phép",
		};
		expect(headings(vi)).toEqual(headings(en).map((h) => map[h] ?? `unmapped: ${h}`));
	});
});

const UNUSED_STOCK = ["openspec-propose", "openspec-update-change", "openspec-bulk-archive-change", "openspec-onboard"];
const WORKFLOW_IDS = ["explore", "new", "continue", "ff", "apply", "verify", "sync", "archive"];
const OLD_STEP_COMMAND = /\/opsx-(explore|new|continue|ff|apply|verify|sync|archive)\b/;
const STEP_SKILL: Record<string, string> = {
	explore: "openspec-explore",
	new: "openspec-new-change",
	continue: "openspec-continue-change",
	ff: "openspec-ff-change",
	apply: "openspec-apply-change",
	verify: "openspec-verify-change",
	sync: "openspec-sync-specs",
	archive: "openspec-archive-change",
};
const STEPS_TO_ARCHIVE = [
	"openspec-new-change",
	"openspec-continue-change",
	"openspec-apply-change",
	"openspec-verify-change",
	"openspec-archive-change",
];

describe("README OpenSpec 2.0 and stock skills", () => {
	const docs = [
		["README.md", read("README.md"), "## Prerequisites", "## Uninstall"],
		["README.vi.md", read("README.vi.md"), "## Yêu cầu", "## Gỡ cài đặt"],
	] as const;

	it("OpenSpec profile explained", () => {
		for (const [name, text, prereq] of docs.map((d) => [d[0], d[1], d[2]] as const)) {
			const body = section(text, prereq);
			expect(body, name).toContain("OpenSpec 2.0");
			expect(body, name).toContain("openspec config profile");
			for (const id of WORKFLOW_IDS) expect(body, `${name} ${id}`).toContain(id);
			expect(body, name).toContain("openspec update");
			expect(body, name).not.toContain("1.16");
		}
	});

	it("Unused stock skills explained", () => {
		for (const [name, text] of docs) {
			for (const id of UNUSED_STOCK) expect(text, `${name} ${id}`).toContain(id);
		}
		expect(read("README.md")).toMatch(/not removed/i);
		expect(read("README.vi.md")).toMatch(/không (bị )?(gỡ|xóa)/i);
	});

	it("Remaining files stated", () => {
		for (const [name, text, , uninstall] of docs) {
			expect(section(text, uninstall), name).toContain(".agents/skills/");
		}
	});

	it("Table matches shipped prompts: the command table lists /opsx-init and /opsx-generate-specs only", () => {
		const prompts = readdirSync(resolve(root, "prompts"))
			.map((f) => `/${f.replace(/\.md$/, "")}`)
			.sort();
		expect(prompts).toEqual(["/opsx-generate-specs"]);
		for (const [name, text] of docs) {
			const rows = text
				.split("\n")
				.map((l) => l.match(/^\| `(\/opsx-[a-z-]+)`/)?.[1])
				.filter((c): c is string => c !== undefined)
				.sort();
			expect(rows, name).toEqual([...prompts, "/opsx-init"].sort());
		}
	});

	it("Skill table maps each step to its stock skill and /skill:<id>", () => {
		for (const [name, text] of docs) {
			for (const [step, id] of Object.entries(STEP_SKILL)) {
				const row = text.split("\n").find((l) => l.startsWith(`| ${step} |`));
				expect(row, `${name} ${step} row`).toBeDefined();
				expect(row, `${name} ${step}`).toContain(`\`${id}\``);
				expect(row, `${name} ${step}`).toContain(`\`/skill:${id}`);
			}
		}
	});

	it("READMEs say /skill:<id> needs enableSkillCommands and that the prompts are gone", () => {
		for (const [name, text] of docs) {
			expect(text, name).toContain("enableSkillCommands");
			expect(text, name).toContain("opsx-propose");
			expect(text, name).toContain("opsx-bulk-archive");
		}
	});

	it("Quick start reaches archive by skill id", () => {
		for (const [name, text, heading] of [
			["README.md", read("README.md"), "## Quick start"],
			["README.vi.md", read("README.vi.md"), "## Bắt đầu nhanh"],
		] as const) {
			const quick = section(text, heading);
			const order = ["/opsx-init", ...STEPS_TO_ARCHIVE].map((c) => quick.indexOf(c));
			for (const [i, at] of order.entries()) expect(at, `${name} ${i}`).toBeGreaterThanOrEqual(0);
			expect(quick, name).toContain("openspec-ff-change");
			expect(quick, name).not.toMatch(OLD_STEP_COMMAND);
		}
	});

	it("Remaining files stated: uninstall names the shipped commands and the stock skills", () => {
		for (const [name, text, , uninstall] of docs) {
			const body = section(text, uninstall);
			expect(body, name).toContain("/opsx-init");
			expect(body, name).toContain("/opsx-generate-specs");
			expect(body, name).not.toMatch(OLD_STEP_COMMAND);
		}
	});

	it("READMEs name no old step command", () => {
		for (const [name, text] of docs) {
			expect(text, name).not.toMatch(OLD_STEP_COMMAND);
		}
	});
});

describe("usage guide", () => {
	const guide = read("docs/usage-guide.md");

	it("Commands not appearing", () => {
		expect(guide).toMatch(/commands do not appear[\s\S]*?`\/opsx-init`[\s\S]*?reload/i);
	});

	it("describes the shipped steps after a schema replacement, without legacy cleanup", () => {
		expect(guide).toContain("continues like a fresh install (language, `openspec schema validate superspec`, reload)");
		expect(guide).not.toMatch(/fresh install \(legacy cleanup/);
	});

	it("Existing schema is not overwritten", () => {
		expect(guide).toContain("--force");
		expect(guide).toMatch(/backs? up|backup/i);
	});

	it("Upgrade after a package update", () => {
		expect(guide).toMatch(/session[- ]start notice/i);
		expect(guide).toContain("openspec/schemas/superspec/");
		expect(guide).toMatch(/commit/i);
	});

	it("Profile missing workflows", () => {
		const entry = section(guide, "**The OpenSpec profile is missing workflows.**");
		expect(entry).toContain("openspec config profile");
		for (const id of WORKFLOW_IDS) expect(entry, id).toContain(id);
		expect(entry).toContain("/opsx-init");
	});

	it("OpenSpec version too old", () => {
		expect(guide).toContain("Install or upgrade OpenSpec (>= 2.0)");
		expect(guide).not.toContain("1.16");
	});

	it("Stock skills removed by an update", () => {
		const entry = section(guide, "**Stock skills are missing after `openspec update`.**");
		expect(entry).toMatch(/openspec update[^.]*profile/);
		expect(entry).toContain("openspec config profile");
	});

	it("Two upgrade paths", () => {
		const entry = section(guide, "## Upgrading");
		expect(entry).toMatch(/`openspec update`[^.]*stock skills/);
		expect(entry).toMatch(/package[^.]*`\/opsx-init`[^.]*`workflow\.md`/);
	});

	it("Skill commands not appearing", () => {
		const entry = section(guide, "**The `/skill:openspec-*` commands do not appear.**");
		expect(entry).toContain("openspec init --tools pi");
		expect(entry).toContain("/opsx-init");
		expect(entry).toContain("openspec config profile");
		expect(entry).toContain("enableSkillCommands");
		expect(entry).toMatch(/ask the agent/i);
	});

	it("Every workflow step covered by skill id, invoked with /skill:<id> or by asking", () => {
		expect(guide.indexOf("/opsx-init")).toBeLessThan(guide.indexOf("## Step by step"));
		const steps = section(guide, "## Step by step");
		const order = STEPS_TO_ARCHIVE.map((c) => steps.indexOf(c));
		for (const at of order) expect(at).toBeGreaterThanOrEqual(0);
		expect([...order].sort((x, y) => x - y)).toEqual(order);
		expect(steps).toContain("/skill:openspec-new-change");
		expect(steps).toMatch(/ask the agent/i);
	});

	it("ff stops before apply and names openspec-apply-change next", () => {
		const ff = section(guide, "## Fast-forward with openspec-ff-change");
		expect(ff).toContain("/skill:openspec-ff-change <name>");
		expect(ff).toMatch(/ask the agent/i);
		expect(ff).toContain("openspec-apply-change");
	});

	it("names no old step command", () => {
		expect(guide).not.toMatch(OLD_STEP_COMMAND);
	});

	it("Restore from backup", () => {
		expect(guide).toContain("~/.pi/superspec-backups/");
		expect(guide).toMatch(/cp -R/);
	});
});

describe("docs match the 2.0 skills model", () => {
	it("no stale paths or legacy cleanup in docs", () => {
		for (const file of ["README.md", "README.vi.md", "docs/architecture.md", "docs/workflow.md", "docs/usage-guide.md", "docs/e2e-checklist.md"]) {
			const text = read(file);
			expect(text, file).not.toContain("skills/references");
			expect(text, file).not.toContain("--tools none");
			expect(text, file).not.toContain("Delete legacy openspec files");
		}
	});

	it("architecture records goals, version and reference path", () => {
		const arch = read("docs/architecture.md");
		expect(arch).toContain("Tested OpenSpec version: 2.0.0");
		expect(arch).toContain("schema/superspec/subagent-routing.md");
		expect(arch).toMatch(/stock (OpenSpec )?skills[^.]*\.agents\/skills\//);
		expect(arch).toContain("Prompts + workflow rules");
	});

	it("workflow doc lists the stock skills, conflict 7 and 11", () => {
		const wf = read("docs/workflow.md");
		for (const id of ["openspec-explore", "openspec-new-change", "openspec-archive-change"]) expect(wf).toContain(id);
		const conflicts = wf.slice(wf.indexOf("## Conflicts resolved"));
		const row = (n: number): string => conflicts.split("\n").find((l) => l.startsWith(`| ${n} |`)) ?? "";
		expect(row(7)).toMatch(/stock/i);
		expect(row(11)).toMatch(/workflow\.md[^|]*(wins|overrides)/i);
		expect(wf).toMatch(/stock skills paragraph/);
	});

	it("e2e checklist covers OpenSpec 2.0 and the shipped layout", () => {
		const e2e = read("docs/e2e-checklist.md");
		expect(e2e).toContain("OpenSpec 2.0 or newer");
		expect(e2e).toContain("openspec config profile");
		expect(e2e).toMatch(/1\.x-initialised/);
		expect(e2e).toContain(".pi/prompts/mine.md");
	});

	it("living spec purposes describe stock skills, not the removed commands", () => {
		for (const cap of ["planning-commands", "execution-commands", "generate-specs-command"]) {
			const purpose = section(read(`openspec/specs/${cap}/spec.md`), "## Purpose");
			expect(purpose, cap).not.toMatch(OLD_STEP_COMMAND);
		}
		for (const cap of ["planning-commands", "execution-commands"]) {
			expect(section(read(`openspec/specs/${cap}/spec.md`), "## Purpose"), cap).toMatch(/stock (OpenSpec )?skills/);
		}
	});

	it("docs name no old step command", () => {
		for (const file of ["docs/architecture.md", "docs/workflow.md", "docs/e2e-checklist.md", "docs/glossary.md", "docs/domain-model.md"]) {
			expect(read(file), file).not.toMatch(OLD_STEP_COMMAND);
		}
	});

	it("e2e checklist covers the section read for explore, sync and archive and the missing-skill stop", () => {
		const e2e = read("docs/e2e-checklist.md");
		for (const id of ["openspec-explore", "openspec-sync-specs", "openspec-archive-change"]) {
			const line = e2e.split("\n").find((l) => l.includes(`/skill:${id}`) && /reads? [^.]*workflow\.md/.test(l));
			expect(line, id).toBeDefined();
		}
		expect(e2e).toMatch(/missing[^.\n]*stock skill[^\n]*stops?/i);
	});

	it("changelog marks the breaking change", () => {
		const log = read("CHANGELOG.md");
		expect(log).toMatch(/BREAKING[^\n]*OpenSpec (>= |≥ )?2\.0/i);
		expect(log).toContain("schema version 9");
		expect(log).toMatch(/BREAKING[^\n]*\/skill:<id>|step (commands|prompts)[^\n]*removed/i);
	});
});
