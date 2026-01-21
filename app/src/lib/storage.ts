import { verifyPlugin } from './plugin-sandbox';
import { writable } from 'svelte/store';
import { DEFAULT_PLUGINS, DEFAULT_DEV_PLUGINS } from './default-plugins';

export interface StoredPlugin {
	url: string;
	id?: string;
	name?: string;
	description?: string;
	version?: string;
	author?: string;
	enabled?: boolean;
	toggle?: boolean;
}
const PLUGINS_KEY = 'furnarchy_plugins';
const DELETED_PLUGINS_KEY = 'furnarchy_deleted_plugins';
const AUTH_URL_KEY = 'furnarchy_auth_url';
const VERSION_KEY = 'furnarchy_version';
const ZOOM_SETTINGS_KEY = 'furnarchy_zoom_settings';

export const pluginStore = writable<StoredPlugin[]>([]);

export interface ZoomSettings {
	zoomLevel: number;
	fitWidth: boolean;
}

export function getStoredZoomSettings(): ZoomSettings {
	if (typeof localStorage === 'undefined') return { zoomLevel: 1.5, fitWidth: false };
	const stored = localStorage.getItem(ZOOM_SETTINGS_KEY);
	if (!stored) return { zoomLevel: 1.5, fitWidth: false };
	try {
		return JSON.parse(stored);
	} catch {
		return { zoomLevel: 1.5, fitWidth: false };
	}
}

export function saveStoredZoomSettings(settings: ZoomSettings) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(ZOOM_SETTINGS_KEY, JSON.stringify(settings));
}

function getDeletedPluginIds(): string[] {
	if (typeof localStorage === 'undefined') return [];
	const stored = localStorage.getItem(DELETED_PLUGINS_KEY);
	if (!stored) return [];
	try {
		return JSON.parse(stored);
	} catch (e) {
		return [];
	}
}

export function markPluginAsDeleted(id: string) {
	if (typeof localStorage === 'undefined') return;
	const deleted = getDeletedPluginIds();
	if (!deleted.includes(id)) {
		deleted.push(id);
		localStorage.setItem(DELETED_PLUGINS_KEY, JSON.stringify(deleted));
	}
}

export function getStoredPlugins(): StoredPlugin[] {
	if (typeof localStorage === 'undefined') return [];

	const stored = localStorage.getItem(PLUGINS_KEY);
	if (!stored) return [];

	try {
		const parsed = JSON.parse(stored);
		// Migration: Handle legacy string[] format
		if (Array.isArray(parsed)) {
			return parsed.map((p) => {
				if (typeof p === 'string') return { url: p };
				return p;
			});
		}
		return [];
	} catch (e) {
		console.error('Failed to load plugins', e);
		return [];
	}
}

export function saveStoredPlugins(plugins: StoredPlugin[]) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
	pluginStore.set(plugins);
}

export function updateStoredPlugin(url: string, updates: Partial<StoredPlugin>) {
	pluginStore.update((plugins) => {
		const idx = plugins.findIndex((p) => p.url === url);
		if (idx === -1) return plugins;

		const current = plugins[idx];
		const updated = { ...current, ...updates };

		// Check if anything actually changed to avoid unnecessary writes
		if (JSON.stringify(current) === JSON.stringify(updated)) return plugins;

		const newPlugins = [...plugins];
		newPlugins[idx] = updated;

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(PLUGINS_KEY, JSON.stringify(newPlugins));
		}
		return newPlugins;
	});
}

export function getStoredAuthUrl(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(AUTH_URL_KEY);
}

export function saveStoredAuthUrl(url: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(AUTH_URL_KEY, url);
}

function getStoredVersion(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(VERSION_KEY);
}

function saveStoredVersion(version: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(VERSION_KEY, version);
}

function isMinorBehind(current: string, stored: string | null): boolean {
	if (!stored) return true;

	const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10));
	const [cMaj, cMin] = parse(current);
	const [sMaj, sMin] = parse(stored);

	if (isNaN(cMaj) || isNaN(sMaj)) return false; // Safety

	if (sMaj < cMaj) return true;
	if (sMaj === cMaj && sMin < cMin) return true;

	return false;
}

export async function maintainConfig(currentVersion: string) {
	if (typeof localStorage === 'undefined') return;

	const storedVersion = getStoredVersion();
	let plugins = getStoredPlugins();

	const deletedIds = getDeletedPluginIds();

	let changed = false;

	const defaultUrls = [...DEFAULT_PLUGINS];
	if (import.meta.env.DEV) {
		defaultUrls.push(...DEFAULT_DEV_PLUGINS);
	}

	for (const url of defaultUrls) {
		if (!plugins.some((p) => p.url === url)) {
			try {
				const meta = await verifyPlugin(url);

				// Skip if explicitly deleted
				if (deletedIds.includes(meta.id)) {
					console.log(`Skipping deleted default plugin: ${meta.name} (${meta.id})`);
					continue;
				}

				plugins.push({
					id: meta.id,
					url: url,
					name: meta.name,
					description: meta.description,
					version: meta.version,
					author: meta.author,
					enabled: typeof meta.toggle === 'boolean' ? !meta.toggle : true,
					toggle: meta.toggle
				});
				changed = true;
			} catch (e) {
				console.error(`Failed to load default plugin ${url}:`, e);
			}
		}
	}

	if (changed) {
		saveStoredPlugins(plugins);
	}

	if (storedVersion !== currentVersion) {
		saveStoredVersion(currentVersion);
	}
}
