<script lang="ts">
	import type { RemoteSession } from '$lib/remote/types';
	import { formatDisplayName } from '$lib/remote/utils';

	export let sessions: RemoteSession[];
	export let onSelect: (session: RemoteSession) => void;
	export let onRemove: (id: string) => void;
</script>

<div class="session-picker">
	<h2 class="title">Sessions</h2>

	<div class="picker-viewport">
		{#each sessions as s}
			<div class="session-card">
				<button class="main-action" on:click={() => onSelect(s)}>
					<div class="info">
						<div class="name">{formatDisplayName(s.name)}</div>
					</div>
				</button>
				<button class="delete-btn" on:click={() => onRemove(s.id)} title="Delete Profile">
					✕
				</button>
			</div>
		{/each}

		{#if sessions.length === 0}
			<div class="empty-state">
				<p>No paired characters found.</p>
				<p class="hint">
					Scan a QR code from the Remote Furc plugin in <a
						href="https://furnarchy.xyz"
						target="_blank"
						rel="noopener noreferrer">Furnarchy</a
					> to get started!
				</p>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	@use '../../styles/remote' as *;

	.session-picker {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: $classic-tan;
		border: 4px ridge $classic-tan;
		box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);

		.title {
			text-align: center;
			color: #fff;
			background: $classic-purple-dark;
			font-family: 'Verdana', sans-serif;
			padding: 8px;
			margin: 0;
			text-transform: uppercase;
			letter-spacing: 2px;
			font-size: 0.9rem;
			border-bottom: 2px solid rgba(0, 0, 0, 0.3);
			font-weight: bold;
		}

		.picker-viewport {
			flex: 1;
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			gap: 12px;
			padding: 20px 10px;
		}

		.session-card {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 0 10px;

			.main-action {
				flex: 1;
				@include furc-button($classic-roll, #fff8e0);
				display: flex;
				align-items: center;
				padding: 8px;
				cursor: pointer;
				text-align: center;
				font-family: 'Verdana', sans-serif;
				text-transform: uppercase;
				letter-spacing: 1.5px;
				min-height: 44px;

				&:active {
					box-shadow: none;
					transform: translate(1px, 1px);
				}

				.info {
					width: 100%;
					.name {
						color: #fff;
						font-weight: bold;
						font-size: 1rem;
						text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
					}
				}
			}

			.delete-btn {
				@include furc-button($classic-red, #ffe0e0);
				width: 44px;
				height: 44px;
				font-size: 0.9rem;
				&:active {
					box-shadow: none;
					transform: translate(1px, 1px);
				}
			}
		}

		.empty-state {
			text-align: center;
			padding: 40px;
			color: black;

			.hint {
				font-size: 0.9rem;
				font-style: italic;
				margin-top: 10px;
			}
		}
	}
</style>
