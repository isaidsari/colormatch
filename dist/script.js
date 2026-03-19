// src/balls.ts
var spriteCache = new Map;
var SPRITE_PAD = 6;
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
}
function hslFromRgb(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    switch (mx) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}
function getSprite(color, radius) {
  const key = `${color}_${radius}`;
  let cached = spriteCache.get(key);
  if (cached)
    return cached;
  const size = (radius + SPRITE_PAD) * 2;
  const oc = new OffscreenCanvas(size, size);
  const ctx = oc.getContext("2d");
  const cx = radius + SPRITE_PAD;
  const cy = cx;
  const r = radius;
  const rgb = hexToRgb(color);
  const [h, s, l] = hslFromRgb(rgb[0], rgb[1], rgb[2]);
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 3, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 0.5, cy + 1.5, r + 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx + r * 0.08, cy + r * 0.12, r * 1.05);
  grad.addColorStop(0, `hsl(${h},${Math.min(100, s + 5)}%,${Math.min(88, l + 22)}%)`);
  grad.addColorStop(0.45, color);
  grad.addColorStop(0.85, `hsl(${h},${Math.min(100, s + 5)}%,${Math.max(12, l - 16)}%)`);
  grad.addColorStop(1, `hsl(${h},${Math.min(100, s + 8)}%,${Math.max(8, l - 26)}%)`);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  const hl = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.26, 0, cx - r * 0.08, cy - r * 0.1, r * 0.5);
  hl.addColorStop(0, "rgba(255,255,255,0.4)");
  hl.addColorStop(0.6, "rgba(255,255,255,0.08)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hl;
  ctx.fill();
  spriteCache.set(key, oc);
  return oc;
}
var PERSONALITIES = [
  { mouth: "smirk", lookBias: 0 },
  { mouth: "open", lookBias: 0 },
  { mouth: "grin", lookBias: 0 },
  { mouth: "smug", lookBias: 0.5 },
  { mouth: "flat", lookBias: -0.3 },
  { mouth: "worried", lookBias: 0 }
];
var _faceTime = 0;
function updateFaceTime(dt) {
  _faceTime += dt;
}
function drawFace(ctx, x, y, r, colorIndex, state) {
  const t = _faceTime;
  const p = PERSONALITIES[colorIndex] ?? PERSONALITIES[0];
  const span = r * 0.32;
  const eyeY = -r * 0.15;
  const dotR = r * 0.09;
  const blink = Math.sin(t * 1.7 + colorIndex * 1.4) > 0.93;
  const lx = state === "scared" ? Math.sin(t * 7 + colorIndex) * 3 : (Math.sin(t * 0.7 + colorIndex * 0.8) + p.lookBias) * 1.5;
  const ly = state === "scared" ? -1 : Math.cos(t * 0.6 + colorIndex) * 0.5;
  ctx.save();
  ctx.translate(x, y);
  for (const side of [-1, 1]) {
    const ex = side * span;
    if (state === "scared") {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, eyeY, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(30,20,15,0.25)";
      ctx.lineWidth = r * 0.015;
      ctx.beginPath();
      ctx.arc(ex, eyeY, r * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#1a1612";
      ctx.beginPath();
      ctx.arc(ex + lx * 0.5, eyeY + ly, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(ex + lx * 0.5 - r * 0.02, eyeY + ly - r * 0.025, r * 0.025, 0, Math.PI * 2);
      ctx.fill();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - dotR * 1.2, eyeY);
      ctx.lineTo(ex + dotR * 1.2, eyeY);
      ctx.strokeStyle = "#1a1612";
      ctx.lineWidth = r * 0.04;
      ctx.lineCap = "round";
      ctx.stroke();
    } else {
      ctx.fillStyle = "#1a1612";
      ctx.beginPath();
      ctx.arc(ex + lx * 0.3, eyeY + ly * 0.3, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(ex + lx * 0.3 - dotR * 0.3, eyeY + ly * 0.3 - dotR * 0.35, dotR * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const my = r * 0.3;
  ctx.strokeStyle = "#1a1612";
  ctx.lineWidth = r * 0.04;
  ctx.lineCap = "round";
  if (state === "scared") {
    ctx.beginPath();
    ctx.arc(0, my + r * 0.06, r * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1612";
    ctx.fill();
  } else if (state === "selected") {
    ctx.beginPath();
    ctx.arc(0, my + r * 0.02, r * 0.17, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else {
    switch (p.mouth) {
      case "smirk":
        ctx.beginPath();
        ctx.moveTo(-r * 0.13, my);
        ctx.quadraticCurveTo(r * 0.02, my + r * 0.1, r * 0.16, my - r * 0.02);
        ctx.stroke();
        break;
      case "open":
        ctx.beginPath();
        ctx.ellipse(0, my + r * 0.03, r * 0.09, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1612";
        ctx.fill();
        break;
      case "grin":
        ctx.beginPath();
        ctx.arc(0, my, r * 0.16, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;
      case "smug":
        ctx.beginPath();
        ctx.moveTo(-r * 0.06, my + r * 0.01);
        ctx.lineTo(r * 0.16, my - r * 0.02);
        ctx.stroke();
        break;
      case "flat":
        ctx.beginPath();
        ctx.moveTo(-r * 0.12, my + r * 0.01);
        ctx.lineTo(r * 0.12, my + r * 0.01);
        ctx.stroke();
        break;
      case "worried":
        ctx.beginPath();
        ctx.arc(0, my + r * 0.16, r * 0.13, Math.PI + 0.35, Math.PI * 2 - 0.35);
        ctx.stroke();
        break;
    }
  }
  if (state === "scared") {
    const dt = (t * 2.5 + colorIndex * 0.7) % 1.8;
    if (dt <= 1) {
      ctx.globalAlpha = (1 - dt) * 0.5;
      ctx.fillStyle = "#aed6f1";
      const dx = r * 0.52;
      const dy = -r * 0.1 + dt * r * 0.4;
      ctx.beginPath();
      ctx.moveTo(dx, dy - r * 0.1);
      ctx.quadraticCurveTo(dx + r * 0.05, dy + r * 0.02, dx, dy + r * 0.05);
      ctx.quadraticCurveTo(dx - r * 0.05, dy + r * 0.02, dx, dy - r * 0.1);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

class Ball {
  x;
  y;
  radius;
  color;
  targetX;
  targetY;
  scale = 1;
  targetScale = 1;
  row = 0;
  col = 0;
  colorIndex = 0;
  faceState = "idle";
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.targetX = x;
    this.targetY = y;
  }
  update(speed = 0.3) {
    let moving = false;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      this.x += dx * speed;
      this.y += dy * speed;
      moving = true;
    } else {
      this.x = this.targetX;
      this.y = this.targetY;
    }
    const ds = this.targetScale - this.scale;
    if (Math.abs(ds) > 0.01) {
      this.scale += ds * 0.35;
      moving = true;
    } else {
      this.scale = this.targetScale;
    }
    return moving;
  }
  draw(ctx) {
    if (this.scale < 0.02)
      return;
    const s = this.scale;
    const sprite = getSprite(this.color, this.radius);
    const sw = sprite.width;
    const sh = sprite.height;
    const dw = sw * s;
    const dh = sh * s;
    ctx.drawImage(sprite, this.x - dw / 2, this.y - dh / 2, dw, dh);
    if (s > 0.3) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(s, s);
      ctx.translate(-this.x, -this.y);
      drawFace(ctx, this.x, this.y, this.radius, this.colorIndex, this.faceState);
      ctx.restore();
    }
  }
  drawSelected(ctx) {
    const r = this.radius * this.scale + 4;
    const t = _faceTime;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.lineDashOffset = -t * 20;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  clone() {
    const b = new Ball(this.x, this.y, this.radius, this.color);
    b.targetX = this.targetX;
    b.targetY = this.targetY;
    b.row = this.row;
    b.col = this.col;
    b.scale = this.scale;
    b.targetScale = this.targetScale;
    b.colorIndex = this.colorIndex;
    b.faceState = this.faceState;
    return b;
  }
}

// src/particle.ts
class Particle {
  x;
  y;
  vx;
  vy;
  radius;
  color;
  life = 1;
  decay;
  constructor(x, y, vx, vy, radius, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.decay = 0.025 + Math.random() * 0.03;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.12;
    this.life -= this.decay;
    this.radius *= 0.95;
    return this.life > 0 && this.radius > 0.3;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    const s = this.radius * 2;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    ctx.restore();
  }
}

class ScorePopup {
  x;
  y;
  text;
  color;
  life = 1;
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
  }
  update() {
    this.y -= 1.2;
    this.life -= 0.025;
    return this.life > 0;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.font = 'bold 14px "Space Mono", "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// src/game.ts
var COLORS = [
  "#E74C3C",
  "#F1C40F",
  "#2ECC71",
  "#3498DB",
  "#9B59B6",
  "#E67E22"
];
function colorToIndex(color) {
  const idx = COLORS.indexOf(color);
  return idx >= 0 ? idx : 0;
}

class Game {
  canvas;
  ctx;
  grid = [];
  rows = 12;
  cols = 8;
  cellSize = 44;
  ballRadius = 18;
  offsetX;
  offsetY;
  state = 4 /* FALL_ANIM */;
  dragging = null;
  dragOrigin = null;
  swap1 = null;
  swap2 = null;
  swapIsReverse = false;
  animId = 0;
  particles = [];
  popups = [];
  score = 0;
  combo = 0;
  highScore = 0;
  elScore;
  elCombo;
  elHigh;
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.offsetX = (canvas.width - (this.cols - 1) * this.cellSize) / 2;
    this.offsetY = (canvas.height - (this.rows - 1) * this.cellSize) / 2;
    this.elScore = document.getElementById("score");
    this.elCombo = document.getElementById("combo");
    this.elHigh = document.getElementById("high-score");
    this.highScore = parseInt(localStorage.getItem("colormatch-hs") || "0");
    this.bindEvents();
    this.init();
  }
  init() {
    cancelAnimationFrame(this.animId);
    this.score = 0;
    this.combo = 0;
    this.particles = [];
    this.popups = [];
    this.state = 4 /* FALL_ANIM */;
    this.buildGrid();
    this.purgeInitialMatches();
    this.cascadeEntrance();
    this.updateUI();
    this.animId = requestAnimationFrame(this.tick);
  }
  restart() {
    this.init();
  }
  pos(r, c) {
    return {
      x: this.offsetX + c * this.cellSize,
      y: this.offsetY + r * this.cellSize
    };
  }
  cell(px, py) {
    const c = Math.round((px - this.offsetX) / this.cellSize);
    const r = Math.round((py - this.offsetY) / this.cellSize);
    if (r >= 0 && r < this.rows && c >= 0 && c < this.cols)
      return { r, c };
    return null;
  }
  rndColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  buildGrid() {
    this.grid = [];
    for (let r = 0;r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0;c < this.cols; c++) {
        const p = this.pos(r, c);
        const color = this.rndColor();
        const b = new Ball(p.x, p.y, this.ballRadius, color);
        b.row = r;
        b.col = c;
        b.colorIndex = colorToIndex(color);
        this.grid[r][c] = b;
      }
    }
  }
  purgeInitialMatches() {
    for (let i = 0;i < 200; i++) {
      const m = this.findMatches();
      if (m.length === 0)
        break;
      for (const g of m)
        for (const b of g) {
          b.color = this.rndColor();
          b.colorIndex = colorToIndex(b.color);
        }
    }
  }
  cascadeEntrance() {
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        b.y = b.targetY - this.canvas.height - r * 20 - Math.random() * 10;
      }
    }
  }
  findMatches() {
    const matches = [];
    for (let r = 0;r < this.rows; r++) {
      let run = [this.grid[r][0]];
      for (let c = 1;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (b.color === run[0].color) {
          run.push(b);
        } else {
          if (run.length >= 3)
            matches.push(run);
          run = [b];
        }
      }
      if (run.length >= 3)
        matches.push(run);
    }
    for (let c = 0;c < this.cols; c++) {
      let run = [this.grid[0][c]];
      for (let r = 1;r < this.rows; r++) {
        const b = this.grid[r][c];
        if (b.color === run[0].color) {
          run.push(b);
        } else {
          if (run.length >= 3)
            matches.push(run);
          run = [b];
        }
      }
      if (run.length >= 3)
        matches.push(run);
    }
    return matches;
  }
  processMatches() {
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.combo = 0;
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++)
          this.grid[r][c].faceState = "idle";
      this.state = 0 /* IDLE */;
      this.updateUI();
      return;
    }
    this.combo++;
    const set = new Set;
    for (const g of matches)
      for (const b of g)
        set.add(b);
    const pts = set.size * 10 * this.combo;
    this.score += pts;
    for (const b of set) {
      b.faceState = "scared";
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("colormatch-hs", String(this.highScore));
    }
    let sumX = 0, sumY = 0;
    for (const b of set) {
      this.spawnBurst(b.x, b.y, b.color, 6);
      b.targetScale = 0;
      sumX += b.x;
      sumY += b.y;
    }
    const cx = sumX / set.size;
    const cy = sumY / set.size;
    const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
    this.popups.push(new ScorePopup(cx, cy - 10, label, "#fff"));
    this.updateUI();
    this.state = 3 /* BREAK_ANIM */;
  }
  gravity() {
    for (let c = 0;c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1;r >= 0; r--) {
        const b = this.grid[r][c];
        if (b.targetScale > 0.5) {
          if (r !== write) {
            this.grid[write][c] = b;
            this.grid[r][c] = null;
            b.row = write;
            b.col = c;
            const p = this.pos(write, c);
            b.targetX = p.x;
            b.targetY = p.y;
          }
          write--;
        }
      }
      for (let r = write;r >= 0; r--) {
        const p = this.pos(r, c);
        const startY = -this.ballRadius * 2 - (write - r) * this.cellSize;
        const nb = new Ball(p.x, startY, this.ballRadius, this.rndColor());
        nb.colorIndex = colorToIndex(nb.color);
        nb.targetX = p.x;
        nb.targetY = p.y;
        nb.row = r;
        nb.col = c;
        nb.scale = 0.6;
        nb.targetScale = 1;
        this.grid[r][c] = nb;
      }
    }
    this.state = 4 /* FALL_ANIM */;
  }
  spawnBurst(x, y, color, n) {
    for (let i = 0;i < n; i++) {
      const a = Math.PI * 2 * i / n + Math.random() * 0.4;
      const spd = 2.5 + Math.random() * 3;
      this.particles.push(new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 2 + Math.random() * 4, color));
    }
  }
  bindEvents() {
    const cv = this.canvas;
    cv.style.cursor = "grab";
    cv.addEventListener("mousedown", (e) => this.onDown(this.mouseXY(e)));
    cv.addEventListener("mousemove", (e) => this.onMove(this.mouseXY(e)));
    cv.addEventListener("mouseup", (e) => this.onUp(this.mouseXY(e)));
    cv.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.onDown(this.touchXY(e));
    }, { passive: false });
    cv.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.onMove(this.touchXY(e));
    }, { passive: false });
    cv.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.onUp(this.touchXY(e));
    }, { passive: false });
  }
  mouseXY(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / r.width;
    const sy = this.canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  touchXY(e) {
    const t = e.touches[0] || e.changedTouches[0];
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / r.width;
    const sy = this.canvas.height / r.height;
    return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
  }
  onDown(p) {
    if (this.state !== 0 /* IDLE */)
      return;
    const c = this.cell(p.x, p.y);
    if (!c)
      return;
    this.dragging = this.grid[c.r][c.c];
    this.dragging.faceState = "selected";
    this.dragOrigin = { x: this.dragging.targetX, y: this.dragging.targetY };
    this.state = 1 /* DRAGGING */;
    this.canvas.style.cursor = "grabbing";
  }
  onMove(p) {
    if (this.state !== 1 /* DRAGGING */ || !this.dragging)
      return;
    this.dragging.x = p.x;
    this.dragging.y = p.y;
  }
  onUp(p) {
    if (this.state !== 1 /* DRAGGING */ || !this.dragging)
      return;
    this.canvas.style.cursor = "grab";
    this.dragging.faceState = "idle";
    const b = this.dragging;
    const o = this.dragOrigin;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    b.x = b.targetX;
    b.y = b.targetY;
    let { row: tr, col: tc } = b;
    if (Math.abs(dx) > this.cellSize * 0.25 || Math.abs(dy) > this.cellSize * 0.25) {
      if (Math.abs(dx) > Math.abs(dy)) {
        tc += dx > 0 ? 1 : -1;
      } else {
        tr += dy > 0 ? 1 : -1;
      }
    }
    this.dragging = null;
    this.dragOrigin = null;
    if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && (tr !== b.row || tc !== b.col)) {
      this.beginSwap(b, this.grid[tr][tc]);
    } else {
      this.state = 0 /* IDLE */;
    }
  }
  beginSwap(a, b) {
    this.swap1 = a;
    this.swap2 = b;
    this.swapIsReverse = false;
    this.grid[a.row][a.col] = b;
    this.grid[b.row][b.col] = a;
    const [ar, ac] = [a.row, a.col];
    a.row = b.row;
    a.col = b.col;
    b.row = ar;
    b.col = ac;
    const pa = this.pos(a.row, a.col);
    const pb = this.pos(b.row, b.col);
    a.targetX = pa.x;
    a.targetY = pa.y;
    b.targetX = pb.x;
    b.targetY = pb.y;
    this.state = 2 /* SWAP_ANIM */;
  }
  undoSwap() {
    const a = this.swap1, b = this.swap2;
    this.grid[a.row][a.col] = b;
    this.grid[b.row][b.col] = a;
    const [ar, ac] = [a.row, a.col];
    a.row = b.row;
    a.col = b.col;
    b.row = ar;
    b.col = ac;
    const pa = this.pos(a.row, a.col);
    const pb = this.pos(b.row, b.col);
    a.targetX = pa.x;
    a.targetY = pa.y;
    b.targetX = pb.x;
    b.targetY = pb.y;
    this.swapIsReverse = true;
  }
  updateBalls() {
    let anim = false;
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++)
        if (this.grid[r][c]?.update())
          anim = true;
    return anim;
  }
  tick = () => {
    this.particles = this.particles.filter((p) => p.update());
    this.popups = this.popups.filter((p) => p.update());
    const anim = this.updateBalls();
    updateFaceTime(1 / 60);
    switch (this.state) {
      case 2 /* SWAP_ANIM */:
        if (!anim) {
          if (this.swapIsReverse) {
            this.state = 0 /* IDLE */;
          } else if (this.findMatches().length === 0) {
            this.undoSwap();
          } else {
            this.combo = 0;
            this.processMatches();
          }
        }
        break;
      case 3 /* BREAK_ANIM */:
        if (!anim)
          this.gravity();
        break;
      case 4 /* FALL_ANIM */:
        if (!anim)
          this.processMatches();
        break;
    }
    this.draw();
    this.animId = requestAnimationFrame(this.tick);
  };
  draw() {
    const { ctx, canvas } = this;
    const { width: w, height: h } = canvas;
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (b && b !== this.dragging)
          b.draw(ctx);
      }
    if (this.dragging) {
      this.dragging.drawSelected(ctx);
      this.dragging.draw(ctx);
    }
    for (const p of this.particles)
      p.draw(ctx);
    for (const p of this.popups)
      p.draw(ctx);
  }
  updateUI() {
    this.elScore.textContent = String(this.score);
    this.elHigh.textContent = String(this.highScore);
    if (this.combo > 1) {
      this.elCombo.textContent = `COMBO x${this.combo}`;
      this.elCombo.classList.add("visible");
    } else {
      this.elCombo.classList.remove("visible");
    }
  }
}

// src/script.ts
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var game = new Game(canvas, ctx);
document.getElementById("restart")?.addEventListener("click", () => game.restart());

//# debugId=064BDD557004E9BA64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXHNyY1xcYmFsbHMudHMiLCAiLi5cXHNyY1xccGFydGljbGUudHMiLCAiLi5cXHNyY1xcZ2FtZS50cyIsICIuLlxcc3JjXFxzY3JpcHQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLy8g4pSA4pSAIFNwcml0ZSBjYWNoZSAoYm9keSBvbmx5IOKAlCBncmFkaWVudCwgaGlnaGxpZ2h0LCBzaGFkb3cpIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5jb25zdCBzcHJpdGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBPZmZzY3JlZW5DYW52YXM+KCk7XHJcbmNvbnN0IFNQUklURV9QQUQgPSA2O1xyXG5cclxuZnVuY3Rpb24gaGV4VG9SZ2IoaGV4OiBzdHJpbmcpOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgY29uc3QgbiA9IHBhcnNlSW50KGhleC5zbGljZSgxKSwgMTYpO1xyXG4gICAgcmV0dXJuIFtuID4+IDE2LCAobiA+PiA4KSAmIDB4ZmYsIG4gJiAweGZmXTtcclxufVxyXG5cclxuZnVuY3Rpb24gaHNsRnJvbVJnYihyOiBudW1iZXIsIGc6IG51bWJlciwgYjogbnVtYmVyKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcclxuICAgIHIgLz0gMjU1OyBnIC89IDI1NTsgYiAvPSAyNTU7XHJcbiAgICBjb25zdCBteCA9IE1hdGgubWF4KHIsIGcsIGIpLCBtbiA9IE1hdGgubWluKHIsIGcsIGIpO1xyXG4gICAgbGV0IGggPSAwLCBzID0gMDtcclxuICAgIGNvbnN0IGwgPSAobXggKyBtbikgLyAyO1xyXG4gICAgaWYgKG14ICE9PSBtbikge1xyXG4gICAgICAgIGNvbnN0IGQgPSBteCAtIG1uO1xyXG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbXggLSBtbikgOiBkIC8gKG14ICsgbW4pO1xyXG4gICAgICAgIHN3aXRjaCAobXgpIHtcclxuICAgICAgICAgICAgY2FzZSByOiBoID0gKChnIC0gYikgLyBkICsgKGcgPCBiID8gNiA6IDApKSAvIDY7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoKGIgLSByKSAvIGQgKyAyKSAvIDY7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGI6IGggPSAoKHIgLSBnKSAvIGQgKyA0KSAvIDY7IGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBbaCAqIDM2MCwgcyAqIDEwMCwgbCAqIDEwMF07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZShjb2xvcjogc3RyaW5nLCByYWRpdXM6IG51bWJlcik6IE9mZnNjcmVlbkNhbnZhcyB7XHJcbiAgICBjb25zdCBrZXkgPSBgJHtjb2xvcn1fJHtyYWRpdXN9YDtcclxuICAgIGxldCBjYWNoZWQgPSBzcHJpdGVDYWNoZS5nZXQoa2V5KTtcclxuICAgIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XHJcblxyXG4gICAgY29uc3Qgc2l6ZSA9IChyYWRpdXMgKyBTUFJJVEVfUEFEKSAqIDI7XHJcbiAgICBjb25zdCBvYyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoc2l6ZSwgc2l6ZSk7XHJcbiAgICBjb25zdCBjdHggPSBvYy5nZXRDb250ZXh0KCcyZCcpITtcclxuICAgIGNvbnN0IGN4ID0gcmFkaXVzICsgU1BSSVRFX1BBRDtcclxuICAgIGNvbnN0IGN5ID0gY3g7XHJcbiAgICBjb25zdCByID0gcmFkaXVzO1xyXG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IoY29sb3IpO1xyXG4gICAgY29uc3QgW2gsIHMsIGxdID0gaHNsRnJvbVJnYihyZ2JbMF0sIHJnYlsxXSwgcmdiWzJdKTtcclxuXHJcbiAgICAvLyBTaGFkb3dcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoY3ggKyAxLCBjeSArIDMsIHIgKyAyLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMC4xOCknO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKGN4ICsgMC41LCBjeSArIDEuNSwgciArIDAuNSwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDAsMCwwLDAuMTIpJztcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgLy8gQm9keSBncmFkaWVudFxyXG4gICAgY29uc3QgZ3JhZCA9IGN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcclxuICAgICAgICBjeCAtIHIgKiAwLjMsIGN5IC0gciAqIDAuMywgciAqIDAuMDUsXHJcbiAgICAgICAgY3ggKyByICogMC4wOCwgY3kgKyByICogMC4xMiwgciAqIDEuMDUsXHJcbiAgICApO1xyXG4gICAgZ3JhZC5hZGRDb2xvclN0b3AoMCwgYGhzbCgke2h9LCR7TWF0aC5taW4oMTAwLCBzICsgNSl9JSwke01hdGgubWluKDg4LCBsICsgMjIpfSUpYCk7XHJcbiAgICBncmFkLmFkZENvbG9yU3RvcCgwLjQ1LCBjb2xvcik7XHJcbiAgICBncmFkLmFkZENvbG9yU3RvcCgwLjg1LCBgaHNsKCR7aH0sJHtNYXRoLm1pbigxMDAsIHMgKyA1KX0lLCR7TWF0aC5tYXgoMTIsIGwgLSAxNil9JSlgKTtcclxuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDEsIGBoc2woJHtofSwke01hdGgubWluKDEwMCwgcyArIDgpfSUsJHtNYXRoLm1heCg4LCBsIC0gMjYpfSUpYCk7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKGN4LCBjeSwgciwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IGdyYWQ7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIC8vIFNwZWN1bGFyIGhpZ2hsaWdodFxyXG4gICAgY29uc3QgaGwgPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXHJcbiAgICAgICAgY3ggLSByICogMC4yMiwgY3kgLSByICogMC4yNiwgMCxcclxuICAgICAgICBjeCAtIHIgKiAwLjA4LCBjeSAtIHIgKiAwLjEsIHIgKiAwLjUsXHJcbiAgICApO1xyXG4gICAgaGwuYWRkQ29sb3JTdG9wKDAsICdyZ2JhKDI1NSwyNTUsMjU1LDAuNCknKTtcclxuICAgIGhsLmFkZENvbG9yU3RvcCgwLjYsICdyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpJyk7XHJcbiAgICBobC5hZGRDb2xvclN0b3AoMSwgJ3JnYmEoMjU1LDI1NSwyNTUsMCknKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoY3gsIGN5LCByLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gaGw7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIHNwcml0ZUNhY2hlLnNldChrZXksIG9jKTtcclxuICAgIHJldHVybiBvYztcclxufVxyXG5cclxuLy8g4pSA4pSAIEZhY2UgZGVmaW5pdGlvbnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG50eXBlIE1vdXRoVHlwZSA9ICdzbWlyaycgfCAnb3BlbicgfCAnZ3JpbicgfCAnc211ZycgfCAnZmxhdCcgfCAnd29ycmllZCc7XHJcbnR5cGUgRmFjZVN0YXRlID0gJ2lkbGUnIHwgJ3NlbGVjdGVkJyB8ICdzY2FyZWQnO1xyXG5cclxuaW50ZXJmYWNlIFBlcnNvbmFsaXR5IHtcclxuICAgIG1vdXRoOiBNb3V0aFR5cGU7XHJcbiAgICBsb29rQmlhczogbnVtYmVyOyAvLyBzdWJ0bGUgZ2F6ZSBvZmZzZXQgcGVyIGNoYXJhY3RlclxyXG59XHJcblxyXG4vLyBFYWNoIGNvbG9yIGluZGV4IG1hcHMgdG8gYSBwZXJzb25hbGl0eVxyXG5jb25zdCBQRVJTT05BTElUSUVTOiBQZXJzb25hbGl0eVtdID0gW1xyXG4gICAgeyBtb3V0aDogJ3NtaXJrJywgbG9va0JpYXM6IDAgfSwgICAgLy8gcmVkIOKAlCBjb25maWRlbnRcclxuICAgIHsgbW91dGg6ICdvcGVuJywgbG9va0JpYXM6IDAgfSwgICAgLy8geWVsbG93IOKAlCBzdXJwcmlzZWRcclxuICAgIHsgbW91dGg6ICdncmluJywgbG9va0JpYXM6IDAgfSwgICAgLy8gZ3JlZW4g4oCUIGhhcHB5XHJcbiAgICB7IG1vdXRoOiAnc211ZycsIGxvb2tCaWFzOiAwLjUgfSwgIC8vIGJsdWUg4oCUIGNvb2xcclxuICAgIHsgbW91dGg6ICdmbGF0JywgbG9va0JpYXM6IC0wLjMgfSwgLy8gdmlvbGV0IOKAlCBib3JlZFxyXG4gICAgeyBtb3V0aDogJ3dvcnJpZWQnLCBsb29rQmlhczogMCB9LCAgICAvLyBvcmFuZ2Ug4oCUIG5lcnZvdXNcclxuXTtcclxuXHJcbi8vIEdsb2JhbCBhbmltYXRpb24gdGltZSDigJQgdXBkYXRlZCBlYWNoIGZyYW1lIGJ5IHRoZSBnYW1lIGxvb3BcclxubGV0IF9mYWNlVGltZSA9IDA7XHJcbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVGYWNlVGltZShkdDogbnVtYmVyKTogdm9pZCB7XHJcbiAgICBfZmFjZVRpbWUgKz0gZHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdGYWNlKFxyXG4gICAgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsXHJcbiAgICB4OiBudW1iZXIsXHJcbiAgICB5OiBudW1iZXIsXHJcbiAgICByOiBudW1iZXIsXHJcbiAgICBjb2xvckluZGV4OiBudW1iZXIsXHJcbiAgICBzdGF0ZTogRmFjZVN0YXRlLFxyXG4pOiB2b2lkIHtcclxuICAgIGNvbnN0IHQgPSBfZmFjZVRpbWU7XHJcbiAgICBjb25zdCBwID0gUEVSU09OQUxJVElFU1tjb2xvckluZGV4XSA/PyBQRVJTT05BTElUSUVTWzBdO1xyXG5cclxuICAgIC8vIOKUgOKUgCBFeWVzIOKUgOKUgFxyXG4gICAgY29uc3Qgc3BhbiA9IHIgKiAwLjMyO1xyXG4gICAgY29uc3QgZXllWSA9IC1yICogMC4xNTtcclxuICAgIGNvbnN0IGRvdFIgPSByICogMC4wOTtcclxuICAgIGNvbnN0IGJsaW5rID0gTWF0aC5zaW4odCAqIDEuNyArIGNvbG9ySW5kZXggKiAxLjQpID4gMC45MztcclxuICAgIGNvbnN0IGx4ID0gc3RhdGUgPT09ICdzY2FyZWQnXHJcbiAgICAgICAgPyBNYXRoLnNpbih0ICogNyArIGNvbG9ySW5kZXgpICogM1xyXG4gICAgICAgIDogKE1hdGguc2luKHQgKiAwLjcgKyBjb2xvckluZGV4ICogMC44KSArIHAubG9va0JpYXMpICogMS41O1xyXG4gICAgY29uc3QgbHkgPSBzdGF0ZSA9PT0gJ3NjYXJlZCcgPyAtMSA6IE1hdGguY29zKHQgKiAwLjYgKyBjb2xvckluZGV4KSAqIDAuNTtcclxuXHJcbiAgICBjdHguc2F2ZSgpO1xyXG4gICAgY3R4LnRyYW5zbGF0ZSh4LCB5KTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IHNpZGUgb2YgWy0xLCAxXSkge1xyXG4gICAgICAgIGNvbnN0IGV4ID0gc2lkZSAqIHNwYW47XHJcblxyXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gJ3NjYXJlZCcpIHtcclxuICAgICAgICAgICAgLy8gV2lkZSB3aGl0ZSBleWVzIHdpdGggdGlueSBwdXBpbFxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyNmZmYnO1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5hcmMoZXgsIGV5ZVksIHIgKiAwLjE3LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDMwLDIwLDE1LDAuMjUpJztcclxuICAgICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IHIgKiAwLjAxNTtcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHguYXJjKGV4LCBleWVZLCByICogMC4xNywgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzFhMTYxMic7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4LmFyYyhleCArIGx4ICogMC41LCBleWVZICsgbHksIHIgKiAwLjA1NSwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC45KSc7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4LmFyYyhleCArIGx4ICogMC41IC0gciAqIDAuMDIsIGV5ZVkgKyBseSAtIHIgKiAwLjAyNSwgciAqIDAuMDI1LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChibGluaykge1xyXG4gICAgICAgICAgICAvLyBCbGluayDigJQgc2hvcnQgaG9yaXpvbnRhbCBsaW5lXHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4Lm1vdmVUbyhleCAtIGRvdFIgKiAxLjIsIGV5ZVkpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGV4ICsgZG90UiAqIDEuMiwgZXllWSk7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICcjMWExNjEyJztcclxuICAgICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IHIgKiAwLjA0O1xyXG4gICAgICAgICAgICBjdHgubGluZUNhcCA9ICdyb3VuZCc7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBOb3JtYWwg4oCUIGRvdCBleWVzIHdpdGggc3BlY3VsYXJcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMWExNjEyJztcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHguYXJjKGV4ICsgbHggKiAwLjMsIGV5ZVkgKyBseSAqIDAuMywgZG90UiwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC44NSknO1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5hcmMoXHJcbiAgICAgICAgICAgICAgICBleCArIGx4ICogMC4zIC0gZG90UiAqIDAuMyxcclxuICAgICAgICAgICAgICAgIGV5ZVkgKyBseSAqIDAuMyAtIGRvdFIgKiAwLjM1LFxyXG4gICAgICAgICAgICAgICAgZG90UiAqIDAuMzUsXHJcbiAgICAgICAgICAgICAgICAwLCBNYXRoLlBJICogMixcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIE1vdXRoIOKUgOKUgFxyXG4gICAgY29uc3QgbXkgPSByICogMC4zO1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJyMxYTE2MTInO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHIgKiAwLjA0O1xyXG4gICAgY3R4LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cclxuICAgIGlmIChzdGF0ZSA9PT0gJ3NjYXJlZCcpIHtcclxuICAgICAgICAvLyBTbWFsbCBcIm9cIiBtb3V0aFxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKDAsIG15ICsgciAqIDAuMDYsIHIgKiAwLjEsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMxYTE2MTInO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICB9IGVsc2UgaWYgKHN0YXRlID09PSAnc2VsZWN0ZWQnKSB7XHJcbiAgICAgICAgLy8gSGFwcHkgYXJjXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoMCwgbXkgKyByICogMC4wMiwgciAqIDAuMTcsIDAuMTUsIE1hdGguUEkgLSAwLjE1KTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFBlcnNvbmFsaXR5IG1vdXRoXHJcbiAgICAgICAgc3dpdGNoIChwLm1vdXRoKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NtaXJrJzpcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5tb3ZlVG8oLXIgKiAwLjEzLCBteSk7XHJcbiAgICAgICAgICAgICAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhyICogMC4wMiwgbXkgKyByICogMC4xLCByICogMC4xNiwgbXkgLSByICogMC4wMik7XHJcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnb3Blbic6XHJcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBjdHguZWxsaXBzZSgwLCBteSArIHIgKiAwLjAzLCByICogMC4wOSwgciAqIDAuMDcsIDAsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzFhMTYxMic7XHJcbiAgICAgICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dyaW4nOlxyXG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmFyYygwLCBteSwgciAqIDAuMTYsIDAuMiwgTWF0aC5QSSAtIDAuMik7XHJcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnc211Zyc6XHJcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBjdHgubW92ZVRvKC1yICogMC4wNiwgbXkgKyByICogMC4wMSk7XHJcbiAgICAgICAgICAgICAgICBjdHgubGluZVRvKHIgKiAwLjE2LCBteSAtIHIgKiAwLjAyKTtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdmbGF0JzpcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5tb3ZlVG8oLXIgKiAwLjEyLCBteSArIHIgKiAwLjAxKTtcclxuICAgICAgICAgICAgICAgIGN0eC5saW5lVG8ociAqIDAuMTIsIG15ICsgciAqIDAuMDEpO1xyXG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3dvcnJpZWQnOlxyXG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmFyYygwLCBteSArIHIgKiAwLjE2LCByICogMC4xMywgTWF0aC5QSSArIDAuMzUsIE1hdGguUEkgKiAyIC0gMC4zNSk7XHJcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFN3ZWF0IGRyb3AgKHNjYXJlZCBvbmx5KSDilIDilIBcclxuICAgIGlmIChzdGF0ZSA9PT0gJ3NjYXJlZCcpIHtcclxuICAgICAgICBjb25zdCBkdCA9ICh0ICogMi41ICsgY29sb3JJbmRleCAqIDAuNykgJSAxLjg7XHJcbiAgICAgICAgaWYgKGR0IDw9IDEpIHtcclxuICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gKDEgLSBkdCkgKiAwLjU7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2FlZDZmMSc7XHJcbiAgICAgICAgICAgIGNvbnN0IGR4ID0gciAqIDAuNTI7XHJcbiAgICAgICAgICAgIGNvbnN0IGR5ID0gLXIgKiAwLjEgKyBkdCAqIHIgKiAwLjQ7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4Lm1vdmVUbyhkeCwgZHkgLSByICogMC4xKTtcclxuICAgICAgICAgICAgY3R4LnF1YWRyYXRpY0N1cnZlVG8oZHggKyByICogMC4wNSwgZHkgKyByICogMC4wMiwgZHgsIGR5ICsgciAqIDAuMDUpO1xyXG4gICAgICAgICAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhkeCAtIHIgKiAwLjA1LCBkeSArIHIgKiAwLjAyLCBkeCwgZHkgLSByICogMC4xKTtcclxuICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gMTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuLy8g4pSA4pSAIEJhbGwgY2xhc3Mg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG5leHBvcnQgY2xhc3MgQmFsbCB7XHJcbiAgICBwdWJsaWMgdGFyZ2V0WDogbnVtYmVyO1xyXG4gICAgcHVibGljIHRhcmdldFk6IG51bWJlcjtcclxuICAgIHB1YmxpYyBzY2FsZTogbnVtYmVyID0gMTtcclxuICAgIHB1YmxpYyB0YXJnZXRTY2FsZTogbnVtYmVyID0gMTtcclxuICAgIHB1YmxpYyByb3c6IG51bWJlciA9IDA7XHJcbiAgICBwdWJsaWMgY29sOiBudW1iZXIgPSAwO1xyXG4gICAgcHVibGljIGNvbG9ySW5kZXg6IG51bWJlciA9IDA7XHJcbiAgICBwdWJsaWMgZmFjZVN0YXRlOiBGYWNlU3RhdGUgPSAnaWRsZSc7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIHg6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgeTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyByYWRpdXM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHg7XHJcbiAgICAgICAgdGhpcy50YXJnZXRZID0geTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoc3BlZWQ6IG51bWJlciA9IDAuMyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBtb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3QgZHggPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XHJcbiAgICAgICAgY29uc3QgZHkgPSB0aGlzLnRhcmdldFkgLSB0aGlzLnk7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IDAuNSB8fCBNYXRoLmFicyhkeSkgPiAwLjUpIHtcclxuICAgICAgICAgICAgdGhpcy54ICs9IGR4ICogc3BlZWQ7XHJcbiAgICAgICAgICAgIHRoaXMueSArPSBkeSAqIHNwZWVkO1xyXG4gICAgICAgICAgICBtb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMueCA9IHRoaXMudGFyZ2V0WDtcclxuICAgICAgICAgICAgdGhpcy55ID0gdGhpcy50YXJnZXRZO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHMgPSB0aGlzLnRhcmdldFNjYWxlIC0gdGhpcy5zY2FsZTtcclxuICAgICAgICBpZiAoTWF0aC5hYnMoZHMpID4gMC4wMSkge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlICs9IGRzICogMC4zNTtcclxuICAgICAgICAgICAgbW92aW5nID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gdGhpcy50YXJnZXRTY2FsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtb3Zpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnNjYWxlIDwgMC4wMikgcmV0dXJuO1xyXG5cclxuICAgICAgICBjb25zdCBzID0gdGhpcy5zY2FsZTtcclxuXHJcbiAgICAgICAgLy8gMSkgRHJhdyBjYWNoZWQgYm9keSBzcHJpdGVcclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBnZXRTcHJpdGUodGhpcy5jb2xvciwgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGNvbnN0IHN3ID0gc3ByaXRlLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IHNoID0gc3ByaXRlLmhlaWdodDtcclxuICAgICAgICBjb25zdCBkdyA9IHN3ICogcztcclxuICAgICAgICBjb25zdCBkaCA9IHNoICogcztcclxuICAgICAgICBjdHguZHJhd0ltYWdlKHNwcml0ZSwgdGhpcy54IC0gZHcgLyAyLCB0aGlzLnkgLSBkaCAvIDIsIGR3LCBkaCk7XHJcblxyXG4gICAgICAgIC8vIDIpIERyYXcgbGl2ZSBmYWNlIG9uIHRvcFxyXG4gICAgICAgIGlmIChzID4gMC4zKSB7XHJcbiAgICAgICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgICAgICBjdHguc2NhbGUocywgcyk7XHJcbiAgICAgICAgICAgIGN0eC50cmFuc2xhdGUoLXRoaXMueCwgLXRoaXMueSk7XHJcbiAgICAgICAgICAgIGRyYXdGYWNlKGN0eCwgdGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCB0aGlzLmNvbG9ySW5kZXgsIHRoaXMuZmFjZVN0YXRlKTtcclxuICAgICAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZHJhd1NlbGVjdGVkKGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgciA9IHRoaXMucmFkaXVzICogdGhpcy5zY2FsZSArIDQ7XHJcbiAgICAgICAgY29uc3QgdCA9IF9mYWNlVGltZTtcclxuXHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgciwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNiknO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAyO1xyXG4gICAgICAgIGN0eC5zZXRMaW5lRGFzaChbMywgM10pO1xyXG4gICAgICAgIGN0eC5saW5lRGFzaE9mZnNldCA9IC10ICogMjA7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5zZXRMaW5lRGFzaChbXSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxuXHJcbiAgICBjbG9uZSgpOiBCYWxsIHtcclxuICAgICAgICBjb25zdCBiID0gbmV3IEJhbGwodGhpcy54LCB0aGlzLnksIHRoaXMucmFkaXVzLCB0aGlzLmNvbG9yKTtcclxuICAgICAgICBiLnRhcmdldFggPSB0aGlzLnRhcmdldFg7XHJcbiAgICAgICAgYi50YXJnZXRZID0gdGhpcy50YXJnZXRZO1xyXG4gICAgICAgIGIucm93ID0gdGhpcy5yb3c7XHJcbiAgICAgICAgYi5jb2wgPSB0aGlzLmNvbDtcclxuICAgICAgICBiLnNjYWxlID0gdGhpcy5zY2FsZTtcclxuICAgICAgICBiLnRhcmdldFNjYWxlID0gdGhpcy50YXJnZXRTY2FsZTtcclxuICAgICAgICBiLmNvbG9ySW5kZXggPSB0aGlzLmNvbG9ySW5kZXg7XHJcbiAgICAgICAgYi5mYWNlU3RhdGUgPSB0aGlzLmZhY2VTdGF0ZTtcclxuICAgICAgICByZXR1cm4gYjtcclxuICAgIH1cclxufSIsCiAgICAiZXhwb3J0IGNsYXNzIFBhcnRpY2xlIHtcclxuICAgIHB1YmxpYyBsaWZlOiBudW1iZXIgPSAxO1xyXG4gICAgcHJpdmF0ZSBkZWNheTogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyB4OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHk6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgdng6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgdnk6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgcmFkaXVzOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIGNvbG9yOiBzdHJpbmcsXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLmRlY2F5ID0gMC4wMjUgKyBNYXRoLnJhbmRvbSgpICogMC4wMztcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy54ICs9IHRoaXMudng7XHJcbiAgICAgICAgdGhpcy55ICs9IHRoaXMudnk7XHJcbiAgICAgICAgdGhpcy52eSArPSAwLjEyO1xyXG4gICAgICAgIHRoaXMubGlmZSAtPSB0aGlzLmRlY2F5O1xyXG4gICAgICAgIHRoaXMucmFkaXVzICo9IDAuOTU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGlmZSA+IDAgJiYgdGhpcy5yYWRpdXMgPiAwLjM7XHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IHZvaWQge1xyXG4gICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgdGhpcy5saWZlKTtcclxuICAgICAgICBjb25zdCBzID0gdGhpcy5yYWRpdXMgKiAyO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCh0aGlzLnggLSBzIC8gMiwgdGhpcy55IC0gcyAvIDIsIHMsIHMpO1xyXG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTY29yZVBvcHVwIHtcclxuICAgIHByaXZhdGUgbGlmZTogbnVtYmVyID0gMTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgeDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB5OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHRleHQ6IHN0cmluZyxcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkgeyB9XHJcblxyXG4gICAgdXBkYXRlKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHRoaXMueSAtPSAxLjI7XHJcbiAgICAgICAgdGhpcy5saWZlIC09IDAuMDI1O1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxpZmUgPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiB2b2lkIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IE1hdGgubWF4KDAsIHRoaXMubGlmZSk7XHJcbiAgICAgICAgY3R4LmZvbnQgPSAnYm9sZCAxNHB4IFwiU3BhY2UgTW9ub1wiLCBcIkNvdXJpZXIgTmV3XCIsIG1vbm9zcGFjZSc7XHJcbiAgICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG4gICAgICAgIGN0eC5maWxsVGV4dCh0aGlzLnRleHQsIHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG59XHJcbiIsCiAgICAiaW1wb3J0IHsgQmFsbCwgdXBkYXRlRmFjZVRpbWUgfSBmcm9tICcuL2JhbGxzLmpzJztcclxuaW1wb3J0IHsgUGFydGljbGUsIFNjb3JlUG9wdXAgfSBmcm9tICcuL3BhcnRpY2xlLmpzJztcclxuXHJcbmNvbnN0IGVudW0gU3RhdGUge1xyXG4gICAgSURMRSxcclxuICAgIERSQUdHSU5HLFxyXG4gICAgU1dBUF9BTklNLFxyXG4gICAgQlJFQUtfQU5JTSxcclxuICAgIEZBTExfQU5JTSxcclxufVxyXG5cclxuY29uc3QgQ09MT1JTID0gW1xyXG4gICAgJyNFNzRDM0MnLCAvLyAwIOKGkiBwZXJzb25hbGl0eSAwIChzbWlyaylcclxuICAgICcjRjFDNDBGJywgLy8gMSDihpIgcGVyc29uYWxpdHkgMSAob3BlbilcclxuICAgICcjMkVDQzcxJywgLy8gMiDihpIgcGVyc29uYWxpdHkgMiAoZ3JpbilcclxuICAgICcjMzQ5OERCJywgLy8gMyDihpIgcGVyc29uYWxpdHkgMyAoc211ZylcclxuICAgICcjOUI1OUI2JywgLy8gNCDihpIgcGVyc29uYWxpdHkgNCAoZmxhdClcclxuICAgICcjRTY3RTIyJywgLy8gNSDihpIgcGVyc29uYWxpdHkgNSAod29ycmllZClcclxuXTtcclxuXHJcbmZ1bmN0aW9uIGNvbG9yVG9JbmRleChjb2xvcjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGlkeCA9IENPTE9SUy5pbmRleE9mKGNvbG9yKTtcclxuICAgIHJldHVybiBpZHggPj0gMCA/IGlkeCA6IDA7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBHYW1lIHtcclxuICAgIC8vIEdyaWRcclxuICAgIHByaXZhdGUgZ3JpZDogQmFsbFtdW10gPSBbXTtcclxuICAgIHByaXZhdGUgcm93cyA9IDEyO1xyXG4gICAgcHJpdmF0ZSBjb2xzID0gODtcclxuICAgIHByaXZhdGUgY2VsbFNpemUgPSA0NDtcclxuICAgIHByaXZhdGUgYmFsbFJhZGl1cyA9IDE4O1xyXG4gICAgcHJpdmF0ZSBvZmZzZXRYOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIG9mZnNldFk6IG51bWJlcjtcclxuXHJcbiAgICAvLyBTdGF0ZVxyXG4gICAgcHJpdmF0ZSBzdGF0ZTogU3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcbiAgICBwcml2YXRlIGRyYWdnaW5nOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIGRyYWdPcmlnaW46IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwMTogQmFsbCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwMjogQmFsbCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwSXNSZXZlcnNlID0gZmFsc2U7XHJcbiAgICBwcml2YXRlIGFuaW1JZCA9IDA7XHJcblxyXG4gICAgLy8gRWZmZWN0c1xyXG4gICAgcHJpdmF0ZSBwYXJ0aWNsZXM6IFBhcnRpY2xlW10gPSBbXTtcclxuICAgIHByaXZhdGUgcG9wdXBzOiBTY29yZVBvcHVwW10gPSBbXTtcclxuXHJcbiAgICAvLyBTY29yZVxyXG4gICAgcHJpdmF0ZSBzY29yZSA9IDA7XHJcbiAgICBwcml2YXRlIGNvbWJvID0gMDtcclxuICAgIHByaXZhdGUgaGlnaFNjb3JlID0gMDtcclxuXHJcbiAgICAvLyBVSSByZWZzXHJcbiAgICBwcml2YXRlIGVsU2NvcmU6IEhUTUxFbGVtZW50O1xyXG4gICAgcHJpdmF0ZSBlbENvbWJvOiBIVE1MRWxlbWVudDtcclxuICAgIHByaXZhdGUgZWxIaWdoOiBIVE1MRWxlbWVudDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsXHJcbiAgICAgICAgcHJpdmF0ZSBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMub2Zmc2V0WCA9IChjYW52YXMud2lkdGggLSAodGhpcy5jb2xzIC0gMSkgKiB0aGlzLmNlbGxTaXplKSAvIDI7XHJcbiAgICAgICAgdGhpcy5vZmZzZXRZID0gKGNhbnZhcy5oZWlnaHQgLSAodGhpcy5yb3dzIC0gMSkgKiB0aGlzLmNlbGxTaXplKSAvIDI7XHJcblxyXG4gICAgICAgIHRoaXMuZWxTY29yZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzY29yZScpITtcclxuICAgICAgICB0aGlzLmVsQ29tYm8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tYm8nKSE7XHJcbiAgICAgICAgdGhpcy5lbEhpZ2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGlnaC1zY29yZScpITtcclxuXHJcbiAgICAgICAgdGhpcy5oaWdoU2NvcmUgPSBwYXJzZUludChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29sb3JtYXRjaC1ocycpIHx8ICcwJyk7XHJcblxyXG4gICAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdCgpOiB2b2lkIHtcclxuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1JZCk7XHJcbiAgICAgICAgdGhpcy5zY29yZSA9IDA7XHJcbiAgICAgICAgdGhpcy5jb21ibyA9IDA7XHJcbiAgICAgICAgdGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuICAgICAgICB0aGlzLnBvcHVwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcblxyXG4gICAgICAgIHRoaXMuYnVpbGRHcmlkKCk7XHJcbiAgICAgICAgdGhpcy5wdXJnZUluaXRpYWxNYXRjaGVzKCk7XHJcbiAgICAgICAgdGhpcy5jYXNjYWRlRW50cmFuY2UoKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKCk7XHJcbiAgICAgICAgdGhpcy5hbmltSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy50aWNrKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcmVzdGFydCgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgR3JpZCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHBvcyhyOiBudW1iZXIsIGM6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHg6IHRoaXMub2Zmc2V0WCArIGMgKiB0aGlzLmNlbGxTaXplLFxyXG4gICAgICAgICAgICB5OiB0aGlzLm9mZnNldFkgKyByICogdGhpcy5jZWxsU2l6ZSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2VsbChweDogbnVtYmVyLCBweTogbnVtYmVyKSB7XHJcbiAgICAgICAgY29uc3QgYyA9IE1hdGgucm91bmQoKHB4IC0gdGhpcy5vZmZzZXRYKSAvIHRoaXMuY2VsbFNpemUpO1xyXG4gICAgICAgIGNvbnN0IHIgPSBNYXRoLnJvdW5kKChweSAtIHRoaXMub2Zmc2V0WSkgLyB0aGlzLmNlbGxTaXplKTtcclxuICAgICAgICBpZiAociA+PSAwICYmIHIgPCB0aGlzLnJvd3MgJiYgYyA+PSAwICYmIGMgPCB0aGlzLmNvbHMpIHJldHVybiB7IHIsIGMgfTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJuZENvbG9yKCkge1xyXG4gICAgICAgIHJldHVybiBDT0xPUlNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogQ09MT1JTLmxlbmd0aCldO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGRHcmlkKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuZ3JpZCA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgdGhpcy5ncmlkW3JdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHAgPSB0aGlzLnBvcyhyLCBjKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5ybmRDb2xvcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IG5ldyBCYWxsKHAueCwgcC55LCB0aGlzLmJhbGxSYWRpdXMsIGNvbG9yKTtcclxuICAgICAgICAgICAgICAgIGIucm93ID0gcjtcclxuICAgICAgICAgICAgICAgIGIuY29sID0gYztcclxuICAgICAgICAgICAgICAgIGIuY29sb3JJbmRleCA9IGNvbG9yVG9JbmRleChjb2xvcik7ICAvLyDihpAgRUtMRVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdID0gYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHB1cmdlSW5pdGlhbE1hdGNoZXMoKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAyMDA7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBtID0gdGhpcy5maW5kTWF0Y2hlcygpO1xyXG4gICAgICAgICAgICBpZiAobS5sZW5ndGggPT09IDApIGJyZWFrO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGcgb2YgbSkgZm9yIChjb25zdCBiIG9mIGcpIHtcclxuICAgICAgICAgICAgICAgIGIuY29sb3IgPSB0aGlzLnJuZENvbG9yKCk7XHJcbiAgICAgICAgICAgICAgICBiLmNvbG9ySW5kZXggPSBjb2xvclRvSW5kZXgoYi5jb2xvcik7ICAvLyDihpAgRUtMRVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY2FzY2FkZUVudHJhbmNlKCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHRoaXMuZ3JpZFtyXVtjXTtcclxuICAgICAgICAgICAgICAgIGIueSA9IGIudGFyZ2V0WSAtIHRoaXMuY2FudmFzLmhlaWdodCAtIHIgKiAyMCAtIE1hdGgucmFuZG9tKCkgKiAxMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgTWF0Y2ggZmluZGluZyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIGZpbmRNYXRjaGVzKCk6IEJhbGxbXVtdIHtcclxuICAgICAgICBjb25zdCBtYXRjaGVzOiBCYWxsW11bXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBIb3Jpem9udGFsXHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBsZXQgcnVuOiBCYWxsW10gPSBbdGhpcy5ncmlkW3JdWzBdXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDE7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHRoaXMuZ3JpZFtyXVtjXTtcclxuICAgICAgICAgICAgICAgIGlmIChiLmNvbG9yID09PSBydW5bMF0uY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBydW4ucHVzaChiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuID0gW2JdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChydW4ubGVuZ3RoID49IDMpIG1hdGNoZXMucHVzaChydW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVmVydGljYWxcclxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgIGxldCBydW46IEJhbGxbXSA9IFt0aGlzLmdyaWRbMF1bY11dO1xyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gMTsgciA8IHRoaXMucm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIuY29sb3IgPT09IHJ1blswXS5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1bi5wdXNoKGIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICAgICAgICAgICAgICBydW4gPSBbYl07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF0Y2hlcztcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgR2FtZSBsb2dpYyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NNYXRjaGVzKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSB0aGlzLmZpbmRNYXRjaGVzKCk7XHJcblxyXG4gICAgICAgIGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbWJvID0gMDtcclxuICAgICAgICAgICAgLy8gVMO8bSB0b3BsYXLEsSBpZGxlJ2EgZMO2bmTDvHJcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKylcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdLmZhY2VTdGF0ZSA9ICdpZGxlJztcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLklETEU7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb21ibysrO1xyXG5cclxuICAgICAgICBjb25zdCBzZXQgPSBuZXcgU2V0PEJhbGw+KCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBnIG9mIG1hdGNoZXMpIGZvciAoY29uc3QgYiBvZiBnKSBzZXQuYWRkKGIpO1xyXG5cclxuICAgICAgICBjb25zdCBwdHMgPSBzZXQuc2l6ZSAqIDEwICogdGhpcy5jb21ibztcclxuICAgICAgICB0aGlzLnNjb3JlICs9IHB0cztcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIHNldCkge1xyXG4gICAgICAgICAgICBiLmZhY2VTdGF0ZSA9ICdzY2FyZWQnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2NvcmUgPiB0aGlzLmhpZ2hTY29yZSkge1xyXG4gICAgICAgICAgICB0aGlzLmhpZ2hTY29yZSA9IHRoaXMuc2NvcmU7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjb2xvcm1hdGNoLWhzJywgU3RyaW5nKHRoaXMuaGlnaFNjb3JlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIC8vIEVmZmVjdHNcclxuICAgICAgICBsZXQgc3VtWCA9IDAsIHN1bVkgPSAwO1xyXG4gICAgICAgIGZvciAoY29uc3QgYiBvZiBzZXQpIHtcclxuICAgICAgICAgICAgdGhpcy5zcGF3bkJ1cnN0KGIueCwgYi55LCBiLmNvbG9yLCA2KTtcclxuICAgICAgICAgICAgYi50YXJnZXRTY2FsZSA9IDA7XHJcbiAgICAgICAgICAgIHN1bVggKz0gYi54O1xyXG4gICAgICAgICAgICBzdW1ZICs9IGIueTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGN4ID0gc3VtWCAvIHNldC5zaXplO1xyXG4gICAgICAgIGNvbnN0IGN5ID0gc3VtWSAvIHNldC5zaXplO1xyXG4gICAgICAgIGNvbnN0IGxhYmVsID0gdGhpcy5jb21ibyA+IDEgPyBgKyR7cHRzfSB4JHt0aGlzLmNvbWJvfWAgOiBgKyR7cHRzfWA7XHJcbiAgICAgICAgdGhpcy5wb3B1cHMucHVzaChuZXcgU2NvcmVQb3B1cChjeCwgY3kgLSAxMCwgbGFiZWwsICcjZmZmJykpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKCk7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJSRUFLX0FOSU07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBncmF2aXR5KCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgbGV0IHdyaXRlID0gdGhpcy5yb3dzIC0gMTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNoaWZ0IHN1cnZpdmluZyBiYWxscyBkb3duXHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSB0aGlzLnJvd3MgLSAxOyByID49IDA7IHItLSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHRoaXMuZ3JpZFtyXVtjXTtcclxuICAgICAgICAgICAgICAgIGlmIChiLnRhcmdldFNjYWxlID4gMC41KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIgIT09IHdyaXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt3cml0ZV1bY10gPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBudWxsITtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5yb3cgPSB3cml0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5jb2wgPSBjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwID0gdGhpcy5wb3Mod3JpdGUsIGMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLnRhcmdldFggPSBwLng7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIudGFyZ2V0WSA9IHAueTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmlsbCBlbXB0eSBjZWxscyBmcm9tIHRvcFxyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gd3JpdGU7IHIgPj0gMDsgci0tKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwID0gdGhpcy5wb3MociwgYyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydFkgPSAtdGhpcy5iYWxsUmFkaXVzICogMiAtICh3cml0ZSAtIHIpICogdGhpcy5jZWxsU2l6ZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5iID0gbmV3IEJhbGwocC54LCBzdGFydFksIHRoaXMuYmFsbFJhZGl1cywgdGhpcy5ybmRDb2xvcigpKTtcclxuICAgICAgICAgICAgICAgIG5iLmNvbG9ySW5kZXggPSBjb2xvclRvSW5kZXgobmIuY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0WCA9IHAueDtcclxuICAgICAgICAgICAgICAgIG5iLnRhcmdldFkgPSBwLnk7XHJcbiAgICAgICAgICAgICAgICBuYi5yb3cgPSByO1xyXG4gICAgICAgICAgICAgICAgbmIuY29sID0gYztcclxuICAgICAgICAgICAgICAgIG5iLnNjYWxlID0gMC42O1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0U2NhbGUgPSAxO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdID0gbmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEZYIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgc3Bhd25CdXJzdCh4OiBudW1iZXIsIHk6IG51bWJlciwgY29sb3I6IHN0cmluZywgbjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IChNYXRoLlBJICogMiAqIGkpIC8gbiArIE1hdGgucmFuZG9tKCkgKiAwLjQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwZCA9IDIuNSArIE1hdGgucmFuZG9tKCkgKiAzO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKFxyXG4gICAgICAgICAgICAgICAgbmV3IFBhcnRpY2xlKHgsIHksIE1hdGguY29zKGEpICogc3BkLCBNYXRoLnNpbihhKSAqIHNwZCwgMiArIE1hdGgucmFuZG9tKCkgKiA0LCBjb2xvciksXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBJbnB1dCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIGJpbmRFdmVudHMoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY3YgPSB0aGlzLmNhbnZhcztcclxuICAgICAgICBjdi5zdHlsZS5jdXJzb3IgPSAnZ3JhYic7XHJcblxyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGUgPT4gdGhpcy5vbkRvd24odGhpcy5tb3VzZVhZKGUpKSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZSA9PiB0aGlzLm9uTW92ZSh0aGlzLm1vdXNlWFkoZSkpKTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZSA9PiB0aGlzLm9uVXAodGhpcy5tb3VzZVhZKGUpKSk7XHJcblxyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB0aGlzLm9uRG93bih0aGlzLnRvdWNoWFkoZSkpOyB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25Nb3ZlKHRoaXMudG91Y2hYWShlKSk7IH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB0aGlzLm9uVXAodGhpcy50b3VjaFhZKGUpKTsgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG1vdXNlWFkoZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCBzeCA9IHRoaXMuY2FudmFzLndpZHRoIC8gci53aWR0aDtcclxuICAgICAgICBjb25zdCBzeSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHIuaGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiB7IHg6IChlLmNsaWVudFggLSByLmxlZnQpICogc3gsIHk6IChlLmNsaWVudFkgLSByLnRvcCkgKiBzeSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdG91Y2hYWShlOiBUb3VjaEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdCA9IGUudG91Y2hlc1swXSB8fCBlLmNoYW5nZWRUb3VjaGVzWzBdO1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCBzeCA9IHRoaXMuY2FudmFzLndpZHRoIC8gci53aWR0aDtcclxuICAgICAgICBjb25zdCBzeSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHIuaGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiB7IHg6ICh0LmNsaWVudFggLSByLmxlZnQpICogc3gsIHk6ICh0LmNsaWVudFkgLSByLnRvcCkgKiBzeSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Eb3duKHA6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBTdGF0ZS5JRExFKSByZXR1cm47XHJcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY2VsbChwLngsIHAueSk7XHJcbiAgICAgICAgaWYgKCFjKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IHRoaXMuZ3JpZFtjLnJdW2MuY107XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZy5mYWNlU3RhdGUgPSAnc2VsZWN0ZWQnO1xyXG4gICAgICAgIHRoaXMuZHJhZ09yaWdpbiA9IHsgeDogdGhpcy5kcmFnZ2luZy50YXJnZXRYLCB5OiB0aGlzLmRyYWdnaW5nLnRhcmdldFkgfTtcclxuICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRFJBR0dJTkc7XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2dyYWJiaW5nJztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTW92ZShwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmRyYWdnaW5nLnggPSBwLng7XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZy55ID0gcC55O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25VcChwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYic7XHJcblxyXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuZmFjZVN0YXRlID0gJ2lkbGUnO1xyXG5cclxuICAgICAgICBjb25zdCBiID0gdGhpcy5kcmFnZ2luZztcclxuICAgICAgICBjb25zdCBvID0gdGhpcy5kcmFnT3JpZ2luITtcclxuICAgICAgICBjb25zdCBkeCA9IHAueCAtIG8ueDtcclxuICAgICAgICBjb25zdCBkeSA9IHAueSAtIG8ueTtcclxuXHJcbiAgICAgICAgLy8gU25hcCBiYWNrIHZpc3VhbGx5XHJcbiAgICAgICAgYi54ID0gYi50YXJnZXRYO1xyXG4gICAgICAgIGIueSA9IGIudGFyZ2V0WTtcclxuXHJcbiAgICAgICAgbGV0IHRyID0gYi5yb3csIHRjID0gYi5jb2w7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1IHx8IE1hdGguYWJzKGR5KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1KSB7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuICAgICAgICAgICAgICAgIHRjICs9IGR4ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRyICs9IGR5ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5kcmFnT3JpZ2luID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRyID49IDAgJiYgdHIgPCB0aGlzLnJvd3MgJiYgdGMgPj0gMCAmJiB0YyA8IHRoaXMuY29scyAmJiAodHIgIT09IGIucm93IHx8IHRjICE9PSBiLmNvbCkpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWdpblN3YXAoYiwgdGhpcy5ncmlkW3RyXVt0Y10pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJlZ2luU3dhcChhOiBCYWxsLCBiOiBCYWxsKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zd2FwMSA9IGE7XHJcbiAgICAgICAgdGhpcy5zd2FwMiA9IGI7XHJcbiAgICAgICAgdGhpcy5zd2FwSXNSZXZlcnNlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIFN3YXAgaW4gZ3JpZFxyXG4gICAgICAgIHRoaXMuZ3JpZFthLnJvd11bYS5jb2xdID0gYjtcclxuICAgICAgICB0aGlzLmdyaWRbYi5yb3ddW2IuY29sXSA9IGE7XHJcblxyXG4gICAgICAgIGNvbnN0IFthciwgYWNdID0gW2Eucm93LCBhLmNvbF07XHJcbiAgICAgICAgYS5yb3cgPSBiLnJvdzsgYS5jb2wgPSBiLmNvbDtcclxuICAgICAgICBiLnJvdyA9IGFyOyBiLmNvbCA9IGFjO1xyXG5cclxuICAgICAgICBjb25zdCBwYSA9IHRoaXMucG9zKGEucm93LCBhLmNvbCk7XHJcbiAgICAgICAgY29uc3QgcGIgPSB0aGlzLnBvcyhiLnJvdywgYi5jb2wpO1xyXG4gICAgICAgIGEudGFyZ2V0WCA9IHBhLng7IGEudGFyZ2V0WSA9IHBhLnk7XHJcbiAgICAgICAgYi50YXJnZXRYID0gcGIueDsgYi50YXJnZXRZID0gcGIueTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNXQVBfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVuZG9Td2FwKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLnN3YXAxISwgYiA9IHRoaXMuc3dhcDIhO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRbYS5yb3ddW2EuY29sXSA9IGI7XHJcbiAgICAgICAgdGhpcy5ncmlkW2Iucm93XVtiLmNvbF0gPSBhO1xyXG5cclxuICAgICAgICBjb25zdCBbYXIsIGFjXSA9IFthLnJvdywgYS5jb2xdO1xyXG4gICAgICAgIGEucm93ID0gYi5yb3c7IGEuY29sID0gYi5jb2w7XHJcbiAgICAgICAgYi5yb3cgPSBhcjsgYi5jb2wgPSBhYztcclxuXHJcbiAgICAgICAgY29uc3QgcGEgPSB0aGlzLnBvcyhhLnJvdywgYS5jb2wpO1xyXG4gICAgICAgIGNvbnN0IHBiID0gdGhpcy5wb3MoYi5yb3csIGIuY29sKTtcclxuICAgICAgICBhLnRhcmdldFggPSBwYS54OyBhLnRhcmdldFkgPSBwYS55O1xyXG4gICAgICAgIGIudGFyZ2V0WCA9IHBiLng7IGIudGFyZ2V0WSA9IHBiLnk7XHJcblxyXG4gICAgICAgIHRoaXMuc3dhcElzUmV2ZXJzZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFVwZGF0ZSAvIERyYXcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVCYWxscygpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgYW5pbSA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspXHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ncmlkW3JdW2NdPy51cGRhdGUoKSkgYW5pbSA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIGFuaW07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIC8vIFBoeXNpY3NcclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IHRoaXMucGFydGljbGVzLmZpbHRlcihwID0+IHAudXBkYXRlKCkpO1xyXG4gICAgICAgIHRoaXMucG9wdXBzID0gdGhpcy5wb3B1cHMuZmlsdGVyKHAgPT4gcC51cGRhdGUoKSk7XHJcbiAgICAgICAgY29uc3QgYW5pbSA9IHRoaXMudXBkYXRlQmFsbHMoKTtcclxuICAgICAgICB1cGRhdGVGYWNlVGltZSgxIC8gNjApO1xyXG5cclxuICAgICAgICAvLyBTdGF0ZSBtYWNoaW5lXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU1dBUF9BTklNOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhbmltKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3dhcElzUmV2ZXJzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmluZE1hdGNoZXMoKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmRvU3dhcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tYm8gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkJSRUFLX0FOSU06XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuaW0pIHRoaXMuZ3Jhdml0eSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkZBTExfQU5JTTpcclxuICAgICAgICAgICAgICAgIGlmICghYW5pbSkgdGhpcy5wcm9jZXNzTWF0Y2hlcygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXcoKTtcclxuICAgICAgICB0aGlzLmFuaW1JZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnRpY2spO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGRyYXcoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgeyBjdHgsIGNhbnZhcyB9ID0gdGhpcztcclxuICAgICAgICBjb25zdCB3ID0gY2FudmFzLndpZHRoLCBoID0gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgLy8gQmFja2dyb3VuZFxyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzE0MTQxNCc7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIHcsIGgpO1xyXG5cclxuICAgICAgICAvLyBTdWJ0bGUgZ3JpZCBkb3RzXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpJztcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKSB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHggPSB0aGlzLm9mZnNldFggKyBjICogdGhpcy5jZWxsU2l6ZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHkgPSB0aGlzLm9mZnNldFkgKyByICogdGhpcy5jZWxsU2l6ZTtcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5hcmMoeCwgeSwgMS41LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBCYWxscyAobm9uLWRyYWdnaW5nIGZpcnN0KVxyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspXHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSB0aGlzLmdyaWRbcl1bY107XHJcbiAgICAgICAgICAgICAgICBpZiAoYiAmJiBiICE9PSB0aGlzLmRyYWdnaW5nKSBiLmRyYXcoY3R4KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBEcmFnZ2luZyBiYWxsIG9uIHRvcFxyXG4gICAgICAgIGlmICh0aGlzLmRyYWdnaW5nKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcuZHJhd1NlbGVjdGVkKGN0eCk7XHJcbiAgICAgICAgICAgIHRoaXMuZHJhZ2dpbmcuZHJhdyhjdHgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUGFydGljbGVzICYgcG9wdXBzXHJcbiAgICAgICAgZm9yIChjb25zdCBwIG9mIHRoaXMucGFydGljbGVzKSBwLmRyYXcoY3R4KTtcclxuICAgICAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5wb3B1cHMpIHAuZHJhdyhjdHgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBVSSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVVJKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuZWxTY29yZS50ZXh0Q29udGVudCA9IFN0cmluZyh0aGlzLnNjb3JlKTtcclxuICAgICAgICB0aGlzLmVsSGlnaC50ZXh0Q29udGVudCA9IFN0cmluZyh0aGlzLmhpZ2hTY29yZSk7XHJcbiAgICAgICAgaWYgKHRoaXMuY29tYm8gPiAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZWxDb21iby50ZXh0Q29udGVudCA9IGBDT01CTyB4JHt0aGlzLmNvbWJvfWA7XHJcbiAgICAgICAgICAgIHRoaXMuZWxDb21iby5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5lbENvbWJvLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIiwKICAgICJpbXBvcnQgeyBHYW1lIH0gZnJvbSAnLi9nYW1lLmpzJztcclxuXHJcbmNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXMnKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcclxuY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJykhO1xyXG5cclxuY29uc3QgZ2FtZSA9IG5ldyBHYW1lKGNhbnZhcywgY3R4KTtcclxuXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXJ0Jyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gZ2FtZS5yZXN0YXJ0KCkpO1xyXG4iCiAgXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsSUFBTSxjQUFjLElBQUk7QUFDeEIsSUFBTSxhQUFhO0FBRW5CLFNBQVMsUUFBUSxDQUFDLEtBQXVDO0FBQUEsRUFDckQsTUFBTSxJQUFJLFNBQVMsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQUEsRUFDbkMsT0FBTyxDQUFDLEtBQUssSUFBSyxLQUFLLElBQUssS0FBTSxJQUFJLEdBQUk7QUFBQTtBQUc5QyxTQUFTLFVBQVUsQ0FBQyxHQUFXLEdBQVcsR0FBcUM7QUFBQSxFQUMzRSxLQUFLO0FBQUEsRUFBSyxLQUFLO0FBQUEsRUFBSyxLQUFLO0FBQUEsRUFDekIsTUFBTSxLQUFLLEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQUssS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDO0FBQUEsRUFDbkQsSUFBSSxJQUFJLEdBQUcsSUFBSTtBQUFBLEVBQ2YsTUFBTSxLQUFLLEtBQUssTUFBTTtBQUFBLEVBQ3RCLElBQUksT0FBTyxJQUFJO0FBQUEsSUFDWCxNQUFNLElBQUksS0FBSztBQUFBLElBQ2YsSUFBSSxJQUFJLE1BQU0sS0FBSyxJQUFJLEtBQUssTUFBTSxLQUFLLEtBQUs7QUFBQSxJQUM1QyxRQUFRO0FBQUEsV0FDQztBQUFBLFFBQUcsTUFBTSxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksSUFBSSxNQUFNO0FBQUEsUUFBRztBQUFBLFdBQzVDO0FBQUEsUUFBRyxN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QUFTLGFBQWEsR0FBRztBQUFBLE1BQzlCLEtBQUssU0FBUyxLQUFLLEdBQUc7QUFBQSxJQUMxQjtBQUFBLElBR0EsV0FBVyxLQUFLLEtBQUs7QUFBQSxNQUFXLEVBQUUsS0FBSyxHQUFHO0FBQUEsSUFDMUMsV0FBVyxLQUFLLEtBQUs7QUFBQSxNQUFRLEVBQUUsS0FBSyxHQUFHO0FBQUE7QUFBQSxFQUtuQyxRQUFRLEdBQVM7QUFBQSxJQUNyQixLQUFLLFFBQVEsY0FBYyxPQUFPLEtBQUssS0FBSztBQUFBLElBQzVDLEtBQUssT0FBTyxjQUFjLE9BQU8sS0FBSyxTQUFTO0FBQUEsSUFDL0MsSUFBSSxLQUFLLFFBQVEsR0FBRztBQUFBLE1BQ2hCLEtBQUssUUFBUSxjQUFjLFVBQVUsS0FBSztBQUFBLE1BQzFDLEtBQUssUUFBUSxVQUFVLElBQUksU0FBUztBQUFBLElBQ3hDLEVBQU87QUFBQSxNQUNILEtBQUssUUFBUSxVQUFVLE9BQU8sU0FBUztBQUFBO0FBQUE7QUFHbkQ7OztBQzFmQSxJQUFNLFNBQVMsU0FBUyxlQUFlLFFBQVE7QUFDL0MsSUFBTSxNQUFNLE9BQU8sV0FBVyxJQUFJO0FBRWxDLElBQU0sT0FBTyxJQUFJLEtBQUssUUFBUSxHQUFHO0FBRWpDLFNBQVMsZUFBZSxTQUFTLEdBQUcsaUJBQWlCLFNBQVMsTUFBTSxLQUFLLFFBQVEsQ0FBQzsiLAogICJkZWJ1Z0lkIjogIjA2NEJERDU1NzAwNEU5QkE2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
