Furnarchy.register({
    id: "life-support-afk-aeefd1e3",
    name: "Life Support",
    description: "Keeps you logged in and manages AFK status.",
    version: "1.0.1",
    author: "me@merklejerk.com",
    toggle: false,
}, (api) => {
    const utils = Furnarchy.utils;

    let config = {
        timeout: 10, // minutes
        afkReason: "https://furnarchy.xyz",
        autoReconnect: true
    };

    let state = {
        myName: null,
        myShortname: null,
        isIdle: false,
        lastActivity: Date.now(),
        afkStart: 0,
        currentReason: null
    };

    let timers = {
        idleCheck: null,
        keepAlive: null,
        afkUpdate: null
    };

    // Load saved config
    const savedConfig = api.loadData('config');
    if (savedConfig) {
        config = { ...config, ...savedConfig };
    }

    function log(msg) {
        console.log(`[Life Support] ${msg}`);
    }

    function formatTime(ms) {
        const mins = Math.floor(ms / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) {
            return `${hours}h ${mins % 60}m`;
        }
        return `${mins}m`;
    }

    function updateAfkReason() {
        if (!state.isIdle) return;
        const duration = Date.now() - state.afkStart;
        const timeStr = formatTime(duration);
        const msg = [`[${timeStr}]`, state.currentReason].join(' ');
        api.send(`afk ${utils.escape(msg)}`);
    }

    function enableIdleMode(customReason) {
        state.isIdle = true;
        state.afkStart = Date.now();
        state.currentReason = customReason || config.afkReason || "https://furnarchy.xyz";
        api.notify("Life Support: You are now idle.");

        api.send('unafk');
        updateAfkReason();
        
        // Start timers
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        timers.keepAlive = setInterval(performKeepAlive, 300000); // 5 mins

        if (timers.afkUpdate) clearInterval(timers.afkUpdate);
        timers.afkUpdate = setInterval(updateAfkReason, 60000); // 1 min
    }

    function exitIdleMode() {
        if (!state.isIdle) return;
        
        log("Exiting idle mode.");
        state.isIdle = false;
        state.currentReason = null;
        
        api.send('unafk');

        // Clear timers
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        if (timers.afkUpdate) clearInterval(timers.afkUpdate);
        
        api.notify("Life Support: Welcome back!");
    }

    function performKeepAlive() {
        if (!state.isIdle) return;
        api.send('stand');
        api.send('sit');
    }

    function startIdleCheck() {
        if (timers.idleCheck) clearInterval(timers.idleCheck);
        timers.idleCheck = setInterval(() => {
            if (!state.isIdle && state.myName) {
                const idleTime = Date.now() - state.lastActivity;
                if (idleTime > config.timeout * 60000) {
                    enableIdleMode();
                }
            }
        }, 10000); // Check every 10s
    }

    // Hooks
    api.onLoggedIn((name, uid) => {
        state.myName = name;
        state.myShortname = utils.getShortname(name);
        state.lastActivity = Date.now();
        startIdleCheck();
    });

    api.onOutgoing((line, sourceId) => {
        // Ignore commands sent by this plugin to prevent loops
        if (sourceId === api.metadata.id) return line;

        const cmd = utils.parseClientCommand(line);

        if (cmd.type === 'afk') {
            let message = cmd.message;
            if (message === '<prevReason>') {
                message = null;
            }
            enableIdleMode(message);
            return null;
        }

        if (cmd.type === 'unafk') {
            if (state.isIdle) exitIdleMode();
            return null;
        }

        // Ignore plugin-generated commands for activity tracking
        if (sourceId) return line;

        // Only break idle on movement, speech, or whispers
        if (['move', 'rotate', 'speech', 'whisper', 'emote', 'sit', 'stand', 'liedown', 'get', 'use'].includes(cmd.type)) {
            state.lastActivity = Date.now();
            if (state.isIdle) {
                exitIdleMode();
            }
        }
        return line;
    }, -100); // Low priority

    api.onPause((paused) => {
        if (paused && state.isIdle) {
            exitIdleMode();
        }
    });

    api.onDisconnected(() => {
        if (config.autoReconnect) {
            log("Disconnected. Reconnecting in 5 seconds...");
            setTimeout(() => {
                api.reconnect();
            }, 5000);
        }
    });

    api.onUnload(() => {
        log("Unloading plugin...");
        if (timers.idleCheck) clearInterval(timers.idleCheck);
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        if (timers.afkUpdate) clearInterval(timers.afkUpdate);
    });

    api.onConfigure(() => {
        const idTimeout = "ls-timeout";
        const idReason = "ls-reason";
        const idReconnect = "ls-reconnect";
        const idSave = "ls-save";

        api.openModal({
            title: "Life Support Settings",
            body: `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <label for="${idTimeout}">Idle Timeout (minutes):</label>
                        <input id="${idTimeout}" type="number" class="full-width" value="${config.timeout}" min="1" />
                    </div>
                    <div>
                        <label for="${idReason}">AFK Reason:</label>
                        <input id="${idReason}" type="text" class="full-width" value="${utils.escape(config.afkReason)}" />
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input id="${idReconnect}" type="checkbox" ${config.autoReconnect ? 'checked' : ''} />
                        <label for="${idReconnect}">Auto Reconnect</label>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="btn-primary" id="${idSave}">Save</button>
                    </div>
                </div>
            `,
            onClose: () => {}
        });

        setTimeout(() => {
            const btn = document.getElementById(idSave);
            if (btn) {
                btn.onclick = () => {
                    const inputTimeout = document.getElementById(idTimeout);
                    const inputReason = document.getElementById(idReason);
                    const inputReconnect = document.getElementById(idReconnect);
                    
                    if (inputTimeout && inputReason) {
                        const val = parseInt(inputTimeout.value, 10);
                        if (val > 0) {
                            config.timeout = val;
                            config.afkReason = inputReason.value || "https://furnarchy.xyz";
                            config.autoReconnect = inputReconnect ? inputReconnect.checked : false;
                            api.saveData('config', config);
                            api.notify(`Settings saved.`);
                            api.closeModal();
                        }
                    }
                };
            }
        }, 100);
    });
});
