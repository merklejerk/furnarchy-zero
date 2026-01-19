Furnarchy.register({
    id: "modal-showcase-dev",
    name: "Modal Showcase",
    description: "Demonstrates the modal capabilities of Furnarchy Zero.",
    version: "1.1.5",
    author: "me@merklejerk.com",
    toggle: true
}, (api) => {
    
    const showModal = () => {
        const closeBtnId = 'modal-showcase-close';
        
        api.openModal({
            title: "Modal Showcase",
            body: `
                <div class="text-center">
                    <p>This is a modal opened from a plugin!</p>
                    <p>You can use standard HTML here.</p>
                    <p>Try out these styled buttons:</p>
                    <div class="modal-row" style="justify-content: center; gap: 10px; margin-top: 20px;">
                        <button class="btn-primary" onclick="alert('Primary clicked!')">Primary</button>
                        <button class="btn-danger" onclick="alert('Danger clicked!')">Danger</button>
                        <button class="btn-info" onclick="alert('Info clicked!')">Info</button>
                    </div>
                    <div class="text-left" style="margin-top: 20px;">
                        <label class="modal-label">List Box:</label>
                        <div class="list-box" style="height: 120px;">
                            <div class="list-row">Item 1</div>
                            <div class="list-row">Item 2</div>
                            <div class="list-row">Item 3</div>
                            <div class="list-row">Item 4</div>
                            <div class="list-row">Item 5</div>
                        </div>
                    </div>
                    <div class="text-left" style="margin-top: 20px;">
                        <label class="modal-label">Styled Input:</label>
                        <input type="text" class="full-width" placeholder="Type something retro..." />
                    </div>
                    <div style="margin-top: 20px;">
                        <button id="${closeBtnId}" class="btn-full">Close Modal</button>
                    </div>
                </div>
            `,
            onClose: () => {
                api.disable();
            }
        });

        setTimeout(() => {
            const btn = document.getElementById(closeBtnId);
            if (btn) {
                btn.onclick = () => api.closeModal();
            }
        }, 100);
    };

    api.onPause((paused) => {
        if (!paused) {
            showModal();
        } else {
            if (api.getModalPluginId() === api.metadata.id) {
                api.closeModal();
            }
        }
    });
    
    api.onUnload(() => {
        if (api.getModalPluginId() === api.metadata.id) {
            api.closeModal();
        }
    });
});
