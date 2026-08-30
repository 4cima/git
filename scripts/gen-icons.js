// Generates: public/icons/icon-192x192.png, icon-512x512.png, apple-touch-icon.png (180)
// Design: black square, gold circle #E8A317, black geometric "4". No external deps.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const GOLD = [232, 163, 23]
const BLACK = [0, 0, 0]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function writePng(file, size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px[y * size + x]
      const o = row + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(file, png)
  console.log('wrote', file, png.length, 'bytes')
}

const SS = 4 // supersample factor
function inCircle(dx, dy, r) { return dx * dx + dy * dy <= r * r }
function nearSeg(px, py, x1, y1, x2, y2, w) {
  const vx = x2 - x1, vy = y2 - y1
  const wx = px - x1, wy = py - y1
  const L2 = vx * vx + vy * vy
  let t = L2 ? (wx * vx + wy * vy) / L2 : 0
  t = Math.max(0, Math.min(1, t))
  const dx = px - (x1 + t * vx), dy = py - (y1 + t * vy)
  return dx * dx + dy * dy <= (w / 2) * (w / 2)
}
function render(size) {
  const px = new Array(size * size)
  const S = size * SS
  const c = S / 2, R = S * 0.46
  const sw = S * 0.085
  const diag = [S * 0.55, S * 0.20, S * 0.30, S * 0.60]
  const bar = [S * 0.26, S * 0.60, S * 0.74, S * 0.60]
  const vert = [S * 0.62, S * 0.18, S * 0.62, S * 0.84]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let gold = 0, four = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x * SS + sx + 0.5, fy = y * SS + sy + 0.5
          if (inCircle(fx - c, fy - c, R)) {
            gold++
            if (nearSeg(fx, fy, ...diag, sw) || nearSeg(fx, fy, ...bar, sw) || nearSeg(fx, fy, ...vert, sw)) four++
          }
        }
      }
      const total = SS * SS
      if (four > 0) {
        // blend black "4" over gold over black bg
        const a4 = four / total
        const ag = (gold - four) / total
        const mix = (i) => Math.round(BLACK[i] * a4 + GOLD[i] * ag + BLACK[i] * (1 - gold / total))
        px[y * size + x] = [mix(0), mix(1), mix(2)]
      } else if (gold > 0) {
        const a = gold / total
        px[y * size + x] = [
          Math.round(GOLD[0] * a + BLACK[0] * (1 - a)),
          Math.round(GOLD[1] * a + BLACK[1] * (1 - a)),
          Math.round(GOLD[2] * a + BLACK[2] * (1 - a)),
        ]
      } else px[y * size + x] = BLACK
    }
  }
  return px
}

const out = path.join(__dirname, '..', 'public', 'icons')
for (const [name, size] of [['icon-192x192.png', 192], ['icon-512x512.png', 512], ['apple-touch-icon.png', 180]]) {
  writePng(path.join(out, name), size, render(size))
}
