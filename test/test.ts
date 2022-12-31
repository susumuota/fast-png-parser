import test from 'node:test';
import assert from 'node:assert/strict';
import { open } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import CRC32 from 'crc-32';

import { extractPNG, parsePNG, PNGChunkType, PNG_IHDR_Type, PNG_tEXt_Type } from '../dist/index.js';

// download `ct1n0g04.png` from  http://www.libpng.org/pub/png/PngSuite/ct1n0g04.png

const calcCRC32 = (chunk: PNGChunkType) => CRC32.buf(Buffer.concat([Buffer.from(chunk.type), chunk.data]));

test('test extractPNG', async (_) => {
  const fh = await open('ct1n0g04.png', 'r');
  const chunks = await extractPNG(fh);
  fh.close();
  assert.strictEqual(chunks.length, 10);
  if (!chunks[0] || !chunks[9]) return;
  assert.strictEqual(chunks[0].position, 16);
  assert.strictEqual(chunks[0].length, 13);
  assert.strictEqual(chunks[0].type, 'IHDR');
  assert.deepStrictEqual(chunks[0].data, Buffer.from([0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20, 0x04, 0x00, 0x00, 0x00, 0x00]));
  assert.strictEqual(chunks[0].crc, -1813919703);
  assert.strictEqual(chunks[0].crc, calcCRC32(chunks[0]));
  assert.strictEqual(chunks[9].position, 788);
  assert.strictEqual(chunks[9].length, 0);
  assert.strictEqual(chunks[9].type, 'IEND');
  assert.deepStrictEqual(chunks[9].data, Buffer.from([]));
  assert.strictEqual(chunks[9].crc, -1371381630);
  assert.strictEqual(chunks[9].crc, calcCRC32(chunks[9]));
});

test('test filter of extractPNG', async (_) => {
  const fh = await open('ct1n0g04.png', 'r');
  const chunks = await extractPNG(fh, { filter: type => ['IHDR', 'tEXt'].includes(type) });
  fh.close();
  assert.strictEqual(chunks.length, 7);
  assert.strictEqual(chunks.filter(chunk => chunk.type === 'IHDR').length, 1);
  assert.strictEqual(chunks.filter(chunk => chunk.type === 'tEXt').length, 6);
});

test('test maxChunks of extractPNG', async (_) => {
  const fh = await open('ct1n0g04.png', 'r');
  const chunks = await extractPNG(fh, { maxChunks: 3 });
  fh.close();
  assert.strictEqual(chunks.length, 3);
  if (!chunks[0] || !chunks[1] || !chunks[2]) return;
  assert.strictEqual(chunks[0].type, 'IHDR');
  assert.strictEqual(chunks[1].type, 'gAMA');
  assert.strictEqual(chunks[2].type, 'tEXt');
});

test('test parsePNG', async (_) => {
  const fh = await open('ct1n0g04.png', 'r');
  const chunks = await extractPNG(fh);
  fh.close();
  assert.strictEqual(chunks.length, 10);
  if (!chunks[0] || !chunks[2]) return;
  const ihdr = parsePNG(chunks[0]) as PNG_IHDR_Type;
  assert.strictEqual(ihdr.width, 32);
  assert.strictEqual(ihdr.height, 32);
  const text = parsePNG(chunks[2]) as PNG_tEXt_Type;
  assert.strictEqual(text.keyword, 'Title');
  assert.strictEqual(text.text, 'PngSuite');
});
