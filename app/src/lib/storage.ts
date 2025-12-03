export interface StoredPlugin {
    url: string;
    name?: string;
    version?: string;
    author?: string;
}

const PLUGINS_KEY = 'furnarchy_plugins';
const AUTH_URL_KEY = 'furnarchy_auth_url';

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
}

export function getStoredAuthUrl(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(AUTH_URL_KEY);
}

export function saveStoredAuthUrl(url: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUTH_URL_KEY, url);
}
