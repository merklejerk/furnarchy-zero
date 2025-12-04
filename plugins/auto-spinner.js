Furnarchy.register({
    id: "auto-spinner-73d51b4bc8625286",
    name: "Auto Spinner",
    description: "Automatically spins your character.",
    version: "1.1.0",
    author: "me@merklerjerk.com"
}, (api) => {
    
    let interval = null;
    let config = {
        direction: '<', // '<' for left (CCW), '>' for right (CW)
        frequency: 5000 // ms
    };

    // Load saved config
    const savedConfig = Furnarchy.utils.loadData(api.metadata.id, 'config');
    if (savedConfig) {
        config = { ...config, ...savedConfig };
    }
    
    api.onLoggedIn(() => {
        api.notify("Logged in! Starting spin cycle...");
        startSpin();
    });
    
    api.onPause((paused) => {
        if (paused) stopSpin();
        else startSpin();
    });

    api.onConfigure(() => {
        const idFreq = "auto-spinner-freq";
        const idDir = "auto-spinner-dir";
        const idSave = "auto-spinner-save";

        Furnarchy.utils.openModal({
            title: "Configure Auto Spinner",
            body: `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <label for="${idDir}" style="display: block; margin-bottom: 5px;">Direction:</label>
                        <select id="${idDir}" class="full-width">
                            <option value="<" ${config.direction === '<' ? 'selected' : ''}>Left (CCW)</option>
                            <option value=">" ${config.direction === '>' ? 'selected' : ''}>Right (CW)</option>
                        </select>
                    </div>
                    <div>
                        <label for="${idFreq}" style="display: block; margin-bottom: 5px;">Frequency (seconds):</label>
                        <input id="${idFreq}" type="number" class="full-width" value="${config.frequency / 1000}" min="0.1" step="0.1" />
                    </div>
                    <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                        <button class="btn-primary" id="${idSave}">Save</button>
                    </div>
                </div>
            `,
            onClose: () => {}
        });

        // Attach event listener after modal renders
        setTimeout(() => {
            const btn = document.getElementById(idSave);
            if (btn) {
                btn.onclick = () => {
                    const dirSelect = document.getElementById(idDir);
                    const freqInput = document.getElementById(idFreq);
                    
                    if (dirSelect && freqInput) {
                        const newDir = dirSelect.value;
                        const newFreq = parseFloat(freqInput.value) * 1000;
                        
                        if (newFreq > 0) {
                            config.direction = newDir;
                            config.frequency = newFreq;
                            
                            Furnarchy.utils.saveData(api.metadata.id, 'config', config);

                            api.notify(`Configuration saved: ${newDir === '<' ? 'Left' : 'Right'} every ${newFreq/1000}s`);
                            
                            // Restart if running
                            if (interval) {
                                stopSpin();
                                startSpin();
                            }
                            
                            Furnarchy.utils.closeModal();
                        } else {
                            alert("Invalid frequency");
                        }
                    }
                };
            }
        }, 100);
    });
    
    function startSpin() {
        if (interval) return;
        interval = setInterval(() => {
            api.send(config.direction + "\n");
        }, config.frequency);
    }
    
    function stopSpin() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }
});
