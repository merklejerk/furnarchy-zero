import { get } from 'svelte/store';
import { openModal, closeModal, modalStore, type ModalOptions } from './modal-store';

export const utils = {
	openModal: (options: ModalOptions) => openModal(options),
	closeModal: () => closeModal(),
	isModalOpen: () => get(modalStore).isOpen,
	setGameInput: (enabled: boolean) => {
		const furnarchy = (window as any).Furnarchy;
		if (furnarchy) {
			furnarchy.setGameInput(enabled);
		}
	},
	saveData: (pluginId: string, key: string, value: any) => {
		if (typeof localStorage === 'undefined') return;
		const storageKey = `furnarchy_plugin_${pluginId}_${key}`;
		try {
			localStorage.setItem(storageKey, JSON.stringify(value));
		} catch (e) {
			console.error(`[Furnarchy] Failed to save data for ${pluginId}:`, e);
		}
	},
	loadData: (pluginId: string, key: string) => {
		if (typeof localStorage === 'undefined') return null;
		const storageKey = `furnarchy_plugin_${pluginId}_${key}`;
		try {
			const item = localStorage.getItem(storageKey);
			return item ? JSON.parse(item) : null;
		} catch (e) {
			console.error(`[Furnarchy] Failed to load data for ${pluginId}:`, e);
			return null;
		}
	},
	escape: (str: string) => {
		return str.replace(/[&<>"']|[\u0080-\uFFFF]/g, (c) => {
			switch (c) {
				case '&':
					return '&amp;';
				case '<':
					return '&lt;';
				case '>':
					return '&gt;';
				case '"':
					return '&quot;';
				case "'":
					return '&#39;';
				default:
					return '&#' + c.charCodeAt(0) + ';';
			}
		});
	}
};
