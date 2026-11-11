<script lang="ts">
	import { page } from '$app/state';
	import ErrorState from '#lib/components/ErrorState.svelte';
</script>

<ErrorState error={new Error(`${page.status}: ${page.error?.message ?? 'Unknown error'}`)} />
