import { PluginContext } from "../furnarchy";
import { RemoteFurcState } from "./types";
import { getHint } from "./crypto";

export async function loadSettings(api: PluginContext, state: RemoteFurcState) {
	const key = state.currentUser ? `settings_${state.currentUser.uid}` : null;
	if (!key) return;

	const settings =
		api.loadData<{
			relayAddress?: string;
			roomId?: string;
			keyPair?: { publicKey: string; privateKey: string };
			devices?: { id: string; name: string; sharedSecret: string; keyHint?: number }[];
			nextSyncId?: number;
		}>(key) || {};

	state.relayAddress = settings.relayAddress || state.relayAddress;
	state.roomId = settings.roomId || null;
	state.nextSyncId = settings.nextSyncId || 1;
	state.devices = [];

	if (settings.devices) {
		for (const d of settings.devices) {
			const rawKey = Uint8Array.from(atob(d.sharedSecret), (c) => c.charCodeAt(0));
			const sharedKey = await crypto.subtle.importKey(
				"raw",
				rawKey,
				{ name: "AES-GCM", length: 256 },
				true,
				["encrypt", "decrypt"]
			);
			state.devices.push({
				id: d.id,
				name: d.name,
				sharedKey,
				rawSharedSecret: d.sharedSecret,
				keyHint: d.keyHint ?? getHint(d.sharedSecret),
				lastSeen: 0, // Reset activity on load
			});
		}
	}
}

export async function saveSettings(api: PluginContext, state: RemoteFurcState) {
	const key = state.currentUser ? `settings_${state.currentUser.uid}` : null;
	if (!key) return;

	/** @type {any} */
	const exportedDevices = state.devices.map((d) => ({
		id: d.id,
		name: d.name,
		sharedSecret: d.rawSharedSecret,
		keyHint: d.keyHint,
	}));

	await Promise.resolve();
	api.saveData(key, {
		relayAddress: state.relayAddress,
		roomId: state.roomId,
		devices: exportedDevices,
		nextSyncId: state.nextSyncId,
	});
}
