import { withBase } from './paths.ts';

export function relTime(iso: string): string {
	const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	return `${Math.floor(s / 86400)}d ago`;
}

export function absTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function duration(ms: number): string {
	if (!ms) return '—';
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.floor(s / 60);
	return m < 60 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

/** Format a reported count, distinguishing zero from missing usage. */
export function tokens(n: number | null): string {
    if (n === null) return 'Unavailable';
	return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const bytes = (s: string) => new TextEncoder().encode(s).length;

/** Links under the base path. */
export const taskHref = (t: { owner: string; repo: string; issue: number }) => withBase(`/tasks/${t.owner}/${t.repo}/${t.issue}`);
export const targetHref = (t: { owner: string; repo: string }) => withBase(`/targets/${t.owner}/${t.repo}`);

/** The issue on GitHub, where a writer gives commands themselves. */
export const issueUrl = (t: { owner: string; repo: string; issue: number }) => `https://github.com/${t.owner}/${t.repo}/issues/${t.issue}`;

export interface DiffLine {
	kind: 'ctx' | 'add' | 'del' | 'hunk' | 'file';
	text: string;
	a?: number;
	b?: number;
}

/** Parses a unified diff into rows with old/new line numbers. */
export function parseUnified(diff: string): DiffLine[] {
	const out: DiffLine[] = [];
	let a = 0;
	let b = 0;
	for (const line of diff.replace(/\n$/, '').split('\n')) {
		if (line.startsWith('diff --git')) out.push({ kind: 'file', text: line.replace(/^diff --git a\/(\S+) .*/, '$1') });
		else if (/^(index |--- |\+\+\+ )/.test(line)) continue;
		else if (line.startsWith('@@')) {
			const m = /@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
			a = Number(m?.[1] ?? 0);
			b = Number(m?.[2] ?? 0);
			out.push({ kind: 'hunk', text: line });
		} else if (line.startsWith('+')) out.push({ kind: 'add', text: line.slice(1), b: b++ });
		else if (line.startsWith('-')) out.push({ kind: 'del', text: line.slice(1), a: a++ });
		else out.push({ kind: 'ctx', text: line.slice(1), a: a++, b: b++ });
	}
	return out;
}

/** Line diff of two texts (LCS), for plan version comparison. */
export function diffLines(before: string, after: string): DiffLine[] {
	const x = before.split('\n');
	const y = after.split('\n');
	const lcs = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
	for (let i = x.length - 1; i >= 0; i--)
		for (let j = y.length - 1; j >= 0; j--)
			lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < x.length || j < y.length) {
		if (i < x.length && j < y.length && x[i] === y[j]) out.push({ kind: 'ctx', text: x[i], a: ++i, b: ++j });
		else if (j < y.length && (i === x.length || lcs[i][j + 1] >= lcs[i + 1][j])) out.push({ kind: 'add', text: y[j], b: ++j });
		else out.push({ kind: 'del', text: x[i], a: ++i });
	}
	return out;
}
