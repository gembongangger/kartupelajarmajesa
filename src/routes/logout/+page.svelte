<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/');
	});
</script>

{#if browser}
	<p class="text-center p-8 text-gray-500">Logging out...</p>
{/if}
