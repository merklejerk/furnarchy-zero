Furnarchy.register({
    name: "Auto Spinner",
    version: "1.0.0",
    author: "me@merklerjerk.com"
}, (api) => {
    
    let interval;
    
    api.onLoggedIn(() => {
        console.log("Logged in! Starting spin cycle...");
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
