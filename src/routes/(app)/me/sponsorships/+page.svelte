<script lang="ts">
    import PageHeader from '#lib/components/PageHeader.svelte';
    import IssueIntents from '#lib/components/IssueIntents.svelte';
    import ErrorState from '#lib/components/ErrorState.svelte';
    import EmptyState from '#lib/components/EmptyState.svelte';
    import Skeleton from '#lib/components/Skeleton.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<svelte:head><title>My sponsorships · Concurro</title></svelte:head>
<PageHeader title="My sponsorships" subtitle="Your visible provider consent and issue history. Each issue selects funding per provider. Consent and historical charges stay visible independently of current funding." />
{#await data.result}<Skeleton rows={6} />{:then issues}
    {#if issues.length}<IssueIntents {issues} />{:else}<EmptyState title="No provider sponsorships" text="On an issue, choose Use my credentials for a provider, or comment /concurro funding openai personal or /concurro funding anthropic personal." />{/if}
{:catch error}<ErrorState {error} />{/await}
