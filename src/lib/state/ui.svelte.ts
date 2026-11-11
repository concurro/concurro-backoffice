const KEY = 'concurro.sidebar';

function read(): boolean {
	try {
		return localStorage.getItem(KEY) === 'collapsed';
	} catch {
		return false;
	}
}

export const ui = $state({
	sidebarCollapsed: typeof localStorage === 'undefined' ? false : read(),
	mobileNavOpen: false,
	paletteOpen: false
});

export function toggleSidebar() {
	ui.sidebarCollapsed = !ui.sidebarCollapsed;
	try {
		localStorage.setItem(KEY, ui.sidebarCollapsed ? 'collapsed' : 'open');
	} catch {
		/* storage unavailable */
	}
}
