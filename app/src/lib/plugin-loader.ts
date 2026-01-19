import { get } from 'svelte/store';
import { pluginStore } from './storage';
import type { FurnarchyCore } from './core/furnarchy-core';

function getUrl(url: string, bypassCache: boolean) {
	if (!bypassCache) return url;
	const sep = url.includes('?') ? '&' : '?';
	return `${url}${sep}_=${Date.now()}`;
}

export async function injectPlugin(core: FurnarchyCore, url: string, bypassCache = false) {
	// Check if already injected
	if (document.querySelector(`script[data-plugin-url="${url}"]`)) return;

	try {
		// Attempt to fetch the script content directly.
		// This bypasses strict MIME type checking (ORB/CORB) which often blocks
		// raw GitHub/Gist URLs (served as text/plain).
		// This requires the server to support CORS (which GitHub does).
		const fetchUrl = getUrl(url, bypassCache);
		const response = await fetch(fetchUrl);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const content = await response.text();

		// Set context so register() knows which URL this is
		core.loadingPluginUrl = url;

		const script = document.createElement('script');
		script.textContent = content;
		script.dataset.pluginUrl = url;
		document.body.appendChild(script);
		console.log(`[plugin-loader] Loaded via fetch: ${url}`);
	} catch (e) {
		console.warn(`[plugin-loader] Fetch failed for ${url}, falling back to script tag.`, e);

		// Fallback to standard script injection.
		// This works for non-CORS servers but requires correct MIME types.
		return new Promise<void>((resolve) => {
			const script = document.createElement('script');
			script.src = getUrl(url, bypassCache);
			script.async = true;
			script.dataset.pluginUrl = url;
			script.onload = () => {
				console.log(`[plugin-loader] Loaded via tag: ${url}`);
				resolve();
			};
			script.onerror = () => {
				console.error(`[plugin-loader] Failed to load: ${url}`);
				resolve();
			};
			document.body.appendChild(script);
		});
	} finally {
		core.loadingPluginUrl = null;
	}
}

export async function reloadPlugin(core: FurnarchyCore, url: string) {
	// 1. Find plugin ID to unload properly
	let pluginId: string | null = null;
	if (core && core.plugins) {
		const p = core.plugins.find((p: any) => p.metadata.sourceUrl === url);
		if (p) pluginId = p.metadata.id;
	}

	// 2. Unload from core
	if (pluginId) {
		core.unloadPlugin(pluginId);
	}

	// 3. Remove script tag
	const existingScript = document.querySelector(`script[data-plugin-url="${url}"]`);
	if (existingScript) {
		existingScript.remove();
	}

	// 4. Re-inject
	await injectPlugin(core, url, true);
}

export async function loadAllPlugins(core: FurnarchyCore) {
	const plugins = get(pluginStore);
	await Promise.all(plugins.map((p) => injectPlugin(core, p.url)));
	core.start();
}
