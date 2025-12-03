import { resolveAssetUrl, resolveBackendUrl, isRelativeUrl, isBackendUrl } from './url-utils';

export function installXhrPatch(assetUrl: string, backendUrl: string) {
    // Define the custom XHR class globally
    (window as any).FurcXMLHttpRequest = class FurcXMLHttpRequest extends XMLHttpRequest {
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
