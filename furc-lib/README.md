# @furnarchy/furc-lib

A utility library for parsing Furcadia file formats and protocols.

## Features

- **FR01 Archives**: Extract files from Furcadia's modern container format.
- **Maps**: Parse `.map` files with support for all layers (floors, objects, walls, regions, effects, lighting, ambiance) and decryption.
- **FOX5**: Parse modern `.fox` (FOX5) assets with support for encryption and compressed sprite streams.
- **FSH/FSHX**: Parse legacy and modern `.fsh` assets (WIP/Untested).
- **DSB**: Parse DragonSpeak Binary (.dsb) files (WIP/Untested).
- **Compression**: Helper for LZMA and Bzip2 decompression used in Furcadia files.

## Installation

```bash
npm install @furnarchy/furc-lib
```

## Usage

```typescript
import { Fr01Archive, parseMap } from '@furnarchy/furc-lib';

// Parse an FR01 archive
const archive = new Fr01Archive(buffer);
const mapBuffer = await archive.getFile('map.map');

// Parse the map
const mapData = parseMap(mapBuffer);
console.log(`Map: ${mapData.name} (${mapData.width}x${mapData.height})`);
```

## License

MIT
