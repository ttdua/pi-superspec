import type { ExecResult, InitIO } from "../../extensions/init/io.ts";

export function fakeIO(
	overrides: Partial<InitIO> = {},
): InitIO & { notes: string[]; reports: string[]; reloads: number } {
	const notes: string[] = [];
	const reports: string[] = [];
	let reloads = 0;
	const base: InitIO = {
		cwd: "/tmp/fake-project",
		hasUI: true,
		async exec(_command: string, _args: string[], _cwd?: string): Promise<ExecResult> {
			return { code: 0, stdout: "1.4.1\n", stderr: "" };
		},
		async confirm(_title: string, _message: string): Promise<boolean> {
			return true;
		},
		async prompt(_title: string, _placeholder?: string): Promise<string | undefined> {
			return undefined;
		},
		notify(message: string, _level?: "info" | "warning" | "error"): void {
			notes.push(message);
		},
		report(message: string): void {
			reports.push(message);
		},
		async reload(): Promise<void> {
			reloads += 1;
		},
		superpowersAvailable(): boolean {
			return true;
		},
	};
	return {
		...base,
		...overrides,
		notes,
		reports,
		get reloads() {
			return reloads;
		},
	};
}
