import { verifyPlugin } from './plugin-sandbox';
import { writable } from 'svelte/store';

export interface StoredPlugin {
    url: string;
    name?: string;
    version?: string;
    author?: string;
    enabled?: boolean;
}

const PLUGINS_KEY = 'furnarchy_plugins';
const AUTH_URL_KEY = 'furnarchy_auth_url';
const VERSION_KEY = 'furnarchy_version';

export const pluginStore = writable<StoredPlugin[]>([]);

export function getStoredPlugins(): StoredPlugin[] {
    if (typeof localStorage === 'undefined') return [];
    
    const stored = localStorage.getItem(PLUGINS_KEY);
    if (!stored) return [];

    try {
        const parsed = JSON.parse(stored);
        // Migration: Handle legacy string[] format
        if (Array.isArray(parsed)) {
            return parsed.map(p => {
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

export function getStoredAuthUrl(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(AUTH_URL_KEY);
}

export function saveStoredAuthUrl(url: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUTH_URL_KEY, url);
}

export function getStoredVersion(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(VERSION_KEY);
}

export function saveStoredVersion(version: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(VERSION_KEY, version);
}

function isMinorBehind(current: string, stored: string | null): boolean {
    if (!stored) return true;
    
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10));
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
    
    if (isMinorBehind(currentVersion, storedVersion)) {
        const defaultUrls = [
            '/plugins/auto-spinner.js'
        ];
        
        let changed = false;
        
        for (const url of defaultUrls) {
            if (!plugins.some(p => p.url === url)) {
                try {
                    const meta = await verifyPlugin(url);
                    plugins.push({
                        url: url,
                        name: meta.name,
                        version: meta.version,
                        author: meta.author,
                        enabled: true
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
        
        saveStoredVersion(currentVersion);
    }
}
