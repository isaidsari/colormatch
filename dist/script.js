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
  { mouth: "smirk", lookBias: 0, brow: { angle: 0.15, offsetY: 0, curve: 0.2 } },
  { mouth: "open", lookBias: 0, brow: { angle: -0.1, offsetY: -0.02, curve: 0.4 } },
  { mouth: "grin", lookBias: 0, brow: { angle: 0, offsetY: 0, curve: 0.3 } },
  { mouth: "smug", lookBias: 0.5, brow: { angle: 0.2, offsetY: 0.02, curve: 0.1 } },
  { mouth: "flat", lookBias: -0.3, brow: { angle: 0, offsetY: 0.03, curve: 0 } },
  { mouth: "worried", lookBias: 0, brow: { angle: -0.2, offsetY: -0.01, curve: 0.3 } }
];
var _faceTime = 0;
function updateFaceTime(dt) {
  _faceTime += dt;
}
function getFaceTime() {
  return _faceTime;
}
function drawFace(ctx, x, y, r, colorIndex, state, lookAtDx = 0, lookAtDy = 0, lookAtAmt = 0) {
  const t = _faceTime;
  const p = PERSONALITIES[colorIndex] ?? PERSONALITIES[0];
  const span = r * 0.32;
  const eyeY = -r * 0.15;
  const dotR = r * 0.09;
  const blink = Math.sin(t * 1.7 + colorIndex * 1.4) > 0.93;
  const idleLx = (Math.sin(t * 0.7 + colorIndex * 0.8) + p.lookBias) * 1.5;
  const idleLy = Math.cos(t * 0.6 + colorIndex) * 0.5;
  const lookDist = Math.hypot(lookAtDx, lookAtDy) || 1;
  const targetLx = lookAtDx / lookDist * 3;
  const targetLy = lookAtDy / lookDist * 1.5;
  const lx = state === "scared" ? Math.sin(t * 7 + colorIndex) * 3 : idleLx * (1 - lookAtAmt) + targetLx * lookAtAmt;
  const ly = state === "scared" ? -1 : idleLy * (1 - lookAtAmt) + targetLy * lookAtAmt;
  ctx.save();
  ctx.translate(x, y);
  const browY = eyeY - r * 0.18;
  const browW = r * 0.16;
  ctx.strokeStyle = "#1a1612";
  ctx.lineWidth = r * 0.04;
  ctx.lineCap = "round";
  if (state === "scared") {
    for (const side of [-1, 1]) {
      const bx = side * span;
      ctx.beginPath();
      ctx.moveTo(bx - side * browW, browY + r * 0.04);
      ctx.lineTo(bx + side * browW, browY - r * 0.06);
      ctx.stroke();
    }
  } else if (state === "selected") {
    for (const side of [-1, 1]) {
      const bx = side * span;
      ctx.beginPath();
      ctx.moveTo(bx - browW, browY - r * 0.03);
      ctx.quadraticCurveTo(bx, browY - r * 0.1, bx + browW, browY - r * 0.03);
      ctx.stroke();
    }
  } else if (!blink) {
    const b = p.brow;
    for (const side of [-1, 1]) {
      const bx = side * span;
      const bAngle = b.angle * side;
      const by = browY + b.offsetY * r;
      ctx.beginPath();
      if (b.curve > 0.05) {
        const x1 = bx - browW;
        const y1 = by + Math.sin(bAngle) * browW;
        const x2 = bx + browW;
        const y2 = by - Math.sin(bAngle) * browW;
        const cpY = by - b.curve * r * 0.15;
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(bx, cpY, x2, y2);
      } else {
        ctx.moveTo(bx - browW, by + Math.sin(bAngle) * browW);
        ctx.lineTo(bx + browW, by - Math.sin(bAngle) * browW);
      }
      ctx.stroke();
    }
  }
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
  lookAtX = 0;
  lookAtY = 0;
  lookAtAmount = 0;
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
    if (this.lookAtAmount > 0.01) {
      this.lookAtAmount *= 0.93;
    } else {
      this.lookAtAmount = 0;
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
      drawFace(ctx, this.x, this.y, this.radius, this.colorIndex, this.faceState, this.lookAtX - this.x, this.lookAtY - this.y, this.lookAtAmount);
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
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
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
  onTickAmbient;
  grid = [];
  rows = 12;
  cols = 8;
  cellSize = 44;
  ballRadius = 18;
  offsetX;
  offsetY;
  logicalW;
  logicalH;
  gridDotCache = null;
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
  idleTimer = 0;
  hintMove = null;
  HINT_DELAY = 5;
  score = 0;
  displayScore = 0;
  displayHigh = 0;
  combo = 0;
  highScore = 0;
  elScore;
  elHigh;
  constructor(canvas, ctx, logicalW = 380, logicalH = 600, onTickAmbient) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.onTickAmbient = onTickAmbient;
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.offsetX = (logicalW - (this.cols - 1) * this.cellSize) / 2;
    this.offsetY = (logicalH - (this.rows - 1) * this.cellSize) / 2;
    this.elScore = document.getElementById("score");
    this.elHigh = document.getElementById("high-score");
    this.highScore = parseInt(localStorage.getItem("colormatch-hs") || "0");
    this.buildGridDotCache();
    this.bindEvents();
    this.init();
  }
  init() {
    cancelAnimationFrame(this.animId);
    this.score = 0;
    this.displayScore = 0;
    this.displayHigh = this.highScore;
    this.combo = 0;
    this.particles = [];
    this.popups = [];
    this.state = 4 /* FALL_ANIM */;
    this.elScore.textContent = "0";
    this.elHigh.textContent = String(this.highScore);
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
        b.y = b.targetY - this.logicalH - r * 20 - Math.random() * 10;
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
  buildGridDotCache() {
    const oc = new OffscreenCanvas(this.logicalW, this.logicalH);
    const ctx = oc.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        ctx.beginPath();
        ctx.arc(this.offsetX + c * this.cellSize, this.offsetY + r * this.cellSize, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.gridDotCache = oc;
  }
  swapCreatesMatch(r1, c1, r2, c2) {
    const g = this.grid;
    const tmpColor = g[r1][c1].color;
    const tmpIdx = g[r1][c1].colorIndex;
    g[r1][c1].color = g[r2][c2].color;
    g[r1][c1].colorIndex = g[r2][c2].colorIndex;
    g[r2][c2].color = tmpColor;
    g[r2][c2].colorIndex = tmpIdx;
    const hasMatch = this.findMatches().length > 0;
    g[r2][c2].color = g[r1][c1].color;
    g[r2][c2].colorIndex = g[r1][c1].colorIndex;
    g[r1][c1].color = tmpColor;
    g[r1][c1].colorIndex = tmpIdx;
    return hasMatch;
  }
  findValidMove() {
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        if (c + 1 < this.cols && this.swapCreatesMatch(r, c, r, c + 1)) {
          return [r, c, r, c + 1];
        }
        if (r + 1 < this.rows && this.swapCreatesMatch(r, c, r + 1, c)) {
          return [r, c, r + 1, c];
        }
      }
    }
    return null;
  }
  shuffleGrid() {
    const colors = [];
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++)
        colors.push({ color: this.grid[r][c].color, idx: this.grid[r][c].colorIndex });
    for (let i = colors.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    let k = 0;
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        this.grid[r][c].color = colors[k].color;
        this.grid[r][c].colorIndex = colors[k].idx;
        k++;
      }
    this.purgeInitialMatches();
  }
  processMatches() {
    const matches = this.findMatches();
    if (matches.length === 0) {
      this.combo = 0;
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++)
          this.grid[r][c].faceState = "idle";
      if (!this.findValidMove()) {
        this.shuffleGrid();
        if (!this.findValidMove()) {
          this.shuffleGrid();
        }
      }
      this.state = 0 /* IDLE */;
      this.idleTimer = 0;
      this.hintMove = null;
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
    const burstCount = 8 + intensity * 4;
    let sumX = 0, sumY = 0;
    for (const b of set) {
      this.spawnBurst(b.x, b.y, b.color, burstCount);
      b.targetScale = 0;
      sumX += b.x;
      sumY += b.y;
    }
    const cx = sumX / set.size;
    const cy = sumY / set.size;
    this.shakeMag = Math.min(2 + intensity * 1.5, 12);
    if (this.combo >= 2) {
      this.flashAlpha = Math.min(0.08 + intensity * 0.03, 0.28);
      const colors = [...set].map((b) => b.color);
      this.flashColor = colors[0];
    }
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        const nb = this.grid[r][c];
        if (nb && !set.has(nb) && nb.targetScale > 0.5) {
          const dist = Math.hypot(nb.x - cx, nb.y - cy);
          if (dist < this.cellSize * 4) {
            nb.lookAtX = cx;
            nb.lookAtY = cy;
            nb.lookAtAmount = Math.min(1, this.cellSize * 4 / (dist + 1));
          }
        }
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
      const a = Math.PI * 2 * i / n + Math.random() * 0.5;
      const spd = 3 + Math.random() * 4;
      this.particles.push(new Particle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, 2.5 + Math.random() * 4, color));
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
    const sx = this.logicalW / r.width;
    const sy = this.logicalH / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }
  touchXY(e) {
    const t = e.touches[0] || e.changedTouches[0];
    const r = this.canvas.getBoundingClientRect();
    const sx = this.logicalW / r.width;
    const sy = this.logicalH / r.height;
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
    this.idleTimer = 0;
    this.hintMove = null;
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
  tick = (now = 0) => {
    this.onTickAmbient?.(now);
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
      case 0 /* IDLE */:
        this.idleTimer += 1 / 60;
        if (!this.hintMove && this.idleTimer >= this.HINT_DELAY) {
          this.hintMove = this.findValidMove();
        }
        break;
    }
    this.tickUI();
    this.draw();
    this.animId = requestAnimationFrame(this.tick);
  };
  draw() {
    const { ctx } = this;
    const w = this.logicalW, h = this.logicalH;
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
    if (this.gridDotCache)
      ctx.drawImage(this.gridDotCache, 0, 0);
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
    if (this.hintMove) {
      const [r1, c1, r2, c2] = this.hintMove;
      const pulse = 0.3 + Math.sin(getFaceTime() * 3) * 0.15;
      const b1 = this.grid[r1][c1];
      const b2 = this.grid[r2][c2];
      for (const b of [b1, b2]) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, this.ballRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
      }
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
  updateUI() {}
  tickUI() {
    let changed = false;
    if (this.displayScore < this.score) {
      const step = Math.max(1, Math.ceil((this.score - this.displayScore) * 0.15));
      this.displayScore = Math.min(this.displayScore + step, this.score);
      this.elScore.textContent = String(this.displayScore);
      changed = true;
    }
    if (this.displayHigh < this.highScore) {
      const step = Math.max(1, Math.ceil((this.highScore - this.displayHigh) * 0.15));
      this.displayHigh = Math.min(this.displayHigh + step, this.highScore);
      this.elHigh.textContent = String(this.displayHigh);
      changed = true;
    }
    if (changed) {
      this.elScore.classList.add("bump");
      if (this.displayHigh > parseInt(this.elHigh.textContent || "0")) {
        this.elHigh.classList.add("bump");
      }
    } else {
      this.elScore.classList.remove("bump");
      this.elHigh.classList.remove("bump");
    }
  }
}

// src/ambient.ts
var COLORS2 = ["#E74C3C", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6", "#E67E22"];
var COUNT = 8;
var balls = [];
var ambientCtx = null;
var lastAmbientTick = 0;
var AMBIENT_INTERVAL = 1000 / 30;
function initAmbient(canvas) {
  canvas.style.filter = "blur(45px)";
  canvas.style.transform = "scale(1.08)";
  ambientCtx = canvas.getContext("2d");
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  balls = Array.from({ length: COUNT }, (_, i) => {
    const baseR = 65 + Math.random() * 85;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: baseR,
      baseR,
      angle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      wobbleAmp: 30 + Math.random() * 50,
      wobbleFreq: 0.3 + Math.random() * 0.4,
      wobblePhase: Math.random() * Math.PI * 2,
      baseAlpha: 0.3 + Math.random() * 0.2,
      alphaAmp: 0.08 + Math.random() * 0.08,
      alphaFreq: 0.2 + Math.random() * 0.3,
      alphaPhase: Math.random() * Math.PI * 2,
      rAmp: baseR * 0.12,
      rFreq: 0.15 + Math.random() * 0.2,
      rPhase: Math.random() * Math.PI * 2,
      color: COLORS2[i % COLORS2.length],
      t: Math.random() * 100
    };
  });
}
function tickAmbient(now) {
  if (!ambientCtx || now - lastAmbientTick < AMBIENT_INTERVAL)
    return;
  lastAmbientTick = now;
  const ctx = ambientCtx;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  for (const b of balls) {
    b.t += 0.033;
    b.angle += (Math.random() - 0.5) * 0.008;
    const vx = Math.cos(b.angle) * b.speed;
    const vy = Math.sin(b.angle) * b.speed;
    const perpX = -Math.sin(b.angle);
    const perpY = Math.cos(b.angle);
    const wobble = Math.sin(b.t * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp * 0.033;
    b.x += vx + perpX * wobble;
    b.y += vy + perpY * wobble;
    if (b.x < -b.r)
      b.x = w + b.r;
    if (b.x > w + b.r)
      b.x = -b.r;
    if (b.y < -b.r)
      b.y = h + b.r;
    if (b.y > h + b.r)
      b.y = -b.r;
    b.r = b.baseR + Math.sin(b.t * b.rFreq + b.rPhase) * b.rAmp;
    ctx.globalAlpha = Math.max(0, b.baseAlpha + Math.sin(b.t * b.alphaFreq + b.alphaPhase) * b.alphaAmp);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// src/script.ts
var bgCanvas = document.getElementById("bg-canvas");
initAmbient(bgCanvas);
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var dpr = window.devicePixelRatio || 1;
var logicalW = 380;
var logicalH = 600;
canvas.width = logicalW * dpr;
canvas.height = logicalH * dpr;
canvas.style.width = `${logicalW}px`;
canvas.style.height = `${logicalH}px`;
ctx.scale(dpr, dpr);
var game = new Game(canvas, ctx, logicalW, logicalH, tickAmbient);
document.getElementById("restart")?.addEventListener("click", () => game.restart());

//# debugId=7771D9723BEBB63B64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXHNyY1xcYmFsbHMudHMiLCAiLi5cXHNyY1xccGFydGljbGUudHMiLCAiLi5cXHNyY1xcZ2FtZS50cyIsICIuLlxcc3JjXFxhbWJpZW50LnRzIiwgIi4uXFxzcmNcXHNjcmlwdC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICIvLyDilIDilIAgU3ByaXRlIGNhY2hlIChib2R5IG9ubHkg4oCUIGdyYWRpZW50LCBoaWdobGlnaHQsIHNoYWRvdykg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcbmNvbnN0IHNwcml0ZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE9mZnNjcmVlbkNhbnZhcz4oKTtcclxuY29uc3QgU1BSSVRFX1BBRCA9IDY7XHJcblxyXG5mdW5jdGlvbiBoZXhUb1JnYihoZXg6IHN0cmluZyk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XHJcbiAgICBjb25zdCBuID0gcGFyc2VJbnQoaGV4LnNsaWNlKDEpLCAxNik7XHJcbiAgICByZXR1cm4gW24gPj4gMTYsIChuID4+IDgpICYgMHhmZiwgbiAmIDB4ZmZdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoc2xGcm9tUmdiKHI6IG51bWJlciwgZzogbnVtYmVyLCBiOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xyXG4gICAgciAvPSAyNTU7IGcgLz0gMjU1OyBiIC89IDI1NTtcclxuICAgIGNvbnN0IG14ID0gTWF0aC5tYXgociwgZywgYiksIG1uID0gTWF0aC5taW4ociwgZywgYik7XHJcbiAgICBsZXQgaCA9IDAsIHMgPSAwO1xyXG4gICAgY29uc3QgbCA9IChteCArIG1uKSAvIDI7XHJcbiAgICBpZiAobXggIT09IG1uKSB7XHJcbiAgICAgICAgY29uc3QgZCA9IG14IC0gbW47XHJcbiAgICAgICAgcyA9IGwgPiAwLjUgPyBkIC8gKDIgLSBteCAtIG1uKSA6IGQgLyAobXggKyBtbik7XHJcbiAgICAgICAgc3dpdGNoIChteCkge1xyXG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCkpIC8gNjsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgZzogaCA9ICgoYiAtIHIpIC8gZCArIDIpIC8gNjsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgYjogaCA9ICgociAtIGcpIC8gZCArIDQpIC8gNjsgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIFtoICogMzYwLCBzICogMTAwLCBsICogMTAwXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3ByaXRlKGNvbG9yOiBzdHJpbmcsIHJhZGl1czogbnVtYmVyKTogT2Zmc2NyZWVuQ2FudmFzIHtcclxuICAgIGNvbnN0IGtleSA9IGAke2NvbG9yfV8ke3JhZGl1c31gO1xyXG4gICAgbGV0IGNhY2hlZCA9IHNwcml0ZUNhY2hlLmdldChrZXkpO1xyXG4gICAgaWYgKGNhY2hlZCkgcmV0dXJuIGNhY2hlZDtcclxuXHJcbiAgICBjb25zdCBzaXplID0gKHJhZGl1cyArIFNQUklURV9QQUQpICogMjtcclxuICAgIGNvbnN0IG9jID0gbmV3IE9mZnNjcmVlbkNhbnZhcyhzaXplLCBzaXplKTtcclxuICAgIGNvbnN0IGN0eCA9IG9jLmdldENvbnRleHQoJzJkJykhO1xyXG4gICAgY29uc3QgY3ggPSByYWRpdXMgKyBTUFJJVEVfUEFEO1xyXG4gICAgY29uc3QgY3kgPSBjeDtcclxuICAgIGNvbnN0IHIgPSByYWRpdXM7XHJcbiAgICBjb25zdCByZ2IgPSBoZXhUb1JnYihjb2xvcik7XHJcbiAgICBjb25zdCBbaCwgcywgbF0gPSBoc2xGcm9tUmdiKHJnYlswXSwgcmdiWzFdLCByZ2JbMl0pO1xyXG5cclxuICAgIC8vIFNoYWRvd1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCArIDEsIGN5ICsgMywgciArIDIsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgwLDAsMCwwLjE4KSc7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoY3ggKyAwLjUsIGN5ICsgMS41LCByICsgMC41LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMC4xMiknO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAvLyBCb2R5IGdyYWRpZW50XHJcbiAgICBjb25zdCBncmFkID0gY3R4LmNyZWF0ZVJhZGlhbEdyYWRpZW50KFxyXG4gICAgICAgIGN4IC0gciAqIDAuMywgY3kgLSByICogMC4zLCByICogMC4wNSxcclxuICAgICAgICBjeCArIHIgKiAwLjA4LCBjeSArIHIgKiAwLjEyLCByICogMS4wNSxcclxuICAgICk7XHJcbiAgICBncmFkLmFkZENvbG9yU3RvcCgwLCBgaHNsKCR7aH0sJHtNYXRoLm1pbigxMDAsIHMgKyA1KX0lLCR7TWF0aC5taW4oODgsIGwgKyAyMil9JSlgKTtcclxuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuNDUsIGNvbG9yKTtcclxuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuODUsIGBoc2woJHtofSwke01hdGgubWluKDEwMCwgcyArIDUpfSUsJHtNYXRoLm1heCgxMiwgbCAtIDE2KX0lKWApO1xyXG4gICAgZ3JhZC5hZGRDb2xvclN0b3AoMSwgYGhzbCgke2h9LCR7TWF0aC5taW4oMTAwLCBzICsgOCl9JSwke01hdGgubWF4KDgsIGwgLSAyNil9JSlgKTtcclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoY3gsIGN5LCByLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gZ3JhZDtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgLy8gU3BlY3VsYXIgaGlnaGxpZ2h0XHJcbiAgICBjb25zdCBobCA9IGN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcclxuICAgICAgICBjeCAtIHIgKiAwLjIyLCBjeSAtIHIgKiAwLjI2LCAwLFxyXG4gICAgICAgIGN4IC0gciAqIDAuMDgsIGN5IC0gciAqIDAuMSwgciAqIDAuNSxcclxuICAgICk7XHJcbiAgICBobC5hZGRDb2xvclN0b3AoMCwgJ3JnYmEoMjU1LDI1NSwyNTUsMC40KScpO1xyXG4gICAgaGwuYWRkQ29sb3JTdG9wKDAuNiwgJ3JnYmEoMjU1LDI1NSwyNTUsMC4wOCknKTtcclxuICAgIGhsLmFkZENvbG9yU3RvcCgxLCAncmdiYSgyNTUsMjU1LDI1NSwwKScpO1xyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCwgY3ksIHIsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBobDtcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgc3ByaXRlQ2FjaGUuc2V0KGtleSwgb2MpO1xyXG4gICAgcmV0dXJuIG9jO1xyXG59XHJcblxyXG4vLyDilIDilIAgRmFjZSBkZWZpbml0aW9ucyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbnR5cGUgTW91dGhUeXBlID0gJ3NtaXJrJyB8ICdvcGVuJyB8ICdncmluJyB8ICdzbXVnJyB8ICdmbGF0JyB8ICd3b3JyaWVkJztcclxudHlwZSBGYWNlU3RhdGUgPSAnaWRsZScgfCAnc2VsZWN0ZWQnIHwgJ3NjYXJlZCc7XHJcblxyXG4vLyBFeWVicm93IHNoYXBlOiBhbmdsZSAocmFkaWFucykgYW5kIHZlcnRpY2FsIG9mZnNldCBwZXIgcGVyc29uYWxpdHlcclxuaW50ZXJmYWNlIEJyb3dEZWYge1xyXG4gICAgYW5nbGU6IG51bWJlcjsgICAgICAvLyB0aWx0IGluIHJhZGlhbnMgKHBvc2l0aXZlID0gaW5uZXItdXAsIGFuZ3J5IGxvb2spXHJcbiAgICBvZmZzZXRZOiBudW1iZXI7ICAgIC8vIHZlcnRpY2FsIHNoaWZ0IGZyb20gZGVmYXVsdCBwb3NpdGlvblxyXG4gICAgY3VydmU6IG51bWJlcjsgICAgICAvLyBjdXJ2YXR1cmUgYW1vdW50ICgwID0gc3RyYWlnaHQsIHBvc2l0aXZlID0gYXJjaGVkKVxyXG59XHJcblxyXG5pbnRlcmZhY2UgUGVyc29uYWxpdHkge1xyXG4gICAgbW91dGg6IE1vdXRoVHlwZTtcclxuICAgIGxvb2tCaWFzOiBudW1iZXI7XHJcbiAgICBicm93OiBCcm93RGVmO1xyXG59XHJcblxyXG4vLyBFYWNoIGNvbG9yIGluZGV4IG1hcHMgdG8gYSBwZXJzb25hbGl0eVxyXG5jb25zdCBQRVJTT05BTElUSUVTOiBQZXJzb25hbGl0eVtdID0gW1xyXG4gICAgeyBtb3V0aDogJ3NtaXJrJywgICBsb29rQmlhczogMCwgICAgYnJvdzogeyBhbmdsZTogMC4xNSwgb2Zmc2V0WTogMCwgY3VydmU6IDAuMiB9IH0sICAgICAvLyByZWQg4oCUIGNvbmZpZGVudCwgc2xpZ2h0IGFyY2hcclxuICAgIHsgbW91dGg6ICdvcGVuJywgICAgbG9va0JpYXM6IDAsICAgIGJyb3c6IHsgYW5nbGU6IC0wLjEsIG9mZnNldFk6IC0wLjAyLCBjdXJ2ZTogMC40IH0gfSwgIC8vIHllbGxvdyDigJQgc3VycHJpc2VkLCByYWlzZWRcclxuICAgIHsgbW91dGg6ICdncmluJywgICAgbG9va0JpYXM6IDAsICAgIGJyb3c6IHsgYW5nbGU6IDAsIG9mZnNldFk6IDAsIGN1cnZlOiAwLjMgfSB9LCAgICAgICAgIC8vIGdyZWVuIOKAlCBoYXBweSwgcmVsYXhlZCBhcmNoXHJcbiAgICB7IG1vdXRoOiAnc211ZycsICAgIGxvb2tCaWFzOiAwLjUsICBicm93OiB7IGFuZ2xlOiAwLjIsIG9mZnNldFk6IDAuMDIsIGN1cnZlOiAwLjEgfSB9LCAgIC8vIGJsdWUg4oCUIGNvb2wsIG9uZSBicm93IHVwXHJcbiAgICB7IG1vdXRoOiAnZmxhdCcsICAgIGxvb2tCaWFzOiAtMC4zLCBicm93OiB7IGFuZ2xlOiAwLCBvZmZzZXRZOiAwLjAzLCBjdXJ2ZTogMCB9IH0sICAgICAgICAvLyB2aW9sZXQg4oCUIGJvcmVkLCBmbGF0IGxvdyBicm93c1xyXG4gICAgeyBtb3V0aDogJ3dvcnJpZWQnLCBsb29rQmlhczogMCwgICAgYnJvdzogeyBhbmdsZTogLTAuMiwgb2Zmc2V0WTogLTAuMDEsIGN1cnZlOiAwLjMgfSB9LCAgLy8gb3JhbmdlIOKAlCBuZXJ2b3VzLCBpbm5lci11cFxyXG5dO1xyXG5cclxuLy8gR2xvYmFsIGFuaW1hdGlvbiB0aW1lIOKAlCB1cGRhdGVkIGVhY2ggZnJhbWUgYnkgdGhlIGdhbWUgbG9vcFxyXG5sZXQgX2ZhY2VUaW1lID0gMDtcclxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUZhY2VUaW1lKGR0OiBudW1iZXIpOiB2b2lkIHtcclxuICAgIF9mYWNlVGltZSArPSBkdDtcclxufVxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmFjZVRpbWUoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBfZmFjZVRpbWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdGYWNlKFxyXG4gICAgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsXHJcbiAgICB4OiBudW1iZXIsXHJcbiAgICB5OiBudW1iZXIsXHJcbiAgICByOiBudW1iZXIsXHJcbiAgICBjb2xvckluZGV4OiBudW1iZXIsXHJcbiAgICBzdGF0ZTogRmFjZVN0YXRlLFxyXG4gICAgbG9va0F0RHg6IG51bWJlciA9IDAsXHJcbiAgICBsb29rQXREeTogbnVtYmVyID0gMCxcclxuICAgIGxvb2tBdEFtdDogbnVtYmVyID0gMCxcclxuKTogdm9pZCB7XHJcbiAgICBjb25zdCB0ID0gX2ZhY2VUaW1lO1xyXG4gICAgY29uc3QgcCA9IFBFUlNPTkFMSVRJRVNbY29sb3JJbmRleF0gPz8gUEVSU09OQUxJVElFU1swXTtcclxuXHJcbiAgICAvLyDilIDilIAgRXllcyDilIDilIBcclxuICAgIGNvbnN0IHNwYW4gPSByICogMC4zMjtcclxuICAgIGNvbnN0IGV5ZVkgPSAtciAqIDAuMTU7XHJcbiAgICBjb25zdCBkb3RSID0gciAqIDAuMDk7XHJcbiAgICBjb25zdCBibGluayA9IE1hdGguc2luKHQgKiAxLjcgKyBjb2xvckluZGV4ICogMS40KSA+IDAuOTM7XHJcblxyXG4gICAgLy8gSWRsZSBnYXplXHJcbiAgICBjb25zdCBpZGxlTHggPSAoTWF0aC5zaW4odCAqIDAuNyArIGNvbG9ySW5kZXggKiAwLjgpICsgcC5sb29rQmlhcykgKiAxLjU7XHJcbiAgICBjb25zdCBpZGxlTHkgPSBNYXRoLmNvcyh0ICogMC42ICsgY29sb3JJbmRleCkgKiAwLjU7XHJcblxyXG4gICAgLy8gTG9va0F0IGdhemUg4oCUIG5vcm1hbGl6ZSBkaXJlY3Rpb25cclxuICAgIGNvbnN0IGxvb2tEaXN0ID0gTWF0aC5oeXBvdChsb29rQXREeCwgbG9va0F0RHkpIHx8IDE7XHJcbiAgICBjb25zdCB0YXJnZXRMeCA9IChsb29rQXREeCAvIGxvb2tEaXN0KSAqIDM7XHJcbiAgICBjb25zdCB0YXJnZXRMeSA9IChsb29rQXREeSAvIGxvb2tEaXN0KSAqIDEuNTtcclxuXHJcbiAgICAvLyBCbGVuZCBiZXR3ZWVuIGlkbGUgYW5kIGxvb2tBdFxyXG4gICAgY29uc3QgbHggPSBzdGF0ZSA9PT0gJ3NjYXJlZCdcclxuICAgICAgICA/IE1hdGguc2luKHQgKiA3ICsgY29sb3JJbmRleCkgKiAzXHJcbiAgICAgICAgOiBpZGxlTHggKiAoMSAtIGxvb2tBdEFtdCkgKyB0YXJnZXRMeCAqIGxvb2tBdEFtdDtcclxuICAgIGNvbnN0IGx5ID0gc3RhdGUgPT09ICdzY2FyZWQnXHJcbiAgICAgICAgPyAtMVxyXG4gICAgICAgIDogaWRsZUx5ICogKDEgLSBsb29rQXRBbXQpICsgdGFyZ2V0THkgKiBsb29rQXRBbXQ7XHJcblxyXG4gICAgY3R4LnNhdmUoKTtcclxuICAgIGN0eC50cmFuc2xhdGUoeCwgeSk7XHJcblxyXG4gICAgLy8g4pSA4pSAIEV5ZWJyb3dzIOKUgOKUgFxyXG4gICAgY29uc3QgYnJvd1kgPSBleWVZIC0gciAqIDAuMTg7XHJcbiAgICBjb25zdCBicm93VyA9IHIgKiAwLjE2O1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gJyMxYTE2MTInO1xyXG4gICAgY3R4LmxpbmVXaWR0aCA9IHIgKiAwLjA0O1xyXG4gICAgY3R4LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cclxuICAgIGlmIChzdGF0ZSA9PT0gJ3NjYXJlZCcpIHtcclxuICAgICAgICAvLyBTY2FyZWQ6IGlubmVyLXVwIHdvcnJpZWQgYnJvd3NcclxuICAgICAgICBmb3IgKGNvbnN0IHNpZGUgb2YgWy0xLCAxXSkge1xyXG4gICAgICAgICAgICBjb25zdCBieCA9IHNpZGUgKiBzcGFuO1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8oYnggLSBzaWRlICogYnJvd1csIGJyb3dZICsgciAqIDAuMDQpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKGJ4ICsgc2lkZSAqIGJyb3dXLCBicm93WSAtIHIgKiAwLjA2KTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09ICdzZWxlY3RlZCcpIHtcclxuICAgICAgICAvLyBTZWxlY3RlZDogcmFpc2VkIGhhcHB5IGJyb3dzXHJcbiAgICAgICAgZm9yIChjb25zdCBzaWRlIG9mIFstMSwgMV0pIHtcclxuICAgICAgICAgICAgY29uc3QgYnggPSBzaWRlICogc3BhbjtcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGJ4IC0gYnJvd1csIGJyb3dZIC0gciAqIDAuMDMpO1xyXG4gICAgICAgICAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhieCwgYnJvd1kgLSByICogMC4xLCBieCArIGJyb3dXLCBicm93WSAtIHIgKiAwLjAzKTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoIWJsaW5rKSB7XHJcbiAgICAgICAgLy8gUGVyc29uYWxpdHkgYnJvd3NcclxuICAgICAgICBjb25zdCBiID0gcC5icm93O1xyXG4gICAgICAgIGZvciAoY29uc3Qgc2lkZSBvZiBbLTEsIDFdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJ4ID0gc2lkZSAqIHNwYW47XHJcbiAgICAgICAgICAgIGNvbnN0IGJBbmdsZSA9IGIuYW5nbGUgKiBzaWRlOyAvLyBtaXJyb3IgYW5nbGUgZm9yIGVhY2ggc2lkZVxyXG4gICAgICAgICAgICBjb25zdCBieSA9IGJyb3dZICsgYi5vZmZzZXRZICogcjtcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBpZiAoYi5jdXJ2ZSA+IDAuMDUpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFyY2hlZCBicm93XHJcbiAgICAgICAgICAgICAgICBjb25zdCB4MSA9IGJ4IC0gYnJvd1c7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5MSA9IGJ5ICsgTWF0aC5zaW4oYkFuZ2xlKSAqIGJyb3dXO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeDIgPSBieCArIGJyb3dXO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeTIgPSBieSAtIE1hdGguc2luKGJBbmdsZSkgKiBicm93VztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNwWSA9IGJ5IC0gYi5jdXJ2ZSAqIHIgKiAwLjE1O1xyXG4gICAgICAgICAgICAgICAgY3R4Lm1vdmVUbyh4MSwgeTEpO1xyXG4gICAgICAgICAgICAgICAgY3R4LnF1YWRyYXRpY0N1cnZlVG8oYngsIGNwWSwgeDIsIHkyKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFN0cmFpZ2h0IGJyb3dcclxuICAgICAgICAgICAgICAgIGN0eC5tb3ZlVG8oYnggLSBicm93VywgYnkgKyBNYXRoLnNpbihiQW5nbGUpICogYnJvd1cpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmxpbmVUbyhieCArIGJyb3dXLCBieSAtIE1hdGguc2luKGJBbmdsZSkgKiBicm93Vyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgRXllcyDilIDilIBcclxuICAgIGZvciAoY29uc3Qgc2lkZSBvZiBbLTEsIDFdKSB7XHJcbiAgICAgICAgY29uc3QgZXggPSBzaWRlICogc3BhbjtcclxuXHJcbiAgICAgICAgaWYgKHN0YXRlID09PSAnc2NhcmVkJykge1xyXG4gICAgICAgICAgICAvLyBXaWRlIHdoaXRlIGV5ZXMgd2l0aCB0aW55IHB1cGlsXHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI2ZmZic7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4LmFyYyhleCwgZXllWSwgciAqIDAuMTcsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMzAsMjAsMTUsMC4yNSknO1xyXG4gICAgICAgICAgICBjdHgubGluZVdpZHRoID0gciAqIDAuMDE1O1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5hcmMoZXgsIGV5ZVksIHIgKiAwLjE3LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMWExNjEyJztcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHguYXJjKGV4ICsgbHggKiAwLjUsIGV5ZVkgKyBseSwgciAqIDAuMDU1LCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjkpJztcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHguYXJjKGV4ICsgbHggKiAwLjUgLSByICogMC4wMiwgZXllWSArIGx5IC0gciAqIDAuMDI1LCByICogMC4wMjUsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGJsaW5rKSB7XHJcbiAgICAgICAgICAgIC8vIEJsaW5rIOKAlCBzaG9ydCBob3Jpem9udGFsIGxpbmVcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGV4IC0gZG90UiAqIDEuMiwgZXllWSk7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8oZXggKyBkb3RSICogMS4yLCBleWVZKTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJyMxYTE2MTInO1xyXG4gICAgICAgICAgICBjdHgubGluZVdpZHRoID0gciAqIDAuMDQ7XHJcbiAgICAgICAgICAgIGN0eC5saW5lQ2FwID0gJ3JvdW5kJztcclxuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE5vcm1hbCDigJQgZG90IGV5ZXMgd2l0aCBzcGVjdWxhclxyXG4gICAgICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMxYTE2MTInO1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5hcmMoZXggKyBseCAqIDAuMywgZXllWSArIGx5ICogMC4zLCBkb3RSLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjg1KSc7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4LmFyYyhcclxuICAgICAgICAgICAgICAgIGV4ICsgbHggKiAwLjMgLSBkb3RSICogMC4zLFxyXG4gICAgICAgICAgICAgICAgZXllWSArIGx5ICogMC4zIC0gZG90UiAqIDAuMzUsXHJcbiAgICAgICAgICAgICAgICBkb3RSICogMC4zNSxcclxuICAgICAgICAgICAgICAgIDAsIE1hdGguUEkgKiAyLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgTW91dGgg4pSA4pSAXHJcbiAgICBjb25zdCBteSA9IHIgKiAwLjM7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSAnIzFhMTYxMic7XHJcbiAgICBjdHgubGluZVdpZHRoID0gciAqIDAuMDQ7XHJcbiAgICBjdHgubGluZUNhcCA9ICdyb3VuZCc7XHJcblxyXG4gICAgaWYgKHN0YXRlID09PSAnc2NhcmVkJykge1xyXG4gICAgICAgIC8vIFNtYWxsIFwib1wiIG1vdXRoXHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoMCwgbXkgKyByICogMC4wNiwgciAqIDAuMSwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzFhMTYxMic7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09ICdzZWxlY3RlZCcpIHtcclxuICAgICAgICAvLyBIYXBweSBhcmNcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYygwLCBteSArIHIgKiAwLjAyLCByICogMC4xNywgMC4xNSwgTWF0aC5QSSAtIDAuMTUpO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gUGVyc29uYWxpdHkgbW91dGhcclxuICAgICAgICBzd2l0Y2ggKHAubW91dGgpIHtcclxuICAgICAgICAgICAgY2FzZSAnc21pcmsnOlxyXG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICAgICAgY3R4Lm1vdmVUbygtciAqIDAuMTMsIG15KTtcclxuICAgICAgICAgICAgICAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKHIgKiAwLjAyLCBteSArIHIgKiAwLjEsIHIgKiAwLjE2LCBteSAtIHIgKiAwLjAyKTtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuJzpcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5lbGxpcHNlKDAsIG15ICsgciAqIDAuMDMsIHIgKiAwLjA5LCByICogMC4wNywgMCwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjMWExNjEyJztcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnZ3Jpbic6XHJcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBjdHguYXJjKDAsIG15LCByICogMC4xNiwgMC4yLCBNYXRoLlBJIC0gMC4yKTtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzbXVnJzpcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5tb3ZlVG8oLXIgKiAwLjA2LCBteSArIHIgKiAwLjAxKTtcclxuICAgICAgICAgICAgICAgIGN0eC5saW5lVG8ociAqIDAuMTYsIG15IC0gciAqIDAuMDIpO1xyXG4gICAgICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2ZsYXQnOlxyXG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICAgICAgY3R4Lm1vdmVUbygtciAqIDAuMTIsIG15ICsgciAqIDAuMDEpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmxpbmVUbyhyICogMC4xMiwgbXkgKyByICogMC4wMSk7XHJcbiAgICAgICAgICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnd29ycmllZCc6XHJcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBjdHguYXJjKDAsIG15ICsgciAqIDAuMTYsIHIgKiAwLjEzLCBNYXRoLlBJICsgMC4zNSwgTWF0aC5QSSAqIDIgLSAwLjM1KTtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgU3dlYXQgZHJvcCAoc2NhcmVkIG9ubHkpIOKUgOKUgFxyXG4gICAgaWYgKHN0YXRlID09PSAnc2NhcmVkJykge1xyXG4gICAgICAgIGNvbnN0IGR0ID0gKHQgKiAyLjUgKyBjb2xvckluZGV4ICogMC43KSAlIDEuODtcclxuICAgICAgICBpZiAoZHQgPD0gMSkge1xyXG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSAoMSAtIGR0KSAqIDAuNTtcclxuICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjYWVkNmYxJztcclxuICAgICAgICAgICAgY29uc3QgZHggPSByICogMC41MjtcclxuICAgICAgICAgICAgY29uc3QgZHkgPSAtciAqIDAuMSArIGR0ICogciAqIDAuNDtcclxuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICBjdHgubW92ZVRvKGR4LCBkeSAtIHIgKiAwLjEpO1xyXG4gICAgICAgICAgICBjdHgucXVhZHJhdGljQ3VydmVUbyhkeCArIHIgKiAwLjA1LCBkeSArIHIgKiAwLjAyLCBkeCwgZHkgKyByICogMC4wNSk7XHJcbiAgICAgICAgICAgIGN0eC5xdWFkcmF0aWNDdXJ2ZVRvKGR4IC0gciAqIDAuMDUsIGR5ICsgciAqIDAuMDIsIGR4LCBkeSAtIHIgKiAwLjEpO1xyXG4gICAgICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSAxO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG4vLyDilIDilIAgQmFsbCBjbGFzcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbmV4cG9ydCBjbGFzcyBCYWxsIHtcclxuICAgIHB1YmxpYyB0YXJnZXRYOiBudW1iZXI7XHJcbiAgICBwdWJsaWMgdGFyZ2V0WTogbnVtYmVyO1xyXG4gICAgcHVibGljIHNjYWxlOiBudW1iZXIgPSAxO1xyXG4gICAgcHVibGljIHRhcmdldFNjYWxlOiBudW1iZXIgPSAxO1xyXG4gICAgcHVibGljIHJvdzogbnVtYmVyID0gMDtcclxuICAgIHB1YmxpYyBjb2w6IG51bWJlciA9IDA7XHJcbiAgICBwdWJsaWMgY29sb3JJbmRleDogbnVtYmVyID0gMDtcclxuICAgIHB1YmxpYyBmYWNlU3RhdGU6IEZhY2VTdGF0ZSA9ICdpZGxlJztcclxuXHJcbiAgICAvLyBHYXplIG92ZXJyaWRlIOKAlCB3aGVuIHNldCwgZXllcyBsb29rIHRvd2FyZCB0aGlzIHBvaW50XHJcbiAgICBwdWJsaWMgbG9va0F0WDogbnVtYmVyID0gMDtcclxuICAgIHB1YmxpYyBsb29rQXRZOiBudW1iZXIgPSAwO1xyXG4gICAgcHVibGljIGxvb2tBdEFtb3VudDogbnVtYmVyID0gMDsgLy8gMCA9IG5vcm1hbCBpZGxlIGdhemUsIDEgPSBmdWxseSBsb2NrZWQgb25cclxuXHJcbiAgICAvLyBQaHlzaWNzXHJcbiAgICBwdWJsaWMgdnk6IG51bWJlciA9IDA7XHJcbiAgICBwdWJsaWMgdXNlR3Jhdml0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgcHJpdmF0ZSBzcXVhc2hZOiBudW1iZXIgPSAxO1xyXG4gICAgcHJpdmF0ZSBicmVhdGhQaGFzZTogbnVtYmVyO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyB4OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHk6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgcmFkaXVzOiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIGNvbG9yOiBzdHJpbmcsXHJcbiAgICApIHtcclxuICAgICAgICB0aGlzLnRhcmdldFggPSB4O1xyXG4gICAgICAgIHRoaXMudGFyZ2V0WSA9IHk7XHJcbiAgICAgICAgdGhpcy5icmVhdGhQaGFzZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoc3BlZWQ6IG51bWJlciA9IDAuMyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBtb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gLS0tIFZlcnRpY2FsIG1vdmVtZW50IC0tLVxyXG4gICAgICAgIGNvbnN0IGR5ID0gdGhpcy50YXJnZXRZIC0gdGhpcy55O1xyXG5cclxuICAgICAgICBpZiAodGhpcy51c2VHcmF2aXR5ICYmIGR5ID4gMSkge1xyXG4gICAgICAgICAgICAvLyBJbi1nYW1lIGZhbGwg4oCUIGdyYXZpdHlcclxuICAgICAgICAgICAgdGhpcy52eSArPSAwLjU1O1xyXG4gICAgICAgICAgICB0aGlzLnZ5ID0gTWF0aC5taW4odGhpcy52eSwgMTQpO1xyXG4gICAgICAgICAgICB0aGlzLnkgKz0gdGhpcy52eTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnkgPj0gdGhpcy50YXJnZXRZKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbXBhY3RWID0gdGhpcy52eTtcclxuICAgICAgICAgICAgICAgIHRoaXMueSA9IHRoaXMudGFyZ2V0WTtcclxuICAgICAgICAgICAgICAgIHRoaXMudnkgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51c2VHcmF2aXR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW1wYWN0ViA+IDQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNxdWFzaFkgPSAxIC0gTWF0aC5taW4oMC4wNCwgaW1wYWN0ViAqIDAuMDAzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnMoZHkpID4gMC41KSB7XHJcbiAgICAgICAgICAgIC8vIExlcnAgKGVudHJhbmNlLCBzd2FwLCBzbWFsbCBtb3ZlcylcclxuICAgICAgICAgICAgdGhpcy55ICs9IGR5ICogc3BlZWQ7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh0aGlzLnRhcmdldFkgLSB0aGlzLnkpIDw9IDAuNSkgdGhpcy55ID0gdGhpcy50YXJnZXRZO1xyXG4gICAgICAgICAgICB0aGlzLnZ5ID0gMDtcclxuICAgICAgICAgICAgbW92aW5nID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnkgPSB0aGlzLnRhcmdldFk7XHJcbiAgICAgICAgICAgIHRoaXMudnkgPSAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gLS0tIEhvcml6b250YWwgbW92ZW1lbnQgKGxlcnAsIHVzZWQgZm9yIHN3YXApIC0tLVxyXG4gICAgICAgIGNvbnN0IGR4ID0gdGhpcy50YXJnZXRYIC0gdGhpcy54O1xyXG4gICAgICAgIGlmIChNYXRoLmFicyhkeCkgPiAwLjUpIHtcclxuICAgICAgICAgICAgdGhpcy54ICs9IGR4ICogc3BlZWQ7XHJcbiAgICAgICAgICAgIG1vdmluZyA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy54ID0gdGhpcy50YXJnZXRYO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gLS0tIFNjYWxlIC0tLVxyXG4gICAgICAgIGNvbnN0IGRzID0gdGhpcy50YXJnZXRTY2FsZSAtIHRoaXMuc2NhbGU7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGRzKSA+IDAuMDEpIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZSArPSBkcyAqIDAuMzU7XHJcbiAgICAgICAgICAgIG1vdmluZyA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZSA9IHRoaXMudGFyZ2V0U2NhbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAtLS0gU3F1YXNoIGRlY2F5IChmYXN0IHNldHRsZSwgbm8gb3NjaWxsYXRpb24pIC0tLVxyXG4gICAgICAgIGlmIChNYXRoLmFicygxIC0gdGhpcy5zcXVhc2hZKSA+IDAuMDAyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3F1YXNoWSArPSAoMSAtIHRoaXMuc3F1YXNoWSkgKiAwLjI1O1xyXG4gICAgICAgICAgICBtb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3F1YXNoWSA9IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAtLS0gTG9va0F0IGRlY2F5IC0tLVxyXG4gICAgICAgIGlmICh0aGlzLmxvb2tBdEFtb3VudCA+IDAuMDEpIHtcclxuICAgICAgICAgICAgdGhpcy5sb29rQXRBbW91bnQgKj0gMC45MztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmxvb2tBdEFtb3VudCA9IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbW92aW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zY2FsZSA8IDAuMDIpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgcyA9IHRoaXMuc2NhbGU7XHJcblxyXG4gICAgICAgIC8vIEJyZWF0aGluZzogdmVyeSBzdWJ0bGUgaWRsZSBwdWxzZVxyXG4gICAgICAgIGNvbnN0IGJyZWF0aCA9IHRoaXMuZmFjZVN0YXRlID09PSAnaWRsZScgJiYgdGhpcy50YXJnZXRTY2FsZSA9PT0gMVxyXG4gICAgICAgICAgICA/IE1hdGguc2luKF9mYWNlVGltZSAqIDIgKyB0aGlzLmJyZWF0aFBoYXNlKSAqIDAuMDA0XHJcbiAgICAgICAgICAgIDogMDtcclxuXHJcbiAgICAgICAgY29uc3Qgc3kgPSBzICogdGhpcy5zcXVhc2hZICogKDEgLSBicmVhdGgpO1xyXG4gICAgICAgIGNvbnN0IHN4ID0gcyAqICgyIC0gdGhpcy5zcXVhc2hZKSAqICgxICsgYnJlYXRoKTsgLy8gY29uc2VydmUgdm9sdW1lXHJcblxyXG4gICAgICAgIC8vIDEpIERyYXcgY2FjaGVkIGJvZHkgc3ByaXRlXHJcbiAgICAgICAgY29uc3Qgc3ByaXRlID0gZ2V0U3ByaXRlKHRoaXMuY29sb3IsIHRoaXMucmFkaXVzKTtcclxuICAgICAgICBjb25zdCBzdyA9IHNwcml0ZS53aWR0aDtcclxuICAgICAgICBjb25zdCBzaCA9IHNwcml0ZS5oZWlnaHQ7XHJcbiAgICAgICAgY29uc3QgZHcgPSBzdyAqIHN4O1xyXG4gICAgICAgIGNvbnN0IGRoID0gc2ggKiBzeTtcclxuICAgICAgICAvLyBBbmNob3IgYm90dG9tIHNvIHNxdWFzaCBsb29rcyBncm91bmRlZFxyXG4gICAgICAgIGNvbnN0IGFuY2hvclkgPSB0aGlzLnkgKyAoc2ggKiBzIC0gZGgpICogMC41O1xyXG4gICAgICAgIGN0eC5kcmF3SW1hZ2Uoc3ByaXRlLCB0aGlzLnggLSBkdyAvIDIsIGFuY2hvclkgLSBkaCAvIDIsIGR3LCBkaCk7XHJcblxyXG4gICAgICAgIC8vIDIpIERyYXcgbGl2ZSBmYWNlIG9uIHRvcFxyXG4gICAgICAgIGlmIChzID4gMC4zKSB7XHJcbiAgICAgICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgICAgIGN0eC50cmFuc2xhdGUodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgICAgICAgICBjdHguc2NhbGUoc3gsIHN5KTtcclxuICAgICAgICAgICAgY3R4LnRyYW5zbGF0ZSgtdGhpcy54LCAtdGhpcy55KTtcclxuICAgICAgICAgICAgZHJhd0ZhY2UoY3R4LCB0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIHRoaXMuY29sb3JJbmRleCwgdGhpcy5mYWNlU3RhdGUsXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvb2tBdFggLSB0aGlzLngsIHRoaXMubG9va0F0WSAtIHRoaXMueSwgdGhpcy5sb29rQXRBbW91bnQpO1xyXG4gICAgICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkcmF3U2VsZWN0ZWQoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCByID0gdGhpcy5yYWRpdXMgKiB0aGlzLnNjYWxlICsgNDtcclxuICAgICAgICBjb25zdCB0ID0gX2ZhY2VUaW1lO1xyXG5cclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCByLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC42KSc7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDI7XHJcbiAgICAgICAgY3R4LnNldExpbmVEYXNoKFszLCAzXSk7XHJcbiAgICAgICAgY3R4LmxpbmVEYXNoT2Zmc2V0ID0gLXQgKiAyMDtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LnNldExpbmVEYXNoKFtdKTtcclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGNsb25lKCk6IEJhbGwge1xyXG4gICAgICAgIGNvbnN0IGIgPSBuZXcgQmFsbCh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIHRoaXMuY29sb3IpO1xyXG4gICAgICAgIGIudGFyZ2V0WCA9IHRoaXMudGFyZ2V0WDtcclxuICAgICAgICBiLnRhcmdldFkgPSB0aGlzLnRhcmdldFk7XHJcbiAgICAgICAgYi5yb3cgPSB0aGlzLnJvdztcclxuICAgICAgICBiLmNvbCA9IHRoaXMuY29sO1xyXG4gICAgICAgIGIuc2NhbGUgPSB0aGlzLnNjYWxlO1xyXG4gICAgICAgIGIudGFyZ2V0U2NhbGUgPSB0aGlzLnRhcmdldFNjYWxlO1xyXG4gICAgICAgIGIuY29sb3JJbmRleCA9IHRoaXMuY29sb3JJbmRleDtcclxuICAgICAgICBiLmZhY2VTdGF0ZSA9IHRoaXMuZmFjZVN0YXRlO1xyXG4gICAgICAgIHJldHVybiBiO1xyXG4gICAgfVxyXG59IiwKICAgICJleHBvcnQgY2xhc3MgUGFydGljbGUge1xyXG4gICAgcHVibGljIGxpZmU6IG51bWJlciA9IDE7XHJcbiAgICBwcml2YXRlIGRlY2F5OiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIHg6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgeTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyByYWRpdXM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuZGVjYXkgPSAwLjAyNSArIE1hdGgucmFuZG9tKCkgKiAwLjAzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLnggKz0gdGhpcy52eDtcclxuICAgICAgICB0aGlzLnkgKz0gdGhpcy52eTtcclxuICAgICAgICB0aGlzLnZ5ICs9IDAuMTI7XHJcbiAgICAgICAgdGhpcy5saWZlIC09IHRoaXMuZGVjYXk7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgKj0gMC45NTtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWZlID4gMCAmJiB0aGlzLnJhZGl1cyA+IDAuMztcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgdGhpcy5saWZlKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgdGhpcy5yYWRpdXMsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICBjdHguZmlsbCgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2NvcmVQb3B1cCB7XHJcbiAgICBwcml2YXRlIGxpZmU6IG51bWJlciA9IDE7XHJcbiAgICBwcml2YXRlIGFnZTogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgcG9wU2NhbGU6IG51bWJlcjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgeDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB5OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHRleHQ6IHN0cmluZyxcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICAgICBzY2FsZTogbnVtYmVyID0gMSxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMucG9wU2NhbGUgPSBzY2FsZTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgdGhpcy55IC09IDEuMjtcclxuICAgICAgICB0aGlzLmxpZmUgLT0gMC4wMjU7XHJcbiAgICAgICAgdGhpcy5hZ2UgKz0gMSAvIDYwO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxpZmUgPiAwO1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXcoY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpOiB2b2lkIHtcclxuICAgICAgICBjdHguc2F2ZSgpO1xyXG4gICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IE1hdGgubWF4KDAsIHRoaXMubGlmZSk7XHJcblxyXG4gICAgICAgIC8vIFBvcC1pbjogZWxhc3RpYyBzY2FsZSBhdCBzdGFydFxyXG4gICAgICAgIGNvbnN0IHQgPSBNYXRoLm1pbih0aGlzLmFnZSAqIDYsIDEpO1xyXG4gICAgICAgIGNvbnN0IGVsYXN0aWMgPSB0IDwgMVxyXG4gICAgICAgICAgICA/IDEgLSBNYXRoLnBvdyhNYXRoLmNvcyh0ICogTWF0aC5QSSAqIDAuNSksIDMpICogKDEgKyAwLjMgKiBNYXRoLnNpbih0ICogTWF0aC5QSSAqIDMpKVxyXG4gICAgICAgICAgICA6IDE7XHJcbiAgICAgICAgY29uc3QgcyA9IHRoaXMucG9wU2NhbGUgKiBlbGFzdGljO1xyXG5cclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMueCwgdGhpcy55KTtcclxuICAgICAgICBjdHguc2NhbGUocywgcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGZvbnRTaXplID0gTWF0aC5yb3VuZCgxNCAqIHRoaXMucG9wU2NhbGUpO1xyXG4gICAgICAgIGN0eC5mb250ID0gYGJvbGQgJHtmb250U2l6ZX1weCBcIlNwYWNlIE1vbm9cIiwgXCJDb3VyaWVyIE5ld1wiLCBtb25vc3BhY2VgO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KHRoaXMudGV4dCwgMCwgMCk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG4iLAogICAgImltcG9ydCB7IEJhbGwsIHVwZGF0ZUZhY2VUaW1lLCBnZXRGYWNlVGltZSB9IGZyb20gJy4vYmFsbHMuanMnO1xyXG5pbXBvcnQgeyBQYXJ0aWNsZSwgU2NvcmVQb3B1cCB9IGZyb20gJy4vcGFydGljbGUuanMnO1xyXG5cclxuY29uc3QgZW51bSBTdGF0ZSB7XHJcbiAgICBJRExFLFxyXG4gICAgRFJBR0dJTkcsXHJcbiAgICBTV0FQX0FOSU0sXHJcbiAgICBCUkVBS19BTklNLFxyXG4gICAgRkFMTF9BTklNLFxyXG59XHJcblxyXG5jb25zdCBDT0xPUlMgPSBbXHJcbiAgICAnI0U3NEMzQycsIC8vIDAg4oaSIHBlcnNvbmFsaXR5IDAgKHNtaXJrKVxyXG4gICAgJyNGMUM0MEYnLCAvLyAxIOKGkiBwZXJzb25hbGl0eSAxIChvcGVuKVxyXG4gICAgJyMyRUNDNzEnLCAvLyAyIOKGkiBwZXJzb25hbGl0eSAyIChncmluKVxyXG4gICAgJyMzNDk4REInLCAvLyAzIOKGkiBwZXJzb25hbGl0eSAzIChzbXVnKVxyXG4gICAgJyM5QjU5QjYnLCAvLyA0IOKGkiBwZXJzb25hbGl0eSA0IChmbGF0KVxyXG4gICAgJyNFNjdFMjInLCAvLyA1IOKGkiBwZXJzb25hbGl0eSA1ICh3b3JyaWVkKVxyXG5dO1xyXG5cclxuZnVuY3Rpb24gY29sb3JUb0luZGV4KGNvbG9yOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgY29uc3QgaWR4ID0gQ09MT1JTLmluZGV4T2YoY29sb3IpO1xyXG4gICAgcmV0dXJuIGlkeCA+PSAwID8gaWR4IDogMDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWUge1xyXG4gICAgLy8gR3JpZFxyXG4gICAgcHJpdmF0ZSBncmlkOiBCYWxsW11bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSByb3dzID0gMTI7XHJcbiAgICBwcml2YXRlIGNvbHMgPSA4O1xyXG4gICAgcHJpdmF0ZSBjZWxsU2l6ZSA9IDQ0O1xyXG4gICAgcHJpdmF0ZSBiYWxsUmFkaXVzID0gMTg7XHJcbiAgICBwcml2YXRlIG9mZnNldFg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgb2Zmc2V0WTogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBsb2dpY2FsVzogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBsb2dpY2FsSDogbnVtYmVyO1xyXG4gICAgcHJpdmF0ZSBncmlkRG90Q2FjaGU6IE9mZnNjcmVlbkNhbnZhcyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIC8vIFN0YXRlXHJcbiAgICBwcml2YXRlIHN0YXRlOiBTdGF0ZSA9IFN0YXRlLkZBTExfQU5JTTtcclxuICAgIHByaXZhdGUgZHJhZ2dpbmc6IEJhbGwgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgZHJhZ09yaWdpbjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9IHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXAxOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXAyOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXBJc1JldmVyc2UgPSBmYWxzZTtcclxuICAgIHByaXZhdGUgYW5pbUlkID0gMDtcclxuXHJcbiAgICAvLyBFZmZlY3RzXHJcbiAgICBwcml2YXRlIHBhcnRpY2xlczogUGFydGljbGVbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBwb3B1cHM6IFNjb3JlUG9wdXBbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBzaGFrZVggPSAwO1xyXG4gICAgcHJpdmF0ZSBzaGFrZVkgPSAwO1xyXG4gICAgcHJpdmF0ZSBzaGFrZU1hZyA9IDA7XHJcbiAgICBwcml2YXRlIGZsYXNoQWxwaGEgPSAwO1xyXG4gICAgcHJpdmF0ZSBmbGFzaENvbG9yID0gJyNmZmYnO1xyXG4gICAgcHJpdmF0ZSBjb21ib0Rpc3BsYXlBbHBoYSA9IDA7XHJcbiAgICBwcml2YXRlIGNvbWJvRGlzcGxheVNjYWxlID0gMTtcclxuICAgIHByaXZhdGUgY29tYm9EaXNwbGF5VGV4dCA9ICcnO1xyXG4gICAgcHJpdmF0ZSBjb21ib0Rpc3BsYXlDb2xvciA9ICcjZmZmJztcclxuXHJcbiAgICAvLyBIaW50XHJcbiAgICBwcml2YXRlIGlkbGVUaW1lciA9IDA7XHJcbiAgICBwcml2YXRlIGhpbnRNb3ZlOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXSB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBISU5UX0RFTEFZID0gNTsgLy8gc2Vjb25kcyBiZWZvcmUgaGludCBzaG93c1xyXG5cclxuICAgIC8vIFNjb3JlXHJcbiAgICBwcml2YXRlIHNjb3JlID0gMDtcclxuICAgIHByaXZhdGUgZGlzcGxheVNjb3JlID0gMDtcclxuICAgIHByaXZhdGUgZGlzcGxheUhpZ2ggPSAwO1xyXG4gICAgcHJpdmF0ZSBjb21ibyA9IDA7XHJcbiAgICBwcml2YXRlIGhpZ2hTY29yZSA9IDA7XHJcblxyXG4gICAgLy8gVUkgcmVmc1xyXG4gICAgcHJpdmF0ZSBlbFNjb3JlOiBIVE1MRWxlbWVudDtcclxuICAgIHByaXZhdGUgZWxIaWdoOiBIVE1MRWxlbWVudDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsXHJcbiAgICAgICAgcHJpdmF0ZSBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgICAgICBsb2dpY2FsVzogbnVtYmVyID0gMzgwLFxyXG4gICAgICAgIGxvZ2ljYWxIOiBudW1iZXIgPSA2MDAsXHJcbiAgICAgICAgcHJpdmF0ZSBvblRpY2tBbWJpZW50PzogKG5vdzogbnVtYmVyKSA9PiB2b2lkLFxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy5sb2dpY2FsVyA9IGxvZ2ljYWxXO1xyXG4gICAgICAgIHRoaXMubG9naWNhbEggPSBsb2dpY2FsSDtcclxuICAgICAgICB0aGlzLm9mZnNldFggPSAobG9naWNhbFcgLSAodGhpcy5jb2xzIC0gMSkgKiB0aGlzLmNlbGxTaXplKSAvIDI7XHJcbiAgICAgICAgdGhpcy5vZmZzZXRZID0gKGxvZ2ljYWxIIC0gKHRoaXMucm93cyAtIDEpICogdGhpcy5jZWxsU2l6ZSkgLyAyO1xyXG5cclxuICAgICAgICB0aGlzLmVsU2NvcmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2NvcmUnKSE7XHJcbiAgICAgICAgdGhpcy5lbEhpZ2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGlnaC1zY29yZScpITtcclxuXHJcbiAgICAgICAgdGhpcy5oaWdoU2NvcmUgPSBwYXJzZUludChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29sb3JtYXRjaC1ocycpIHx8ICcwJyk7XHJcbiAgICAgICAgdGhpcy5idWlsZEdyaWREb3RDYWNoZSgpO1xyXG5cclxuICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGluaXQoKTogdm9pZCB7XHJcbiAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5hbmltSWQpO1xyXG4gICAgICAgIHRoaXMuc2NvcmUgPSAwO1xyXG4gICAgICAgIHRoaXMuZGlzcGxheVNjb3JlID0gMDtcclxuICAgICAgICB0aGlzLmRpc3BsYXlIaWdoID0gdGhpcy5oaWdoU2NvcmU7XHJcbiAgICAgICAgdGhpcy5jb21ibyA9IDA7XHJcbiAgICAgICAgdGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuICAgICAgICB0aGlzLnBvcHVwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcbiAgICAgICAgdGhpcy5lbFNjb3JlLnRleHRDb250ZW50ID0gJzAnO1xyXG4gICAgICAgIHRoaXMuZWxIaWdoLnRleHRDb250ZW50ID0gU3RyaW5nKHRoaXMuaGlnaFNjb3JlKTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZEdyaWQoKTtcclxuICAgICAgICB0aGlzLnB1cmdlSW5pdGlhbE1hdGNoZXMoKTtcclxuICAgICAgICB0aGlzLmNhc2NhZGVFbnRyYW5jZSgpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVUkoKTtcclxuICAgICAgICB0aGlzLmFuaW1JZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnRpY2spO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZXN0YXJ0KCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBHcmlkIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgcG9zKHI6IG51bWJlciwgYzogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5vZmZzZXRYICsgYyAqIHRoaXMuY2VsbFNpemUsXHJcbiAgICAgICAgICAgIHk6IHRoaXMub2Zmc2V0WSArIHIgKiB0aGlzLmNlbGxTaXplLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjZWxsKHB4OiBudW1iZXIsIHB5OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBjID0gTWF0aC5yb3VuZCgocHggLSB0aGlzLm9mZnNldFgpIC8gdGhpcy5jZWxsU2l6ZSk7XHJcbiAgICAgICAgY29uc3QgciA9IE1hdGgucm91bmQoKHB5IC0gdGhpcy5vZmZzZXRZKSAvIHRoaXMuY2VsbFNpemUpO1xyXG4gICAgICAgIGlmIChyID49IDAgJiYgciA8IHRoaXMucm93cyAmJiBjID49IDAgJiYgYyA8IHRoaXMuY29scykgcmV0dXJuIHsgciwgYyB9O1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcm5kQ29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIENPTE9SU1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBDT0xPUlMubGVuZ3RoKV07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEdyaWQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5ncmlkID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRbcl0gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMucG9zKHIsIGMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLnJuZENvbG9yKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gbmV3IEJhbGwocC54LCBwLnksIHRoaXMuYmFsbFJhZGl1cywgY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgYi5yb3cgPSByO1xyXG4gICAgICAgICAgICAgICAgYi5jb2wgPSBjO1xyXG4gICAgICAgICAgICAgICAgYi5jb2xvckluZGV4ID0gY29sb3JUb0luZGV4KGNvbG9yKTsgIC8vIOKGkCBFS0xFXHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVyZ2VJbml0aWFsTWF0Y2hlcygpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDIwMDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG0gPSB0aGlzLmZpbmRNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgIGlmIChtLmxlbmd0aCA9PT0gMCkgYnJlYWs7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZyBvZiBtKSBmb3IgKGNvbnN0IGIgb2YgZykge1xyXG4gICAgICAgICAgICAgICAgYi5jb2xvciA9IHRoaXMucm5kQ29sb3IoKTtcclxuICAgICAgICAgICAgICAgIGIuY29sb3JJbmRleCA9IGNvbG9yVG9JbmRleChiLmNvbG9yKTsgIC8vIOKGkCBFS0xFXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXNjYWRlRW50cmFuY2UoKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgYi55ID0gYi50YXJnZXRZIC0gdGhpcy5sb2dpY2FsSCAtIHIgKiAyMCAtIE1hdGgucmFuZG9tKCkgKiAxMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgTWF0Y2ggZmluZGluZyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIGZpbmRNYXRjaGVzKCk6IEJhbGxbXVtdIHtcclxuICAgICAgICBjb25zdCBtYXRjaGVzOiBCYWxsW11bXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBIb3Jpem9udGFsXHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBsZXQgcnVuOiBCYWxsW10gPSBbdGhpcy5ncmlkW3JdWzBdXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDE7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHRoaXMuZ3JpZFtyXVtjXTtcclxuICAgICAgICAgICAgICAgIGlmIChiLmNvbG9yID09PSBydW5bMF0uY29sb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBydW4ucHVzaChiKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuID0gW2JdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChydW4ubGVuZ3RoID49IDMpIG1hdGNoZXMucHVzaChydW4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVmVydGljYWxcclxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgIGxldCBydW46IEJhbGxbXSA9IFt0aGlzLmdyaWRbMF1bY11dO1xyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gMTsgciA8IHRoaXMucm93czsgcisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIuY29sb3IgPT09IHJ1blswXS5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1bi5wdXNoKGIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICAgICAgICAgICAgICBydW4gPSBbYl07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWF0Y2hlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkR3JpZERvdENhY2hlKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IG9jID0gbmV3IE9mZnNjcmVlbkNhbnZhcyh0aGlzLmxvZ2ljYWxXLCB0aGlzLmxvZ2ljYWxIKTtcclxuICAgICAgICBjb25zdCBjdHggPSBvYy5nZXRDb250ZXh0KCcyZCcpITtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4wNiknO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmFyYyhcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFggKyBjICogdGhpcy5jZWxsU2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFkgKyByICogdGhpcy5jZWxsU2l6ZSxcclxuICAgICAgICAgICAgICAgICAgICAxLjUsIDAsIE1hdGguUEkgKiAyLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5ncmlkRG90Q2FjaGUgPSBvYztcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgTW92ZSBkZXRlY3Rpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgLyoqIENoZWNrIGlmIHN3YXBwaW5nIChyMSxjMSkgd2l0aCAocjIsYzIpIGNyZWF0ZXMgYSBtYXRjaCAqL1xyXG4gICAgcHJpdmF0ZSBzd2FwQ3JlYXRlc01hdGNoKHIxOiBudW1iZXIsIGMxOiBudW1iZXIsIHIyOiBudW1iZXIsIGMyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBnID0gdGhpcy5ncmlkO1xyXG4gICAgICAgIC8vIFRlbXBvcmFyaWx5IHN3YXAgY29sb3JzXHJcbiAgICAgICAgY29uc3QgdG1wQ29sb3IgPSBnW3IxXVtjMV0uY29sb3I7XHJcbiAgICAgICAgY29uc3QgdG1wSWR4ID0gZ1tyMV1bYzFdLmNvbG9ySW5kZXg7XHJcbiAgICAgICAgZ1tyMV1bYzFdLmNvbG9yID0gZ1tyMl1bYzJdLmNvbG9yO1xyXG4gICAgICAgIGdbcjFdW2MxXS5jb2xvckluZGV4ID0gZ1tyMl1bYzJdLmNvbG9ySW5kZXg7XHJcbiAgICAgICAgZ1tyMl1bYzJdLmNvbG9yID0gdG1wQ29sb3I7XHJcbiAgICAgICAgZ1tyMl1bYzJdLmNvbG9ySW5kZXggPSB0bXBJZHg7XHJcblxyXG4gICAgICAgIGNvbnN0IGhhc01hdGNoID0gdGhpcy5maW5kTWF0Y2hlcygpLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIC8vIFN3YXAgYmFja1xyXG4gICAgICAgIGdbcjJdW2MyXS5jb2xvciA9IGdbcjFdW2MxXS5jb2xvcjtcclxuICAgICAgICBnW3IyXVtjMl0uY29sb3JJbmRleCA9IGdbcjFdW2MxXS5jb2xvckluZGV4O1xyXG4gICAgICAgIGdbcjFdW2MxXS5jb2xvciA9IHRtcENvbG9yO1xyXG4gICAgICAgIGdbcjFdW2MxXS5jb2xvckluZGV4ID0gdG1wSWR4O1xyXG5cclxuICAgICAgICByZXR1cm4gaGFzTWF0Y2g7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEZpbmQgZmlyc3QgdmFsaWQgbW92ZSwgcmV0dXJucyBwYWlyIG9mIFtyLGNdIG9yIG51bGwgKi9cclxuICAgIHByaXZhdGUgZmluZFZhbGlkTW92ZSgpOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXSB8IG51bGwge1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgLy8gUmlnaHQgbmVpZ2hib3JcclxuICAgICAgICAgICAgICAgIGlmIChjICsgMSA8IHRoaXMuY29scyAmJiB0aGlzLnN3YXBDcmVhdGVzTWF0Y2gociwgYywgciwgYyArIDEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtyLCBjLCByLCBjICsgMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBEb3duIG5laWdoYm9yXHJcbiAgICAgICAgICAgICAgICBpZiAociArIDEgPCB0aGlzLnJvd3MgJiYgdGhpcy5zd2FwQ3JlYXRlc01hdGNoKHIsIGMsIHIgKyAxLCBjKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbciwgYywgciArIDEsIGNdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2h1ZmZsZUdyaWQoKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgY29sb3JzLCBzaHVmZmxlLCByZWRpc3RyaWJ1dGVcclxuICAgICAgICBjb25zdCBjb2xvcnM6IHsgY29sb3I6IHN0cmluZzsgaWR4OiBudW1iZXIgfVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKylcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKylcclxuICAgICAgICAgICAgICAgIGNvbG9ycy5wdXNoKHsgY29sb3I6IHRoaXMuZ3JpZFtyXVtjXS5jb2xvciwgaWR4OiB0aGlzLmdyaWRbcl1bY10uY29sb3JJbmRleCB9KTtcclxuXHJcbiAgICAgICAgLy8gRmlzaGVyLVlhdGVzIHNodWZmbGVcclxuICAgICAgICBmb3IgKGxldCBpID0gY29sb3JzLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcclxuICAgICAgICAgICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xyXG4gICAgICAgICAgICBbY29sb3JzW2ldLCBjb2xvcnNbal1dID0gW2NvbG9yc1tqXSwgY29sb3JzW2ldXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBrID0gMDtcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKVxyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10uY29sb3IgPSBjb2xvcnNba10uY29sb3I7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10uY29sb3JJbmRleCA9IGNvbG9yc1trXS5pZHg7XHJcbiAgICAgICAgICAgICAgICBrKys7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBhY2NpZGVudGFsIG1hdGNoZXNcclxuICAgICAgICB0aGlzLnB1cmdlSW5pdGlhbE1hdGNoZXMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgR2FtZSBsb2dpYyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHByb2Nlc3NNYXRjaGVzKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSB0aGlzLmZpbmRNYXRjaGVzKCk7XHJcblxyXG4gICAgICAgIGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbWJvID0gMDtcclxuICAgICAgICAgICAgLy8gVMO8bSB0b3BsYXLEsSBpZGxlJ2EgZMO2bmTDvHJcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKylcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdLmZhY2VTdGF0ZSA9ICdpZGxlJztcclxuXHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGFueSB2YWxpZCBtb3ZlcyByZW1haW5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmZpbmRWYWxpZE1vdmUoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaHVmZmxlR3JpZCgpO1xyXG4gICAgICAgICAgICAgICAgLy8gUmUtY2hlY2sgYWZ0ZXIgc2h1ZmZsZSAoZXh0cmVtZWx5IHJhcmUgZWRnZSBjYXNlKVxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmZpbmRWYWxpZE1vdmUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2h1ZmZsZUdyaWQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLklETEU7XHJcbiAgICAgICAgICAgIHRoaXMuaWRsZVRpbWVyID0gMDtcclxuICAgICAgICAgICAgdGhpcy5oaW50TW92ZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVUkoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb21ibysrO1xyXG5cclxuICAgICAgICBjb25zdCBzZXQgPSBuZXcgU2V0PEJhbGw+KCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBnIG9mIG1hdGNoZXMpIGZvciAoY29uc3QgYiBvZiBnKSBzZXQuYWRkKGIpO1xyXG5cclxuICAgICAgICBjb25zdCBwdHMgPSBzZXQuc2l6ZSAqIDEwICogdGhpcy5jb21ibztcclxuICAgICAgICB0aGlzLnNjb3JlICs9IHB0cztcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIHNldCkge1xyXG4gICAgICAgICAgICBiLmZhY2VTdGF0ZSA9ICdzY2FyZWQnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuc2NvcmUgPiB0aGlzLmhpZ2hTY29yZSkge1xyXG4gICAgICAgICAgICB0aGlzLmhpZ2hTY29yZSA9IHRoaXMuc2NvcmU7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjb2xvcm1hdGNoLWhzJywgU3RyaW5nKHRoaXMuaGlnaFNjb3JlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIC8vIEVmZmVjdHMg4oCUIHNjYWxlIHdpdGggY29tYm9cclxuICAgICAgICBjb25zdCBpbnRlbnNpdHkgPSBNYXRoLm1pbih0aGlzLmNvbWJvLCA2KTtcclxuICAgICAgICBjb25zdCBidXJzdENvdW50ID0gOCArIGludGVuc2l0eSAqIDQ7XHJcblxyXG4gICAgICAgIGxldCBzdW1YID0gMCwgc3VtWSA9IDA7XHJcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIHNldCkge1xyXG4gICAgICAgICAgICB0aGlzLnNwYXduQnVyc3QoYi54LCBiLnksIGIuY29sb3IsIGJ1cnN0Q291bnQpO1xyXG4gICAgICAgICAgICBiLnRhcmdldFNjYWxlID0gMDtcclxuICAgICAgICAgICAgc3VtWCArPSBiLng7XHJcbiAgICAgICAgICAgIHN1bVkgKz0gYi55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3ggPSBzdW1YIC8gc2V0LnNpemU7XHJcbiAgICAgICAgY29uc3QgY3kgPSBzdW1ZIC8gc2V0LnNpemU7XHJcblxyXG4gICAgICAgIC8vIFNjcmVlbiBzaGFrZSDigJQgbGlnaHQgb24gZmlyc3QgbWF0Y2gsIHN0cm9uZ2VyIG9uIGNvbWJvc1xyXG4gICAgICAgIHRoaXMuc2hha2VNYWcgPSBNYXRoLm1pbigyICsgaW50ZW5zaXR5ICogMS41LCAxMik7XHJcblxyXG4gICAgICAgIC8vIEZsYXNoIG92ZXJsYXkgZnJvbSBjb21ibyB4MlxyXG4gICAgICAgIGlmICh0aGlzLmNvbWJvID49IDIpIHtcclxuICAgICAgICAgICAgdGhpcy5mbGFzaEFscGhhID0gTWF0aC5taW4oMC4wOCArIGludGVuc2l0eSAqIDAuMDMsIDAuMjgpO1xyXG4gICAgICAgICAgICBjb25zdCBjb2xvcnMgPSBbLi4uc2V0XS5tYXAoYiA9PiBiLmNvbG9yKTtcclxuICAgICAgICAgICAgdGhpcy5mbGFzaENvbG9yID0gY29sb3JzWzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gTmVhcmJ5IGJhbGxzIGxvb2sgYXQgdGhlIGV4cGxvc2lvblxyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspXHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5iID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5iICYmICFzZXQuaGFzKG5iKSAmJiBuYi50YXJnZXRTY2FsZSA+IDAuNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc3QgPSBNYXRoLmh5cG90KG5iLnggLSBjeCwgbmIueSAtIGN5KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzdCA8IHRoaXMuY2VsbFNpemUgKiA0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iLmxvb2tBdFggPSBjeDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmIubG9va0F0WSA9IGN5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDbG9zZXIgPSBzdHJvbmdlciBnYXplXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5iLmxvb2tBdEFtb3VudCA9IE1hdGgubWluKDEsICh0aGlzLmNlbGxTaXplICogNCkgLyAoZGlzdCArIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSB0aGlzLmNvbWJvID4gMSA/IGArJHtwdHN9IHgke3RoaXMuY29tYm99YCA6IGArJHtwdHN9YDtcclxuICAgICAgICBjb25zdCBwb3B1cFNjYWxlID0gdGhpcy5jb21ibyA+IDEgPyAxICsgTWF0aC5taW4oaW50ZW5zaXR5ICogMC4xNSwgMC42KSA6IDE7XHJcbiAgICAgICAgdGhpcy5wb3B1cHMucHVzaChuZXcgU2NvcmVQb3B1cChjeCwgY3kgLSAxMCwgbGFiZWwsICcjZmZmJywgcG9wdXBTY2FsZSkpO1xyXG5cclxuICAgICAgICAvLyBDYW52YXMgY29tYm8gYmFubmVyXHJcbiAgICAgICAgaWYgKHRoaXMuY29tYm8gPj0gMikge1xyXG4gICAgICAgICAgICBjb25zdCBjb2xvcnMgPSBbLi4uc2V0XS5tYXAoYiA9PiBiLmNvbG9yKTtcclxuICAgICAgICAgICAgdGhpcy5jb21ib0Rpc3BsYXlUZXh0ID0gYENPTUJPIHgke3RoaXMuY29tYm99YDtcclxuICAgICAgICAgICAgdGhpcy5jb21ib0Rpc3BsYXlBbHBoYSA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuY29tYm9EaXNwbGF5U2NhbGUgPSAxLjY7XHJcbiAgICAgICAgICAgIHRoaXMuY29tYm9EaXNwbGF5Q29sb3IgPSBjb2xvcnNbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZVVJKCk7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkJSRUFLX0FOSU07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBncmF2aXR5KCk6IHZvaWQge1xyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgbGV0IHdyaXRlID0gdGhpcy5yb3dzIC0gMTtcclxuXHJcbiAgICAgICAgICAgIC8vIFNoaWZ0IHN1cnZpdmluZyBiYWxscyBkb3duXHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSB0aGlzLnJvd3MgLSAxOyByID49IDA7IHItLSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHRoaXMuZ3JpZFtyXVtjXTtcclxuICAgICAgICAgICAgICAgIGlmIChiLnRhcmdldFNjYWxlID4gMC41KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIgIT09IHdyaXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFt3cml0ZV1bY10gPSBiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBudWxsITtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5yb3cgPSB3cml0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5jb2wgPSBjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwID0gdGhpcy5wb3Mod3JpdGUsIGMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLnRhcmdldFggPSBwLng7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIudGFyZ2V0WSA9IHAueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi51c2VHcmF2aXR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmlsbCBlbXB0eSBjZWxscyBmcm9tIHRvcFxyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gd3JpdGU7IHIgPj0gMDsgci0tKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwID0gdGhpcy5wb3MociwgYyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydFkgPSAtdGhpcy5iYWxsUmFkaXVzICogMiAtICh3cml0ZSAtIHIpICogdGhpcy5jZWxsU2l6ZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5iID0gbmV3IEJhbGwocC54LCBzdGFydFksIHRoaXMuYmFsbFJhZGl1cywgdGhpcy5ybmRDb2xvcigpKTtcclxuICAgICAgICAgICAgICAgIG5iLmNvbG9ySW5kZXggPSBjb2xvclRvSW5kZXgobmIuY29sb3IpO1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0WCA9IHAueDtcclxuICAgICAgICAgICAgICAgIG5iLnRhcmdldFkgPSBwLnk7XHJcbiAgICAgICAgICAgICAgICBuYi5yb3cgPSByO1xyXG4gICAgICAgICAgICAgICAgbmIuY29sID0gYztcclxuICAgICAgICAgICAgICAgIG5iLnNjYWxlID0gMC42O1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0U2NhbGUgPSAxO1xyXG4gICAgICAgICAgICAgICAgbmIudXNlR3Jhdml0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkZBTExfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgRlgg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBzcGF3bkJ1cnN0KHg6IG51bWJlciwgeTogbnVtYmVyLCBjb2xvcjogc3RyaW5nLCBuOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBhID0gKE1hdGguUEkgKiAyICogaSkgLyBuICsgTWF0aC5yYW5kb20oKSAqIDAuNTtcclxuICAgICAgICAgICAgY29uc3Qgc3BkID0gMyArIE1hdGgucmFuZG9tKCkgKiA0O1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKFxyXG4gICAgICAgICAgICAgICAgbmV3IFBhcnRpY2xlKHgsIHksIE1hdGguY29zKGEpICogc3BkLCBNYXRoLnNpbihhKSAqIHNwZCwgMi41ICsgTWF0aC5yYW5kb20oKSAqIDQsIGNvbG9yKSxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIElucHV0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgYmluZEV2ZW50cygpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBjdiA9IHRoaXMuY2FudmFzO1xyXG4gICAgICAgIGN2LnN0eWxlLmN1cnNvciA9ICdncmFiJztcclxuXHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZSA9PiB0aGlzLm9uRG93bih0aGlzLm1vdXNlWFkoZSkpKTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBlID0+IHRoaXMub25Nb3ZlKHRoaXMubW91c2VYWShlKSkpO1xyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlID0+IHRoaXMub25VcCh0aGlzLm1vdXNlWFkoZSkpKTtcclxuXHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25Eb3duKHRoaXMudG91Y2hYWShlKSk7IH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgdGhpcy5vbk1vdmUodGhpcy50b3VjaFhZKGUpKTsgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25VcCh0aGlzLnRvdWNoWFkoZSkpOyB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbW91c2VYWShlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgciA9IHRoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIGNvbnN0IHN4ID0gdGhpcy5sb2dpY2FsVyAvIHIud2lkdGg7XHJcbiAgICAgICAgY29uc3Qgc3kgPSB0aGlzLmxvZ2ljYWxIIC8gci5oZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIHsgeDogKGUuY2xpZW50WCAtIHIubGVmdCkgKiBzeCwgeTogKGUuY2xpZW50WSAtIHIudG9wKSAqIHN5IH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0b3VjaFhZKGU6IFRvdWNoRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0ID0gZS50b3VjaGVzWzBdIHx8IGUuY2hhbmdlZFRvdWNoZXNbMF07XHJcbiAgICAgICAgY29uc3QgciA9IHRoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIGNvbnN0IHN4ID0gdGhpcy5sb2dpY2FsVyAvIHIud2lkdGg7XHJcbiAgICAgICAgY29uc3Qgc3kgPSB0aGlzLmxvZ2ljYWxIIC8gci5oZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIHsgeDogKHQuY2xpZW50WCAtIHIubGVmdCkgKiBzeCwgeTogKHQuY2xpZW50WSAtIHIudG9wKSAqIHN5IH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRvd24ocDogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IFN0YXRlLklETEUpIHJldHVybjtcclxuICAgICAgICBjb25zdCBjID0gdGhpcy5jZWxsKHAueCwgcC55KTtcclxuICAgICAgICBpZiAoIWMpIHJldHVybjtcclxuICAgICAgICB0aGlzLmRyYWdnaW5nID0gdGhpcy5ncmlkW2Mucl1bYy5jXTtcclxuICAgICAgICB0aGlzLmRyYWdnaW5nLmZhY2VTdGF0ZSA9ICdzZWxlY3RlZCc7XHJcbiAgICAgICAgdGhpcy5kcmFnT3JpZ2luID0geyB4OiB0aGlzLmRyYWdnaW5nLnRhcmdldFgsIHk6IHRoaXMuZHJhZ2dpbmcudGFyZ2V0WSB9O1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5EUkFHR0lORztcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYmJpbmcnO1xyXG4gICAgICAgIHRoaXMuaWRsZVRpbWVyID0gMDtcclxuICAgICAgICB0aGlzLmhpbnRNb3ZlID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTW92ZShwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmRyYWdnaW5nLnggPSBwLng7XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZy55ID0gcC55O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25VcChwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYic7XHJcblxyXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcuZmFjZVN0YXRlID0gJ2lkbGUnO1xyXG5cclxuICAgICAgICBjb25zdCBiID0gdGhpcy5kcmFnZ2luZztcclxuICAgICAgICBjb25zdCBvID0gdGhpcy5kcmFnT3JpZ2luITtcclxuICAgICAgICBjb25zdCBkeCA9IHAueCAtIG8ueDtcclxuICAgICAgICBjb25zdCBkeSA9IHAueSAtIG8ueTtcclxuXHJcbiAgICAgICAgLy8gU25hcCBiYWNrIHZpc3VhbGx5XHJcbiAgICAgICAgYi54ID0gYi50YXJnZXRYO1xyXG4gICAgICAgIGIueSA9IGIudGFyZ2V0WTtcclxuXHJcbiAgICAgICAgbGV0IHRyID0gYi5yb3csIHRjID0gYi5jb2w7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1IHx8IE1hdGguYWJzKGR5KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1KSB7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuICAgICAgICAgICAgICAgIHRjICs9IGR4ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRyICs9IGR5ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5kcmFnT3JpZ2luID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRyID49IDAgJiYgdHIgPCB0aGlzLnJvd3MgJiYgdGMgPj0gMCAmJiB0YyA8IHRoaXMuY29scyAmJiAodHIgIT09IGIucm93IHx8IHRjICE9PSBiLmNvbCkpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWdpblN3YXAoYiwgdGhpcy5ncmlkW3RyXVt0Y10pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJlZ2luU3dhcChhOiBCYWxsLCBiOiBCYWxsKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zd2FwMSA9IGE7XHJcbiAgICAgICAgdGhpcy5zd2FwMiA9IGI7XHJcbiAgICAgICAgdGhpcy5zd2FwSXNSZXZlcnNlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIFN3YXAgaW4gZ3JpZFxyXG4gICAgICAgIHRoaXMuZ3JpZFthLnJvd11bYS5jb2xdID0gYjtcclxuICAgICAgICB0aGlzLmdyaWRbYi5yb3ddW2IuY29sXSA9IGE7XHJcblxyXG4gICAgICAgIGNvbnN0IFthciwgYWNdID0gW2Eucm93LCBhLmNvbF07XHJcbiAgICAgICAgYS5yb3cgPSBiLnJvdzsgYS5jb2wgPSBiLmNvbDtcclxuICAgICAgICBiLnJvdyA9IGFyOyBiLmNvbCA9IGFjO1xyXG5cclxuICAgICAgICBjb25zdCBwYSA9IHRoaXMucG9zKGEucm93LCBhLmNvbCk7XHJcbiAgICAgICAgY29uc3QgcGIgPSB0aGlzLnBvcyhiLnJvdywgYi5jb2wpO1xyXG4gICAgICAgIGEudGFyZ2V0WCA9IHBhLng7IGEudGFyZ2V0WSA9IHBhLnk7XHJcbiAgICAgICAgYi50YXJnZXRYID0gcGIueDsgYi50YXJnZXRZID0gcGIueTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNXQVBfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVuZG9Td2FwKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLnN3YXAxISwgYiA9IHRoaXMuc3dhcDIhO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRbYS5yb3ddW2EuY29sXSA9IGI7XHJcbiAgICAgICAgdGhpcy5ncmlkW2Iucm93XVtiLmNvbF0gPSBhO1xyXG5cclxuICAgICAgICBjb25zdCBbYXIsIGFjXSA9IFthLnJvdywgYS5jb2xdO1xyXG4gICAgICAgIGEucm93ID0gYi5yb3c7IGEuY29sID0gYi5jb2w7XHJcbiAgICAgICAgYi5yb3cgPSBhcjsgYi5jb2wgPSBhYztcclxuXHJcbiAgICAgICAgY29uc3QgcGEgPSB0aGlzLnBvcyhhLnJvdywgYS5jb2wpO1xyXG4gICAgICAgIGNvbnN0IHBiID0gdGhpcy5wb3MoYi5yb3csIGIuY29sKTtcclxuICAgICAgICBhLnRhcmdldFggPSBwYS54OyBhLnRhcmdldFkgPSBwYS55O1xyXG4gICAgICAgIGIudGFyZ2V0WCA9IHBiLng7IGIudGFyZ2V0WSA9IHBiLnk7XHJcblxyXG4gICAgICAgIHRoaXMuc3dhcElzUmV2ZXJzZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFVwZGF0ZSAvIERyYXcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVCYWxscygpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgYW5pbSA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspXHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ncmlkW3JdW2NdPy51cGRhdGUoKSkgYW5pbSA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIGFuaW07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrID0gKG5vdzogbnVtYmVyID0gMCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIHRoaXMub25UaWNrQW1iaWVudD8uKG5vdyk7XHJcblxyXG4gICAgICAgIC8vIFBoeXNpY3NcclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IHRoaXMucGFydGljbGVzLmZpbHRlcihwID0+IHAudXBkYXRlKCkpO1xyXG4gICAgICAgIHRoaXMucG9wdXBzID0gdGhpcy5wb3B1cHMuZmlsdGVyKHAgPT4gcC51cGRhdGUoKSk7XHJcbiAgICAgICAgY29uc3QgYW5pbSA9IHRoaXMudXBkYXRlQmFsbHMoKTtcclxuICAgICAgICB1cGRhdGVGYWNlVGltZSgxIC8gNjApO1xyXG5cclxuICAgICAgICAvLyBTdGF0ZSBtYWNoaW5lXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU1dBUF9BTklNOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhbmltKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3dhcElzUmV2ZXJzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmluZE1hdGNoZXMoKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmRvU3dhcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tYm8gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkJSRUFLX0FOSU06XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuaW0pIHRoaXMuZ3Jhdml0eSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkZBTExfQU5JTTpcclxuICAgICAgICAgICAgICAgIGlmICghYW5pbSkgdGhpcy5wcm9jZXNzTWF0Y2hlcygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLklETEU6XHJcbiAgICAgICAgICAgICAgICAvLyBIaW50IHRpbWVyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmlkbGVUaW1lciArPSAxIC8gNjA7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGludE1vdmUgJiYgdGhpcy5pZGxlVGltZXIgPj0gdGhpcy5ISU5UX0RFTEFZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oaW50TW92ZSA9IHRoaXMuZmluZFZhbGlkTW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRpY2tVSSgpO1xyXG4gICAgICAgIHRoaXMuZHJhdygpO1xyXG4gICAgICAgIHRoaXMuYW5pbUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMudGljayk7XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgZHJhdygpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCB7IGN0eCB9ID0gdGhpcztcclxuICAgICAgICBjb25zdCB3ID0gdGhpcy5sb2dpY2FsVywgaCA9IHRoaXMubG9naWNhbEg7XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSBzY3JlZW4gc2hha2VcclxuICAgICAgICBpZiAodGhpcy5zaGFrZU1hZyA+IDAuMykge1xyXG4gICAgICAgICAgICB0aGlzLnNoYWtlWCA9IChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIHRoaXMuc2hha2VNYWcgKiAyO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWtlWSA9IChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIHRoaXMuc2hha2VNYWcgKiAyO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWtlTWFnICo9IDAuODg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zaGFrZVggPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWtlWSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuc2hha2VNYWcgPSAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHgudHJhbnNsYXRlKHRoaXMuc2hha2VYLCB0aGlzLnNoYWtlWSk7XHJcblxyXG4gICAgICAgIC8vIEJhY2tncm91bmRcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMxNDE0MTQnO1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgtMTAsIC0xMCwgdyArIDIwLCBoICsgMjApO1xyXG5cclxuICAgICAgICAvLyBTdWJ0bGUgZ3JpZCBkb3RzIChjYWNoZWQpXHJcbiAgICAgICAgaWYgKHRoaXMuZ3JpZERvdENhY2hlKSBjdHguZHJhd0ltYWdlKHRoaXMuZ3JpZERvdENhY2hlLCAwLCAwKTtcclxuXHJcbiAgICAgICAgLy8gQmFsbHMgKG5vbi1kcmFnZ2luZyBmaXJzdClcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKVxyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIgJiYgYiAhPT0gdGhpcy5kcmFnZ2luZykgYi5kcmF3KGN0eCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRHJhZ2dpbmcgYmFsbCBvbiB0b3BcclxuICAgICAgICBpZiAodGhpcy5kcmFnZ2luZykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXdTZWxlY3RlZChjdHgpO1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXcoY3R4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEhpbnQgZ2xvd1xyXG4gICAgICAgIGlmICh0aGlzLmhpbnRNb3ZlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IFtyMSwgYzEsIHIyLCBjMl0gPSB0aGlzLmhpbnRNb3ZlO1xyXG4gICAgICAgICAgICBjb25zdCBwdWxzZSA9IDAuMyArIE1hdGguc2luKGdldEZhY2VUaW1lKCkgKiAzKSAqIDAuMTU7XHJcbiAgICAgICAgICAgIGNvbnN0IGIxID0gdGhpcy5ncmlkW3IxXVtjMV07XHJcbiAgICAgICAgICAgIGNvbnN0IGIyID0gdGhpcy5ncmlkW3IyXVtjMl07XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYiBvZiBbYjEsIGIyXSkge1xyXG4gICAgICAgICAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5hcmMoYi54LCBiLnksIHRoaXMuYmFsbFJhZGl1cyArIDQsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGByZ2JhKDI1NSwgMjU1LCAyNTUsICR7cHVsc2V9KWA7XHJcbiAgICAgICAgICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcclxuICAgICAgICAgICAgICAgIGN0eC5zaGFkb3dDb2xvciA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSknO1xyXG4gICAgICAgICAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSAxMDtcclxuICAgICAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBhcnRpY2xlcyAmIHBvcHVwc1xyXG4gICAgICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnBhcnRpY2xlcykgcC5kcmF3KGN0eCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBwIG9mIHRoaXMucG9wdXBzKSBwLmRyYXcoY3R4KTtcclxuXHJcbiAgICAgICAgLy8gRmxhc2ggb3ZlcmxheVxyXG4gICAgICAgIGlmICh0aGlzLmZsYXNoQWxwaGEgPiAwLjAwNSkge1xyXG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSB0aGlzLmZsYXNoQWxwaGE7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmZsYXNoQ29sb3I7XHJcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgtMTAsIC0xMCwgdyArIDIwLCBoICsgMjApO1xyXG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmZsYXNoQWxwaGEgKj0gMC44NTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENvbWJvIGJhbm5lciDigJQgYmlnIGNlbnRlcmVkIHRleHQgb24gY2FudmFzXHJcbiAgICAgICAgaWYgKHRoaXMuY29tYm9EaXNwbGF5QWxwaGEgPiAwLjAxKSB7XHJcbiAgICAgICAgICAgIGN0eC5zYXZlKCk7XHJcbiAgICAgICAgICAgIGN0eC5nbG9iYWxBbHBoYSA9IHRoaXMuY29tYm9EaXNwbGF5QWxwaGE7XHJcbiAgICAgICAgICAgIGNvbnN0IHMgPSB0aGlzLmNvbWJvRGlzcGxheVNjYWxlO1xyXG4gICAgICAgICAgICBjb25zdCBieCA9IHcgLyAyO1xyXG4gICAgICAgICAgICBjb25zdCBieSA9IDM4O1xyXG5cclxuICAgICAgICAgICAgY3R4LnRyYW5zbGF0ZShieCwgYnkpO1xyXG4gICAgICAgICAgICBjdHguc2NhbGUocywgcyk7XHJcblxyXG4gICAgICAgICAgICBjdHguZm9udCA9ICdib2xkIDIycHggXCJTcGFjZSBNb25vXCIsIFwiQ291cmllciBOZXdcIiwgbW9ub3NwYWNlJztcclxuICAgICAgICAgICAgY3R4LnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgICAgICBjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XHJcblxyXG4gICAgICAgICAgICAvLyBHbG93XHJcbiAgICAgICAgICAgIGN0eC5zaGFkb3dDb2xvciA9IHRoaXMuY29tYm9EaXNwbGF5Q29sb3I7XHJcbiAgICAgICAgICAgIGN0eC5zaGFkb3dCbHVyID0gMTY7XHJcbiAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbWJvRGlzcGxheUNvbG9yO1xyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQodGhpcy5jb21ib0Rpc3BsYXlUZXh0LCAwLCAwKTtcclxuICAgICAgICAgICAgLy8gU2Vjb25kIHBhc3MgZm9yIGJyaWdodGVyIGdsb3dcclxuICAgICAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSA4O1xyXG4gICAgICAgICAgICBjdHguZmlsbFRleHQodGhpcy5jb21ib0Rpc3BsYXlUZXh0LCAwLCAwKTtcclxuXHJcbiAgICAgICAgICAgIGN0eC5yZXN0b3JlKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBBbmltYXRlOiBzY2FsZSBzZXR0bGVzIHRvIDEsIGFscGhhIGZhZGVzXHJcbiAgICAgICAgICAgIHRoaXMuY29tYm9EaXNwbGF5U2NhbGUgKz0gKDEgLSB0aGlzLmNvbWJvRGlzcGxheVNjYWxlKSAqIDAuMTU7XHJcbiAgICAgICAgICAgIHRoaXMuY29tYm9EaXNwbGF5QWxwaGEgLT0gMC4wMTI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjdHgucmVzdG9yZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBVSSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZVVJKCk6IHZvaWQge1xyXG4gICAgICAgIC8vIEFuaW1hdGUgc2NvcmUgY291bnRpbmcgaW4gdGlja1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdGlja1VJKCk6IHZvaWQge1xyXG4gICAgICAgIGxldCBjaGFuZ2VkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRpc3BsYXlTY29yZSA8IHRoaXMuc2NvcmUpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3RlcCA9IE1hdGgubWF4KDEsIE1hdGguY2VpbCgodGhpcy5zY29yZSAtIHRoaXMuZGlzcGxheVNjb3JlKSAqIDAuMTUpKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5U2NvcmUgPSBNYXRoLm1pbih0aGlzLmRpc3BsYXlTY29yZSArIHN0ZXAsIHRoaXMuc2NvcmUpO1xyXG4gICAgICAgICAgICB0aGlzLmVsU2NvcmUudGV4dENvbnRlbnQgPSBTdHJpbmcodGhpcy5kaXNwbGF5U2NvcmUpO1xyXG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmRpc3BsYXlIaWdoIDwgdGhpcy5oaWdoU2NvcmUpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3RlcCA9IE1hdGgubWF4KDEsIE1hdGguY2VpbCgodGhpcy5oaWdoU2NvcmUgLSB0aGlzLmRpc3BsYXlIaWdoKSAqIDAuMTUpKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5SGlnaCA9IE1hdGgubWluKHRoaXMuZGlzcGxheUhpZ2ggKyBzdGVwLCB0aGlzLmhpZ2hTY29yZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZWxIaWdoLnRleHRDb250ZW50ID0gU3RyaW5nKHRoaXMuZGlzcGxheUhpZ2gpO1xyXG4gICAgICAgICAgICBjaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEJ1bXAgYW5pbWF0aW9uXHJcbiAgICAgICAgaWYgKGNoYW5nZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5lbFNjb3JlLmNsYXNzTGlzdC5hZGQoJ2J1bXAnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZGlzcGxheUhpZ2ggPiBwYXJzZUludCh0aGlzLmVsSGlnaC50ZXh0Q29udGVudCB8fCAnMCcpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVsSGlnaC5jbGFzc0xpc3QuYWRkKCdidW1wJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmVsU2NvcmUuY2xhc3NMaXN0LnJlbW92ZSgnYnVtcCcpO1xyXG4gICAgICAgICAgICB0aGlzLmVsSGlnaC5jbGFzc0xpc3QucmVtb3ZlKCdidW1wJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsCiAgICAiY29uc3QgQ09MT1JTID0gWycjRTc0QzNDJywgJyNGMUM0MEYnLCAnIzJFQ0M3MScsICcjMzQ5OERCJywgJyM5QjU5QjYnLCAnI0U2N0UyMiddO1xuY29uc3QgQ09VTlQgPSA4O1xuXG5pbnRlcmZhY2UgQW1iaWVudEJhbGwge1xuICAgIHg6IG51bWJlcjtcbiAgICB5OiBudW1iZXI7XG4gICAgcjogbnVtYmVyO1xuICAgIGFuZ2xlOiBudW1iZXI7XG4gICAgc3BlZWQ6IG51bWJlcjtcbiAgICB3b2JibGVBbXA6IG51bWJlcjtcbiAgICB3b2JibGVGcmVxOiBudW1iZXI7XG4gICAgd29iYmxlUGhhc2U6IG51bWJlcjtcbiAgICBiYXNlQWxwaGE6IG51bWJlcjtcbiAgICBhbHBoYUFtcDogbnVtYmVyO1xuICAgIGFscGhhRnJlcTogbnVtYmVyO1xuICAgIGFscGhhUGhhc2U6IG51bWJlcjtcbiAgICBiYXNlUjogbnVtYmVyO1xuICAgIHJBbXA6IG51bWJlcjtcbiAgICByRnJlcTogbnVtYmVyO1xuICAgIHJQaGFzZTogbnVtYmVyO1xuICAgIGNvbG9yOiBzdHJpbmc7XG4gICAgdDogbnVtYmVyO1xufVxuXG5sZXQgYmFsbHM6IEFtYmllbnRCYWxsW10gPSBbXTtcbmxldCBhbWJpZW50Q3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsID0gbnVsbDtcbmxldCBsYXN0QW1iaWVudFRpY2sgPSAwO1xuY29uc3QgQU1CSUVOVF9JTlRFUlZBTCA9IDEwMDAgLyAzMDsgLy8gMzBmcHNcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRBbWJpZW50KGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQpOiB2b2lkIHtcbiAgICBjYW52YXMuc3R5bGUuZmlsdGVyID0gJ2JsdXIoNDVweCknO1xuICAgIGNhbnZhcy5zdHlsZS50cmFuc2Zvcm0gPSAnc2NhbGUoMS4wOCknO1xuXG4gICAgYW1iaWVudEN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpITtcblxuICAgIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgfVxuICAgIHJlc2l6ZSgpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemUpO1xuXG4gICAgYmFsbHMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiBDT1VOVCB9LCAoXywgaSkgPT4ge1xuICAgICAgICBjb25zdCBiYXNlUiA9IDY1ICsgTWF0aC5yYW5kb20oKSAqIDg1O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogTWF0aC5yYW5kb20oKSAqIHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICAgICAgeTogTWF0aC5yYW5kb20oKSAqIHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICAgICAgICAgIHI6IGJhc2VSLFxuICAgICAgICAgICAgYmFzZVIsXG4gICAgICAgICAgICBhbmdsZTogTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyLFxuICAgICAgICAgICAgc3BlZWQ6IDAuMyArIE1hdGgucmFuZG9tKCkgKiAwLjUsXG4gICAgICAgICAgICB3b2JibGVBbXA6IDMwICsgTWF0aC5yYW5kb20oKSAqIDUwLFxuICAgICAgICAgICAgd29iYmxlRnJlcTogMC4zICsgTWF0aC5yYW5kb20oKSAqIDAuNCxcbiAgICAgICAgICAgIHdvYmJsZVBoYXNlOiBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSAqIDIsXG4gICAgICAgICAgICBiYXNlQWxwaGE6IDAuMyArIE1hdGgucmFuZG9tKCkgKiAwLjIsXG4gICAgICAgICAgICBhbHBoYUFtcDogMC4wOCArIE1hdGgucmFuZG9tKCkgKiAwLjA4LFxuICAgICAgICAgICAgYWxwaGFGcmVxOiAwLjIgKyBNYXRoLnJhbmRvbSgpICogMC4zLFxuICAgICAgICAgICAgYWxwaGFQaGFzZTogTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyLFxuICAgICAgICAgICAgckFtcDogYmFzZVIgKiAwLjEyLFxuICAgICAgICAgICAgckZyZXE6IDAuMTUgKyBNYXRoLnJhbmRvbSgpICogMC4yLFxuICAgICAgICAgICAgclBoYXNlOiBNYXRoLnJhbmRvbSgpICogTWF0aC5QSSAqIDIsXG4gICAgICAgICAgICBjb2xvcjogQ09MT1JTW2kgJSBDT0xPUlMubGVuZ3RoXSxcbiAgICAgICAgICAgIHQ6IE1hdGgucmFuZG9tKCkgKiAxMDAsXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5cbi8qKiBDYWxsZWQgZnJvbSB0aGUgZ2FtZSBsb29wIGVhY2ggZnJhbWUg4oCUIHRocm90dGxlZCBpbnRlcm5hbGx5IHRvIDMwZnBzICovXG5leHBvcnQgZnVuY3Rpb24gdGlja0FtYmllbnQobm93OiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIWFtYmllbnRDdHggfHwgbm93IC0gbGFzdEFtYmllbnRUaWNrIDwgQU1CSUVOVF9JTlRFUlZBTCkgcmV0dXJuO1xuICAgIGxhc3RBbWJpZW50VGljayA9IG5vdztcblxuICAgIGNvbnN0IGN0eCA9IGFtYmllbnRDdHg7XG4gICAgY29uc3QgdyA9IGN0eC5jYW52YXMud2lkdGg7XG4gICAgY29uc3QgaCA9IGN0eC5jYW52YXMuaGVpZ2h0O1xuXG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcblxuICAgIGZvciAoY29uc3QgYiBvZiBiYWxscykge1xuICAgICAgICBiLnQgKz0gMC4wMzM7IC8vIH4zMGZwcyBkdFxuICAgICAgICBiLmFuZ2xlICs9IChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIDAuMDA4O1xuXG4gICAgICAgIGNvbnN0IHZ4ID0gTWF0aC5jb3MoYi5hbmdsZSkgKiBiLnNwZWVkO1xuICAgICAgICBjb25zdCB2eSA9IE1hdGguc2luKGIuYW5nbGUpICogYi5zcGVlZDtcbiAgICAgICAgY29uc3QgcGVycFggPSAtTWF0aC5zaW4oYi5hbmdsZSk7XG4gICAgICAgIGNvbnN0IHBlcnBZID0gIE1hdGguY29zKGIuYW5nbGUpO1xuICAgICAgICBjb25zdCB3b2JibGUgPSBNYXRoLnNpbihiLnQgKiBiLndvYmJsZUZyZXEgKyBiLndvYmJsZVBoYXNlKSAqIGIud29iYmxlQW1wICogMC4wMzM7XG5cbiAgICAgICAgYi54ICs9IHZ4ICsgcGVycFggKiB3b2JibGU7XG4gICAgICAgIGIueSArPSB2eSArIHBlcnBZICogd29iYmxlO1xuXG4gICAgICAgIGlmIChiLnggPCAtYi5yKSAgICBiLnggPSB3ICsgYi5yO1xuICAgICAgICBpZiAoYi54ID4gdyArIGIucikgIGIueCA9IC1iLnI7XG4gICAgICAgIGlmIChiLnkgPCAtYi5yKSAgICBiLnkgPSBoICsgYi5yO1xuICAgICAgICBpZiAoYi55ID4gaCArIGIucikgIGIueSA9IC1iLnI7XG5cbiAgICAgICAgYi5yID0gYi5iYXNlUiArIE1hdGguc2luKGIudCAqIGIuckZyZXEgKyBiLnJQaGFzZSkgKiBiLnJBbXA7XG5cbiAgICAgICAgY3R4Lmdsb2JhbEFscGhhID0gTWF0aC5tYXgoMCwgYi5iYXNlQWxwaGEgKyBNYXRoLnNpbihiLnQgKiBiLmFscGhhRnJlcSArIGIuYWxwaGFQaGFzZSkgKiBiLmFscGhhQW1wKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGIuY29sb3I7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYyhiLngsIGIueSwgYi5yLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgfVxufVxuIiwKICAgICJpbXBvcnQgeyBHYW1lIH0gZnJvbSAnLi9nYW1lLmpzJztcbmltcG9ydCB7IGluaXRBbWJpZW50LCB0aWNrQW1iaWVudCB9IGZyb20gJy4vYW1iaWVudC5qcyc7XG5cbmNvbnN0IGJnQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JnLWNhbnZhcycpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuaW5pdEFtYmllbnQoYmdDYW52YXMpO1xuXG5jb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSE7XG5cbi8vIFJldGluYSAvIEhpRFBJIHN1cHBvcnRcbmNvbnN0IGRwciA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDE7XG5jb25zdCBsb2dpY2FsVyA9IDM4MDtcbmNvbnN0IGxvZ2ljYWxIID0gNjAwO1xuY2FudmFzLndpZHRoID0gbG9naWNhbFcgKiBkcHI7XG5jYW52YXMuaGVpZ2h0ID0gbG9naWNhbEggKiBkcHI7XG5jYW52YXMuc3R5bGUud2lkdGggPSBgJHtsb2dpY2FsV31weGA7XG5jYW52YXMuc3R5bGUuaGVpZ2h0ID0gYCR7bG9naWNhbEh9cHhgO1xuY3R4LnNjYWxlKGRwciwgZHByKTtcblxuY29uc3QgZ2FtZSA9IG5ldyBHYW1lKGNhbnZhcywgY3R4LCBsb2dpY2FsVywgbG9naWNhbEgsIHRpY2tBbWJpZW50KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhcnQnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiBnYW1lLnJlc3RhcnQoKSk7XG4iCiAgXSwK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QUksRUFBRSxLQUFLLElBQUksRUFBRTtBQUFBLElBQ2pDLE1BQU0sUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLEtBQUs7QUFBQSxJQUMvQixNQUFNLFFBQVMsS0FBSyxJQUFJLEVBQUUsS0FBSztBQUFBLElBQy9CLE1BQU0sU0FBUyxLQUFLLElBQUksRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFdBQVcsSUFBSSxFQUFFLFlBQVk7QUFBQSxJQUU1RSxFQUFFLEtBQUssS0FBSyxRQUFRO0FBQUEsSUFDcEIsRUFBRSxLQUFLLEtBQUssUUFBUTtBQUFBLElBRXBCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtBQUFBLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRTtBQUFBLElBQy9CLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtBQUFBLE1BQUksRUFBRSxJQUFJLENBQUMsRUFBRTtBQUFBLElBQzdCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtBQUFBLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRTtBQUFBLElBQy9CLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtBQUFBLE1BQUksRUFBRSxJQUFJLENBQUMsRUFBRTtBQUFBLElBRTdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsS0FBSyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLElBQUksRUFBRTtBQUFBLElBRXZELElBQUksY0FBYyxLQUFLLElBQUksR0FBRyxFQUFFLFlBQVksS0FBSyxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxVQUFVLElBQUksRUFBRSxRQUFRO0FBQUEsSUFDbkcsSUFBSSxZQUFZLEVBQUU7QUFBQSxJQUNsQixJQUFJLFVBQVU7QUFBQSxJQUNkLElBQUksSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLEtBQUssS0FBSyxDQUFDO0FBQUEsSUFDckMsSUFBSSxLQUFLO0FBQUEsRUFDYjtBQUFBOzs7QUNwR0osSUFBTSxXQUFXLFNBQVMsZUFBZSxXQUFXO0FBQ3BELFlBQVksUUFBUTtBQUVwQixJQUFNLFNBQVMsU0FBUyxlQUFlLFFBQVE7QUFDL0MsSUFBTSxNQUFNLE9BQU8sV0FBVyxJQUFJO0FBR2xDLElBQU0sTUFBTSxPQUFPLG9CQUFvQjtBQUN2QyxJQUFNLFdBQVc7QUFDakIsSUFBTSxXQUFXO0FBQ2pCLE9BQU8sUUFBUSxXQUFXO0FBQzFCLE9BQU8sU0FBUyxXQUFXO0FBQzNCLE9BQU8sTUFBTSxRQUFRLEdBQUc7QUFDeEIsT0FBTyxNQUFNLFNBQVMsR0FBRztBQUN6QixJQUFJLE1BQU0sS0FBSyxHQUFHO0FBRWxCLElBQU0sT0FBTyxJQUFJLEtBQUssUUFBUSxLQUFLLFVBQVUsVUFBVSxXQUFXO0FBRWxFLFNBQVMsZUFBZSxTQUFTLEdBQUcsaUJBQWlCLFNBQVMsTUFBTSxLQUFLLFFBQVEsQ0FBQzsiLAogICJkZWJ1Z0lkIjogIjc3NzFEOTcyM0JFQkI2M0I2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
