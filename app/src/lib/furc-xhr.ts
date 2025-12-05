import { resolveAssetUrl, resolveBackendUrl, isRelativeUrl, isBackendUrl } from './url-utils';
import type { ExtendedWindow } from './window-types';

export function installXhrPatch(targetWindow: Window, assetUrl: string, backendUrl: string) {
	const extWindow = targetWindow as ExtendedWindow;
	const BaseXHR = extWindow.XMLHttpRequest;
	// Define the custom XHR class globally
	extWindow.FurcXMLHttpRequest = class FurcXMLHttpRequest extends BaseXHR {
		static readonly UNSENT = 0;
		static readonly OPENED = 1;
		static readonly HEADERS_RECEIVED = 2;
		static readonly LOADING = 3;
		static readonly DONE = 4;

		open(method: string, url: string | URL, ...args: any[]) {
			// Convert URL to string if it's not
			let urlStr = url.toString();

			// Check if URL is relative
			// We assume relative URLs are for static assets on the game server
			if (isRelativeUrl(urlStr)) {
				urlStr = resolveAssetUrl(urlStr, assetUrl);
				console.log(`[FurcXMLHttpRequest] Remapped relative URL to: ${urlStr}`);
			} else if (isBackendUrl(urlStr)) {
				urlStr = resolveBackendUrl(urlStr, backendUrl);
				console.log(`[FurcXMLHttpRequest] Remapped backend URL to: ${urlStr}`);
			}

			// @ts-ignore
			return super.open(method, urlStr, ...args);
		}
	};
}
