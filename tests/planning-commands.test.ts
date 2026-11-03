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

	it("ff stops before apply and points to /opsx-apply", () => {
		const text = skill("ff");
		expect(text).toContain("/opsx-apply");
		expect(text).toContain("Do NOT start apply");
		expect(text).toContain("interactively");
	});

	it("explore forbids writing implementation code", () => {
		expect(skill("explore")).toContain("Do NOT write code");
	});

	it("new asks for a kebab-case name and continue handles several changes", () => {
		const text = skill("new");
		expect(text).toContain("kebab-case");
		expect(text).toContain("ask for a valid name");
		expect(skill("continue")).toContain("several");
	});
});
