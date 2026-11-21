<script lang="ts">
    import PageHeader from '#lib/components/PageHeader.svelte';
    import Panel from '#lib/components/Panel.svelte';
    import Skeleton from '#lib/components/Skeleton.svelte';
    import ErrorState from '#lib/components/ErrorState.svelte';
    import MockOperator from '#lib/components/MockOperator.svelte';
    import LiveOperator from '#lib/components/LiveOperator.svelte';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
</script>

<svelte:head><title>Operator · Concurro</title></svelte:head>

{#await data.result}
    <PageHeader title="Operator" subtitle="Read API and viewer-scoped task operations." />
    <Panel title="Read model"><Skeleton rows={4} /></Panel>
{:then op}
    {#if 'kind' in op}<LiveOperator {op} />{:else}<MockOperator op={op} />{/if}
{:catch error}
    <PageHeader title="Operator" subtitle="Read API and viewer-scoped task operations." />
    <ErrorState {error} />
{/await}
