import { existsSync } from "node:fs";
import { join } from "node:path";
import { findProjectRoot } from "../activation.ts";
import { applyConfig } from "./config.ts";
import type { ExecResult, InitIO } from "./io.ts";
import { cleanLegacy } from "./legacy.ts";
import { checkOpenspec, collectWarnings } from "./preflight.ts";
import { installSchema } from "./schema-install.ts";

export type InitOutcome = "activated" | "blocked" | "preflight-failed" | "validation-failed";

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

export async function runInit(io: InitIO, packageRoot: string): Promise<InitOutcome> {
	const preflight = await checkOpenspec(io);
	if (!preflight.ok) {
		io.notify(preflight.message, "error");
		return "preflight-failed";
	}
	for (const warning of await collectWarnings(io)) io.notify(warning, "warning");

	const root = findProjectRoot(io.cwd) ?? io.cwd;
	if (!existsSync(join(root, "openspec"))) {
		const init = await run(io, ["init", "--tools", "none"], root);
		if (init.code !== 0) {
			const detail = output(init);
			io.notify(`openspec init --tools none failed${detail ? `:\n${detail}` : ""}`, "error");
			return "preflight-failed";
		}
	}

	applyConfig(root);
	const state = installSchema(root, packageRoot);
	if (state !== "absent" && state !== "identical") {
		io.notify(
			`Existing schema at openspec/schemas/superspec is ${state}; it was left unchanged. Activation stopped.`,
			"warning",
		);
		await cleanLegacy(io, root);
		return "blocked";
	}
	await cleanLegacy(io, root);

	const validation = await run(io, ["schema", "validate", "superspec"], root);
	if (validation.code !== 0) {
		const detail = output(validation);
		io.notify(`openspec schema validate superspec failed${detail ? `:\n${detail}` : ""}`, "error");
		return "validation-failed";
	}
	io.notify("Schema superspec is valid.", "info");
	await io.reload();
	io.notify("Superspec is set up. Next: /opsx-new <name>", "info");
	return "activated";
}
