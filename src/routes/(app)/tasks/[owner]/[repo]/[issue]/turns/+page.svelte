<script lang="ts">
	import { SquareTerminal } from 'lucide-svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
</script>

<EmptyState icon={SquareTerminal} title="No turn selected" text="Pick a turn from the list to see its prompt, transcript, response, changes and runner." />
