// Run from any directory: node frontend/scripts/generate-favicon.mjs
// The navigation mark is the source for both browser icon formats.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../public/brand/tutorme-mark.svg", import.meta.url));
await writeFile(new URL("../app/icon.svg", import.meta.url), source);
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((png, index) => {
  const entry = 6 + 16 * index;
  header[entry] = sizes[index];
  header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([header, ...images]));
