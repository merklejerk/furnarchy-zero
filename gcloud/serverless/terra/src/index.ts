import { HttpFunction } from '@google-cloud/functions-framework';
import * as dotenv from 'dotenv';

dotenv.config();

// Load allowed origins from env, default to localhost for safety if not set
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

export const proxy: HttpFunction = async (req, res) => {
  // Enable CORS
  const origin = req.headers.origin;
  
  // SECURITY FIX: Only allow whitelisted origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  } else {
    // If origin is not allowed, do NOT set Access-Control-Allow-Origin.
    // The browser will block the response.
    // For non-browser tools (curl), this doesn't matter, but they don't send Origin usually.
  }
  
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Furcadia-FJ-Token, X-Furcadia-FJ-CSRFToken');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const targetBase = process.env.TARGET_BASE_URL || 'https://terra.furcadia.com';
    
    // Construct target URL using URL class for safety
    // Ensure base ends with / and path doesn't start with / to append correctly
    const base = targetBase.endsWith('/') ? targetBase : `${targetBase}/`;
    const relativePath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
    
    // SSRF PROTECTION: Ensure we don't accidentally proxy to a different domain
    // if relativePath happens to be an absolute URL or protocol-relative URL.
    if (relativePath.includes('://') || relativePath.startsWith('//')) {
        res.status(400).send({ error: 'Invalid path: Absolute URLs not allowed' });
        return;
    }

    const targetUrlObj = new URL(relativePath, base);
    const fullTargetUrl = targetUrlObj.toString();

    console.log(`Proxying ${req.method} request to: ${fullTargetUrl}...`);

    const headers: Record<string, string> = {};
    
    // Hop-by-hop headers to skip
    const skipHeaders = [
        'host', 'connection', 'keep-alive', 'proxy-authenticate', 
        'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 
        'upgrade', 'content-length'
    ];

    // Forward headers
    Object.keys(req.headers).forEach(key => {
        if (skipHeaders.includes(key.toLowerCase())) return;
        
        const value = req.headers[key];
        if (Array.isArray(value)) {
            headers[key] = value.join(', ');
        } else if (value !== undefined) {
            headers[key] = value;
        }
    });

    // Mimic official client behavior
    headers['Origin'] = 'https://play.furcadia.com';
    headers['Referer'] = 'https://play.furcadia.com/';

    const options: any = {
      method: req.method,
      headers: headers,
    };

    if (req.method === 'POST' || req.method === 'PUT') {
        // Use rawBody to forward the request body exactly as received
        options.body = req.rawBody;
    }

    console.log('Sending upstream request...');
    const response = await fetch(fullTargetUrl, options);
    console.log(`Upstream response: ${response.status} ${response.statusText}`);
    
    // Forward response headers
    response.headers.forEach((value, name) => {
      const lowerName = name.toLowerCase();
      // Skip CORS headers from the upstream as we set our own
      if (lowerName.startsWith('access-control-')) return;
      // Skip Set-Cookie, we handle it below
      if (lowerName === 'set-cookie') return;
      // Skip content-encoding/length as fetch handles decompression
      if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lowerName)) return;
      
      res.set(name, value);
    });

    // Handle Set-Cookie
    const cookies = response.headers.getSetCookie();
    const modifiedCookies = cookies.map(cookie => {
        // Remove Domain attribute so it defaults to the current domain
        let newCookie = cookie.replace(/;\s*domain=[^;]+/gi, '');
        
        // Determine if we are running locally (HTTP) or in production (HTTPS)
        // If the proxy is accessed via localhost, we assume HTTP/Development environment
        const isLocal = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');

        if (isLocal) {
            // Local development: Remove Secure to allow HTTP
            newCookie = newCookie.replace(/;\s*Secure/gi, '');
            newCookie = newCookie.replace(/;\s*SameSite=[^;]+/gi, '');
            // SameSite=Lax works fine for localhost ports sharing the same domain
            return newCookie + '; SameSite=Lax';
        } else {
            // Production: Enforce SameSite=None; Secure for cross-domain support
            newCookie = newCookie.replace(/;\s*SameSite=[^;]+/gi, '');
            newCookie = newCookie.replace(/;\s*Secure/gi, '');
            return newCookie + '; SameSite=None; Secure';
        }
    });
    if (modifiedCookies.length > 0) {
        res.set('Set-Cookie', modifiedCookies);
    }

    const responseBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(responseBuffer);
    res.status(response.status).send(buffer);

  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).send({ error: error.message });
  }
};
