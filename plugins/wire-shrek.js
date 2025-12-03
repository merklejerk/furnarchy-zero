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
            const div = popup.document.createElement('div');
            div.style.fontFamily = 'monospace';
            div.style.borderBottom = '1px solid #ccc';
            div.style.padding = '4px';
            div.style.backgroundColor = type === 'IN' ? '#e6ffe6' : '#ffe6e6';
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordBreak = 'break-all';
            
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
            
            // Auto-scroll if near bottom
            const body = popup.document.body;
            const isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 100;
            
            body.appendChild(div);
            
            if (isNearBottom) {
                popup.window.scrollTo(0, body.scrollHeight);
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
                    body { font-family: monospace; font-size: 12px; padding: 10px; margin: 0; }
                    h3 { margin-top: 0; border-bottom: 2px solid #333; padding-bottom: 5px; }
                </style>
            </head>
            <body>
                <h3>Wire Shrek Capture</h3>
            </body>
            </html>
        `);
        popup.document.close();
        
        popup.onbeforeunload = () => {
            popup = null;
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
    });

    api.onOutgoing((text, sourceId, tag) => {
        log('OUT', text, sourceId, tag);
        return text;
    });

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
