import type { Tone } from '#lib/types.ts';

export interface Toast {
	id: number;
	text: string;
	tone: Tone;
}

let seq = 0;
export const toasts = $state<Toast[]>([]);

export function toast(text: string, tone: Tone = 'success') {
	const id = ++seq;
	toasts.push({ id, text, tone });
	setTimeout(() => dismiss(id), 4000);
}

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}
