import { existsSync } from "node:fs";
import { join } from "node:path";
import { findProjectRoot } from "../activation.ts";
import { parseInitArgs } from "./args.ts";
import { DEFAULT_LANGUAGE, applyConfig, applyLanguage, readLanguage, validateLanguage } from "./config.ts";
import type { ExecResult, InitIO } from "./io.ts";
import { cleanLegacy } from "./legacy.ts";
import { checkOpenspec, collectWarnings } from "./preflight.ts";
import {
	backupPath,
	classifySchema,
	installSchema,
	markerVersion,
	replaceSchema,
	ReplaceError,
	type ReplaceResult,
} from "./schema-install.ts";

export type InitOutcome =
	| "activated"
	| "blocked"
	| "invalid-arguments"
	| "preflight-failed"
	| "replace-failed"
	| "validation-failed";

function replacementLine(r: ReplaceResult): string {
	if (r.from === undefined) return `Schema superspec replaced (foreign) with v${r.to}.`;
	const verb = r.from < r.to ? "upgraded" : r.from > r.to ? "downgraded" : "replaced";
	return `Schema superspec ${verb} from v${r.from} to v${r.to}.`;
}

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
	const target = join(root, "openspec", "schemas", "superspec");
	const bundled = join(packageRoot, "schema", "superspec");
	let state: ReturnType<typeof classifySchema>;
	try {
		state = classifySchema(target, bundled);
	} catch (err) {
		io.notify(
			`Could not read openspec/schemas/superspec: ${err instanceof Error ? err.message : String(err)}. Nothing was changed.`,
			"error",
		);
		await cleanLegacy(io, root);
		return "blocked";
	}
	const to = markerVersion(bundled) ?? 0;
	const noteLine = "Note: openspec/config.yaml now has `schema: superspec`.";
	// Blocked notice: the main line, then the config note (when config.yaml was just written), then details.
	const block = async (main: string, details: string[] = []): Promise<InitOutcome> => {
		const lines = [main, ...(config === "written" ? [noteLine] : []), ...details];
		io.notify(lines.join("\n"), "warning");
		await cleanLegacy(io, root);
		return "blocked";
	};

	const schemaReport: string[] = [];
	let backup: string | undefined;
	if (state === "absent") {
		installSchema(root, packageRoot);
	} else if (state !== "identical") {
		let backupLabel: string | undefined;
		if (parsed.force) {
			const found = markerVersion(target);
			backupLabel = found === undefined ? "foreign" : `v${found}`;
		} else if (state === "upgradable") {
			const from = markerVersion(target);
			if (!io.hasUI) {
				return block(
					`Schema superspec v${from} can be upgraded to v${to}. Run /opsx-init in an interactive session to confirm, ` +
						"or /opsx-init --force to upgrade and keep a backup.",
				);
			}
			const ok = await io.confirm(
				"Upgrade schema superspec?",
				`Replace openspec/schemas/superspec (v${from}, unchanged since install) with the bundled v${to}? Commit the result afterwards.`,
			);
			if (!ok) {
				return block(
					`Schema superspec v${from} was left unchanged. Run /opsx-init again and confirm to upgrade to v${to}.`,
				);
			}
		} else {
			const details =
				state === "newer"
					? ["The installed pi-superspec package is older than the project schema; update the package instead if possible."]
					: [];
			return block(
				`Existing schema at openspec/schemas/superspec is ${state}; it was left unchanged. Activation stopped. ` +
					`Run /opsx-init --force to replace it with the bundled v${to}; ` +
					"the current files are backed up to ~/.pi/superspec-backups/ first.",
				details,
			);
		}
		try {
			const backupTo =
				backupLabel === undefined ? undefined : backupPath(io.backupRoot, root, backupLabel, new Date());
			const result = replaceSchema(root, packageRoot, backupTo);
			backup = result.backup;
			schemaReport.push(replacementLine(result));
			if (backup !== undefined) schemaReport.push(`Backup of the previous schema: ${backup}`);
			schemaReport.push("Commit openspec/schemas/superspec/.");
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err);
			const lines = [
				err instanceof ReplaceError ? reason : `Schema replacement failed: ${reason}`,
				"The schema at openspec/schemas/superspec was not changed or was restored.",
			];
			if (err instanceof ReplaceError && err.backup !== undefined) {
				lines.push(`Backup of the previous schema: ${err.backup}`);
			}
			if (config === "written") lines.push(noteLine);
			io.notify(lines.join("\n"), "error");
			await cleanLegacy(io, root);
			return "replace-failed";
		}
	}
	await cleanLegacy(io, root);
	await setLanguage(io, root, parsed.lang);

	const validation = await run(io, ["schema", "validate", "superspec"], root);
	if (validation.code !== 0) {
		const detail = output(validation);
		io.notify(
			`openspec schema validate superspec failed${detail ? `:\n${detail}` : ""}\n` +
				(backup !== undefined ? `Backup of the previous schema: ${backup}\n` : "") +
				"Installed files were kept; the project activates on the next session start even though this session was not reloaded.",
			"error",
		);
		return "validation-failed";
	}
	// reload() rebuilds the chat from session entries, dropping notify() output,
	// so the result is persisted as a session message before reloading.
	const report = [
		...warnings,
		...schemaReport,
		"Schema superspec is valid.",
		"Superspec is set up. Next: /opsx-new <name>",
	];
	if (parsed.generate) {
		report.push("For an existing codebase, run /opsx-generate-specs to draft specs from the code.");
	}
	io.report(report.join("\n"));
	// reload() invalidates the command ctx; nothing may touch io after it.
	await io.reload();
	return "activated";
}
