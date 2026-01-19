Furnarchy.register({
    id: "seek-236132b",
    name: "Seek",
    version: "1.0.0",
    description: "Find the location of players on the map.",
    toggle: false
}, (api) => {
    const utils = Furnarchy.utils;
    let isSeeking = false;
    let originalCamera = null;
    let animationFrame = null;

    const onKeyDown = (e) => {
        if (isSeeking && e.key === 'Escape') {
            stopSeek(true);
        }
    };

    api.onLoad(() => {
        const doc = api.getGameDocument();
        if (doc) {
            doc.addEventListener('keydown', onKeyDown);
        }
    });

    api.onUnload(() => {
        const doc = api.getGameDocument();
        if (doc) {
            doc.removeEventListener('keydown', onKeyDown);
        }
        stopSeek();
    });

    function stopSeek(restore = false) {
        if (!isSeeking && !animationFrame) return;
        
        const wasSeeking = isSeeking;
        isSeeking = false;

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (restore && wasSeeking && originalCamera) {
            api.inject(utils.createServerCommand({
                type: 'camera-sync',
                x: originalCamera.x,
                y: originalCamera.y
            }), api.metadata.id);
        }
        
        originalCamera = null;
    }

    api.onOutgoing((line) => {
        if (!api.enabled) return line;
        
        if (line.toLowerCase().startsWith('seek ')) {
            let nameQuery = line.substring(5).trim();
            if (!nameQuery) return line;

            let exact = false;
            if (nameQuery.startsWith('%')) {
                exact = true;
                nameQuery = nameQuery.substring(1);
            }
            
            // Name matching should be case insensitive and spaces -> pipes
            const searchName = nameQuery.replace(/ /g, '|').toLowerCase();

            let foundAvatar = null;
            // api.gameState.avatars is a Map<number, {name, x, y, colorCode}>
            for (const [uid, avatar] of api.gameState.avatars.entries()) {
                const avatarName = avatar.name.replace(/ /g, '|').toLowerCase();
                if (exact) {
                    if (avatarName === searchName) {
                        foundAvatar = { uid, ...avatar };
                        break;
                    }
                } else {
                    if (avatarName.startsWith(searchName)) {
                        foundAvatar = { uid, ...avatar };
                        break;
                    }
                }
            }

            if (foundAvatar) {
                // Before moving, remember original
                if (!isSeeking) {
                    originalCamera = api.gameState.camera ? { ...api.gameState.camera } : { x: 0, y: 0 };
                }
                
                isSeeking = true;
                api.notify(`Found <name shortname='${utils.getShortname(foundAvatar.name)}' forced>${foundAvatar.name}</name> at &lt;<i>${foundAvatar.x}, ${foundAvatar.y}</i>&gt;. Press <font color="bcast">ESC</font> to restore.`);
                animateCameraTo(foundAvatar.x, foundAvatar.y);
            } else {
                api.notify(`Could not find player starting with "${nameQuery}".`);
            }
            return null;
        }
        return line;
    });

    function animateCameraTo(tx, ty) {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        
        // Rough centering (adjust based on common viewport sizes)
        
        const startX = api.gameState.camera?.x || 0;
        const startY = api.gameState.camera?.y || 0;
        
        const startTime = performance.now();
        const duration = 800; // ms

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            const t = 1 - Math.pow(1 - progress, 3);

            const curX = Math.round(startX + (tx - startX) * t);
            const curY = Math.round(startY + (ty - startY) * t);

            api.inject(utils.createServerCommand({
                type: 'camera-sync',
                x: curX,
                y: curY
            }), api.metadata.id);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            } else {
                animationFrame = null;
            }
        };
        animationFrame = requestAnimationFrame(step);
    }

    api.onIncoming((line, sourceId) => {
        // Exit seek mode if an organic camera move or player move occurs
        if (!isSeeking) return line;
        if (sourceId === api.metadata.id) return line;

        const cmd = utils.parseServerCommand(line);
        if (cmd.type === 'camera-sync') {
            stopSeek();
        } else if (cmd.type === 'move-avatar' && api.gameState.player && cmd.uid.toString() === api.gameState.player.uid) {
            stopSeek();
        }
        return line;
    });

    api.onConfigure(() => {
        api.openModal({
            title: "Seek Instructions",
            body: `
                <div class="text-small">
                    <p class="modal-label">Commands</p>
                    <div class="list-box">
                        <div class="list-row">
                            <code>seek <span class="text-gold">NAME</span></code>
                            <div class="text-dim">Search for player and move camera.</div>
                        </div>
                        <div class="list-row">
                            <code>seek <span class="text-gold">%NAME</span></code>
                            <div class="text-dim">Exact name search.</div>
                        </div>
                    </div>
                    <p style="margin-top: 10px;">
                        Press <span class="text-gold">Esc</span> to return camera to its original position.
                    </p>
                </div>
            `
        });
    });
});
