/**
 * Poster pipeline: Met Open Access (CC0) image → 4:5 crop → greyscale → contrast → riso duotone
 * (ink-deep → ink → paper) → WebP 720×900 under 100 KB.
 * Reads src/posters/posters.json (needs `metId`), caches originals in scripts/.poster-cache.
 * Run: npm run posters
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const W = 720, H = 900, MAX_BYTES = 100 * 1024
const CACHE = new URL('./.poster-cache/', import.meta.url)
const OUT = new URL('../src/posters/img/', import.meta.url)
const CONFIG = new URL('../src/posters/posters.json', import.meta.url)
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })

type RGB = [number, number, number]
const INK_DEEP: RGB = [0x14, 0x20, 0x4a], INK: RGB = [0x1f, 0x3b, 0xd6], PAPER: RGB = [0xf4, 0xee, 0xe2]
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB

// 256-entry lookup: shadows ink-deep, mids ink, highlights paper.
const LUT: RGB[] = Array.from({ length: 256 }, (_, l) => (l < 120 ? mix(INK_DEEP, INK, l / 120) : mix(INK, PAPER, Math.min(1, (l - 120) / 110))))

async function original(metId: number): Promise<Buffer> {
  const file = new URL(`${metId}.jpg`, CACHE)
  if (!existsSync(file)) {
    const meta = await (await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${metId}`)).json() as { isPublicDomain: boolean; primaryImage: string }
    if (!meta.isPublicDomain || !meta.primaryImage) throw new Error(`Met object ${metId} is not public domain / has no image`)
    const img = await fetch(meta.primaryImage, { headers: { 'User-Agent': 'downstairs-poster-pipeline' } })
    writeFileSync(file, Buffer.from(await img.arrayBuffer()))
  }
  return readFileSync(file)
}

const posters = JSON.parse(readFileSync(CONFIG, 'utf8')) as { id: string; metId: number; image: string }[]
for (const p of posters) {
  const grey = await sharp(await original(p.metId))
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .greyscale()
    .normalise({ lower: 2, upper: 98 })
    .linear(1.18, -18)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const rgb = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    const c = LUT[Math.max(0, Math.min(255, grey.data[i]))]
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
  }
  let q = 86, buf = Buffer.alloc(0)
  for (; q >= 30; q -= 4) {
    buf = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: q, effort: 6 }).toBuffer()
    if (buf.length <= MAX_BYTES) break
  }
  writeFileSync(new URL(p.image, OUT), buf)
  console.log(`${p.id.padEnd(22)} q${q}  ${(buf.length / 1024).toFixed(0)} KB`)
}
