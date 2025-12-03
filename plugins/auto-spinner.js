Furnarchy.register({
    id: "auto-spinner-73d51b4bc8625286",
    name: "Auto Spinner",
    description: "Automatically spins your character every 5 seconds.",
    version: "1.0.0",
    author: "me@merklerjerk.com"
}, (api) => {
    
    let interval;
    
    api.onLoggedIn(() => {
        api.notify("Logged in! Starting spin cycle...");
        startSpin();
    });
    
    api.onPause((paused) => {
        if (paused) stopSpin();
        else startSpin();
    });
    
    function startSpin() {
        if (interval) return;
        interval = setInterval(() => {
            // Send the '<' command every 5 seconds
            api.send("<\n");
        }, 5000);
    }
    
    function stopSpin() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }
});
