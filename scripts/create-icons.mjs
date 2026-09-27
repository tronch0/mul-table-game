import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
const icon = await readFile('public/favicon.svg')
for (const size of [192, 512]) await sharp(icon).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
await sharp(icon).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
await sharp({create: {width: 512, height: 512, channels: 4, background: '#087f73'}}).composite([{input: await sharp(icon).resize(320,320).png().toBuffer()}]).png().toFile('public/icons/maskable-512.png')
