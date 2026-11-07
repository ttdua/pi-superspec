import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";

const rootPath = fileURLToPath(new URL("..", import.meta.url));

const PLUGIN_SPECIFIC =
	/pi-subagents|tintinweb|gotgenes|contact_supervisor|subagents_enable|ask_parent|notify_parent|get_subagent_result|steer_subagent|bg_wait|Agent\(|subagent\(/;
const BUNDLED_NAME = /superspec\./;

function filesUnder(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? filesUnder(path) : [path];
	});
}

const rel = (path: string): string => path.slice(rootPath.length);

describe("plugin-neutral workflow text", () => {
	const skillFiles = filesUnder(join(rootPath, "skills"));
	const promptFiles = filesUnder(join(rootPath, "prompts"));
	const agentFiles = filesUnder(join(rootPath, "agents")).filter((f) => f.endsWith(".md"));

	it("finds the files it checks", () => {
		expect(skillFiles.length).toBeGreaterThan(0);
		expect(promptFiles.length).toBeGreaterThan(0);
		expect(agentFiles).toHaveLength(6);
	});

	it("skills and prompts name no plugin-specific tool or package", () => {
		for (const file of [...skillFiles, ...promptFiles]) {
			expect(readFileSync(file, "utf8"), rel(file)).not.toMatch(PLUGIN_SPECIFIC);
		}
	});

	it("Skills name roles, not bundled agent names", () => {
		for (const file of skillFiles) {
			expect(readFileSync(file, "utf8"), rel(file)).not.toMatch(BUNDLED_NAME);
		}
	});

	it("agent bodies name no plugin-specific tool or package", () => {
		for (const file of agentFiles) {
			const { body } = parseFrontmatter(readFileSync(file, "utf8"));
			expect(body, rel(file)).not.toMatch(PLUGIN_SPECIFIC);
		}
	});
});
