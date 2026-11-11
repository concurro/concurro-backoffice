const NOW = Date.now();

/** ISO timestamp `minutes` before page load, so fixtures always look recent. */
export function ago(minutes: number): string {
	return new Date(NOW - minutes * 60_000).toISOString();
}

export const H = 60;
export const D = 24 * 60;
