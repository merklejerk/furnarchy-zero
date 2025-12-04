<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import { FurnarchyCore } from '$lib/furnarchy-core';
	import { maintainConfig } from '$lib/storage';
	import '$lib/retro.css';

	// We can instantiate a dummy core just to get the version if needed,
	// or just import the version constant if we exported it, but the class has it.
	const version = new FurnarchyCore().version;

	onMount(async () => {
		await maintainConfig(version);
	});
</script>

<svelte:head>
	<title>Furnarchy Zero</title>
</svelte:head> 

<div class="landing-page retro-theme">
	<header>
		<img src="/logo.png" alt="Furnarchy Zero Logo" width="384" />
		<p class="subtitle">A plugin-enabled web client for Furcadia.</p>
		<div class="version">v{version}</div>
	</header>

	<main>
		<div class="actions">
			<a href="/play" class="play-btn" data-sveltekit-reload>Launch Client</a>
		</div>

		<div class="info-section">
			<h2>About</h2>
			<p>
				Furnarchy Zero is a wrapper around the official Furcadia web client that enables client-side
				scripting and plugins. Brought to you by the author of Furnarchy 1, 3, and 2 (yes, counting
				is hard).
			</p>
			<p>
				<strong>Disclaimer:</strong> This is an experimental third-party tool and is not affiliated with
				Dragon's Eye Productions. Use at your own risk. Plugins have full access to your game session.
				Only install plugins from trusted sources.
			</p>
		</div>

		<div class="settings-section">
			<h2>Configuration</h2>
			<SettingsPanel />
		</div>
	</main>

	<footer>
		<div class="footer-links">
			<a
				href="https://github.com/merklejerk/furnarchy-zero"
				target="_blank"
				rel="noopener noreferrer">GitHub</a
			>
			<span class="separator">•</span>
			<a
				href="https://github.com/merklejerk/furnarchy-zero/issues"
				target="_blank"
				rel="noopener noreferrer">Report Issue</a
			>
		</div>
		<p>Furnarchy Zero &copy; 2025</p>
	</footer>
</div>

<style lang="scss">
    @use '../lib/styles/variables' as *;
    @use '../lib/styles/mixins' as *;

	.landing-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 40px 20px;
	}

	:global(body) {
		background-color: $color-bg-dark; /* Dark purple/black background */
	}

	header {
		text-align: center;
		margin-bottom: 60px;
		border-bottom: 4px double #444;
		padding-bottom: 20px;
	}

	.subtitle {
		font-size: 1.5rem;
		color: $color-text-dim;
		margin-top: 10px;
	}

	.version {
		margin-top: 10px;
		color: #666;
	}

	.actions {
		text-align: center;
		margin-bottom: 60px;
	}

	.play-btn {
		display: inline-block;
        @include retro-button($color-primary, $color-primary-border, $color-primary-shadow);
		font-size: 2rem;
		padding: 15px 40px;
		text-decoration: none;
		letter-spacing: 2px;
	}

	.info-section {
        @include retro-panel;
		padding: 30px;
		margin-bottom: 40px;
		line-height: 1.4;
	}

	h2 {
		color: $color-text-link;
		border-bottom: 2px dashed $color-border-dim;
		padding-bottom: 10px;
		margin-top: 0;
	}

	footer {
		text-align: center;
		color: $color-border-dim;
		margin-top: 60px;
		font-size: 1rem;
		border-top: 4px double #444;
		padding-top: 20px;
	}

	.footer-links {
		margin-bottom: 10px;
	}

	.footer-links a {
		color: #888;
		text-decoration: none;
		margin: 0 10px;
	}

	.footer-links a:hover {
		color: $color-text-link;
		text-decoration: underline;
	}

	.separator {
		color: #444;
	}
</style>
