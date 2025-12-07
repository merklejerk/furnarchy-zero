Furnarchy.register({
    id: "life-support-afk-aeefd1e3",
    name: "Life Support",
    description: "Keeps you logged in and manages AFK status.",
    version: "1.3.0",
    author: "me@merklejerk.com",
    toggle: false,
}, (api) => {
    const DEFAULT_REASON = "<a href=\"https://furnarchy.xyz\">Furnarchy Zero</a>";
    const utils = Furnarchy.utils;

    let config = {
        timeout: 10, // minutes
        afkReason: null,
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

    let listeners = [];

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
        const msg = [`[${timeStr}]`, typeof(state.currentReason) === 'string' ? state.currentReason : DEFAULT_REASON].join(' ');
        api.send(`afk ${msg}`);
    }

    function enableIdleMode(customReason) {
        const wasIdle = state.isIdle;
        state.isIdle = true;
        state.afkStart = Date.now();
        state.currentReason = customReason || config.afkReason;
        api.notify("You are now idle.");

        api.send('unafk');
        updateAfkReason();
        
        // Start timers
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        timers.keepAlive = setInterval(performKeepAlive, 300000); // 5 mins

        if (timers.afkUpdate) clearInterval(timers.afkUpdate);
        timers.afkUpdate = setInterval(updateAfkReason, 60000); // 1 min

        if (!wasIdle) {
            listeners.forEach(cb => { try { cb(true); } catch(e) { console.error(e); } });
        }
    }

    function exitIdleMode() {
        if (!state.isIdle) return;
        
        log("Exiting idle mode.");
        state.isIdle = false;
        state.currentReason = null;
        
        if (api.isLoggedIn) {
            api.send('unafk');
            api.notify("Welcome back!");
        }

        // Clear timers
        if (timers.keepAlive) clearInterval(timers.keepAlive);
        if (timers.afkUpdate) clearInterval(timers.afkUpdate);

        listeners.forEach(cb => { try { cb(false); } catch(e) { console.error(e); } });
    }

    function performKeepAlive() {
        if (!state.isIdle) return;
        api.send('stand');
        api.send('sit');
    }

    function startIdleCheck() {
        if (timers.idleCheck) clearInterval(timers.idleCheck);
        timers.idleCheck = setInterval(() => {
            if (!api.isLoggedIn) return;
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

        // Load per-character AFK reason
        const charConfig = api.loadData(`config_${state.myShortname}`);
        if (charConfig && typeof(charConfig.afkReason) === 'string') {
            config.afkReason = charConfig.afkReason;
        }

        startIdleCheck();
    });

    api.onOutgoing((line, sourceId) => {
        if (!api.enabled) return line;
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
        if (state.isIdle) {
            exitIdleMode();
        }

        if (timers.idleCheck) {
            clearInterval(timers.idleCheck);
            timers.idleCheck = null;
        }
        
        state.myName = null;
        state.myShortname = null;

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
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }
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
                        <input id="${idReason}" type="text" class="full-width" value="${utils.escape(typeof(config.afkReason) === 'string' ? config.afkReason : DEFAULT_REASON)}" />
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
                            config.afkReason = inputReason.value || "";
                            config.autoReconnect = inputReconnect ? inputReconnect.checked : false;
                            
                            // Save shared settings to global config
                            const globalConfig = api.loadData('config') || {};
                            globalConfig.timeout = config.timeout;
                            globalConfig.autoReconnect = config.autoReconnect;
                            api.saveData('config', globalConfig);

                            if (state.myShortname) {
                                // Logged in: Save AFK reason to character config
                                const charConfig = api.loadData(`config_${state.myShortname}`) || {};
                                charConfig.afkReason = config.afkReason;
                                api.saveData(`config_${state.myShortname}`, charConfig);
                            }
                            api.closeModal();
                        }
                    }
                };
            }
        }, 100);
    });

    // Expose API
    api.expose({
        name: "life-support",
        version: "1.1.1",
        isIdle: () => state.isIdle,
        onModeChange: (cb) => {
            listeners.push(cb);
        }
    });
});
