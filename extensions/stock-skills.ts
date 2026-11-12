import { accessSync, constants, statSync } from "node:fs";
import { join } from "node:path";

/** Stock OpenSpec skill ids the Superspec prompts run, in workflow order. */
export const REQUIRED_STOCK_SKILLS: readonly string[] = [
	"openspec-explore",
	"openspec-new-change",
	"openspec-continue-change",
	"openspec-ff-change",
	"openspec-apply-change",
	"openspec-verify-change",
	"openspec-sync-specs",
	"openspec-archive-change",
];

/** OpenSpec workflow ids that install the required stock skills. */
export const REQUIRED_WORKFLOWS: readonly string[] = [
	"explore",
	"new",
	"continue",
	"ff",
	"apply",
	"verify",
	"sync",
	"archive",
];

function isReadableFile(path: string): boolean {
	try {
		if (!statSync(path).isFile()) return false;
		accessSync(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

/** Required stock skills whose `SKILL.md` is not a readable file under `<root>/.agents/skills/`. Never throws. */
export function missingStockSkills(root: string): string[] {
	return REQUIRED_STOCK_SKILLS.filter((id) => !isReadableFile(join(root, ".agents", "skills", id, "SKILL.md")));
}

export function stockSkillsWarning(missing: string[]): string {
	return `pi-superspec needs these stock OpenSpec skills, which are missing from .agents/skills/: ${missing.join(", ")}. Select the workflows with \`openspec config profile\`, then run \`openspec update\` (or /opsx-init).`;
}
