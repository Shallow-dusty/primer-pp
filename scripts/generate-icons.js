// scripts/generate-icons.js — Generate placeholder PNG icons
// Run: node scripts/generate-icons.js

import { writeFileSync, mkdirSync } from 'fs';

// Minimal PNG encoder for solid-color square icons
function createPNG(size, r, g, b) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);  // width
    ihdr.writeUInt32BE(size, 4);  // height
    ihdr[8] = 8;   // bit depth
    ihdr[9] = 2;   // color type: RGB
    ihdr[10] = 0;  // compression
    ihdr[11] = 0;  // filter
    ihdr[12] = 0;  // interlace
    const ihdrChunk = makeChunk('IHDR', ihdr);

    // IDAT chunk — uncompressed deflate of raw pixel rows
    const rawRow = Buffer.alloc(1 + size * 3); // filter byte + RGB per pixel
    rawRow[0] = 0; // no filter
    for (let x = 0; x < size; x++) {
        rawRow[1 + x * 3] = r;
        rawRow[2 + x * 3] = g;
        rawRow[3 + x * 3] = b;
    }

    // Build uncompressed deflate stream
    const rowLen = rawRow.length;
    const totalRaw = rowLen * size;
    const blocks = [];
    const fullData = Buffer.alloc(totalRaw);
    for (let y = 0; y < size; y++) {
        rawRow.copy(fullData, y * rowLen);
    }

    // Split into 65535-byte blocks for deflate
    let offset = 0;
    while (offset < totalRaw) {
        const remaining = totalRaw - offset;
        const blockSize = Math.min(remaining, 65535);
        const isLast = (offset + blockSize >= totalRaw);
        const header = Buffer.alloc(5);
        header[0] = isLast ? 1 : 0;
        header.writeUInt16LE(blockSize, 1);
        header.writeUInt16LE(blockSize ^ 0xFFFF, 3);
        blocks.push(header);
        blocks.push(fullData.subarray(offset, offset + blockSize));
        offset += blockSize;
    }

    // Zlib wrapper: CMF + FLG + deflate blocks + Adler-32
    const adler = adler32(fullData);
    const cmf = Buffer.from([0x78, 0x01]); // deflate, no dict
    const adlerBuf = Buffer.alloc(4);
    adlerBuf.writeUInt32BE(adler, 0);

    const zlibData = Buffer.concat([cmf, ...blocks, adlerBuf]);
    const idatChunk = makeChunk('IDAT', zlibData);

    // IEND chunk
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
        }
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) {
        a = (a + buf[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

// Gemini-inspired teal: #1A73E8 → (26, 115, 232)
const COLOR = [26, 115, 232];

const outDir = 'src/platforms/extension/icons';
mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
    const png = createPNG(size, ...COLOR);
    writeFileSync(`${outDir}/icon-${size}.png`, png);
    console.log(`Created icon-${size}.png (${png.length} bytes)`);
}
