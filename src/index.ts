import type { FileHandle } from 'node:fs/promises';
import { Buffer } from 'node:buffer';


// FileHandle wrapper to maintain `position` variable and supply it to every `read` call
// https://stackoverflow.com/q/65571609
class FileHandleWrapper {
  fileHandle: FileHandle;
  position: number;

  constructor(fileHandle: FileHandle) {
    this.fileHandle = fileHandle;
    this.position = 0;
  }

  // https://nodejs.dev/en/api/v18/fs/#filehandlereadbuffer-offset-length-position
  async read(buffer: Buffer, offset: number, length: number) {
    const result = await this.fileHandle.read(buffer, offset, length, this.position);
    console.assert(result.bytesRead === length); // TODO: this assert will be fail if there is no IEND
    this.position += result.bytesRead;
    return result;
  }

  // https://en.cppreference.com/w/c/io/fseek
  seek(offset: number, origin: 'SEEK_SET' | 'SEEK_CUR') {
    if (origin === 'SEEK_SET') {
      this.position = offset;
    } else if (origin === 'SEEK_CUR') {
      this.position += offset;
    } else {
      throw new Error(`Unknown origin: ${origin}`);
    }
    return 0;
  }

  // https://en.cppreference.com/w/c/io/ftell
  tell() {
    return this.position;
  }
}

// https://datatracker.ietf.org/doc/html/rfc2083#page-77
// (hexadecimal)           89  50  4e  47  0d  0a  1a  0a
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type PNGChunkType = {
  position: number,
  length: number,
  type: string,
  data: Buffer,
  crc: number,
};

const extractPNG = async (fh: FileHandle, options?: { filter?: (type: string) => boolean, maxChunks?: number }): Promise<PNGChunkType[]> => {
  // FileHandle wrapper to keep position
  const fhw = new FileHandleWrapper(fh);

  // https://datatracker.ietf.org/doc/html/rfc2083#page-77
  // PNG file signature. 8 bytes
  const signatureBuf = Buffer.alloc(8);
  await fhw.read(signatureBuf, 0, 8);
  if (!PNG_SIGNATURE.equals(signatureBuf)) throw new Error(`Invalid PNG file signature: ${signatureBuf}`);

  // https://datatracker.ietf.org/doc/html/rfc2083#section-3
  // Chunk layout
  // Length:      4 bytes unsigned integer
  // Chunk Type:  4 bytes ascii letters
  // Chunk Data:  n bytes (specified by Length)
  // CRC:         4 bytes signed integer, including the chunk type code and chunk data fields
  const chunkLengthBuf = Buffer.alloc(4);
  const chunkTypeBuf = Buffer.alloc(4);
  const crcBuf = Buffer.alloc(4);
  let chunks: PNGChunkType[] = [];

  while (true) {
    // Length. A 4-byte unsigned integer.
    await fhw.read(chunkLengthBuf, 0, 4);
    const chunkLength = chunkLengthBuf.readUInt32BE();

    // Chunk Type. A 4-byte chunk type code.
    // IHDR must appear first and IEND must appear last
    await fhw.read(chunkTypeBuf, 0, 4);
    const chunkType = chunkTypeBuf.toString('ascii');

    if (options && options.filter && !options.filter(chunkType)) {
      // filter does not hit. skip this chunk
      fhw.seek(chunkLength + 4, 'SEEK_CUR');
    } else {
      // Chunk Data.
      const chunkDataBuf = Buffer.alloc(chunkLength);
      const position = fhw.tell();
      await fhw.read(chunkDataBuf, 0, chunkLength);

      // CRC. A 4-byte signed integer.
      await fhw.read(crcBuf, 0, 4);
      const crcValue = crcBuf.readInt32BE();

      chunks = [...chunks, { position, length: chunkLength, type: chunkType, data: chunkDataBuf, crc: crcValue }]

      // cutoff loop
      if (options && options.maxChunks && chunks.length >= options.maxChunks) break;
    }

    // TODO: if there is no IEND
    if (chunkType === 'IEND') break;
  }

  return chunks;
};

type PNG_IHDR_Type = {
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
  compressionMethod: number,
  filterMethod: number,
  interlaceMethod: number,
};

type PNG_PLTE_Type = {
  palette: number[][],
}

type PNG_IDAT_Type = {
  data: Buffer,
};

type PNG_IEND_Type = {
};

type PNG_tEXt_Type = {
  keyword: string,
  text: string,
};

const parsePNG = (chunk: PNGChunkType): PNG_IHDR_Type | PNG_PLTE_Type | PNG_IDAT_Type | PNG_IEND_Type | PNG_tEXt_Type => {
  const type = chunk.type;
  const data = chunk.data;
  if (type === 'IHDR') {
    // https://datatracker.ietf.org/doc/html/rfc2083#page-15
    // Width:              4 bytes
    // Height:             4 bytes
    // Bit depth:          1 byte
    // Color type:         1 byte
    // Compression method: 1 byte
    // Filter method:      1 byte
    // Interlace method:   1 byte
    console.assert(chunk.length === 13);
    const width = data.readUInt32BE(0);
    const height = data.readUInt32BE(4);
    const bitDepth = data.readUInt8(8);
    const colorType = data.readUInt8(9);
    const compressionMethod = data.readUInt8(10);
    const filterMethod = data.readUInt8(11);
    const interlaceMethod = data.readUInt8(12);
    return { width, height, bitDepth, colorType, compressionMethod, filterMethod, interlaceMethod } as PNG_IHDR_Type;
  } else if (type === 'PLTE') {
    // https://datatracker.ietf.org/doc/html/rfc2083#page-17
    // Red:   1 byte (0 = black, 255 = red)
    // Green: 1 byte (0 = black, 255 = green)
    // Blue:  1 byte (0 = black, 255 = blue)
    console.assert(chunk.length % 3 === 0);
    const palette = [...Array(chunk.length / 3).keys()].map(i => {
      const red = data.readUInt8(3 * i);
      const green = data.readUInt8(3 * i + 1);
      const blue = data.readUInt8(3 * i + 2);
      return [red, green, blue];
    });
    return { palette } as PNG_PLTE_Type;
  } else if (type === 'IDAT') {
    // https://datatracker.ietf.org/doc/html/rfc2083#page-18
    return { data } as PNG_IDAT_Type;
  } else if (type === 'IEND') {
    // https://datatracker.ietf.org/doc/html/rfc2083#page-19
    return {} as PNG_IEND_Type;
  } else if (type === 'tEXt') {
    // https://datatracker.ietf.org/doc/html/rfc2083#page-24
    // Keyword:        1-79 bytes (character string)
    // Null separator: 1 byte
    // Text:           n bytes (character string)
    const nullPos = data.indexOf(0x00);
    console.assert(nullPos < 80);
    const keyword = data.subarray(0, nullPos).toString();
    const text = data.subarray(nullPos + 1).toString();
    return { keyword, text } as PNG_tEXt_Type;
  } else {
    // TODO: parse other chunk types
    return { data } as PNG_IDAT_Type;
  }
};

export {
  extractPNG,
  parsePNG,
  PNGChunkType,
  PNG_IHDR_Type,
  PNG_PLTE_Type,
  PNG_IDAT_Type,
  PNG_IEND_Type,
  PNG_tEXt_Type,
};
