import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [245, 241, 230];
const INK: RGB = [20, 20, 20];
const RED: RGB = [176, 58, 46];
const GRAY: RGB = [96, 92, 84];
const PANEL: RGB = [237, 230, 214];
const BLUE: RGB = [38, 74, 120];
const GOLD: RGB = [196, 144, 44];

function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
}

function frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) set(x, y, c);
    }
}

const GLYPH: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#...', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

function textW(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = GLYPH[ch] ?? GLYPH['?'];
    for (let r = 0; r < 7; r++)
      for (let col = 0; col < 5; col++)
        if (g[r][col] === '#') rect(cx + col * scale, y + r * scale, scale, scale, c);
    cx += 6 * scale;
  }
}

function centered(y: number, s: string, scale: number, c: RGB): void {
  drawText(Math.floor((W - textW(s, scale)) / 2), y, s, scale, c);
}

function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line === '' ? w : line + ' ' + w;
    if (textW(next, scale) <= maxW || line === '') line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

function block(x: number, y: number, s: string, scale: number, maxW: number, c: RGB, leading: number): number {
  let yy = y;
  for (const ln of wrap(s, scale, maxW)) {
    drawText(x, yy, ln, scale, c);
    yy += leading;
  }
  return yy;
}

rect(0, 0, W, H, PAPER);
frame(18, 18, W - 36, H - 36, INK, 3);
frame(28, 28, W - 56, H - 56, INK, 1);

centered(48, 'THE WORLD TODAY', 10, INK);
centered(132, 'THURSDAY 26 NOVEMBER 2026', 3, RED);
rect(60, 164, W - 120, 4, RED);
rect(60, 174, W - 120, 2, INK);

let y = block(64, 196, "FIRST FOREIGN ASTRONAUT JOINS CHINA'S TIANGONG", 6, W - 128, INK, 52);
y = block(64, y + 4, "PAKISTAN'S MUHAMMAD ZEESHAN ALI RIDES SHENZHOU-24 TO THE STATION", 3, W - 128, GRAY, 26);

rect(64, y + 10, W - 128, 190, PANEL);
frame(64, y + 10, W - 128, 190, INK, 2);
disc(300, y + 105, 62, BLUE);
disc(278, y + 84, 16, GOLD);
disc(322, y + 122, 12, GOLD);
rect(560, y + 70, 180, 26, INK);
rect(620, y + 40, 26, 86, INK);
rect(500, y + 78, 60, 10, RED);
rect(740, y + 78, 60, 10, RED);
disc(633, y + 83, 9, GOLD);
for (let i = 0; i < 40; i++) set(120 + ((i * 173) % 780), y + 24 + ((i * 97) % 150), INK);
y = y + 10 + 190 + 22;

const stories: Array<[string, string]> = [
  ['BANGLADESH GARMENT WAGES UP 36%', 'ENTRY-LEVEL PAY RISES FOR MILLIONS OF WORKERS'],
  ['NORTH KOREA ORDERS SWISS OFFICE CLOSED', 'PYONGYANG DIRECTS DIPLOMATS TO SHUT NEW POST'],
  ['INDIA MARKS CONSTITUTION DAY', 'NATION ALSO REMEMBERS 26/11 MUMBAI VICTIMS'],
  ['GUKESH FACES SINDAROV', 'WORLD CHESS TITLE MATCH UNDER WAY IN GENEVA'],
  ['ASTEROID TEST SHOWS NEW CRATER', 'DEFENCE MISSION IMAGES REVEAL IMPACT SCAR'],
  ['COLOMBIA MARKS TEN YEARS OF PEACE', 'UN PRAISES PROGRESS, WARNS WORK REMAINS'],
];

const colW = 284;
for (let i = 0; i < stories.length; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 64 + col * (colW + 22);
  const top = y + row * 168;
  rect(x, top, colW, 3, RED);
  let yy = block(x, top + 12, stories[i][0], 3, colW, INK, 25);
  block(x, yy + 4, stories[i][1], 2, colW, GRAY, 17);
}

rect(60, H - 92, W - 120, 2, INK);
centered(H - 76, "ALL THE DAY'S NEWS IN ONE IMAGE", 3, INK);

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const raw = new Uint8Array(H * (1 + W * 3));
for (let yy = 0; yy < H; yy++) {
  raw[yy * (1 + W * 3)] = 0;
  raw.set(px.subarray(yy * W * 3, (yy + 1) * W * 3), yy * (1 + W * 3) + 1);
}

const ihdr = new Uint8Array(13);
const ihdrView = new DataView(ihdr.buffer);
ihdrView.setUint32(0, W);
ihdrView.setUint32(4, H);
ihdr[8] = 8;
ihdr[9] = 2;

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const parts = [signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))];
const png = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
let offset = 0;
for (const p of parts) {
  png.set(p, offset);
  offset += p.length;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(outDir + '/entry.png', png);
