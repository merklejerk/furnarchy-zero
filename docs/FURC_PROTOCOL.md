# **Furcadia Network Protocol Specification: Comprehensive Architecture and Instruction Set Analysis**

## **1\. Introduction and Architectural Philosophy**

The Furcadia Network Protocol stands as a significant artifact in the history of online virtual worlds, representing a unique evolutionary bridge between the text-based Multi-User Dungeons (MUDs) of the 1980s and the graphical Massively Multiplayer Online Games (MMOGs) that would come to dominate the 2000s. Unlike its contemporaries that rapidly shifted toward efficient, opaque binary protocols over UDP to support fast-paced combat, Furcadia’s architecture was designed with a fundamentally different set of constraints and goals: accessibility, user-generated content (UGC), and social interaction.

The protocol operates strictly over the Transmission Control Protocol (TCP), prioritizing reliable, ordered delivery of data over the speed of transmission.1 This decision eliminates the need for the client to handle packet reordering or loss recovery, simplifying the client-side network stack significantly. Furthermore, the data stream is almost entirely character-based, utilizing 7-bit US-ASCII encoding for the majority of instructions.1 This design choice—essentially wrapping a graphical state machine in a text-based transport layer—has profound implications for the game's ecosystem. It allowed for the early proliferation of third-party tools, bots, and proxies, as the barrier to entry for reverse-engineering the protocol was essentially the ability to read text.

However, the simplicity of ASCII presents a challenge for transmitting complex game state data such as 32-bit coordinates, unique user identifiers (UIDs), and high-fidelity color information. To address this, the protocol employs custom base-encoding algorithms—specifically Base95 and Base220—which compress numerical data into printable character strings.3 This approach creates a "hybrid" protocol: human-readable in its command structure (opcodes and delimiters) but machine-dense in its payload arguments.

The modern iteration of the protocol, particularly following the "Second Dreaming" updates (Version 31+), has had to graft sophisticated features like 32-bit "True Color" support, web-based inventory management, and dynamic lighting onto this legacy backbone.5 This report provides an exhaustive specification of this evolved protocol, dissecting its connection lifecycle, encoding standards, instruction sets, and the architectural compromises required to modernize a 1990s engine for the 2020s.

## **2\. The Physical and Transport Layer**

### **2.1. Network Topology and Connectivity**

The Furcadia network architecture is centralized, relying on a client-server topology where the server acts as the authoritative source of world state. The client is effectively a "dumb terminal" with graphical caching capabilities; it visualizes the state provided by the server and sends user input requests, but it does not perform authoritative simulation of movement or collision.6

The primary game service resides at the hostname lightbringer.furcadia.com, which resolves to the IP address 72.36.220.249.1 In a move that highlights the developers' foresight regarding network accessibility—particularly for users in restrictive environments like university dorms or corporate offices—the server listens on a wide array of ports. While port 6500 is the recommended standard, the service is also available on ports 5000, 2300, and the standard reserved ports 80 (HTTP), 21 (FTP), and 22 (SSH).1 By listening on these reserved ports, the Furcadia server can often bypass basic firewall rules that filter non-standard traffic, ensuring connectivity for a broader user base without requiring tunneling software.

### **2.2. Session Lifecycle and Handshake**

Establishing a valid session with the Furcadia server involves a specific "handshake" procedure that distinguishes it from standard TCP stream handling. A raw TCP connection is insufficient; the client must navigate a Message of the Day (MOTD) preamble before the server will accept input.

#### **2.2.1. The "Dragonroar" Synchronization**

Upon establishing the TCP connection, the server immediately begins streaming text data to the client. This data serves as a news feed, displaying update notes, marketplace advertisements, or community announcements.1 This stream is unidirectional; the server does not expect or process client input during this phase.

The crucial synchronization signal is the line containing the string Dragonroar. This line serves as the "Ready" state indicator.

* **Client Behavior:** The client must buffer and display (or discard) all incoming lines until Dragonroar is detected.  
* **Proxy/Bot Constraints:** Automated tools must strictly observe this silence period. Attempting to send the login command before receiving Dragonroar will typically result in the server ignoring the input or terminating the connection as a flood protection measure.1  
* **Legacy Artifacts:** Historically, the Dragonroar line was followed by version identifiers like V00013 and END. Modern parsers are advised to ignore these, as they are vestiges of older protocol versions and are no longer reliable indicators of state.1

#### **2.2.2. Proxy Identification**

The protocol includes a specific provision for "Third Party Proxies"—middleware software that sits between the client and server to provide features like moderation automation or accessibility tools. To prevent these tools from being flagged as malicious automated traffic, they are required to declare their presence.

* **Command:** onlnprx  
* **Timing:** This command must be sent *immediately* after the Dragonroar signal and *before* the standard connect command.1  
* **Function:** This registers the connection as a proxy, potentially adjusting the server's flood control thresholds or logging the session differently to account for the non-standard latency or packet frequency introduced by the middleware.

### **2.3. Authentication and Encryption**

The authentication mechanism reveals the protocol's age. The standard login command is transmitted as a plaintext string.

* **Command Structure:** connect \<PlayerName\> \<Password\>.7  
* **Security Implications:** In the original specification, this credential transmission occurred without encryption, making it vulnerable to packet sniffing on local networks.2

Modern Mitigation:  
With the "Second Dreaming" update and the integration of web-based account management, the authentication flow has evolved. While the protocol command remains connect, the "Password" field can now accept a temporary session token or a hashed credential generated via a secure HTTPS side-channel (e.g., the web-based character editor or the "Digo Market").5 This "Token Passing" strategy secures the actual user credentials while maintaining backward compatibility with the legacy text-based protocol, which treats the token simply as a string password.

### **2.4. Keep-Alive Mechanisms**

Unlike UDP protocols that might send a "heartbeat" packet every few milliseconds, Furcadia's TCP stream relies on the inherent connectivity of the socket. However, to prevent "zombie" connections (where the socket is open but the client is unresponsive) and to keep NAT mappings open, the protocol utilizes implicit activity.

* **Client-Side:** Periodic commands such as onln (checking a friend's status) or look serve as keep-alives.  
* **Server-Side:** The server periodically pushes updates. If the TCP window fills and packets cannot be acknowledged (ACK) by the client, the OS network stack will eventually tear down the connection.  
* **Timeout:** The server enforces an idle timeout, disconnecting characters that have not sent an input command for a specified duration, unless they are flagged with an "AFK" state, which might extend this timer.9

## **3\. Data Representation and Encoding Algorithms**

The most distinct technical feature of the Furcadia protocol is its data encoding. To transmit integer values (coordinates, IDs, colors) within a 7-bit ASCII stream, the protocol employs two custom base-encoding schemes: **Base95** and **Base220**. These schemes maximize data density while avoiding control characters (ASCII 0-31) that could interfere with modem protocols or terminal emulators.

### **3.1. Base95 Encoding**

Base95 is the legacy encoding system, used primarily for values that fit within the standard printable ASCII range (32-126).

#### **3.1.1. Mechanism and Character Set**

The algorithm maps integer values to ASCII characters by applying a fixed offset.

* **Offset:** \+32.  
* **Range:** ASCII 32 ( Space) to ASCII 126 (\~ Tilde).  
* **Single Byte Capacity:** 0 to 94\.

Encoding Formula:

$$C \= V \+ 32$$

Where $C$ is the resulting ASCII character and $V$ is the integer value (0-94).  
Decoding Formula:

$$V \= C \- 32$$

#### **3.1.2. Multi-Byte Base95**

For values exceeding 94, a multi-byte position notation is used, similar to hexadecimal but with a base of 95\.

* Two-Byte Integer: Used for legacy map coordinates (0-1000).

  $$V \= (C\_{high} \- 32\) \\times 95 \+ (C\_{low} \- 32)$$  
* **Example:** The string \!\#.  
  * \! is ASCII 33\. Value: $33 \- 32 \= 1$.  
  * \# is ASCII 35\. Value: $35 \- 32 \= 3$.  
  * Total: $(1 \\times 95\) \+ 3 \= 98$.

This encoding allows the protocol to represent a coordinate pair (X, Y) in just 4 bytes of text (2 bytes for X, 2 for Y), which is significantly more compact than transmitting the string "100,100" (7 bytes).7

### **3.2. Base220 Encoding**

As the game world expanded and the user base grew into the millions, the Base95 system became insufficient for unique User IDs and larger map coordinates. Base220 was introduced to utilize the extended character set available in the ISO-8859-1 (Latin-1) standard.

#### **3.2.1. Mechanism and Capacity**

Base220 utilizes 220 distinct characters from the 8-bit byte range (0-255). By excluding control characters (0-31), the delete character (127), and potentially some reserved protocol delimiters (like line feeds), it achieves a much higher data density.

* **Capacity:**  
  * **2 Bytes:** $220^2 \= 48,400$. Sufficient for modern map dimensions (typically max 2000x2000, though mostly smaller).  
  * **4 Bytes:** $220^4 \\approx 2.3 \\times 10^9$. Sufficient for over 2 billion unique User IDs.

#### **3.2.2. Usage in Protocol**

* **User IDs:** Always encoded as 4-byte Base220 strings in packets like "Spawn Avatar" (\<) and "Animated Move" (/).6  
* **Coordinates:** Modern packets use 2-byte Base220 for X and Y, allowing for maps larger than the Base95 limit of roughly $95^2 \\approx 9000$ (though practical map limits are often lower due to memory).  
* **Shape/Sprite IDs:** With the explosion of avatar customization (11 species, 3 genders, countless "Noble" variants), the Shape ID is also transmitted as a 2-byte Base220 value.6

### **3.3. Color Code Structures**

The representation of avatar colors illustrates the protocol's evolution from a simple lookup table to a complex rendering instruction set.

#### **3.3.1. Legacy Color String (13 Bytes)**

The original color string is a fixed-length sequence of 13 Base95 characters. Each character represents an index (0-94 typically, mapping to a 256-color palette) for a specific region of the avatar sprite.7

| Byte Index | Avatar Region | Description |
| :---- | :---- | :---- |
| 0 | Fur | Main body color. |
| 1 | Markings | Secondary body details. |
| 2 | Hair | Head hair color. |
| 3 | Eye | Eye pixel color. |
| 4 | Badge | The "Beekin" badge or accessory. |
| 5 | Vest | Upper body clothing. |
| 6 | Bracer | Wrist/arm accessories. |
| 7 | Cape | Back accessory. |
| 8 | Boot | Footwear. |
| 9 | Pants | Lower body clothing. |
| 10 | Gender | 0=Female, 1=Male, 2=Unspecified. |
| 11 | Species | Base species ID (Rodent, Equine, Feline, etc.). |
| 12 | Reserved | Often unused or for legacy markings. |

#### **3.3.2. Modern Color String (Variable Length)**

The "Second Dreaming" update introduced a variable-length color string (14-30+ characters) to support 32-bit remapping.6

* **Encoding:** Base220.  
* **Structure:** This string acts as a serialized array of "Remap Instructions." It allows specific layers of the new FOX5 avatar sprites (e.g., wings, tails, glowing effects) to be tinted with True Color (24-bit RGB) values.  
* **Parsing:** The client parses this string to build a dynamic color transform matrix, which is then applied to the grayscale layers of the 32-bit sprite assets at runtime. This allows for millions of color combinations, far exceeding the legacy palette limits.5

## **4\. Server-to-Client (S2C) Instruction Set**

The server controls the client's state through a stream of "Instructions." Each instruction is a line of text starting with a specific "Opcode" (a single character) that determines how the following data should be parsed.

### **4.1. Entity Management: The "Spawn" Family**

Managing the visibility and movement of "Furres" (avatars) is the primary function of the protocol.

#### **4.1.1. Spawn Avatar (\<)**

This is the most data-dense packet in the protocol. It tells the client to create a new entity in its local memory or update an existing one.

Format:  
‘\<’ \+ UserID \+ X \+ Y \+ Shape \+ Name \+ ColorCode \+ Flags \+ LF 6  
**Field Breakdown:**

| Field | Encoding | Size | Details |
| :---- | :---- | :---- | :---- |
| **Opcode** | Char | 1 | Always \< (0x3C). |
| **UserID** | Base220 | 4 | Unique session ID. Used for all subsequent updates. |
| **X, Y** | Base220 | 2 ea. | Position on the map. |
| **Shape** | Base220 | 2 | References the FOX file ID (Avatar appearance). |
| **Name** | String | 3-65 | Display name. Spaces are valid. |
| **ColorCode** | String | 14-30 | The Modern Color String (see 3.3.2). |
| **Flags** | Base220 | 1 | Bitmask for state. |

The Flags Bitmask:  
The Flags byte is critical for client logic 6:

* CHAR\_FLAG\_HAS\_PROFILE (Bit 0): Indicates the user has a written profile. The client enables the "Look" context menu option.  
* CHAR\_FLAG\_SET\_VISIBLE (Bit 1): If 0, the avatar is "ghosted" (loaded but invisible). If 1, it renders.  
* CHAR\_FLAG\_NEW\_AVATAR (Bit 2): Optimisation hint. If set, the client treats this as a fresh arrival (no interpolation). If unset, it may be a correction of an existing avatar.

#### **4.1.2. Animated Move (/)**

This packet triggers the "walking" animation. It implies a smooth transition from the current coordinate to the new one.

Format:  
‘/’ \+ UserID \+ X \+ Y \+ Shape \+ LF 6

* **Logic:** The client calculates the vector from CurrentPos to TargetPos (X,Y). It then plays the walking animation for Shape in that direction.  
* **Shape Update:** The packet includes the Shape ID because avatars might change appearance mid-stride (e.g., triggering a "werewolf" transformation or simply changing clothes).

#### **4.1.3. Remove Avatar ())**

Instructs the client to delete the entity from local memory.  
Format: ‘)’ \+ UserID \+ LF.6

* **Usage:** Sent when a player disconnects, teleports out of the visual range, or enters a dream portal.

#### **4.1.4. Hide Avatar (C)**

Used for specific game states where the avatar persists logically but should not be drawn (e.g., an invisible GM, or a player "inside" a large object).  
Format: ‘C’ \+ UserID \+ X \+ Y \+ LF.6

### **4.2. World and Environment Updates**

The Furcadia world is dynamic; users can script changes to the map using "DragonSpeak." These changes are relayed via the protocol.

#### **4.2.1. Object and Floor Placement (\>)**

Updates the static map tiles.  
Format: ‘\>’ \+ XX \+ YY \+ OO.7

* **XX, YY:** Coordinates (Base95/220).  
* **OO:** Object ID.  
* Batching: Crucially, a single \> line can contain multiple triplets.  
  \> 10 10 500 10 11 501 10 12 502  
  This allows the server to send bulk updates (like a door opening or a wall appearing) in a single TCP segment, minimizing overhead.

#### **4.2.2. Floor Change (1)**

Specific opcode for changing the ground tile (floor) distinct from the object layer.  
Format: ‘1’ \+ XX \+ YY \+ OO.7

#### **4.2.3. Camera Control (@)**

Centers the user's viewport.  
Format: ‘@’ \+ XX \+ YY.7

* **Usage:** Sent immediately after a map load or a "teleport" command to ensure the player is looking at their own avatar.

#### **4.2.4. Map Switching (;)**

Instructs the client to load a new map file.  
Format: ‘;’ \+ MapName.7

* **Context:** Used for the main "permanent" maps like *Vinca* or *New Haven*. User-created maps (Dreams) use a more complex handshake (see Section 6).

### **4.3. Text and User Interface**

Text is the primary carrier of social interaction.

#### **4.3.1. Standard Text Output (()**

**Format:** ‘(’ \+ Message.7

* **Rendering:** The client renders this text in the chat box.  
* **Formatting:** Supports a subset of HTML tags:  
  * \<b\>, \<i\>, \<u\>: Styling.  
  * \<font color='...'\>: Coloring.  
  * \<a href='...'\>: Hyperlinks (strictly limited to URLs).1  
  * \<name\>: Special tags for clicking on users.

#### **4.3.2. UI Control and Sub-Protocol (\])**

The \] opcode acts as a gateway for extended functionality, using a secondary type character.7

* **\]c (Change Graphic):** Patches a UI element on the fly.  
  * \]c \+ Index \+ Filename.  
  * Used to change the "skin" of the interface based on the Dream's theme.  
* **\]s (Dream Portal):** Sends metadata about a portal object.  
  * \]s \+ XXYY \+ ID \+ Title.  
  * Populates the tooltip when a user hovers over a portal.  
* **\]q (Dream Entry):** The handshake for entering a user dream.  
  * \]q \+ DreamID.  
  * Triggers the File Server connection sequence.

## **5\. Client-to-Server (C2S) Instruction Set**

The client sends a stream of commands reflecting user input. These are terse and functional.

### **5.1. Movement and Action**

* **m \<Dir\>**: Move. Directions are mapped to the Numpad (1=SW, 3=SE, 7=NW, 9=NE).  
  * *Note:* The client sends m repeatedly while the key is held. The server validates the rate to prevent speed hacking.  
* **get**: Pickup object.  
* **use**: Activate object.  
* **look**: Request description.

### **5.2. State Requests**

* **desc \<Text\>**: Update self description.  
* **rev \<UserID\>**: "Request Avatar".6  
  * **Crucial Recovery Mechanism:** If the client receives a / (Move) packet for a UserID it doesn't know (e.g., packet loss on the \< Spawn packet), it sends rev. The server responds with the full \< Spawn packet. This self-healing mechanism is vital for the stability of the long-running TCP session.  
* **onln \<Name\>**: Queries the server for a friend's online status.

## **6\. The Dream Architecture and File Server Protocol**

One of Furcadia's defining features is "Dreams"—user-created worlds. These are not hosted on the main game channel but are downloaded on-demand.

### **6.1. The Handoff**

When a user enters a portal, the Game Server sends \]q \<DreamID\>. The client effectively "pauses" the game simulation and initiates a secondary connection to the **File Server**.

### **6.2. The File Transfer Protocol**

The File Server operates on a dynamic port and utilizes a distinct binary-heavy protocol.

**Sequence:**

1. **Connect:** Client connects to File Server.  
2. **Welcome:** Server sends 10 Welcome to Furcadia file server.7  
3. **Request:** Client sends the Dream ID.  
4. **Header:** Server sends 44 FILESIZE CHUNKSIZE.  
   * FILESIZE: Total bytes.  
   * CHUNKSIZE: Bytes per packet.  
5. **Streaming:** The server streams the map file (.map) and potentially patch files (.fox, .fsh).  
   * **Chunk Format:** SC \+ Checksum \+ Data.  
   * This framing allows the client to verify integrity mid-stream.  
6. **Termination:** Client sends BYE; Server acknowledges with 99 Log out.

Once the file is cached, the client resumes the Game Server session, which then switches the map context to the newly downloaded Dream.

## **7\. Modernization: The Second Dreaming (v31+)**

The "Second Dreaming" update required significant extensions to the protocol to support modern graphical expectations without breaking the text-based legacy proxy ecosystem.

### **7.1. 32-Bit Asset Integration (FOX5)**

The move from the 8-bit FSH format to the 32-bit FOX5 format was a major architectural shift.

* **FOX5 Container:** A custom format supporting LZMA compression and 32-bit RGBA.11  
* **Protocol Abstraction:** The protocol *does not* transmit these images. It continues to transmit 2-byte Shape IDs (Base220). The client is responsible for mapping ShapeID: 12345 to the specific frame inside a local FOX5 file. This abstraction preserved the protocol's bandwidth efficiency while exponentially increasing visual fidelity.5

### **7.2. Web-Integration Headers**

To support features like the "Digo Market" (real-money transactions) and Guild management, the protocol now includes HTTP-style headers in specific system messages.

* **Headers:** X-Furcadia-Access-Token, X-Furcadia-Guild-ID.8  
* **Hybrid Flow:** The client parses these headers to open authenticated web views (embedded Chromium or external browser) without requiring the user to re-login. This delegates complex, secure transactions to standard HTTPS web stacks, keeping the game protocol focused on world state.

## **8\. Third-Party Ecosystem and Tooling**

The transparency of the ASCII protocol fostered a rich ecosystem of third-party tools.

### **8.1. Proxies and Bots**

* **Silver Monkey:** A popular botting framework. It automates the onlnprx handshake and provides a scripting language (MonkeySpeak) to trigger actions based on incoming text (e.g., "If chat contains 'Hello', reply 'Hi'").12  
* **Mechanism:** These bots act as Man-in-the-Middle (MitM) entities. They maintain the TCP socket to the server and a local socket to the client, stripping out administrative commands or injecting automated responses.

### **8.2. Libraries: LibFurc**

* **LibFurc:** An open-source Python library designed to handle the nuances of Base220 decoding and packet parsing.13  
* **Significance:** It abstracts the complex bitmasking of the Flags byte and the variable-length parsing of the Modern Color String, allowing developers to focus on high-level logic (e.g., "Move avatar to X,Y") rather than byte-level stream management.

## **9\. Conclusion**

The Furcadia Network Protocol is a study in evolutionary software architecture. It successfully bridges the gap between the low-bandwidth, text-only era of the early Internet and the high-fidelity, always-online expectations of the modern web. By retaining a text-based core, it preserved a community of tinkers and developers. By grafting on Base220 encoding and web-based side-channels, it managed to scale to support millions of users and 32-bit graphics.

For the network architect, Furcadia demonstrates the viability of "Hybrid" protocols—where structure is human-readable (text) but payload is machine-dense (Base220)—as a strategy for long-term maintainability and community extensibility.

### ---

**Table 1: Protocol Opcode Reference (S2C)**

| Opcode | Description | Payload Data | Context |
| :---- | :---- | :---- | :---- |
| \< | Spawn Avatar | UserID, X, Y, Shape, Name, Colors, Flags | New entity enters view. |
| / | Animated Move | UserID, X, Y, Shape | Entity walks to new pos. |
| ) | Remove Avatar | UserID | Entity leaves view/disconnects. |
| C | Hide Avatar | UserID, X, Y | Entity exists but hidden. |
| \> | Place Object | X, Y, ObjectID | Map update (Furniture, etc.). |
| 1 | Place Floor | X, Y, FloorID | Map update (Ground). |
| @ | Camera Center | X, Y | Reset viewport center. |
| ( | Text Output | Message String | Chat, System Msg. |
| \] | UI/Meta | Type (c,s,q) \+ Data | Dream portals, UI patching. |

### **Table 2: Data Encoding Comparison**

| Scheme | Base | Range | Offset | Usage |
| :---- | :---- | :---- | :---- | :---- |
| **Base95** | 95 | 32 ( ) to 126 (\~) | \+32 | Legacy coords, small ints. |
| **Base220** | 220 | 35 (\#) to 255 (ÿ) | Var | UserIDs, Modern Coords, Shapes. |

### **Table 3: Spawn Avatar Flag Bitmask**

| Bit | Value | Name | Description |
| :---- | :---- | :---- | :---- |
| 0 | 1 | HAS\_PROFILE | Avatar has a profile description. |
| 1 | 2 | SET\_VISIBLE | Avatar is rendered visible. |
| 2 | 4 | NEW\_AVATAR | Avatar is a fresh spawn (no interpolation). |

#### **Works cited**

1. Recommendations for Third Party Proxies And Other Similar Software \- Furcadia, accessed December 3, 2025, [http://www.furcadia.com/docs/third\_party\_proxies.html](http://www.furcadia.com/docs/third_party_proxies.html)  
2. Relatively secure faster alternative for HTTPS, accessed December 3, 2025, [https://security.stackexchange.com/questions/110723/relatively-secure-faster-alternative-for-https](https://security.stackexchange.com/questions/110723/relatively-secure-faster-alternative-for-https)  
3. Base220 Implicit Conversion (Base220 to Byte\[\]) \- Furcadia Framework Documentation, accessed December 3, 2025, [https://documentation.help/FurcadiaFramework/M\_Furcadia\_Text\_Base220\_op\_Implicit.htm](https://documentation.help/FurcadiaFramework/M_Furcadia_Text_Base220_op_Implicit.htm)  
4. Base95 Class, accessed December 3, 2025, [https://starship-avalon-projects.github.io/FurcadiaFramework/html/T\_Furcadia\_Text\_Base95.htm](https://starship-avalon-projects.github.io/FurcadiaFramework/html/T_Furcadia_Text_Base95.htm)  
5. The Second Dreaming Part 1 \- Furcadia, accessed December 3, 2025, [https://cms.furcadia.com/explore/todo/wondered/updates/the-second-dreaming-part-1](https://cms.furcadia.com/explore/todo/wondered/updates/the-second-dreaming-part-1)  
6. Update 023 Avatar Movement \- Furcadia Dev Center, accessed December 3, 2025, [http://dev.furcadia.com/docs/023\_new\_movement.pdf](http://dev.furcadia.com/docs/023_new_movement.pdf)  
7. Protocol | Furcadia Wiki \- Fandom, accessed December 3, 2025, [https://furcadia.fandom.com/wiki/Protocol](https://furcadia.fandom.com/wiki/Protocol)  
8. headers-fuzz.txt \- GitHub Gist, accessed December 3, 2025, [https://gist.github.com/BugAnnihilator/8762f33ca7f0088307dda621c9eadddc](https://gist.github.com/BugAnnihilator/8762f33ca7f0088307dda621c9eadddc)  
9. Character.ini, accessed December 3, 2025, [https://starship-avalon-projects.github.io/FurcadiaFramework/html/2e782621-dd7d-4bc1-92b6-1057df3af49f.htm](https://starship-avalon-projects.github.io/FurcadiaFramework/html/2e782621-dd7d-4bc1-92b6-1057df3af49f.htm)  
10. ColorString.Update Method \- Furcadia Framework Documentation, accessed December 3, 2025, [https://documentation.help/FurcadiaFramework/M\_Furcadia\_Movement\_ColorString\_Update.htm](https://documentation.help/FurcadiaFramework/M_Furcadia_Movement_ColorString_Update.htm)  
11. FOX5 File Format Specification \- Furcadia, accessed December 3, 2025, [https://cms.furcadia.com/creations/third-party-development/448-fox-format-specification](https://cms.furcadia.com/creations/third-party-development/448-fox-format-specification)  
12. Releases · StarShip-Avalon-Projects/Silver-Monkey \- GitHub, accessed December 3, 2025, [https://github.com/StarShip-Avalon-Projects/Silver-Monkey/releases](https://github.com/StarShip-Avalon-Projects/Silver-Monkey/releases)  
13. FelixWolf/libfurc: Python library for Furcadia \- GitHub, accessed December 3, 2025, [https://github.com/FelixWolf/libfurc](https://github.com/FelixWolf/libfurc)