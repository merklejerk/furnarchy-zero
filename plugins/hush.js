Furnarchy.register({
    id: "hush-c8be8163869",
    name: "Hush",
    version: "1.0.2",
    description: "Ignore list manager. Blocks chat and shrinks avatars.",
    author: "me@merklejerk.com"
}, (api) => {
    const utils = Furnarchy.utils;
    let ignored = []; // string[] (shortnames)
    let lastSeenDescription = null;
    const ignoredAvatars = new Map(); // uid -> shortname
    const visibleAvatars = new Map(); // uid -> shortname

    // Load
    const saved = api.loadData('ignored');
    if (Array.isArray(saved)) {
        ignored = saved;
    }

    function save() {
        api.saveData('ignored', ignored);
    }

    function isIgnored(name) {
        if (!api.enabled) return false;
        if (!name) return false;
        return ignored.includes(utils.getShortname(name));
    }

    function toggleIgnore(name) {
        const short = utils.getShortname(name);
        const idx = ignored.indexOf(short);
        if (idx !== -1) {
            ignored.splice(idx, 1);
            api.notify(`Unignored ${name}.`);
            
            // Restore scale for any visible avatars
            for (const [uid, sname] of ignoredAvatars.entries()) {
                if (sname === short) {
                    const cmd = { type: 'set-scale', uid: uid, scale: 100 };
                    api.inject(utils.createServerCommand(cmd));
                    ignoredAvatars.delete(uid);
                }
            }
        } else {
            ignored.push(short);
            api.notify(`Ignored ${name}.`);

            // Shrink visible avatars
            for (const [uid, sname] of visibleAvatars.entries()) {
                if (sname === short) {
                    const cmd = { type: 'set-scale', uid: uid, scale: 50 };
                    api.inject(utils.createServerCommand(cmd));
                    ignoredAvatars.set(uid, short);
                }
            }
        }
        save();
        renderModal();
    }

    function renderModal(force = false) {
        if (!force && api.getModalPluginId() !== api.metadata.id) return;

        const listHtml = ignored.map(short => {
            return `
                <div class="list-row modal-row">
                    <div>
                        <strong>${utils.escape(short)}</strong>
                    </div>
                    <button class="btn-danger btn-sm" data-short="${short}">Unignore</button>
                </div>
            `;
        }).join('');

        const body = `
            <div style="min-width: 300px;">
                <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                    <input type="text" id="hush-add-input" placeholder="Character Name" style="flex: 1; margin: 0;" />
                    <button id="hush-add-btn" class="btn-primary" style="margin: 0;">Ignore</button>
                </div>
                <div class="list-box">
                    ${ignored.length ? listHtml : '<div class="text-dim text-center" style="padding: 20px;">No one ignored.</div>'}
                </div>
                <div class="text-dim text-small">
                    Ignored players will be muted and their avatars shrunk to 50% size.
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #333;">
                    <div class="modal-label">Chat Commands</div>
                    <ul style="margin: 0; padding-left: 20px;" class="text-dim text-small">
                        <li><code>\`ignore [name]</code> - Toggle ignore</li>
                    </ul>
                </div>
            </div>
        `;

        api.openModal({
            title: "Hush - Ignore List",
            body: body,
            onClose: () => {
                // No local state to update
            }
        });

        // Attach listeners
        setTimeout(() => {
            const btn = document.getElementById('hush-add-btn');
            const input = document.getElementById('hush-add-input');

            if (btn && input) {
                const addIgnore = () => {
                    const name = input.value.trim();
                    if (name) {
                        toggleIgnore(name);
                        input.value = '';
                        input.focus();
                    }
                };
                btn.onclick = addIgnore;
                input.onkeypress = (e) => {
                    if (e.key === 'Enter') addIgnore();
                };
                input.focus();
            }

            // Remove buttons
            const removeBtns = document.querySelectorAll('button[data-short]');
            removeBtns.forEach(b => {
                b.onclick = () => {
                    const short = b.getAttribute('data-short');
                    toggleIgnore(short);
                };
            });
        }, 50);
    }

    api.onIncoming((line, sourceId) => {
        if (!api.enabled) return line;
        if (sourceId === api.metadata.id) return line; // Ignore own injections
        const cmd = utils.parseServerCommand(line);

        if (cmd.type === 'description') {
            lastSeenDescription = cmd.shortname;
        }

        if (cmd.type === 'whisper' || cmd.type === 'speech' || cmd.type === 'emote' || cmd.type === 'roll') {
            if (isIgnored(cmd.fromShort)) return null;
        }

        if (cmd.type === 'add-avatar') {
            const short = utils.getShortname(cmd.name);
            visibleAvatars.set(cmd.uid, short);

            if (isIgnored(cmd.name)) {
                ignoredAvatars.set(cmd.uid, short);
                // Scale to 50% (50 in base220, since 100 is 1.0x)
                cmd.scale = 50; 
                return utils.createServerCommand(cmd);
            } else {
                ignoredAvatars.delete(cmd.uid);
            }
        }

        if (cmd.type === 'set-scale') {
            if (ignoredAvatars.has(cmd.uid)) {
                return null; // Block scale changes for ignored players
            }
        }

        if (cmd.type === 'remove-object' || cmd.type === 'delete-object') {
            visibleAvatars.delete(cmd.uid);
            ignoredAvatars.delete(cmd.uid);
        }

        return line;
    }, 1000); // High priority

    api.onOutgoing((line) => {
        if (!api.enabled) return line;
        const args = line.split(' ');
        const cmdName = args[0].toLowerCase();

        if (cmdName === 'ignore') {
            let name = args.slice(1).join(' ');
            if (!name) {
                if (lastSeenDescription) {
                    name = lastSeenDescription;
                } else {
                    renderModal(true);
                    return null;
                }
            }
            
            if (name) {
                toggleIgnore(name);
            }
            return null;
        }

        if (cmdName === 'hush') {
            renderModal(true);
            return null;
        }

        return line;
    });
    
    api.onConfigure(() => {
        renderModal(true);
    });

    api.onPause((paused) => {
        if (paused) {
            ignoredAvatars.clear();
            visibleAvatars.clear();
        }
    });

    api.expose({
        name: 'hush',
        version: '1.0.2',
        isIgnored: isIgnored
    });

    api.onDisconnected(() => {
        ignoredAvatars.clear();
        visibleAvatars.clear();
    });

    api.onUnload(() => {
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }
    });
});
