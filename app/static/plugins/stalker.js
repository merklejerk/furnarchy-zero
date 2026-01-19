Furnarchy.register({
    id: "stalker-plugin-b9307b7cdc558",
    name: "Stalker",
    version: "1.3.2",
    description: "Tracks online status of friends.",
    author: "me@merklejerk.com"
}, (api) => {
    const utils = Furnarchy.utils;
    let friends = []; // { name, shortname, isOnline, lastSeen, lastNotify }
    let pollIndex = 0;
    let pollTimer = null;
    let lastSeenDescription = null; // shortname
    let pollInterval = 1000;

    // Load
    const saved = api.loadData('friends');
    if (Array.isArray(saved)) {
        friends = saved.map(f => ({
            ...f,
            isOnline: null, // Reset runtime state
            lastNotify: 0
        }));
    }

    const savedConfig = api.loadData('config');
    if (savedConfig && typeof savedConfig.pollInterval === 'number') {
        pollInterval = Math.max(100, savedConfig.pollInterval);
    }

    function save() {
        const toSave = friends.map(f => ({
            name: f.name,
            shortname: f.shortname
        }));
        api.saveData('friends', toSave);
        api.saveData('config', { pollInterval });
    }

    function notify(msg) {
        api.notify(msg);
    }

    function renderModal(force = false) {
        if (!force && api.getModalPluginId() !== api.metadata.id) return;

        const listHtml = friends.map(f => {
            const statusEmoji = f.isOnline === true ? '🟢' : (f.isOnline === false ? '🔴' : '⚪');
            const statusText = f.isOnline === true ? 'Online' : (f.isOnline === false ? 'Offline' : 'Unknown');
            return `
                <div class="list-row modal-row">
                    <div style="display: flex; align-items: center;">
                        <span id="status-icon-${f.shortname}" style="font-size: 1.2em; margin-right: 8px;">${statusEmoji}</span>
                        <div>
                            <strong id="name-${f.shortname}">${utils.escape(f.name)}</strong>
                            <div id="status-text-${f.shortname}" class="text-dim text-small">${statusText}</div>
                        </div>
                    </div>
                    <button class="btn-danger btn-sm" data-short="${f.shortname}">Remove</button>
                </div>
            `;
        }).join('');

        const body = `
            <div style="min-width: 300px;">
                <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                    <input type="text" id="stalker-add-input" placeholder="Character Name" style="flex: 1; margin:0;" />
                    <button id="stalker-add-btn" class="btn-primary" style="margin:0;">Add</button>
                </div>
                <div class="list-box">
                    ${friends.length ? listHtml : '<div class="text-dim text-center" style="padding: 20px;">No friends added yet.</div>'}
                </div>
                <div class="text-dim text-small" style="margin-top: 10px; display: flex; justify-content: flex-end; align-items: center;">
                    <label style="margin-right: 5px;">Poll Interval (s):</label>
                    <input type="number" id="stalker-poll-interval" value="${pollInterval / 1000}" style="width: 60px; margin:0;" min="0.1" step="0.1">
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #333;">
                    <div class="modal-label">Chat Commands</div>
                    <ul style="margin: 0; padding-left: 20px;" class="text-dim text-small">
                        <li><code>\`stalk [name]</code> - Add a friend</li>
                        <li><code>\`unstalk [name]</code> - Remove a friend</li>
                        <li><code>\`stalker</code> - View status in chat</li>
                    </ul>
                </div>
            </div>
        `;

        api.openModal({
            title: "Stalker - Friend List",
            body: body,
            onClose: () => {
                // No local state to update
            }
        });

        // Attach listeners
        setTimeout(() => {
            const btn = document.getElementById('stalker-add-btn');
            const input = document.getElementById('stalker-add-input');
            const intervalInput = document.getElementById('stalker-poll-interval');

            if (intervalInput) {
                intervalInput.onchange = () => {
                    let val = parseFloat(intervalInput.value);
                    if (isNaN(val) || val < 0.1) val = 0.1;
                    pollInterval = Math.floor(val * 1000);
                    save();
                    if (pollTimer) {
                        clearInterval(pollTimer);
                        pollTimer = setInterval(poll, pollInterval);
                    }
                };
            }

            if (btn && input) {
                const addFriend = () => {
                    const name = input.value.trim();
                    if (name) {
                        const short = utils.getShortname(name);
                        if (!friends.find(f => f.shortname === short)) {
                            friends.push({ name, shortname: short, isOnline: null, lastNotify: 0 });
                            save();
                            api.send(`onln ${short}`);
                            renderModal(); // Re-render list
                            // Refocus input
                            setTimeout(() => document.getElementById('stalker-add-input')?.focus(), 50);
                        } else {
                            api.notify(`Already stalking ${name}.`);
                        }
                    }
                };
                btn.onclick = addFriend;
                input.onkeypress = (e) => {
                    if (e.key === 'Enter') addFriend();
                };
                // Focus input initially
                input.focus();
            }

            // Remove buttons
            const removeBtns = document.querySelectorAll('button[data-short]');
            removeBtns.forEach(b => {
                b.onclick = () => {
                    const short = b.getAttribute('data-short');
                    const idx = friends.findIndex(f => f.shortname === short);
                    if (idx !== -1) {
                        friends.splice(idx, 1);
                        save();
                        renderModal();
                    }
                };
            });
        }, 50);
    }

    function updateStatus(shortname, isOnline, displayName) {
        const friend = friends.find(f => f.shortname === shortname);
        if (!friend) return false; // Not a friend

        // Update display name if provided and different
        if (displayName) {
            const cleanName = displayName.replace(/\|/g, ' ');
            if (friend.name !== cleanName) {
                friend.name = cleanName;
                save();
                // Update name in UI if open
                if (api.getModalPluginId() === api.metadata.id) {
                    const nameEl = document.getElementById(`name-${shortname}`);
                    if (nameEl) nameEl.textContent = cleanName;
                }
            }
        }

        if (isOnline) {
            friend.lastSeen = Date.now();
            if (friend.isOnline === false) {
                // Was offline, now online.
                // Check debounce (e.g. 60 seconds)
                if (Date.now() - (friend.lastNotify || 0) > 60000) {
                    notify(`${friend.name} is now online!`);
                    friend.lastNotify = Date.now();
                }
            }
            friend.isOnline = true;
        } else {
            friend.isOnline = false;
        }

        // Update UI indicators if open
        if (api.getModalPluginId() === api.metadata.id) {
            const iconEl = document.getElementById(`status-icon-${shortname}`);
            const textEl = document.getElementById(`status-text-${shortname}`);
            
            if (iconEl) iconEl.textContent = friend.isOnline ? '🟢' : '🔴';
            if (textEl) textEl.textContent = friend.isOnline ? 'Online' : 'Offline';
        }

        return true; // It was a friend
    }

    function poll() {
        if (friends.length === 0) return;
        
        // Find next friend
        const friend = friends[pollIndex];
        pollIndex = (pollIndex + 1) % friends.length;
        
        // Send check
        api.send(`onln ${friend.shortname}`);
    }

    api.onIncoming((line) => {
        if (!api.enabled) return line;
        const cmd = utils.parseServerCommand(line);

        if (cmd.type === 'online-status') {
            const short = utils.getShortname(cmd.name);
            const isFriend = updateStatus(short, cmd.online, cmd.name);
            
            // If it's a friend, consume the packet to prevent spam.
            if (isFriend) return null;
            
            return line;
        }

        if (cmd.type === 'description') {
            lastSeenDescription = cmd.shortname;
        }

        // Passive detection
        let detected = null;
        if (cmd.type === 'add-avatar') detected = cmd.name;
        else if (cmd.type === 'speech' && !cmd.isSelf) detected = cmd.from;
        else if (cmd.type === 'whisper') detected = cmd.from;
        else if (cmd.type === 'emote') detected = cmd.from;

        if (detected) {
            updateStatus(utils.getShortname(detected), true, detected);
        }

        return line;
    });

    api.onOutgoing((line) => {
        if (!api.enabled) return line;
        const args = line.split(' ');
        const cmd = args[0].toLowerCase();

        if (cmd === 'stalk') {
            let name = args.slice(1).join(' ');
            let short = null;

            if (!name) {
                if (lastSeenDescription) {
                    short = lastSeenDescription;
                    name = short; // Use shortname as name initially
                } else {
                    notify("Usage: stalk <name> (or view a description first)");
                    return null;
                }
            } else {
                short = utils.getShortname(name);
            }

            if (friends.find(f => f.shortname === short)) {
                notify(`Already stalking ${name}.`);
            } else {
                friends.push({ name, shortname: short, isOnline: null, lastNotify: 0 });
                save();
                notify(`Added ${name} to stalk list.`);
                // Check immediately
                api.send(`onln ${short}`);
            }
            return null;
        }

        if (cmd === 'unstalk') {
            let name = args.slice(1).join(' ');
            let short = null;

            if (!name) {
                if (lastSeenDescription) {
                    short = lastSeenDescription;
                    name = short;
                } else {
                    notify("Usage: unstalk <name> (or view a description first)");
                    return null;
                }
            } else {
                short = utils.getShortname(name);
            }

            const idx = friends.findIndex(f => f.shortname === short);
            if (idx !== -1) {
                const removedName = friends[idx].name;
                friends.splice(idx, 1);
                save();
                notify(`Removed ${removedName} from stalk list.`);
            } else {
                notify(`${name} is not in your stalk list.`);
            }
            return null;
        }

        if (cmd === 'stalker') {
            if (friends.length === 0) {
                notify("You are not stalking anyone.");
            } else {
                notify("--- Stalk List ---");
                friends.forEach(f => {
                    if (f.isOnline) {
                        notify(`${utils.escape(f.name)}: 🟢`);
                    }
                });
            }
            return null;
        }

        return line;
    });

    api.onLoggedIn(() => {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(poll, pollInterval);
    });

    api.onDisconnected(() => {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        friends.forEach(f => f.isOnline = null);
    });
    
    api.onConfigure(() => {
        // Force open
        renderModal(true);
    });

    api.onPause((paused) => {
        if (paused) {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
        } else {
            if (api.isLoggedIn && !pollTimer) {
                pollTimer = setInterval(poll, pollInterval);
            }
        }
    });

    // Expose service for other plugins
    api.expose({
        name: 'stalker',
        version: '1.0.0',
        getFriends: () => friends.map(f => ({ name: f.name, lastSeen: f.lastSeen, isOnline: f.isOnline })),
        isFriend: (name) => {
            if (!name) return false;
            const short = utils.getShortname(name);
            return friends.some(f => f.shortname === short);
        }
    });

    api.onUnload(() => {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }
    });
});
