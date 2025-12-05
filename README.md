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
    id: "my-cool-plugin",
    name: "My Cool Plugin",
    description: "A plugin that does cool things.",
    version: "1.0.0",
    author: "Your Name"
}, (api) => {

    // Called when the plugin is loaded
    console.log("Plugin loaded!");
    
    // You can send commands immediately
    // api.send("look\n"); 

    // Intercept incoming messages from the server
    // Priority 10: Run this before default (0) handlers
    api.onIncoming((line, sourceId, tag) => {
        // Example: Detect when someone says "pizza"
        if (line.startsWith("(") && line.includes("pizza")) {
            api.notify("Someone mentioned pizza!");
        }
        return line;
    }, 10);

    // Intercept outgoing commands from the user
    api.onOutgoing((line, sourceId, tag) => {
        // Example: Custom command
        if (line === "/hello") {
            api.send("\"Hello everyone!\n");
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
```

### Example: Modal Showcase

This plugin demonstrates how to create custom UI modals with styled inputs and buttons.
It is automatically loaded in development mode. To try it in production, add the plugin URL: `/plugins/modal-showcase.js`.

[View Source](app/static/plugins/modal-showcase.js)

### API Reference

* `Furnarchy.register(meta, callback)`
    Registers a new plugin.
    *   `meta`: Object containing plugin metadata.
        *   `id` (Required): Unique string identifier for the plugin (e.g., "my-plugin").
        *   `name` (Required): Human-readable name.
        *   `version` (Required): Semantic version string.
        *   `description` (Optional): Short description of what the plugin does.
        *   `author` (Optional): Author name or email.
        *   `toggle` (Optional): Boolean. If `true`, the plugin is disabled by default when installed.
    *   `callback`: Function that receives an `api` object with the following methods:
        *   `api.send(text, tag?)`: Send a command to the server. `tag` defaults to the plugin's `id`.
        *   `api.inject(text, tag?)`: Inject a command from the server. `tag` defaults to the plugin's `id`.
        *   `api.notify(text, tag?)`: Display a client-side message in the chat area.
        *   `api.disable()`: Disable the plugin programmatically.
        *   `api.onIncoming(callback, priority?)`: Intercept incoming messages. Callback receives `(text, sourceId, tag)`. `priority` is an optional number (default 0). Higher priority handlers run first.
        *   `api.onOutgoing(callback, priority?)`: Intercept outgoing messages. Callback receives `(text, sourceId, tag)`. `priority` is an optional number (default 0). Higher priority handlers run first.
        *   `api.onConnected(callback)`: Called when the WebSocket connection is established.
        *   `api.onDisconnected(callback)`: Called when the WebSocket connection is closed.
        *   `api.onLoggedIn(callback)`: Called when login succeeds. Callback receives `(name)`.
        *   `api.onPause(callback)`: Called when plugin is enabled/disabled. Callback receives `(paused)`.
        *   `api.onLoad(callback)`: Called immediately after registration with the initial enabled state. Callback receives `(enabled)`.
        *   `api.onConfigure(callback)`: Called when the user clicks the configure button in the plugin manager.
        *   `api.onReady(callback)`: Called when all plugins have been loaded. Use this to safely access services exposed by other plugins.
        *   `api.openModal(options)`: Opens a modal dialog.
            *   `options`: Object containing:
                *   `title`: String title of the modal.
                *   `body`: HTML string content of the modal body.
                *   `onClose`: Optional callback function when the modal is closed.
                *   `width`: Optional CSS width string (e.g., "500px").
                *   `height`: Optional CSS height string (e.g., "auto").
        *   `api.closeModal()`: Closes the currently open modal.
        *   `api.isModalOpen()`: Returns `true` if a modal is currently open.
        *   `api.setGameInput(enabled)`: Enable or disable keyboard input to the game client. Useful when showing custom UI elements.
        *   `api.saveData(key, value)`: Save a JSON-serializable value to local storage, namespaced to the plugin.
        *   `api.loadData(key)`: Load a saved value from local storage. Returns `null` if not found.
        *   `api.expose(service)`: Expose an API object to other plugins. `service` must have `name` and `version` properties.
        *   `api.use(name)`: Retrieve a service exposed by another plugin. Returns `null` if not found.

*   `Furnarchy.utils`
    *   `escape(str)`: Escapes HTML special characters and converts Unicode characters to HTML entities.
    *   `base95Encode(val, length?)`: Encodes a number to Base95 string.
    *   `base95Decode(str)`: Decodes a Base95 string to a number.
    *   `base220Encode(val, length?)`: Encodes a number to Base220 string.
    *   `base220Decode(str)`: Decodes a Base220 string to a number.
    *   `getShortname(name)`: Converts a Furcadia name to its "shortname" format (lowercase, no spaces, no special characters).
    *   `parseServerCommand(line)`: Parses a raw server command string into a structured object.
        *   Returns a `ServerProtocolCommand` object with a `type` property (e.g., `'chat'`, `'move-avatar'`, `'set-user-info'`) and relevant data fields.
        *   Example: `parseServerCommand("(Hello")` -> `{ type: 'chat', text: 'Hello' }`
    *   `parseClientCommand(line)`: Parses a raw client command string into a structured object.
        *   Returns a `ClientProtocolCommand` object with a `type` property (e.g., `'move'`, `'speech'`, `'look'`) and relevant data fields.
        *   Example: `parseClientCommand("m 1")` -> `{ type: 'move', direction: 1 }`
    *   `createServerCommand(cmd)`: Converts a structured `ServerProtocolCommand` object back into a raw server command string.
        *   Example: `createServerCommand({ type: 'chat', text: 'Hello' })` -> `"(Hello"`
    *   `createClientCommand(cmd)`: Converts a structured `ClientProtocolCommand` object back into a raw client command string.
        *   Example: `createClientCommand({ type: 'move', direction: 1 })` -> `"m 1"`

### Hosting Plugins
Since Furnarchy Zero runs in the browser, plugins must be hosted on a web server accessible via HTTPS (or HTTP if running locally).
*   **GitHub Gists**: You can host plugins as Gists. Use the "Raw" button to get the URL.
*   **GitHub Pages**: Host a `.js` file on your GitHub Pages site.

## Security

Furnarchy Zero is a third-party project and is not affiliated with, endorsed by, or connected to Dragon's Eye Productions (DEP). Furcadia is a registered trademark of Dragon's Eye Productions.
