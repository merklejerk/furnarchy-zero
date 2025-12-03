# Furnarchy Zero

![Furnarchy Zero Logo](app/static/logo.png)

**Furnarchy Zero** is a web client wrapper for [Furcadia](https://furcadia.com/). It enhances the official web client with a plugin system.

[**Play Now at furnarchy.xyz**](https://furnarchy.xyz)

## Project Structure

*   `app/`: The main SvelteKit frontend application.
*   `gcloud/serverless/terra/`: The Google Cloud Function that acts as the authentication proxy.

## Why an Auth Proxy?

You might notice that Furnarchy Zero requires a backend "Auth Proxy" to function. This is necessary because of **CORS (Cross-Origin Resource Sharing)** security policies in modern web browsers.

1.  **The Restriction**: Web browsers block web pages (like `furnarchy.xyz`) from sending data to other domains (like `terra.furcadia.com`) unless the destination explicitly allows it. The official Furcadia authentication server does not allow requests from third-party domains.
2.  **The Workaround**: We use a lightweight server-side proxy. Your browser sends the login request to the proxy, and the proxy (which is not a browser and thus not bound by CORS) forwards it to Furcadia.
3.  **Security**: The proxy is **stateless**. It does not log, store, or read your password. It simply acts as a pipe between you and the game server.
4.  **Trust**: If you are uncomfortable sending your credentials through the default proxy, the source code is provided in `gcloud/serverless/terra/`. You can easily host your own instance on Google Cloud Functions (often within the free tier) or any Node.js environment (local or cloud) and configure the client to use it.

## Getting Started

### Prerequisites

*   Node.js (v18 or later)
*   npm
*   Google Cloud SDK (if deploying the backend)

### Frontend Setup

1.  Navigate to the app directory:
    ```bash
    cd app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file (see Configuration below).
4.  Start the development server:
    ```bash
    npm run dev
    ```

### Backend Setup (Auth Proxy)

The auth proxy is required to log in to Furcadia from the web client due to CORS policies.

1.  Navigate to the proxy directory:
    ```bash
    cd gcloud/serverless/terra
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file (see Configuration below).
4.  Run locally:
    ```bash
    npm run dev
    ```

## Configuration

### Frontend (`app/.env`)

```env
# URL of the Auth Proxy (Local or Production)
PUBLIC_BACKEND_URL=http://localhost:8080

# Official Furcadia Client Assets
PUBLIC_FURCADIA_CLIENT_JS_URL=https://play.furcadia.com/web/client.js
PUBLIC_FURCADIA_ASSET_URL=https://play.furcadia.com/web/
```

### Backend (`gcloud/serverless/terra/.env`)

```env
# Target Furcadia Auth Server
TARGET_BASE_URL=https://terra.furcadia.com

# Google Cloud Project Config
GCLOUD_PROJECT_ID=your-project-id
GCLOUD_REGION=us-central1

# Security: Whitelist your frontend domains (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://your-username.github.io
```

## Deployment

### Frontend
The frontend is configured to deploy to GitHub Pages using GitHub Actions.
1.  Push changes to the `main` branch.
2.  The workflow in `.github/workflows/deploy.yml` will automatically build and deploy the site.

### Backend
To deploy the proxy to Google Cloud Functions:

1.  Ensure you are authenticated with `gcloud auth login`.
2.  Run the deploy script:
    ```bash
    cd gcloud/serverless/terra
    ./deploy.sh
    ```

## Plugin Development

Plugins are JavaScript files that interact with the exposed `Furnarchy` global object. They allow you to intercept messages, send commands, and automate gameplay.

### Basic Structure

A plugin registers itself using `Furnarchy.register()`.

```javascript
// my-plugin.js
Furnarchy.register({
    name: "My Cool Plugin",
    version: "1.0.0",
    author: "Your Name"
}, (api) => {

    // Called when the plugin is loaded
    console.log("Plugin loaded!");
    
    // You can send commands immediately
    // api.send("look\n"); 

    // Intercept incoming messages from the server
    api.onIncoming((line) => {
        // Example: Highlight whispers
        if (line.startsWith("(whisper)")) {
            console.log("Got a whisper:", line);
        }
        return line;
    });

    // Intercept outgoing commands from the user
    api.onOutgoing((line) => {
        // Example: Custom command
        if (line === "/hello") {
            api.send("shout Hello everyone!\n");
            return null; // Block the original /hello command
        }
        return line;
    });
    
    // Called when user logs in
    api.onLoggedIn(() => {
        console.log("Logged in!");
    });
    
    // Called when plugin is enabled/disabled
    api.onPause((paused) => {
        console.log("Plugin paused:", paused);
    });
});
```

### Example: Auto Spinner

This plugin waits for the user to log in, then rotates the character every 5 seconds.

```javascript
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
```

### API Reference

* `Furnarchy.register(meta, callback)`
    Registers a new plugin.
    *   `meta`: Object containing plugin metadata (`name`, `version`, `author`).
    *   `callback`: Function that receives an `api` object with the following methods:
        *   `api.send(text, tag?)`: Send a command to the server.
        *   `api.inject(text, tag?)`: Inject a command from the server.
        *   `api.onIncoming(callback)`: Intercept incoming messages.
        *   `api.onOutgoing(callback)`: Intercept outgoing messages.
        *   `api.onLoggedIn(callback)`: Called when login succeeds.
        *   `api.onPause(callback)`: Called when plugin is enabled/disabled.

### Hosting Plugins
Since Furnarchy Zero runs in the browser, plugins must be hosted on a web server accessible via HTTPS (or HTTP if running locally).
*   **GitHub Gists**: You can host plugins as Gists. Use the "Raw" button to get the URL.
*   **GitHub Pages**: Host a `.js` file on your GitHub Pages site.

## Security

Furnarchy Zero is a third-party project and is not affiliated with, endorsed by, or connected to Dragon's Eye Productions (DEP). Furcadia is a registered trademark of Dragon's Eye Productions.
