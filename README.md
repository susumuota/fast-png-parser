# fast-png-parser

[![npm](https://img.shields.io/npm/v/fast-png-parser?color=blue)](https://www.npmjs.com/package/fast-png-parser)
[![npm bundle size](https://img.shields.io/bundlephobia/min/fast-png-parser)](https://github.com/susumuota/fast-png-parser)
[![GitHub](https://img.shields.io/github/license/susumuota/fast-png-parser)](https://github.com/susumuota/fast-png-parser/blob/main/LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/susumuota/fast-png-parser/build.yaml)](https://github.com/susumuota/fast-png-parser/actions/workflows/build.yaml)
[![GitHub last commit](https://img.shields.io/github/last-commit/susumuota/fast-png-parser)](https://github.com/susumuota/fast-png-parser/commits)

Fast, lightweight and memory efficient PNG chunk parser.

## Install

```sh
npm install --save fast-png-parser
```

## Usage

- Extract the image `width` and `height`.

It should be fast and memory efficient because `extractPNG` returns immediately just after the `IHDR` chunk. It must be the first chunk of PNG file so that you can skip all of the rest of chunks.

```javascript
import { open } from 'node:fs/promises';
import { extractPNG, parsePNG } from 'fast-png-parser';

const fh = await open('test.png', 'r');
const chunks = await extractPNG(fh, { filter: type => type === 'IHDR', maxChunks: 1 });
fh.close();

if (chunks[0]) {
  const ihdr = parsePNG(chunks[0]);
  console.log(ihdr.width, ihdr.height);
}
```

- Extract the first `tEXt` chunk.

It should be fast and memory efficient because `extractPNG` returns immediately just after the first `tEXt` chunk. In most cases, `tEXt` chunks appear before `IDAT` chunks so that you can skip to read large `IDAT` chunks.

```javascript
import { open } from 'node:fs/promises';
import { extractPNG, parsePNG } from 'fast-png-parser';

const fh = await open('test.png', 'r');
const chunks = await extractPNG(fh, { filter: type => type === 'tEXt', maxChunks: 1 });
fh.close();

if (chunks[0]) {
  const text = parsePNG(chunks[0]);
  console.log(text.keyword, text.text);
}
```

- CRC check

If you need to check CRC, install `crc-32` module and create `calcCRC32` function to check CRC.

```javascript
import { open } from 'node:fs/promises';
import { extractPNG, parsePNG } from 'fast-png-parser';
import CRC32 from 'crc-32';

const calcCRC32 = chunk => CRC32.buf(Buffer.concat([Buffer.from(chunk.type), chunk.data]));

const fh = await open('test.png', 'r');
const chunks = await extractPNG(fh);
fh.close();

console.log(chunks.map(chunk => chunk.crc === calcCRC32(chunk)));
```

## Source code

- https://github.com/susumuota/fast-png-parser

## License

MIT License. See LICENSE file.

## Author

Susumu OTA
