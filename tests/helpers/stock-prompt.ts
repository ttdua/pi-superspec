import { expect } from "vitest";

/** Stock OpenSpec skill id each command prompt runs (design D4). */
export const STOCK_SKILL = {
	explore: "openspec-explore",
	new: "openspec-new-change",
	continue: "openspec-continue-change",
	ff: "openspec-ff-change",
	apply: "openspec-apply-change",
	verify: "openspec-verify-change",
	sync: "openspec-sync-specs",
	archive: "openspec-archive-change",
} as const;

export type PromptCommand = keyof typeof STOCK_SKILL;

/** Asserts the prompt contract: mapped stock skill, workflow.md section, override rule, missing-skill stop, $@. */
export function expectStockPrompt(text: string, cmd: PromptCommand): void {
	const stock = STOCK_SKILL[cmd];
	expect(text).toContain(`Use the \`${stock}\` skill`);
	expect(text).toContain(`\`${cmd}\` section of \`openspec/schemas/superspec/workflow.md\``);
	expect(text).toContain("where they differ, `workflow.md` wins");
	expect(text).toContain(`If \`${stock}\` is not in the available skills list`);
	expect(text).toContain("openspec config profile");
	expect(text).toContain("openspec update");
	expect(text).toContain("/opsx-init");
	expect(text).toContain("read its SKILL.md");
	expect(text).toContain("name the missing skill");
	expect(text).toContain("stop without doing the work another way");
	expect(text.trimEnd().endsWith("User input: $@")).toBe(true);
	expect(text.trimEnd().split("\n").length).toBeLessThanOrEqual(15);
}
