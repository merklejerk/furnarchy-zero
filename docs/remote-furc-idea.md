# Technical Specification: RemoteFurc

## 1. Overview

RemoteFurc is a persistent-to-transient Furcadia chat bridge. It allows a desktop "Host" (Modded Web Client) to maintain a persistent connection to the game while sharing a real-time, encrypted chat stream with a "Remote" (Mobile Web App). The relay server acts as a blind message passer, ensuring data privacy via E2EE.

## 2. Core Architecture

* **Host (Desktop Mod):** The primary engine. Maintains the WS connection to Furcadia, manages local chat history, and handles command injection.
* **Relay (VPS/Droplet):** A stateless Node.js WebSocket server using native HTTPS. It routes encrypted buffers without access to the plaintext.
* **Remote (Mobile App):** A Svelte-based web interface for reading chat, receiving notifications, and sending remote commands.

## 3. Pairing & Handshake Flow

The pairing process uses a standard HTTP(S) URL to bridge the mobile browser to the secure socket environment.

### 3.1 Handshake Steps

1. **Host Generation:**

   * Generates a unique `RoomID` (UUIDv4).
   * Generates an `IdentityKey` (Authentication secret).
   * Generates an ECDH Keypair (`Host_Public`, `Host_Private`).
   * Displays a QR code: `https://blindrelay.io/pair?room={RoomID}&key={IdentityKey}&pub={Host_Public}`.

2. **Remote Acquisition:**

   * User scans QR. Mobile browser opens the Svelte Remote App.
   * Remote generates its own ECDH Keypair (`Remote_Public`, `Remote_Private`).
   * Remote establishes a WSS connection to the Relay using `RoomID` and `IdentityKey`.

3. **Key Agreement (ECDH):**

   * Host and Remote exchange Public Keys via the Relay.
   * Both derive a **Shared Secret**; the Relay cannot derive this secret.
   * **Shared Secret** initializes an `AES-256-GCM` cipher.

## 4. Relay Server Specification (Node.js)

Optimized for a $4 Droplet to support high concurrency with minimal RAM overhead.

### 4.1 SSL & Network

* **SSL:** Node.js native `https` server using Cloudflare Origin CA certificates.
* **Cloudflare Mode:** Full (Strict) + "Orange Cloud" Proxy for DoS protection.
* **Port:** 443.

### 4.2 Lifecycle & Validation

* **Endpoint:** `GET /v1/connect?room={id}&role={host|remote}&key={IdentityKey}`
* **Heartbeat:** Relay pings every 30s. Clients must pong to avoid Cloudflare's 100s idle timeout.
* **Dumb Pipe:** The Relay identifies the recipient socket by `RoomID` and pipes the binary buffer directly.

## 5. Data Protocol (E2EE)

All messages are encrypted with AES-256-GCM.

### 5.1 Structure

* `[IV (12 bytes)] + [Auth Tag (16 bytes)] + [Ciphertext]`
* The **Auth Tag** ensures message integrity; the Host/Remote will drop any message that fails the tag validation (prevents injection/tampering).

### 5.2 Message Types

* `SYNC_REQ`: Remote requests history from the Host.
* `CHAT_DATA`: Host sends filtered Furcadia lines (`( `, `m `, `[ `).
* `CMD_SEND`: Remote sends commands for the Host to execute.

## 6. Infrastructure

* **Hosting:** $4/mo VPS.
* **Process Manager:** `PM2`.
* **Statelessness:** No database. All chat history is stored in the Host browser's RAM.