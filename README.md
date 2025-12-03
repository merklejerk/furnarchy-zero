# Furnarchy Zero

**Furnarchy Zero** is a web client wrapper for [Furcadia](https://furcadia.com/). It enhances the official web client with a plugin system.

## Project Structure

*   `app/`: The main SvelteKit frontend application.
*   `gcloud/serverless/terra/`: The Google Cloud Function that acts as the authentication proxy.

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
    author: "Your Name",
    
    // Called when the plugin is loaded
    onLoad: () => {
        console.log("Plugin loaded!");
        // You can send commands immediately (though the connection might not be ready yet)
        // Furnarchy.send("look"); 
    },

    // Intercept incoming messages from the server
    // Return the modified string, or null to block the message.
    onIncoming: (line) => {
        // Example: Highlight whispers
        if (line.startsWith("(whisper)")) {
            console.log("Got a whisper:", line);
        }
        return line;
    },

    // Intercept outgoing commands from the user
    onOutgoing: (line) => {
        // Example: Custom command
        if (line === "/hello") {
            Furnarchy.send("shout Hello everyone!");
            return null; // Block the original /hello command
        }
        return line;
    }
});
```

### Example: Auto Spinner

This plugin waits for the user to log in, then rotates the character every 5 seconds.

```javascript
Furnarchy.register({
    name: "Auto Spinner",
    version: "1.0.0",
    author: "me@merklerjerk.com",
    
    onLoggedIn: () => {
        console.log("Logged in! Starting spin cycle...");
        setInterval(() => {
            // Send the '<' command every 5 seconds
            Furnarchy.send("<\n");
        }, 5000);
    }
});
```

### API Reference

#### `Furnarchy.register(plugin)`
Registers a new plugin. The `plugin` object supports the following properties:

*   `name` (Required): The name of your plugin.
*   `version` (Optional): Version string (e.g., "1.0.0").
*   `author` (Optional): Author name.
*   `onLoad` (Optional): Function called when the plugin is successfully registered.
*   `onLoggedIn` (Optional): Function called when the user successfully logs into the game (receives `&&&&&&&&&&&&&&`).
*   `onIncoming` (Optional): Function `(text, tag) => string | null`.
    *   Receives a line of text from the server.
    *   `tag`: The source tag (e.g., `null` for server, `"PLUGIN"` for plugins).
    *   Return a string to pass it on (modified or original).
    *   Return `null` to block the message from reaching the client.
*   `onOutgoing` (Optional): Function `(text, tag) => string | null`.
    *   Receives a command sent by the user.
    *   `tag`: The source tag (e.g., `null` for user input, `"PLUGIN"` for plugins).
    *   Return a string to send it to the server.
    *   Return `null` to prevent it from being sent.

#### `Furnarchy.send(text, tag?)`
Sends a raw command to the game server.
*   `text`: The command string (e.g., `"m 1 1\n"`, `"\"Hello\n"`). **Must end with `\n`**.
*   `tag`: (Optional) A string to identify the source of the command. Defaults to `"PLUGIN"`.

#### `Furnarchy.inject(text, tag?)`
Injects a fake command from the server, as if it was received from the socket.
*   `text`: The command string (e.g., `"(whisper) You: Hello\n"`). **Must end with `\n`**.
*   `tag`: (Optional) A string to identify the source of the command. Defaults to `"PLUGIN"`.

### Hosting Plugins
Since Furnarchy Zero runs in the browser, plugins must be hosted on a web server accessible via HTTPS (or HTTP if running locally).
*   **GitHub Gists**: You can host plugins as Gists. Use the "Raw" button to get the URL.
*   **GitHub Pages**: Host a `.js` file on your GitHub Pages site.

## Security

Furnarchy Zero is a third-party project and is not affiliated with, endorsed by, or connected to Dragon's Eye Productions (DEP). Furcadia is a registered trademark of Dragon's Eye Productions.
