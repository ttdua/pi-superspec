import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_STOCK_SKILLS, REQUIRED_WORKFLOWS, missingStockSkills, stockSkillsWarning } from "../extensions/stock-skills.ts";

function skillsRoot(ids: readonly string[] = REQUIRED_STOCK_SKILLS): string {
	const root = mkdtempSync(join(tmpdir(), "stock-skills-"));
	for (const id of ids) {
		mkdirSync(join(root, ".agents", "skills", id), { recursive: true });
		writeFileSync(join(root, ".agents", "skills", id, "SKILL.md"), "---\nname: x\n---\n");
	}
	return root;
}

describe("required lists", () => {
	it("pins the eight skills and workflows in order", () => {
		expect(REQUIRED_WORKFLOWS).toEqual(["explore", "new", "continue", "ff", "apply", "verify", "sync", "archive"]);
		expect(REQUIRED_STOCK_SKILLS).toEqual([
			"openspec-explore",
			"openspec-new-change",
			"openspec-continue-change",
			"openspec-ff-change",
			"openspec-apply-change",
			"openspec-verify-change",
			"openspec-sync-specs",
			"openspec-archive-change",
		]);
	});
});

describe("missingStockSkills", () => {
	it("returns [] when all eight SKILL.md files exist", () => {
		expect(missingStockSkills(skillsRoot())).toEqual([]);
	});

	it("names the absent skills", () => {
		const ids = REQUIRED_STOCK_SKILLS.filter((id) => id !== "openspec-ff-change" && id !== "openspec-verify-change");
		expect(missingStockSkills(skillsRoot(ids))).toEqual(["openspec-ff-change", "openspec-verify-change"]);
	});

	it("counts a directory without SKILL.md as missing", () => {
		const bare = skillsRoot(REQUIRED_STOCK_SKILLS.filter((id) => id !== "openspec-sync-specs"));
		mkdirSync(join(bare, ".agents", "skills", "openspec-sync-specs"));
		expect(missingStockSkills(bare)).toEqual(["openspec-sync-specs"]);
	});

	it("returns all eight without throwing when .agents/skills is a file", () => {
		const root = mkdtempSync(join(tmpdir(), "stock-skills-"));
		mkdirSync(join(root, ".agents"));
		writeFileSync(join(root, ".agents", "skills"), "");
		expect(missingStockSkills(root)).toEqual([...REQUIRED_STOCK_SKILLS]);
	});

	it("returns all eight when .agents/skills is absent", () => {
		expect(missingStockSkills(mkdtempSync(join(tmpdir(), "stock-skills-")))).toEqual([...REQUIRED_STOCK_SKILLS]);
	});

	it.skipIf(process.getuid?.() === 0)("counts an unreadable SKILL.md as missing", () => {
		const root = skillsRoot();
		const file = join(root, ".agents", "skills", "openspec-explore", "SKILL.md");
		chmodSync(file, 0o000);
		try {
			expect(missingStockSkills(root)).toEqual(["openspec-explore"]);
		} finally {
			chmodSync(file, 0o644);
		}
	});
});

describe("stockSkillsWarning", () => {
	it("names the skill and both fix commands", () => {
		const text = stockSkillsWarning(["openspec-ff-change"]);
		expect(text).toContain("openspec-ff-change");
		expect(text).toContain("openspec config profile");
		expect(text).toContain("openspec update");
	});
});
