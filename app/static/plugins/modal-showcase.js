Furnarchy.register({
    id: "modal-showcase-dev",
    name: "Modal Showcase",
    description: "Demonstrates the modal capabilities of Furnarchy Zero.",
    version: "1.1.1",
    author: "me@merklejerk.com"
}, (api) => {
    
    const showModal = () => {
        const closeBtnId = 'modal-showcase-close';
        
        api.openModal({
            title: "Modal Showcase",
            body: `
                <div style="text-align: center;">
                    <p>This is a modal opened from a plugin!</p>
                    <p>You can use standard HTML here.</p>
                    <p>Try out these styled buttons:</p>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn-primary" onclick="alert('Primary clicked!')">Primary</button>
                        <button class="btn-danger" onclick="alert('Danger clicked!')">Danger</button>
                        <button class="btn-info" onclick="alert('Info clicked!')">Info</button>
                    </div>
                    <div style="margin-top: 20px; text-align: left;">
                        <label style="display: block; margin-bottom: 5px;">Styled Input:</label>
                        <input type="text" class="full-width" placeholder="Type something retro..." />
                    </div>
                    <div style="margin-top: 10px;">
                        <button id="${closeBtnId}" class="full-width">Close Modal</button>
                    </div>
                </div>
            `,
            onClose: () => {
                api.notify("Modal closed.");
            }
        });

        setTimeout(() => {
            const btn = document.getElementById(closeBtnId);
            if (btn) {
                btn.onclick = () => api.closeModal();
            }
        }, 100);
    };

    api.onConfigure(() => {
        showModal();
    });

    api.onOutgoing((line) => {
        if (line.trim() === "m /modal") { // Furcadia commands often start with 'm ' or similar if it's a message, but raw send is what we catch here.
             // Wait, outgoing handler receives what is sent to send().
             // If the user types "/modal" in the input box, the client might send "say /modal" or just "/modal" depending on implementation.
             // Standard Furcadia client sends "m /modal" for speech.
             // But let's assume we catch raw input if we hook early enough, or we catch the protocol command.
             // In `furnarchy-core.ts`, `send` is called.
             // If the user types `/modal`, the web client likely processes it.
             // Let's just check for exact match or "m /modal".
        }
        
        // Actually, let's just stick to onConfigure for now as it is reliable.
        // But I'll add a simple check for "/modal" just in case.
        if (line.trim() === "/modal" || line.trim() === "m /modal") {
            showModal();
            return null; // Consume
        }
        return line;
    });
    
    api.onUnload(() => {
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }
    });
    
    api.notify("Modal Showcase loaded. Click Configure to test.");
});
