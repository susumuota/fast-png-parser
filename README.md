# fast-png-parser

Fast, lightweight and memory efficient PNG chunk parser.

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

## Source code

- https://github.com/susumuota/fast-png-parser

## License

MIT License. See LICENSE file.

## Author

Susumu OTA
