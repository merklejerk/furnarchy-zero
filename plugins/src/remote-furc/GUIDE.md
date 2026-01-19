# Remote Furc User Guide

Remote Furc allows you to securely access your Furcadia chat and send commands from any mobile device or secondary computer. Whether you're away from your desk or just want to use your phone as a second screen, Remote Furc keeps you connected.

## Features

- **Real-time Chat:** Receive whispers, channel messages, and local chat instantly on your mobile device.
- **Secure Messaging:** All communication is encrypted end-to-end. No one (not even the relay server) can read your messages.
- **Remote Commands:** Send speech, emotes, and commands from your phone as if you were at your PC.
- **AFK Protection:** Sending messages via Remote Furc automatically resets your AFK timer, keeping you logged in.
- **Activity Indicator:** A subtle indicator in your game client lets you know when a remote device is active.

---

## Getting Started

### 1. Enable the Plugin
First, ensure that the **Remote Furc** plugin is enabled in your Furnarchy settings.

### 2. Open Remote Furc Settings
Click on the **Remote Furc** settings icon (find it in the Plugin Manager). You must be logged into a character to configure settings.

> [!PLACEHOLDER: Screenshot of Remote Furc Settings button or menu item]

### 3. Pair a New Device
In the Remote Furc Settings modal, click the **+ Pair New Device** button. A QR code will appear on your screen.

> [!PLACEHOLDER: Screenshot of the QR code pairing screen]

### 4. Connect on Mobile
1. Open the camera on your phone and scan the QR code.
2. Your mobile browser will open the Remote Furc interface.

### 5. Verify the Connection (Security Check)
For your security, a set of **3 verification words** will appear on both your PC and your mobile device.

1. Compare the words on both screens.
2. If they match exactly, click **"They Match"** on your PC.
3. Enter a name for your device (e.g., "My iPhone") and click **Finish Pairing**.

> [!PLACEHOLDER: Screenshot of the 3-word verification screen]

---

## How to Use

Once paired, you can visit the Remote Furc URL on your mobile device whenever you are logged in on your PC.

### The Interface
- **Chat Feed:** Displays your incoming messages.
- **Input Bar:** Type here to speak. Use `:` for emotes (e.g., `:waves`).
- **Nearby List:** See who is currently standing near your character.

### The Active Indicator
When a remote device is connected and active, a small purple dot and label will appear in the top-right corner of your game screen. This lets you know at a glance that your "Remote" is working.

> [!PLACEHOLDER: Screenshot of the "1 Remote" active indicator in the game UI]

---

## Technical Details (For the Curious)

Remote Furc is designed with security and privacy as a top priority. Here is a breakdown of how it works under the hood.

### Architecture
Remote Furc uses a "Host-Relay-Client" architecture:
- **Host (PC):** Your Furnarchy client act as the host.
- **Relay:** A middleman server that passes encrypted packets between the Host and the Remote.
- **Remote (Mobile):** The web interface running on your phone.

### Cryptography
Every pairing generates a unique, persistent shared secret between your PC and your mobile device using **Elliptic Curve Diffie-Hellman (ECDH)** over the P-256 curve.

- **End-to-End Encryption (E2EE):** All messages are encrypted using **AES-GCM (256-bit)**. The relay server never sees the plaintext messages because it doesn't have your shared secret.
- **Verification (SAS):** The 3-word verification code is a "Short Authentication String" derived from the shared secret and the public keys of both devices. This protects you against "Man-in-the-Middle" attacks.

### Privacy
- **No Message Logs:** The relay server is "stateless" regarding your messages. It doesn't save any chat history.
- **Local Storage:** Your paired device information is stored locally in your Furnarchy profile on your PC.
- **Per-Character Pairings:** Each character has its own unique "Room ID," meaning you can manage different devices for different characters.

---

## Troubleshooting

- **"Waiting for device connection..."**: Ensure your phone has internet access and can reach the relay server.
- **Messages not sending:** Check if the plugin is still enabled on your PC.
- **Words don't match:** If the verification words don't match, someone might be intercepting your connection. Cancel the pairing and try again on a secure network.
