<script lang="ts">
	import { formatDisplayName } from '$lib/remote/utils';
	export let name: string;
	export let status: string;
	export let active: boolean;
	export let unread: boolean;
	export let onSelect: () => void;
	export let onClose: () => void;

	function handleClose(e: MouseEvent) {
		e.stopPropagation();
		onClose();
	}
</script>

<div
	class="session-tab {active ? 'active' : ''} {unread ? 'unread' : ''}"
	on:click={onSelect}
	on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
	role="button"
	tabindex="0"
>
	<div class="tab-content">
		<span class="status-dot {status.toLowerCase().includes('connected') ? 'online' : 'offline'}"
			>●</span
		>
		<span class="name">{formatDisplayName(name)}</span>
		<button class="close-btn" on:click={handleClose}>×</button>
	</div>
</div>

<style lang="scss">
	@use '../../styles/remote' as *;

	.session-tab {
		background: $classic-btn-bg;
		color: #fff;
		border: 2px outset $classic-btn-border;
		border-bottom: none;
		padding: 4px 8px;
		min-width: 100px;
		max-width: 150px;
		font-size: 0.85rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		border-radius: 6px 6px 0 0;
		margin-right: -2px;
		position: relative;
		transition: background 0.1s;
		font-family: 'Verdana', sans-serif;

		&.active {
			background: $classic-tan;
			color: #000;
			border-color: $classic-tan-dark;
			z-index: 2;
			cursor: default;

			.close-btn {
				color: #000;
			}
		}

		.tab-content {
			display: flex;
			align-items: center;
			width: 100%;
			gap: 6px;

			.name {
				flex: 1;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				font-weight: bold;
			}
		}

		&.unread .name {
			animation: throb 1s infinite ease-in-out;
			text-shadow: 0 0 4px color-mix(in srgb, currentColor 50%, transparent 50%);
		}

		.tab-content {
			display: flex;
			align-items: center;
			width: 100%;
			gap: 6px;

			.name {
				flex: 1;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				font-weight: bold;
			}

			.status-dot {
				font-size: 0.7rem;
				&.online {
					color: #0f0;
					text-shadow: 0 0 3px #0f0;
				}
				&.offline {
					color: #f00;
					text-shadow: 0 0 3px #f00;
				}
			}

			.close-btn {
				background: transparent;
				border: none;
				font-size: 1.1rem;
				cursor: pointer;
				padding: 0 2px;
				opacity: 0.7;

				&:hover {
					opacity: 1;
					color: $classic-red;
				}
			}
		}
	}

	@keyframes throb {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}
</style>
