export interface PluginMetadata {
    name: string;
    version?: string;
    author?: string;
    sourceUrl: string;
}

export async function verifyPlugin(url: string): Promise<PluginMetadata> {
    // 1. Fetch content first
    let content: string;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        content = await response.text();
    } catch (e: any) {
        throw new Error(`Failed to fetch plugin: ${e.message}`);
    }

    return new Promise((resolve, reject) => {
        const requestId = Math.random().toString(36).substring(7);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        
        // STRICTER SANDBOX: No allow-same-origin.
        // This prevents the iframe from accessing the parent window's DOM or global objects directly.
        // Communication is restricted to postMessage.
        iframe.setAttribute('sandbox', 'allow-scripts'); 
        
        let timer: any;
        
        const cleanup = () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('message', handleMessage);
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            // Security check: ensure data structure matches what we expect
            const data = event.data;
            if (!data || data.type !== 'furnarchy-plugin-register' || data.requestId !== requestId) {
                return;
            }

            const plugin = data.plugin;
            if (!plugin.name) {
                cleanup();
                reject(new Error('Plugin registered but missing name'));
                return;
            }

            resolve({
                name: plugin.name,
                version: plugin.version,
                author: plugin.author,
                sourceUrl: url
            });
            cleanup();
        };

        window.addEventListener('message', handleMessage);

        // Mock Furnarchy Core inside the sandbox
        const mockScript = `
            window.Furnarchy = {
                version: '0.0.0-sandbox',
                loadingPluginUrl: ${JSON.stringify(url)},
                register: function(meta, arg) {
                    if (typeof arg === 'function') {
                        // Send metadata immediately
                        window.parent.postMessage({
                            type: 'furnarchy-plugin-register',
                            requestId: '${requestId}',
                            plugin: meta
                        }, '*');

                        const api = {
                            send: function() {},
                            inject: function() {},
                            onIncoming: function() {},
                            onOutgoing: function() {},
                            onLoggedIn: function() {},
                            onPause: function() {}
                        };
                        try { arg(api); } catch(e) {}
                    }
                },
                onRegister: function() {},
                send: function() {}
            };
        `;

        // Encode content to Base64 to safely inject into the HTML string without breaking script tags
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        
        const loaderScript = `
            try {
                const content = decodeURIComponent(escape(atob('${base64Content}')));
                const script = document.createElement('script');
                script.textContent = content;
                document.body.appendChild(script);
            } catch(e) {
                console.error('Sandbox execution error:', e);
            }
        `;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <script>${mockScript}<\/script>
            </head>
            <body>
                <script>${loaderScript}<\/script>
            </body>
            </html>
        `;

        iframe.srcdoc = html;
        document.body.appendChild(iframe);

        // Timeout
        timer = setTimeout(() => {
            cleanup();
            reject(new Error('Plugin load timed out (5s) - did not call Furnarchy.register()?'));
        }, 5000);
    });
}
