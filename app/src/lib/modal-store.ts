import { writable } from 'svelte/store';

export interface ModalOptions {
    title: string;
    body: string; // HTML content
    onClose?: () => void;
    width?: string;
    height?: string;
}

export interface ModalState extends ModalOptions {
    isOpen: boolean;
}

const initialState: ModalState = {
    isOpen: false,
    title: '',
    body: '',
    onClose: undefined
};

export const modalStore = writable<ModalState>(initialState);

export function openModal(options: ModalOptions) {
    modalStore.update(state => {
        // If there was a previous modal open with an onClose, should we call it?
        // The requirement says "exclusive (one at a time)".
        // Usually opening a new one replaces the old one.
        // If we want to be nice, we might want to close the old one first.
        // But for now, let's just overwrite.
        return {
            ...initialState, // Reset other props
            ...options,
            isOpen: true
        };
    });
}

export function closeModal() {
    modalStore.update(state => {
        if (state.isOpen && state.onClose) {
            try {
                state.onClose();
            } catch (e) {
                console.error("Error in modal onClose handler:", e);
            }
        }
        return { ...initialState };
    });
}
