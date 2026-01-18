# Furnarchy Zero

![Furnarchy Zero Logo](app/static/logo.png)

**Furnarchy Zero** is a web client wrapper for [Furcadia](https://furcadia.com/). It enhances the official web client with a plugin system.

* [**Play Now at furnarchy.xyz.**](https://furnarchy.xyz)
* I have also been compiling a comprehensive game protocol spec [HERE](docs/FURC_PROTOCOL.md).

## Project Structure

*   `app/`: The main SvelteKit frontend application.
*   `app/static/plugins`: Pure JS Furnarchy plugins.
*   `plugins/`: TypeScript source code for bundled Furnarchy plugins.
*   `remote-furc-relay/`: A lightweight binary relay for RemoteFurc E2EE communication.
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

**[📚 Read the Full Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md)**

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
    // ... plugin logic ...
});
```

### Example Plugins

You can find examples for plugins by browsing the [bundled plugins](app/static/plugins).

### Hosting Plugins
Since Furnarchy Zero runs in the browser, plugins must be hosted on a web server accessible via HTTPS (or HTTP if running locally).
*   **GitHub Gists**: You can host plugins as Gists. Use the "Raw" button to get the URL.
*   **GitHub Pages**: Host a `.js` file on your GitHub Pages site.

## Security

Furnarchy Zero is a third-party project and is not affiliated with, endorsed by, or connected to Dragon's Eye Productions (DEP). Furcadia is a registered trademark of Dragon's Eye Productions.
