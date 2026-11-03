export function parseArtifactTable(markdown: string): Map<string, string[]> {
	const notFound = () =>
		new Error("Artifact table not found in docs/domain-model.md");
	const lines = markdown.split("\n");
	const start = lines.findIndex((l) => /^##\s+Artifact\s*$/.test(l));
	if (start < 0) throw notFound();
	const header = /^\|\s*ID\s*\|\s*File\s*\|\s*Requires\s*\|\s*Notes\s*\|\s*$/;
	let i = start + 1;
	while (i < lines.length && !/^##\s/.test(lines[i])) {
		if (header.test(lines[i])) break;
		i++;
	}
	if (i >= lines.length || !header.test(lines[i])) throw notFound();
	const result = new Map<string, string[]>();
	for (i += 2; i < lines.length && lines[i].startsWith("|"); i++) {
		const cells = lines[i].split("|").map((c) => c.trim());
		const id = cells[1].replace(/`/g, "");
		const req = cells[3].replace(/`/g, "").trim();
		result.set(
			id,
			req === "" || req === "—"
				? []
				: req
						.split(",")
						.map((r) => r.trim())
						.filter(Boolean),
		);
	}
	if (result.size === 0) throw notFound();
	return result;
}
