<script lang="ts">
	import type { CredentialType } from '#lib/types.ts';

	let { type, secret = $bindable(), accountId = $bindable() }: { type: CredentialType; secret: string; accountId: string } = $props();
</script>

<label>{type.kind === 'subscription' ? 'CLI access token' : 'API key'}<input type="password" autocomplete="off" required bind:value={secret} /></label>
{#if type.accountId}<label>ChatGPT account ID<input autocomplete="off" required bind:value={accountId} /></label>{/if}
{#if type.kind === 'subscription'}
	<details>
		<summary>How to get this token</summary>
		{#if type.id === 'chatgpt_subscription'}
			<p>Run <code>codex login --device-auth</code> locally, then paste only the issued access token and your ChatGPT account ID. The account ID is stored with this token and is not independently verified. <a href="https://developers.openai.com/codex/auth/" target="_blank" rel="noreferrer">Official login guidance</a></p>
		{:else}
			<p>Run <code>claude setup-token</code> locally and paste the token it prints after browser login. <a href="https://code.claude.com/docs/en/authentication" target="_blank" rel="noreferrer">Official login guidance</a></p>
		{/if}
		<p>Never paste a whole credential file or a refresh token.</p>
	</details>
{/if}
<p class="hint">Saved without contacting the provider; a rejected token shows up when a task uses it. It cannot be read back here.</p>

<style>
	label { display: grid; gap: var(--s-2); font-size: var(--fs-sm); }
	input { padding: var(--s-2); border: 1px solid var(--border-strong); border-radius: var(--r-md); background: var(--surface); color: var(--text); }
	details, .hint { margin: 0; font-size: var(--fs-xs); color: var(--text-2); }
	details p { margin: var(--s-2) 0 0; }
</style>
