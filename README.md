# fast-png-parser

Fast, lightweight and memory efficient PNG chunk parser.

## Install

```sh
npm install --save fast-png-parser
```

## Usage

- Extract the first `tEXt` chunk without CRC check.

```javascript
import { open } from 'node:fs/promises';
import { extractPNG, parsePNG } from 'fast-png-parser';

const fh = await open('test.png', 'r');
const chunks = await extractPNG(fh, { filter: type => type === 'tEXt', maxChunks: 1 });
fh.close();

console.log(chunks.map(parsePNG));
```

It should be fast and memory efficient if you are only interested in the first `tEXt` chunk.

If you need to check CRC,

```javascript
import CRC32 from 'crc-32';

const calcCRC32 = (chunk) => CRC32.buf(Buffer.concat([Buffer.from(chunk.type), chunk.data]));

console.log(chunks.map(chunk => chunk.crc === calcCRC32(chunk)));
```

## Source code

- https://github.com/susumuota/fast-png-parser

## License

MIT License. See LICENSE file.

## Author

Susumu OTA
