/// <reference types="node" />
import type { FileHandle } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
type PNGChunkType = {
    position: number;
    length: number;
    type: string;
    data: Buffer;
    crc: number;
};
declare const extractPNG: (fh: FileHandle, options?: {
    filter?: (type: string) => boolean;
    maxChunks?: number;
} | undefined) => Promise<PNGChunkType[]>;
type PNG_IHDR_Type = {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
    compressionMethod: number;
    filterMethod: number;
    interlaceMethod: number;
};
type PNG_PLTE_Type = {
    palette: number[][];
};
type PNG_IDAT_Type = {
    data: Buffer;
};
type PNG_IEND_Type = {};
type PNG_tEXt_Type = {
    keyword: string;
    text: string;
};
declare const parsePNG: (chunk: PNGChunkType) => PNG_IHDR_Type | PNG_PLTE_Type | PNG_IDAT_Type | PNG_IEND_Type | PNG_tEXt_Type;
export { extractPNG, parsePNG, PNGChunkType, PNG_IHDR_Type, PNG_PLTE_Type, PNG_IDAT_Type, PNG_IEND_Type, PNG_tEXt_Type, };
