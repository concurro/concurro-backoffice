export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'concurro.theme';

function read(): ThemePref {
	try {
		const v = localStorage.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : 'system';
	} catch {
		return 'system';
	}
}

const media = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');
let pref = $state<ThemePref>(typeof localStorage === 'undefined' ? 'system' : read());

function apply() {
	const dark = pref === 'dark' || (pref === 'system' && media?.matches);
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

media?.addEventListener('change', apply);

export const theme = {
	get pref() {
		return pref;
	},
	set(next: ThemePref) {
		pref = next;
		try {
			localStorage.setItem(KEY, next);
		} catch {
			/* storage unavailable: keep the choice for this session only */
		}
		apply();
	}
};
