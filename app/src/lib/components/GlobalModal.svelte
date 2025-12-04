<script lang="ts">
	import { modalStore, closeModal } from '$lib/modal-store';
	import { furnarchyCore } from '$lib/furnarchy-core';
	import { tick } from 'svelte';

	let modalWindow: HTMLDivElement;

	$: if ($modalStore.isOpen) {
		if (typeof window !== 'undefined') {
			furnarchyCore.setGameInput(false);
		}
		tick().then(() => {
			modalWindow?.focus();
		});
	} else {
		if (typeof window !== 'undefined') {
			furnarchyCore.setGameInput(true);
		}
	}
</script>

{#if $modalStore.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeModal}>
		<div
			bind:this={modalWindow}
			class="modal-window retro-theme"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape') closeModal();
			}}
			style:width={$modalStore.width || '500px'}
			style:height={$modalStore.height || 'auto'}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="modal-header">
				<h3>{$modalStore.title}</h3>
				<button class="close-btn" onclick={closeModal}>X</button>
			</div>
			<div class="modal-body">
				{@html $modalStore.body}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '../styles/variables' as *;
	@use '../styles/mixins' as *;

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		backdrop-filter: blur(2px);
	}

	.modal-window {
		background: $color-bg-modal;
		border: 2px solid $color-border-light;
		box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		max-width: 90vw;
		max-height: 90vh;
		color: $color-text-main;
		font-family: $font-main;

		@media (max-width: 600px) {
			width: 95vw !important;
			max-width: 95vw;
		}
	}

	.modal-header {
		background: #0000aa; // Keep specific modal header color
		color: $color-text-bright;
		padding: 8px 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 2px solid $color-border-light;

		h3 {
			margin: 0;
			font-size: 1.2rem;
			text-transform: uppercase;
			letter-spacing: 1px;
		}
	}

	.close-btn {
		@include retro-button($color-danger, $color-border-light, #000);
		font-weight: bold;
		padding: 2px 8px;
		box-shadow: 2px 2px 0px #000; // Override shadow size for small button

		&:hover {
			background: $color-danger-hover;
		}

		&:active {
			transform: translate(1px, 1px);
			box-shadow: 1px 1px 0px #000;
		}
	}

	.modal-body {
		padding: 16px;
		overflow-y: auto;
		font-size: 1.1rem;
		line-height: 1.4;
		@include retro-scrollbar;

		/* Ensure injected HTML looks okay */
		:global {
			p {
				margin-top: 0;
			}

			button {
				@include retro-button(#444, $color-border-light, #000);
				margin-right: 8px;
				margin-bottom: 8px;

				&.btn-primary {
					@include retro-button($color-primary, $color-primary-border, $color-primary-shadow);
				}

				&.btn-danger {
					@include retro-button(
						$color-danger,
						$color-danger-border,
						$color-danger-shadow,
						$color-danger-text
					);
				}

				&.btn-info {
					@include retro-button(
						$color-info,
						$color-info-border,
						rgba(0, 0, 0, 0.5),
						$color-info-text
					);
				}
			}

			input,
			select,
			textarea {
				@include retro-input;
				margin-bottom: 8px;

				&.full-width {
					width: 100%;
					box-sizing: border-box;
				}
			}

			.text-error {
				color: $color-text-error;
			}
			.text-success {
				color: $color-text-terminal;
			}
			.text-dim {
				color: $color-text-dim;
			}
			.text-gold {
				color: $color-text-gold;
			}
		}
	}
</style>
