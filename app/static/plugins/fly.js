Furnarchy.register({
    id: "fly-cam-dc131583002",
    name: "Fly",
    description: "Fly the camera freely with WASD or Arrow keys.",
    version: "1.2.0",
    author: "me@merklejerk.com",
    toggle: true,
}, (api) => {
    const utils = Furnarchy.utils;
    let active = false;
    let currentPos = { x: 0, y: 0 };
    let overlayId = "fly-overlay-" + api.metadata.id;
    let styleId = "fly-style-" + api.metadata.id;
    let borderOverlayId = "fly-border-" + api.metadata.id;
    let myUid = null;
    let lastTeleport = null;

    // Try to get UID if already logged in (accessing core directly if available)
    if (api.gameState && api.gameState.player) {
        myUid = parseInt(api.gameState.player.uid);
    }

    api.onLoggedIn((name, uid) => {
        myUid = parseInt(uid);
    });

    // Inject styles
    function injectStyles() {
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes fly-pulse {
                0% { box-shadow: inset 0 0 20px 5px rgba(0, 190, 255, 0.3); border: 2px solid rgba(0, 190, 255, 0.4); }
                50% { box-shadow: inset 0 0 50px 15px rgba(0, 190, 255, 0.6); border: 2px solid rgba(0, 190, 255, 0.8); }
                100% { box-shadow: inset 0 0 20px 5px rgba(0, 190, 255, 0.3); border: 2px solid rgba(0, 190, 255, 0.4); }
            }
            .fly-border-overlay {
                animation: fly-pulse 2s infinite;
                pointer-events: none;
                z-index: 9998;
                position: fixed;
                box-sizing: border-box;
            }
        `;
        document.head.appendChild(style);
    }

    api.onPause((paused) => {
        if (paused) {
            disableFly();
        } else {
            enableFly();
        }
    });

    api.onConfigure(() => {
        showControlPanel();
    });

    function updateModalUI() {
        const modalId = "fly-control-modal-" + api.metadata.id;
        const statusId = modalId + "-status";
        const btnId = modalId + "-btn";
        
        const status = document.getElementById(statusId);
        const btn = document.getElementById(btnId);
        
        if (status && btn) {
            const getStatusText = () => active ? "Active (Flying)" : "Inactive (Idle)";
            const getBtnText = () => active ? "Stop Flying" : "Start Flying";
            const getStatusColor = () => active ? "#0f0" : "#888";
            
            status.textContent = getStatusText();
            status.style.color = getStatusColor();
            btn.textContent = getBtnText();

            if (active) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-danger');
            } else {
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-primary');
            }
        }
    }

    function showControlPanel() {
        const modalId = "fly-control-modal-" + api.metadata.id;
        const statusId = modalId + "-status";
        const btnId = modalId + "-btn";
        const closeId = modalId + "-close";

        const getStatusText = () => active ? "Active (Flying)" : "Inactive (Idle)";
        const getBtnText = () => active ? "Stop Flying" : "Start Flying";
        const getStatusColor = () => active ? "#0f0" : "#888";
        const getBtnClass = () => active ? "btn-danger" : "btn-primary";

        api.openModal({
            title: "Fly Control",
            body: `
                <div id="${modalId}" style="text-align: center;">
                    <div style="margin-bottom: 15px;">
                        <strong>Status:</strong> 
                        <span id="${statusId}" style="color: ${getStatusColor()}; font-weight: bold;">
                            ${getStatusText()}
                        </span>
                    </div>
                    
                    <button id="${btnId}" class="full-width ${getBtnClass()}" style="margin-bottom: 20px;">
                        ${getBtnText()}
                    </button>

                    <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 10px; border: 2px solid #555;">
                        <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 2px solid #555;">Controls</div>
                        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 5px; font-size: 0.9em;">
                            <div><strong>WASD / Arrows</strong></div><div>Pan Camera</div>
                            <div><strong>Shift</strong></div><div>Move Faster</div>
                            <div><strong>ESC</strong></div><div>Exit Fly Mode</div>
                            <div><strong>\`fly</strong></div><div>Toggle Mode</div>
                        </div>
                    </div>

                    <div style="margin-top: 15px;">
                        <button id="${closeId}" class="full-width">Close</button>
                    </div>
                </div>
            `,
            onClose: () => {}
        });

        // Bind events
        setTimeout(() => {
            const btn = document.getElementById(btnId);
            const close = document.getElementById(closeId);

            if (btn) {
                btn.onclick = () => {
                    if (active) {
                        disableFly();
                    } else {
                        enableFly();
                    }
                };
            }

            if (close) {
                close.onclick = () => api.closeModal();
            }
        }, 50);
    }

    function showBorderOverlay() {
        let el = document.getElementById(borderOverlayId);
        if (!el) {
            el = document.createElement('div');
            el.id = borderOverlayId;
            el.className = 'fly-border-overlay';
            document.body.appendChild(el);
        }
        
        const updatePos = () => {
            // Try to get iframe from core if available, or fallback to query selector
            let iframe = null;
            if (api.getGameDocument) {
                const doc = api.getGameDocument();
                if (doc && doc.defaultView && doc.defaultView.frameElement) {
                    iframe = doc.defaultView.frameElement;
                }
            }
            
            if (!iframe) {
                iframe = document.querySelector('.game-iframe');
            }

            if (iframe && el) {
                const rect = iframe.getBoundingClientRect();
                el.style.top = rect.top + 'px';
                el.style.left = rect.left + 'px';
                el.style.width = rect.width + 'px';
                el.style.height = rect.height + 'px';
            }
        };
        
        updatePos();
        window.addEventListener('resize', updatePos);
        // Store the listener removal function on the element for cleanup
        el._cleanup = () => window.removeEventListener('resize', updatePos);
        
        el.style.display = 'block';
    }

    function removeBorderOverlay() {
        const el = document.getElementById(borderOverlayId);
        if (el) {
            el.style.display = 'none';
            if (el._cleanup) el._cleanup();
        }
    }

    function enableFly() {
        if (active) return;
        
        const pos = api.gameState.player ? { x: api.gameState.player.x, y: api.gameState.player.y } : null;
        if (!pos) {
            api.notify("Fly: Camera position unknown. Please move your character to sync first.");
            return;
        }

        // Close modal if it's ours
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }

        active = true;
        currentPos = { ...pos };
        
        injectStyles();
        showBorderOverlay();

        // Attach to game window if possible
        if (api.getGameDocument) {
            const doc = api.getGameDocument();
            if (doc && doc.defaultView) {
                doc.defaultView.addEventListener('keydown', handleKey, { capture: true });
            }
        } else {
            // Fallback
            const iframe = document.querySelector('.game-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.addEventListener('keydown', handleKey, { capture: true });
            }
        }

        api.setGameInput(false);
        window.addEventListener('keydown', handleKey, { capture: true });
        
        showOverlay();
        updateModalUI();
        api.notify("Fly mode enabled. Use WASD or Arrow keys to pan. ESC to cancel.");

        if (!api.enabled) {
            api.enable();
        }
    }

    function disableFly() {
        if (!active) return;
        active = false;
        
        removeBorderOverlay();

        // Detach from game window
        if (api.getGameDocument) {
            const doc = api.getGameDocument();
            if (doc && doc.defaultView) {
                doc.defaultView.removeEventListener('keydown', handleKey, { capture: true });
            }
        } else {
            const iframe = document.querySelector('.game-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.removeEventListener('keydown', handleKey, { capture: true });
            }
        }

        api.setGameInput(true);
        window.removeEventListener('keydown', handleKey, { capture: true });
        
        removeOverlay();
        updateModalUI();
        
        // Restore position
        const pos = api.gameState.player ? { x: api.gameState.player.x, y: api.gameState.player.y } : null;
        if (pos) {
            const cmd = { type: 'camera-sync', x: pos.x, y: pos.y };
            const raw = utils.createServerCommand(cmd);
            api.inject(raw);
        }

        // Re-inject last blocked teleport to snap avatar/camera
        if (lastTeleport) {
            api.inject(lastTeleport);
            lastTeleport = null;
        }
        
        api.notify("Fly mode disabled.");

        // Ensure plugin state reflects fly state
        if (api.enabled) {
            api.disable();
        }
    }

    function updateCamera() {
        const cmd = { type: 'camera-sync', x: currentPos.x, y: currentPos.y };
        const raw = utils.createServerCommand(cmd);
        api.inject(raw);
        
        // Update overlay
        const coordsEl = document.getElementById(overlayId + '-coords');
        if (coordsEl) {
            coordsEl.textContent = `Camera: ${currentPos.x}, ${currentPos.y}`;
        }
    }

    function moveOneStep(dir) {
        const isEven = (Math.abs(currentPos.y) % 2) === 0;
        switch (dir) {
            case 'NE': // Up
                currentPos.y--;
                if (isEven) currentPos.x++;
                break;
            case 'SW': // Down
                currentPos.y++;
                if (!isEven) currentPos.x--;
                break;
            case 'NW': // Left
                currentPos.y--;
                if (!isEven) currentPos.x--;
                break;
            case 'SE': // Right
                currentPos.y++;
                if (isEven) currentPos.x++;
                break;
        }
    }

    function handleKey(e) {
        if (!active) return;
        
        const count = e.shiftKey ? 5 : 1; // 1 step or 5 steps
        let handled = false;
        let dir = null;

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                dir = 'NE';
                handled = true;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                dir = 'SW';
                handled = true;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                dir = 'NW';
                handled = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                dir = 'SE';
                handled = true;
                break;
            case 'Escape':
                disableFly();
                handled = true;
                break;
        }

        if (handled && dir) {
            e.preventDefault();
            e.stopPropagation();

            for (let i = 0; i < count; i++) {
                moveOneStep(dir);
            }
            updateCamera();
        } else if (handled) {
             e.preventDefault();
             e.stopPropagation();
        }
    }

    function showOverlay() {
        let el = document.getElementById(overlayId);
        if (!el) {
            el = document.createElement('div');
            el.id = overlayId;
            el.style.position = 'fixed';
            el.style.top = '60px'; // Below the top bar usually
            el.style.left = '10px';
            el.style.zIndex = '9999';
            el.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            el.style.color = 'white';
            el.style.padding = '10px';
            el.style.borderRadius = '5px';
            el.style.fontFamily = 'sans-serif';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.gap = '5px';
            el.style.pointerEvents = 'auto'; // Ensure clicks work
            
            el.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">✈️ Fly Mode</div>
                <div id="${overlayId}-coords" style="font-family: monospace; margin-bottom: 5px; color: #00beff;">Camera: ${currentPos.x}, ${currentPos.y}</div>
                <div style="font-size: 0.8em;">WASD / Arrows to Pan</div>
                <div style="font-size: 0.8em;">Shift to go faster</div>
                <button id="${overlayId}-cancel" style="margin-top: 5px; cursor: pointer; background: #ff5252; color: white; border: none; padding: 5px; border-radius: 3px;">Exit (ESC)</button>
            `;
            
            document.body.appendChild(el);
            
            const btn = document.getElementById(`${overlayId}-cancel`);
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    disableFly();
                };
            }
        }
        el.style.display = 'block';
    }

    function removeOverlay() {
        const el = document.getElementById(overlayId);
        if (el) {
            el.style.display = 'none';
        }
    }

    api.onIncoming((line, sourceId) => {
        const cmd = utils.parseServerCommand(line);
        
        if (cmd.type === 'set-user-info') {
            myUid = cmd.uid;
        }

        if (!active) return line;
        // Allow our own camera syncs
        if (sourceId === api.metadata.id) return line;
        
        if (cmd.type === 'camera-sync') return null;

        // Block teleport commands for our own avatar to prevent camera snap
        if (cmd.type === 'move-avatar' && cmd.moveType === 'teleport') {
            // Try to refresh UID if missing
            if (myUid === null && api.gameState && api.gameState.player) {
                myUid = parseInt(api.gameState.player.uid);
            }

            if (myUid !== null && cmd.uid === myUid) {
                lastTeleport = line;
                return null;
            }
        }

        return line;
    });

    api.onOutgoing((line, sourceId) => {
        const cmd = line.trim().toLowerCase();
        if (cmd === 'fly') {
            if (active) disableFly();
            else enableFly();
            return null; // Consume command
        }

        if (!api.enabled) return line;
        
        if (active) {
            // Allow commands from other plugins
            if (sourceId) return line;

            const parsed = utils.parseClientCommand(line);
            if (parsed.type === 'move') {
                // Map numeric direction to string direction
                const dirMap = {
                    1: 'SW',
                    3: 'SE',
                    7: 'NW',
                    9: 'NE'
                };
                const dir = dirMap[parsed.direction];
                if (dir) {
                    moveOneStep(dir);
                    updateCamera();
                }
                return null; // Block movement while flying
            } else if (parsed.type === 'rotate') {
                return null; // Block rotation while flying
            }
        }

        return line;
    });

    api.onUnload(() => {
        if (active) {
            disableFly();
        }
        const el = document.getElementById(overlayId);
        if (el) el.remove();
        const borderEl = document.getElementById(borderOverlayId);
        if (borderEl) {
            if (borderEl._cleanup) borderEl._cleanup();
            borderEl.remove();
        }
        const style = document.getElementById(styleId);
        if (style) style.remove();
    });
});
