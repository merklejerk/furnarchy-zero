<script lang="ts">
	import GlobalModal from '$lib/components/GlobalModal.svelte';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet" />
</svelte:head>

{@render children()}
<GlobalModal />

<style>
	:global(body) {
		margin: 0;
	}
</style>
