Furnarchy.register({
    id: "wire-shrek-f3a66d300de24038",
    name: "Wire Shrek",
    description: "Network traffic inspector. Opens a popout window to view raw traffic.",
    version: "1.0.0",
    author: "Furnarchy Zero",
    toggle: true
}, (api) => {
    let popup = null;

    function log(type, text, sourceId, tag) {
        if (popup && !popup.closed) {
            const logContainer = popup.document.getElementById('log');
            if (!logContainer) return;

            const div = popup.document.createElement('div');
            div.className = 'log-entry';
            div.style.backgroundColor = type === 'IN' ? '#e6ffe6' : '#ffe6e6';
            div.title = 'Click to copy raw text';

            div.onclick = () => {
                popup.navigator.clipboard.writeText(text).then(() => {
                    const originalBg = div.style.backgroundColor;
                    div.style.backgroundColor = '#ffffcc';
                    setTimeout(() => div.style.backgroundColor = originalBg, 200);
                }).catch(console.error);
            };
            
            const meta = popup.document.createElement('span');
            meta.style.color = '#888';
            meta.style.fontSize = '0.8em';
            meta.style.marginRight = '8px';
            
            const timestamp = new Date().toLocaleTimeString();
            const tagStr = tag ? `[${tag}]` : '';
            const sourceStr = sourceId ? `(${sourceId})` : '';
            const arrow = type === 'IN' ? '<<' : '>>';
            
            meta.textContent = `${timestamp} ${tagStr}${sourceStr} ${arrow}`;
            
            const content = popup.document.createElement('span');
            content.textContent = text.trim();
            
            div.appendChild(meta);
            div.appendChild(content);
            
            // Auto-scroll logic
            const isNearBottom = (logContainer.scrollTop + logContainer.clientHeight) >= logContainer.scrollHeight - 50;
            
            logContainer.appendChild(div);
            
            if (isNearBottom) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        }
    }

    function openPopup() {
        if (popup && !popup.closed) {
            popup.focus();
            return;
        }
        
        popup = window.open('', 'WireShrek', 'width=600,height=800,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');
        
        if (!popup) {
            console.warn("[Wire Shrek] Popup blocked! Please allow popups for this site.");
            alert("Wire Shrek: Popup blocked! Please allow popups for this site to see the traffic inspector.");
            return;
        }
        
        popup.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Wire Shrek - Network Traffic</title>
                <style>
                    body { font-family: monospace; font-size: 12px; margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
                    h3 { margin: 0; padding: 10px; background: #ddd; border-bottom: 1px solid #999; flex-shrink: 0; }
                    #controls { padding: 5px; background: #eee; border-bottom: 1px solid #ccc; flex-shrink: 0; display: flex; gap: 5px; }
                    #log { flex-grow: 1; overflow-y: auto; padding: 10px; }
                    input { flex-grow: 1; padding: 4px; }
                    button { padding: 4px 8px; cursor: pointer; }
                    .log-entry { position: relative; border-bottom: 1px solid #ccc; padding: 4px; white-space: pre-wrap; word-break: break-all; cursor: pointer; font-family: monospace; }
                    .log-entry:hover { outline: 1px solid #666; z-index: 1; }
                    .log-entry:hover::after {
                        content: "📋 Copy";
                        position: absolute;
                        top: 0;
                        right: 0;
                        background: rgba(0,0,0,0.7);
                        color: #fff;
                        padding: 2px 5px;
                        font-size: 10px;
                        border-bottom-left-radius: 3px;
                        pointer-events: none;
                    }
                </style>
            </head>
            <body>
                <h3>Wire Shrek Capture</h3>
                <div id="controls">
                    <input type="text" id="cmdInput" placeholder="Enter command..." />
                    <button id="btnSend" title="Send to Server (Enter)">Send</button>
                    <button id="btnInject" title="Inject to Client (Shift+Enter)">Inject</button>
                </div>
                <div id="log"></div>
            </body>
            </html>
        `);
        popup.document.close();
        
        const btnSend = popup.document.getElementById('btnSend');
        const btnInject = popup.document.getElementById('btnInject');
        const cmdInput = popup.document.getElementById('cmdInput');

        const sendCmd = () => {
            const text = cmdInput.value;
            if (text) {
                api.send(text.endsWith('\\n') ? text : text + '\\n');
                cmdInput.value = '';
            }
        };
        
        const injectCmd = () => {
             const text = cmdInput.value;
            if (text) {
                api.inject(text.endsWith('\\n') ? text : text + '\\n');
                cmdInput.value = '';
            }
        };

        btnSend.onclick = sendCmd;
        btnInject.onclick = injectCmd;
        
        cmdInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) injectCmd();
                else sendCmd();
            }
        };
        
        popup.onbeforeunload = () => {
            popup = null;
            api.disable();
        };
    }

    function closePopup() {
        if (popup) {
            popup.close();
            popup = null;
        }
    }

    api.onIncoming((text, sourceId, tag) => {
        log('IN', text, sourceId, tag);
        return text;
    }, 1000); // High priority: capture raw server data before other plugins

    api.onOutgoing((text, sourceId, tag) => {
        log('OUT', text, sourceId, tag);
        return text;
    }, -1000); // Low priority: capture final data sent to server (after other plugins)

    api.onPause((paused) => {
        if (paused) {
            closePopup();
        } else {
            openPopup();
        }
    });
    
    api.onLoad((enabled) => {
        if (enabled) {
            openPopup();
        }
    });
});
