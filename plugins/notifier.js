Furnarchy.register({
    id: "notifier-744cfc59",
    name: "Notifier",
    version: "1.0.3",
    description: "Sends browser notifications when specific words or patterns appear in chat.",
    author: "me@merklejerk.com",
    toggle: false
}, (api) => {
    const utils = Furnarchy.utils;
    let patterns = []; // string[]
    
    // Load saved patterns
    const saved = api.loadData('patterns');
    if (Array.isArray(saved)) {
        patterns = saved;
    }

    function save() {
        api.saveData('patterns', patterns);
    }

    function requestPermission() {
        if (!("Notification" in window)) {
            api.notify("This browser does not support desktop notification");
            return;
        }
        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                api.notify("Notifications enabled!");
                renderModal(true); // Re-render to hide button
            }
        });
    }

    function sendNotification(title, body) {
        console.log(`[Notifier] Sending notification: ${title} - ${body}`);
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
            // Try to request? Might fail without user gesture
            Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                    new Notification(title, { body });
                }
            });
        }
    }

    function checkMatch(text, pattern) {
        if (!text) return false;
        
        // Regex: /abc/
        if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
            try {
                const lastSlash = pattern.lastIndexOf('/');
                const body = pattern.substring(1, lastSlash);
                let flags = pattern.substring(lastSlash + 1);
                // Force case-insensitive
                if (!flags.includes('i')) flags += 'i';
                const re = new RegExp(body, flags);
                return re.test(text);
            } catch (e) {
                return false;
            }
        }
        
        // Glob: *test*
        if (pattern.includes('*') || pattern.includes('?')) {
            // Escape regex chars but keep * and ?
            const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
            // Convert to regex: * -> .*, ? -> .
            // Match whole string (anchored)
            const regexStr = '^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
            try {
                const re = new RegExp(regexStr, 'i'); 
                return re.test(text);
            } catch (e) {
                return false;
            }
        }

        // Text match (Exact word/phrase)
        try {
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let regexStr = escaped.replace(/ /g, '\\s+');
            
            // Add word boundaries if pattern starts/ends with word characters
            // This ensures "hello" matches "hello!" but not "othello"
            if (/^\w/.test(pattern)) {
                regexStr = '\\b' + regexStr;
            }
            if (/\w$/.test(pattern)) {
                regexStr = regexStr + '\\b';
            }
            
            const re = new RegExp(regexStr, 'i');
            return re.test(text);
        } catch (e) {
            return text.toLowerCase().includes(pattern.toLowerCase());
        }
    }

    api.onIncoming((line, sourceId) => {
        if (!api.enabled) return line;
        if (sourceId === api.metadata.id) return line;

        const cmd = utils.parseServerCommand(line);
        let message = null;
        let sender = null;

        if (cmd.type === 'speech') {
            message = cmd.message;
            sender = cmd.from || "You";
            if (cmd.isSelf) return line; 
        } else if (cmd.type === 'whisper') {
            message = cmd.message;
            sender = cmd.from;
        } else if (cmd.type === 'emote') {
            message = cmd.message; 
            sender = cmd.from;
        } else if (cmd.type === 'roll') {
            message = `rolls ${cmd.message}`;
            sender = cmd.from;
        }

        if (message) {
            // Check patterns
            for (const pat of patterns) {
                if (checkMatch(message, pat)) {
                    sendNotification(`Furnarchy:`, `${sender}: ${message}`);
                    break; // Only one notification per message
                }
            }
        }

        return line;
    });

    function renderModal(force = false) {
        if (!force && api.getModalPluginId() !== api.metadata.id) return;

        const showPermButton = "Notification" in window && Notification.permission === "default";

        const listHtml = patterns.map((pat, idx) => `
            <div class="list-row modal-row">
                <code style="color: #e0e0e0;">${utils.escape(pat)}</code>
                <button class="btn-danger btn-sm" data-idx="${idx}">Del</button>
            </div>
        `).join('');

        const body = `
            <div>
                ${showPermButton ? `
                    <div style="margin-bottom: 20px; padding: 10px; background: rgba(170, 0, 0, 0.2); border: 2px solid #800;" class="text-center">
                        <p style="margin: 0 0 10px 0;">Browser notifications are not enabled.</p>
                        <button id="notifier-perm-btn" class="btn-primary btn-full">Enable Notifications</button>
                    </div>
                ` : ''}
                
                <div style="margin-bottom: 10px;">
                    <label class="modal-label">Add Pattern</label>
                    <div class="text-dim text-small" style="margin-bottom: 5px;">Matches text, globs (*), or /regex/.</div>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <input type="text" id="notifier-input" class="full-width" placeholder="e.g. hello, *pizza*, /foo/" style="flex: 1; margin: 0;" />
                        <button id="notifier-add-btn" class="btn-primary" style="margin: 0;">Add</button>
                    </div>
                </div>

                <div class="list-box" style="height: 200px;">
                    ${patterns.length ? listHtml : '<div class="text-dim text-center" style="padding: 20px;">No patterns added.</div>'}
                </div>

                <div class="text-dim text-small">
                    <p class="modal-label" style="margin-top: 5px;">Examples</p>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li><code>hello</code> - Exact word (case-insensitive)</li>
                        <li><code>*pizza*</code> - Anything containing "pizza"</li>
                        <li><code>/b(oo|ee)p/</code> - Regex for "boop" or "beep"</li>
                    </ul>
                </div>
            </div>
        `;

        api.openModal({
            title: "Notifier Settings",
            body,
            onClose: () => {}
        });

        setTimeout(() => {
            const input = document.getElementById('notifier-input');
            const addBtn = document.getElementById('notifier-add-btn');
            const permBtn = document.getElementById('notifier-perm-btn');

            if (permBtn) {
                permBtn.onclick = requestPermission;
            }

            const add = () => {
                const val = input.value.trim();
                if (val) {
                    patterns.push(val);
                    save();
                    renderModal(true);
                    input.focus();
                }
            };

            if (addBtn) addBtn.onclick = add;
            if (input) {
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') add();
                };
                input.focus();
            }

            document.querySelectorAll('button[data-idx]').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.getAttribute('data-idx'));
                    patterns.splice(idx, 1);
                    save();
                    renderModal(true);
                };
            });
        }, 50);
    }

    api.onConfigure(() => {
        renderModal(true);
    });
});
