Furnarchy.register({
    id: "color-copy-b5bb9d80",
    name: "Color Copy",
    version: "1.1.0",
    description: "Copy a furre's colors.",
    author: "Furnarchy Zero"
}, (api) => {
    const utils = Furnarchy.utils;
    let listening = false;
    let timeoutId = null;
    
    // State
    let history = [];
    let myName = null;
    let myUid = null;
    let waitingForDream = false;
    let lastAppliedColor = null;

    function reset() {
        listening = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function loadHistory() {
        if (!myName) return;
        const key = `history_${utils.getShortname(myName)}`;
        history = api.loadData(key) || [];
    }

    function saveHistory() {
        if (!myName) return;
        const key = `history_${utils.getShortname(myName)}`;
        api.saveData(key, history);
    }

    function stripSpecies(code) {
        if (!code) return '';
        if (code.startsWith('w')) {
            return code.substring(0, 14);
        } else if (code.startsWith('t')) {
            return code.substring(0, 12);
        } else {
            return code.substring(0, 11);
        }
    }

    function addToHistory(colorCode, name) {
        // Deduplicate: Remove existing entry with same code and name
        const existingIndex = history.findIndex(h => h.colorCode === colorCode && h.name === name);
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }

        // Add to top
        history.unshift({
            colorCode,
            name,
            timestamp: Date.now()
        });
        // Keep max 32
        if (history.length > 32) {
            history = history.slice(0, 32);
        }
        saveHistory();
    }

    function applyColor(colorCode, notify = true) {
        lastAppliedColor = colorCode;
        api.send(`chcol ${colorCode}`);
        if (notify) {
            api.notify("Colors applied!");
        }
    }

    function toggleListening() {
        if (listening) {
            reset();
            api.notify("Color copy cancelled.");
        } else {
            listening = true;
            api.notify("Click on a player within 30 seconds to copy their colors.");
            
            timeoutId = setTimeout(() => {
                if (listening) {
                    reset();
                    api.notify("Color copy timed out.");
                }
            }, 30000);
        }
    }

    api.onLoggedIn((name, uid) => {
        myName = name;
        myUid = parseInt(uid, 10);
        loadHistory();
        
        // We are logging in, so we must wait for the dream to load
        // to avoid capturing the initial blank character info.
        waitingForDream = true;
        lastAppliedColor = null;
    });

    // Initialize if already logged in (e.g. plugin reload)
    if (api.isLoggedIn) {
        myName = api.name;
        myUid = parseInt(api.uid, 10);
        loadHistory();
        waitingForDream = false; // We are already in, trust incoming colors
        lastAppliedColor = null;
    }

    api.onOutgoing((text) => {
        if (!api.enabled) return text;
        
        if (text.trim().toLowerCase() === 'copy') {
            toggleListening();
            return null; // Block the command from going to the server
        }
        return text;
    });

    api.onIncoming((line, sourceId) => {
        if (!api.enabled) return line;
        if (sourceId === api.metadata.id) return line;

        const cmd = utils.parseServerCommand(line);

        if (cmd.type === 'load-dream') {
            waitingForDream = false;
        }

        // Capture self colors (initial or external changes)
        if (myUid && !waitingForDream) {
            let cc = null;
            if (cmd.type === 'add-avatar' && cmd.uid === myUid) {
                cc = cmd.colorCode;
            } else if (cmd.type === 'update-avatar-appearance' && cmd.uid === myUid) {
                cc = cmd.colorCode;
            } else if (cmd.type === 'set-character-info' && utils.getShortname(cmd.name) === utils.getShortname(myName)) {
                cc = cmd.colorCode;
            }

            if (cc) {
                // Only add if it's different from what we last applied ourselves
                // We strip the species info because the server might reject the species change
                // (e.g. if we don't own it) but accept the colors, resulting in a mismatch
                // if we compare the full code.
                if (stripSpecies(cc) !== stripSpecies(lastAppliedColor)) {
                    addToHistory(cc, myName);
                    lastAppliedColor = cc; // Sync state
                }
            }
        }

        // Handle Copy Logic
        if (listening && cmd.type === 'set-character-info') {
            const colorCode = cmd.colorCode;
            const name = cmd.name;

            applyColor(colorCode, false);
            addToHistory(colorCode, name);
            api.notify(`Copied colors from ${name}!`);
            
            reset();
        }

        return line;
    });

    function clearHistory() {
        history = [];
        saveHistory();
        showModal();
    }

    function showModal() {
        const canInteract = api.isLoggedIn && api.isConnected;

        // Generate HTML for history
        let historyHtml = '';
        if (!canInteract) {
            historyHtml = '<div class="list-row text-dim">Please connect and log in to view history.</div>';
        } else if (history.length === 0) {
            historyHtml = '<div class="list-row text-dim">No history yet.</div>';
        } else {
            history.forEach((item, index) => {
                const date = new Date(item.timestamp).toLocaleTimeString();
                historyHtml += `
                    <div class="list-row" style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 10px; flex-grow: 1;">
                            <span class="text-gold">${utils.escape(item.name)}</span>
                            <span class="text-dim" style="font-size: 0.8em;">(${date})</span>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button id="btn-copy-${index}" class="btn-primary" style="padding: 2px 6px; font-size: 0.8em;" title="Copy to Clipboard">📋</button>
                            <button id="btn-apply-${index}" class="btn-info" style="padding: 2px 8px; font-size: 0.8em;">Apply</button>
                        </div>
                    </div>
                `;
            });
        }

        const clearBtnStyle = canInteract ? 'padding: 2px 8px; font-size: 0.8em;' : 'display: none;';
        const startBtnDisabled = !canInteract ? 'disabled' : '';

        api.openModal({
            title: "Color Copy",
            body: `
                <div class="text-dim">
                    <p>Type <span class="text-success">\`copy</span> in chat and click a furre to copy their colors.</p>
                    <div style="margin: 10px 0; text-align: center;">
                        <button id="btn-start-copy" class="btn-primary" style="padding: 5px 20px;" ${startBtnDisabled}>Start Copying</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 class="text-gold" style="margin: 0;">History</h3>
                        <button id="btn-clear-history" class="btn-secondary" style="${clearBtnStyle}">Clear</button>
                    </div>
                    <div class="list-box" style="height: 200px; overflow-y: auto; margin-bottom: 10px;">
                        ${historyHtml}
                    </div>
                    <p class="text-error" style="font-size: 0.8em;">Requires Silver Sponsorship+ for <code>chcol</code>.</p>
                </div>
            `,
            width: "400px"
        });

        // Bind click events
        setTimeout(() => {
            const startBtn = document.getElementById('btn-start-copy');
            if (startBtn && !startBtn.disabled) {
                startBtn.onclick = () => {
                    toggleListening();
                    api.closeModal();
                };
            }

            const clearBtn = document.getElementById('btn-clear-history');
            if (clearBtn) {
                clearBtn.onclick = clearHistory;
            }

            if (canInteract) {
                history.forEach((item, index) => {
                    const applyBtn = document.getElementById(`btn-apply-${index}`);
                    if (applyBtn) {
                        applyBtn.onclick = () => {
                            applyColor(item.colorCode);
                            api.closeModal();
                        };
                    }

                    const copyBtn = document.getElementById(`btn-copy-${index}`);
                    if (copyBtn) {
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(item.colorCode).then(() => {
                                api.notify("Color code copied to clipboard!");
                            }).catch(err => {
                                console.error('Failed to copy: ', err);
                                api.notify("Failed to copy to clipboard.");
                            });
                        };
                    }
                });
            }
        }, 50);
    }

    api.onConfigure(() => {
        showModal();
    });

    api.onUnload(() => {
        reset();
    });
});
