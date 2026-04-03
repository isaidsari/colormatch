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
  vy = 0;
  useGravity = false;
  squashY = 1;
  breathPhase;
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.targetX = x;
    this.targetY = y;
    this.breathPhase = Math.random() * Math.PI * 2;
  }
  update(speed = 0.3) {
    let moving = false;
    const dy = this.targetY - this.y;
    if (this.useGravity && dy > 1) {
      this.vy += 0.55;
      this.vy = Math.min(this.vy, 14);
      this.y += this.vy;
      if (this.y >= this.targetY) {
        const impactV = this.vy;
        this.y = this.targetY;
        this.vy = 0;
        this.useGravity = false;
        if (impactV > 4) {
          this.squashY = 1 - Math.min(0.04, impactV * 0.003);
        }
      }
      moving = true;
    } else if (Math.abs(dy) > 0.5) {
      this.y += dy * speed;
      if (Math.abs(this.targetY - this.y) <= 0.5)
        this.y = this.targetY;
      this.vy = 0;
      moving = true;
    } else {
      this.y = this.targetY;
      this.vy = 0;
    }
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 0.5) {
      this.x += dx * speed;
      moving = true;
    } else {
      this.x = this.targetX;
    }
    const ds = this.targetScale - this.scale;
    if (Math.abs(ds) > 0.01) {
      this.scale += ds * 0.35;
      moving = true;
    } else {
      this.scale = this.targetScale;
    }
    if (Math.abs(1 - this.squashY) > 0.002) {
      this.squashY += (1 - this.squashY) * 0.25;
      moving = true;
    } else {
      this.squashY = 1;
    }
    return moving;
  }
  draw(ctx) {
    if (this.scale < 0.02)
      return;
    const s = this.scale;
    const breath = this.faceState === "idle" && this.targetScale === 1 ? Math.sin(_faceTime * 2 + this.breathPhase) * 0.004 : 0;
    const sy = s * this.squashY * (1 - breath);
    const sx = s * (2 - this.squashY) * (1 + breath);
    const sprite = getSprite(this.color, this.radius);
    const sw = sprite.width;
    const sh = sprite.height;
    const dw = sw * sx;
    const dh = sh * sy;
    const anchorY = this.y + (sh * s - dh) * 0.5;
    ctx.drawImage(sprite, this.x - dw / 2, anchorY - dh / 2, dw, dh);
    if (s > 0.3) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(sx, sy);
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
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.radius * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ScorePopup {
  x;
  y;
  text;
  color;
  life = 1;
  age = 0;
  popScale;
  constructor(x, y, text, color, scale = 1) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.popScale = scale;
  }
  update() {
    this.y -= 1.2;
    this.life -= 0.025;
    this.age += 1 / 60;
    return this.life > 0;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    const t = Math.min(this.age * 6, 1);
    const elastic = t < 1 ? 1 - Math.pow(Math.cos(t * Math.PI * 0.5), 3) * (1 + 0.3 * Math.sin(t * Math.PI * 3)) : 1;
    const s = this.popScale * elastic;
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    const fontSize = Math.round(14 * this.popScale);
    ctx.font = `bold ${fontSize}px "Space Mono", "Courier New", monospace`;
    ctx.textAlign = "center";
    if (this.popScale > 1.1) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8 * this.popScale;
    }
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
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
  shakeX = 0;
  shakeY = 0;
  shakeMag = 0;
  flashAlpha = 0;
  flashColor = "#fff";
  comboDisplayAlpha = 0;
  comboDisplayScale = 1;
  comboDisplayText = "";
  comboDisplayColor = "#fff";
  score = 0;
  combo = 0;
  highScore = 0;
  elScore;
  elHigh;
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.offsetX = (canvas.width - (this.cols - 1) * this.cellSize) / 2;
    this.offsetY = (canvas.height - (this.rows - 1) * this.cellSize) / 2;
    this.elScore = document.getElementById("score");
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
    const intensity = Math.min(this.combo, 6);
    const burstCount = 6 + intensity * 3;
    let sumX = 0, sumY = 0;
    for (const b of set) {
      this.spawnBurst(b.x, b.y, b.color, burstCount);
      b.targetScale = 0;
      sumX += b.x;
      sumY += b.y;
    }
    const cx = sumX / set.size;
    const cy = sumY / set.size;
    if (this.combo >= 2) {
      this.shakeMag = Math.min(3 + intensity * 2, 14);
    }
    if (this.combo >= 3) {
      this.flashAlpha = Math.min(0.12 + intensity * 0.04, 0.35);
      const colors = [...set].map((b) => b.color);
      this.flashColor = colors[0];
    }
    const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
    const popupScale = this.combo > 1 ? 1 + Math.min(intensity * 0.15, 0.6) : 1;
    this.popups.push(new ScorePopup(cx, cy - 10, label, "#fff", popupScale));
    if (this.combo >= 2) {
      const colors = [...set].map((b) => b.color);
      this.comboDisplayText = `COMBO x${this.combo}`;
      this.comboDisplayAlpha = 1;
      this.comboDisplayScale = 1.6;
      this.comboDisplayColor = colors[0];
    }
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
            b.useGravity = true;
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
        nb.useGravity = true;
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
    if (this.shakeMag > 0.3) {
      this.shakeX = (Math.random() - 0.5) * this.shakeMag * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeMag * 2;
      this.shakeMag *= 0.88;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeMag = 0;
    }
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    ctx.fillStyle = "#141414";
    ctx.fillRect(-10, -10, w + 20, h + 20);
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
    if (this.flashAlpha > 0.005) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(-10, -10, w + 20, h + 20);
      ctx.globalAlpha = 1;
      this.flashAlpha *= 0.85;
    }
    if (this.comboDisplayAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.comboDisplayAlpha;
      const s = this.comboDisplayScale;
      const bx = w / 2;
      const by = 38;
      ctx.translate(bx, by);
      ctx.scale(s, s);
      ctx.font = 'bold 22px "Space Mono", "Courier New", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = this.comboDisplayColor;
      ctx.shadowBlur = 16;
      ctx.fillStyle = this.comboDisplayColor;
      ctx.fillText(this.comboDisplayText, 0, 0);
      ctx.shadowBlur = 8;
      ctx.fillText(this.comboDisplayText, 0, 0);
      ctx.restore();
      this.comboDisplayScale += (1 - this.comboDisplayScale) * 0.15;
      this.comboDisplayAlpha -= 0.012;
    }
    ctx.restore();
  }
  updateUI() {
    this.elScore.textContent = String(this.score);
    this.elHigh.textContent = String(this.highScore);
  }
}

// src/script.ts
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var game = new Game(canvas, ctx);
document.getElementById("restart")?.addEventListener("click", () => game.restart());
