export function resolveAssetUrl(relativeUrl: string, assetBaseUrl: string): string {
    let baseStr = assetBaseUrl;
    if (!baseStr.endsWith('/')) baseStr += '/';
    
    // Treat all relative URLs as relative to the asset base directory
    const relPath = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
    
    return new URL(relPath, baseStr).toString();
}

export function resolveBackendUrl(targetUrl: string, backendBaseUrl: string): string {
    const oldUrl = new URL(targetUrl);
    const backendObj = new URL(backendBaseUrl);

    // Combine paths: backend path + original path
    // We strip the leading slash from the old path to append it to the backend path
    const oldPath = oldUrl.pathname.startsWith('/') ? oldUrl.pathname.substring(1) : oldUrl.pathname;
    let basePath = backendObj.pathname;
    if (!basePath.endsWith('/')) basePath += '/';
    
    backendObj.pathname = basePath + oldPath;
    backendObj.search = oldUrl.search;
    backendObj.hash = oldUrl.hash;
    
    return backendObj.toString();
}

export function isRelativeUrl(url: string): boolean {
    return !url.match(/^https?:\/\//) && !url.startsWith('data:') && !url.startsWith('blob:');
}

export function isBackendUrl(url: string): boolean {
    return url.startsWith('http://local-server.furcadia.com:8080/') || url.startsWith('https://terra.furcadia.com/');
}
