# FOX5 File Format Specification

The **FOX5** format is the standard asset container for Furcadia (v31+). It is a tag-based, recursive binary format designed for storing objects, shapes, frames, and sprite references. A key characteristic of FOX5 is its **footer-based** architecture, where the entry point to the file's metadata is located at the very end of the file.

---

## 1. File Layout

A FOX5 file consists of three main segments:
1. **Command Block (Metadata)**: A variable-length block starting at the beginning of the file, containing the tag-based hierarchy.
2. **Sprite Payload**: Raw compressed or uncompressed sprite data, typically following the command block.
3. **Footer**: A fixed 20-byte block at the end of the file, preceded by an optional 16-byte encryption seed.

### 1.1 The Footer
Parsing MUST begin by reading the last 20 bytes of the file. All multi-byte integers in the footer and command block are **Big Endian**.

| Offset (from EOF) | Size (bytes) | Type | Description |
| :--- | :--- | :--- | :--- |
| -20 | 1 | `uint8` | Version check (Standard: `2`). |
| -19 | 1 | `uint8` | **Encryption Flag**. `1` = Encrypted, `0` = Plaintext. |
| -18 | 2 | - | Reserved / Padding. |
| -16 | 4 | `uint32` | **Command Block Size**. Length of the metadata block at the start of the file. |
| -12 | 4 | `uint32` | **Key Modifier**. Also called "Header Size". Used for Command Block decryption. |
| -8 | 4 | `uint32` | **Magic Signature**. Must be `0x464F5835` ("FOX5"). |
| -4 | 4 | `uint32` | **Version Signature**. Must be `0x2E313131` (".111"). |

If the Encryption Flag is `1`, a 16-byte **Encryption Seed** is located at `Offset - 36` (immediately before the footer).

---

## 2. Encryption & Compression

The FOX5 format uses a combination of a stream cipher and LZMA compression.

### 2.1 Decryption Algorithm (RC4)
If the encryption flag is set, any data block (Command Block or individual Sprites) is decrypted using **RC4**. The keystream is initialized using a 16-byte key derived from the **Seed** and **Salts**.

#### The Salts
Four different constants are used to salt the key based on the length of the data being decrypted:

| Name | Values | Used If... |
| :--- | :--- | :--- |
| **SALT_A1** | `[105, 40, 235, 230, 43, 37, 195, 170]` | `(length & 4) == 0` |
| **SALT_A2** | `[255, 119, 78, 57, 138, 24, 255, 219]` | `(length & 4) != 0` |
| **SALT_B1** | `[102, 85, 15, 188, 102, 201, 182, 111]` | `(length & 8) == 0` |
| **SALT_B2** | `[50, 186, 189, 187, 234, 79, 158, 6]` | `(length & 8) != 0` |

#### Key Initialization (Pseudocode)
```python
def get_rc4_key(seed, data_len, modifier):
    key = array(seed) # Start with 16-byte seed
    saltA = SALT_A1 if (data_len & 4) == 0 else SALT_A2
    saltB = SALT_B1 if (data_len & 8) == 0 else SALT_B2
    
    for i in range(8):
        key[i] ^= saltA[i]
        key[i+8] ^= saltB[i]
    
    # Inject modifier into key bytes 4-7
    key[4] ^= (modifier >> 24) & 0xFF
    key[5] ^= (modifier >> 16) & 0xFF
    key[6] ^= (modifier >> 8) & 0xFF
    key[7] ^= modifier & 0xFF
    return key
```

### 2.2 Compression
* **Command Block**: Always LZMA-compressed. If encrypted, decrypt the block first, then decompress.
* **Sprite Block**: Each sprite in the payload is individually LZMA-compressed.

---

## 3. Command Block Hierarchy

The Command Block is a stream of tags. 

### 3.1 The "List" Tag (`L` - 0x4C)
The `L` tag is followed by a **Level** byte and a `uint32` **Count**.

| Level | Contents | Parent Context |
| :--- | :--- | :--- |
| 0 | **Files** | Global Root |
| 1 | **Objects** | File |
| 2 | **Shapes** | Object |
| 3 | **Frames** | Shape (or Object if Level 2 is skipped) |
| 4 | **Sprite Layers** | Frame |

### 3.2 Property Persistence (Inheritance)
Many properties in FOX5 are **sticky**. If a property is not defined for an item, it is inherited from the previous sibling in that list.

**Sticky Properties include:**
* **Object Level**: `t` (Edit Type), `!` (Flags), `?` (MoreFlags), `l` (License), `F` (FX Filters).
* **Frame Level (Sprite Layers)**: 
    * `c` (Content ID): Persists **and auto-increments** by 1 for each child in the list.
    * `C` (Purpose): Persists until redefined.
* **Inherited Shape Lists**: If an Object contains no `L` tag for Shapes (Level 2), it uses the exactly same shape list as the object defined before it.

### 3.3 Implicit ID Assignment
If an Object level item lacks an `i` (ID) tag, its ID is calculated as `last_assigned_id + 1`. This counter is maintained **per Edit Type**. In legacy files, the initial "last assigned" value for all types is `-1` (making the first implicit ID `0`).

---

## 4. Tag Reference

Tags are grouped by the level (List item) they typically appear within.

### 4.1 Structural Tags (Universal)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `<` | `0x3C` | - | **End Block**. Required to terminate every item in a list. |
| `L` | `0x4C` | `u8` level, `u32` count | **List Start**. Defines the start of a child container. |

### 4.2 File Level (Level 0)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `S` | `0x53` | `u32` count, [Entries] | **Sprite Table**. Metadata for all compressed images. |
| `g` | `0x67` | `u8` | **Generator**. Identifies the tool used to create the file. |

### 4.3 Object Level (Level 1)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `i` | `0x69` | `int32` | **ID**. The logical asset index. |
| `n` | `0x6E` | `string` | **Name**. Friendly identifier. |
| `d` | `0x64` | `string` | **Description**. Detailed metadata. |
| `t` | `0x74` | `u8` | **Edit Type**. (Floor, Item, Wall, etc). |
| `!` | `0x21` | `u8` | **Flags**. Bitfield for basic properties. |
| `?` | `0x3F` | `u32` | **MoreFlags**. Extended bitfield for modern features. |
| `l` | `0x6C` | `u8` | **License**. Permission set (1=Free, 2=Public, etc). |
| `F` | `0x46` | `u8`, `u8` | **FX Filter**. `[layer, mode]` for visual effects. |
| `a` | `0x61` | `u16` count + [strings] | **Author(s)**. List of creator strings. |
| `k` | `0x6B` | `u16` count + [strings] | **Keyword(s)**. Descriptive tags. |
| `r` | `0x72` | `u16` | **Revision**. Version counter for the object. |
| `P` | `0x50` | `string` | **Teleport**. Destination string (rare). |

### 4.4 Shape Level (Level 2)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `p` | `0x70` | `u8` | **Purpose**. Scale/Priority (0=Normal, 1=Small). |
| `s` | `0x73` | `u8` | **State**. Behavioral state (e.g. 0=Standing, 1=Walking). |
| `D` | `0x44` | `u8` | **Direction**. (0=SW, 1=SE, 2=NW, 3=NE). |
| `R` | `0x52` | `u8`, `u8` | **Ratio**. Animation speed/scale numerator and denominator. |
| `K` | `0x4B` | `u16` count + [6-byte blocks] | **KitterSpeak**. Embedded logic/scripting data. |

### 4.5 Frame Level (Level 3)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `o` | `0x6F` | `i16` x, `i16` y | **Registration Offset**. Base pixel anchor. |
| `f` | `0x66` | `i16` x, `i16` y | **Furre Offset**. Anchoring for avatars. |

### 4.6 Sprite Layer Level (Level 4)
| Tag | Hex | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `c` | `0x63` | `u16` | **Content Index**. 1-based index (0 = none). |
| `C` | `0x43` | `u16` | **Layer Purpose**. (Shadow = 64). |
| `O` | `0x4F` | `i16` x, `i16` y | **Layer Offset**. Relative to the frame's 'o' tag. |

---

## 5. Sprite Data 🖼️

Individual sprites are extracted based on the **Sprite Table (`S`)**.

### 5.1 Sprite Entry Structure (9 Bytes)
| Offset | Size | Type | Description |
| :--- | :--- | :--- | :--- |
| 0 | 4 | `uint32` | **Data Length**. LZMA-compressed size in bytes. |
| 4 | 2 | `uint16` | **Width**. |
| 6 | 2 | `uint16` | **Height**. |
| 8 | 1 | `uint8` | **Flags**. `1` = 32-bit BGRA, `0` = 8-bit Paletted. |

### 5.2 Decompression
The sprite payload is usually **LZMA compressed**. 
1. If the file-level encryption flag is set, the sprite chunk must be decrypted first.
2. The **modifier** for sprite decryption is `Width * Height * OutputBytesPerPixel` (4 for BGRA, 1 for Paletted).
3. After decryption, the bytes are passed to an LZMA decompressor.

### 5.3 Palettes
Paletted sprites (Flags=0) do not contain color information. They refer to the standard 256-color Furcadia palette (Legacy).

---

## 6. Pseudocode Tips

### The Sprite Index Footgun
In the Frame level (Level 4), the `c` tag is tricky. You must maintain a running `currentSubject` variable:
```python
current_id = 0
for i in range(sprite_layer_count):
    # read tags from stream
    if tag == 'c':
        current_id = read_u16()
    else:
        # If no 'c' tag in this layer, use previous ID + 1
        current_id += 1 
    
    layer.sprite_index = current_id - 1
```

### Implicit Shapes
If an Object block contains an `L` tag for Level 3 (Frames) instead of Level 2 (Shapes), you must create a **synthetic Shape** to hold those frames. This is common in wall assets where only one orientation is provided.

---

## 7. Known Edit Types

| Value | Name | Category |
| :--- | :--- | :--- |
| 1 | Floor | Floors |
| 2 | Item | Objects |
| 3 | Effect | Effects |
| 5 | Avatar | Characters |
| 8 | Wall | Walls |
| 14 | System | UI/Engine |
| 15 | Portal | Objects |

---

## 8. Development Gotchas & Footguns ⚠️

*   **Big Endian All the Way**: While many Furcadia formats use Little Endian, FOX5 uses **Big Endian** for all multi-byte integers in the command block and footer.
*   **The Layer "c" Increment**: This is the most common bug. If a Sprite Layer lacks a `c` tag, you **must** increment the previous layer's `imageID` by 1. The first layer in a frame defaults to `0` if no `c` is provided.
*   **Decryption Buffers**: When decrypting, never use the raw input buffer if you intend to reuse it (e.g. if it's a bundle member). The `xorFox` operation is often in-place.
*   **LZMA Headers**: The LZMA streams in FOX5 typically include standard LZMA headers (Properties + Dictionary Size + Uncompressed Size). They can usually be passed directly to standard LZMA decompressed.
*   **Empty Command Blocks**: Some files contain valid footers but empty command blocks (size 0). Your parser should handle this gracefully.
*   **Duplicate List Tags**: Occasionally, an Object will have two `L` tags for Shapes (Level 2). Standard behavior is to append to the shape list, not overwrite.
*   **Padding**: Valid files may contain `0x00` padding bytes between tags or before the first `L` tag. Always skip `0x00` when looking for the next tag ID.
