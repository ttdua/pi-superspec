import { existsSync } from "node:fs";
import { join } from "node:path";
import { findProjectRoot } from "../activation.ts";
import { parseInitArgs } from "./args.ts";
import { DEFAULT_LANGUAGE, applyConfig, applyLanguage, readLanguage, validateLanguage } from "./config.ts";
import type { ExecResult, InitIO } from "./io.ts";
import { cleanLegacy } from "./legacy.ts";
import { checkOpenspec, collectWarnings } from "./preflight.ts";
import { installSchema } from "./schema-install.ts";

export type InitOutcome = "activated" | "blocked" | "invalid-arguments" | "preflight-failed" | "validation-failed";

function output(result: ExecResult): string {
	return [result.stdout.trim(), result.stderr.trim()].filter((s) => s !== "").join("\n");
}

async function run(io: InitIO, args: string[], cwd: string): Promise<ExecResult> {
	try {
		return await io.exec("openspec", args, cwd);
	} catch (err) {
		return { code: 1, stdout: "", stderr: err instanceof Error ? err.message : String(err) };
	}
}

async function setLanguage(io: InitIO, root: string, flag: string | undefined): Promise<void> {
	if (flag !== undefined) {
		applyLanguage(root, flag);
		return;
	}
	if (readLanguage(root) !== undefined) return;
	let language = DEFAULT_LANGUAGE;
	if (io.hasUI) {
		const answer = await io.prompt(`Document language (empty for ${DEFAULT_LANGUAGE})`, `e.g. ${DEFAULT_LANGUAGE}, vi, Tiếng Việt`);
		if (answer !== undefined && answer.trim() !== "") {
			const valid = validateLanguage(answer);
			if (valid === undefined) {
				io.notify(
					`The document language was not used: it must be at most 64 characters with no control characters. Using ${DEFAULT_LANGUAGE}.`,
					"warning",
				);
			} else {
				language = valid;
			}
		}
	}
	applyLanguage(root, language);
}

export async function runInit(io: InitIO, packageRoot: string, args = ""): Promise<InitOutcome> {
	const parsed = parseInitArgs(args);
	if ("error" in parsed) {
		io.notify(parsed.error, "error");
		return "invalid-arguments";
	}
	const preflight = await checkOpenspec(io);
	if (!preflight.ok) {
		io.notify(preflight.message, "error");
		return "preflight-failed";
	}
	const warnings = await collectWarnings(io);
	for (const warning of warnings) io.notify(warning, "warning");

	const root = findProjectRoot(io.cwd) ?? io.cwd;
	if (!existsSync(join(root, "openspec"))) {
		const init = await run(io, ["init", "--tools", "none"], root);
		if (init.code !== 0) {
			const detail = output(init);
			io.notify(`openspec init --tools none failed${detail ? `:\n${detail}` : ""}`, "error");
			return "preflight-failed";
		}
	}

	// Config is applied before the schema is classified, so a blocked run may
	// already have switched config.yaml; the blocked notice says so.
	const config = applyConfig(root);
	const state = installSchema(root, packageRoot);
	if (state !== "absent" && state !== "identical") {
		const lines = [
			`Existing schema at openspec/schemas/superspec is ${state}; it was left unchanged. Activation stopped.`,
		];
		if (config === "written") lines.push("Note: openspec/config.yaml now has `schema: superspec`.");
		lines.push(
			"Upgrading or repairing an existing schema is handled by the schema-auto-upgrade change. " +
				"To reinstall now, back up any local edits, remove openspec/schemas/superspec/, and run /opsx-init again.",
		);
		io.notify(lines.join("\n"), "warning");
		await cleanLegacy(io, root);
		return "blocked";
	}
	await cleanLegacy(io, root);
	await setLanguage(io, root, parsed.lang);

	const validation = await run(io, ["schema", "validate", "superspec"], root);
	if (validation.code !== 0) {
		const detail = output(validation);
		io.notify(
			`openspec schema validate superspec failed${detail ? `:\n${detail}` : ""}\n` +
				"Installed files were kept; the project activates on the next session start even though this session was not reloaded.",
			"error",
		);
		return "validation-failed";
	}
	// reload() rebuilds the chat from session entries, dropping notify() output,
	// so the result is persisted as a session message before reloading.
	io.report([...warnings, "Schema superspec is valid.", "Superspec is set up. Next: /opsx-new <name>"].join("\n"));
	// reload() invalidates the command ctx; nothing may touch io after it.
	await io.reload();
	return "activated";
}
