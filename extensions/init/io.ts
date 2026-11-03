export interface ExecResult {
	code: number;
	stdout: string;
	stderr: string;
}

export interface InitIO {
	cwd: string;
	hasUI: boolean;
	exec(command: string, args: string[], cwd?: string): Promise<ExecResult>;
	confirm(title: string, message: string): Promise<boolean>;
	notify(message: string, level?: "info" | "warning" | "error"): void;
	/** Persist a visible message in the session so it survives `reload()`. */
	report(message: string): void;
	reload(): Promise<void>;
	superpowersAvailable(): boolean;
}
