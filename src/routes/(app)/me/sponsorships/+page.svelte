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
<PageHeader title="My sponsorships" subtitle="Your visible provider consent and issue history. Current inference remains org-funded; these grants are prospective and do not report personal charges." />
{#await data.result}<Skeleton rows={6} />{:then issues}
    {#if issues.length}<IssueIntents {issues} />{:else}<EmptyState title="No provider sponsorships" text="On an issue, choose Sponsor OpenAI or Sponsor Anthropic, or comment /concurro sponsor openai or /concurro sponsor anthropic." />{/if}
{:catch error}<ErrorState {error} />{/await}
