// src/balls.ts
var spriteCache = new Map;
var SPRITE_PAD = 6;
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, n >> 8 & 255, n & 255];
}
function adjustRgb([r, g, b], amt) {
  return `rgb(${Math.max(0, Math.min(255, r + amt))},${Math.max(0, Math.min(255, g + amt))},${Math.max(0, Math.min(255, b + amt))})`;
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
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 3, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 0.5, cy + 1.5, r + 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.05, cx + r * 0.05, cy + r * 0.15, r * 1.02);
  grad.addColorStop(0, adjustRgb(rgb, 60));
  grad.addColorStop(0.35, adjustRgb(rgb, 20));
  grad.addColorStop(0.6, color);
  grad.addColorStop(0.85, adjustRgb(rgb, -25));
  grad.addColorStop(1, adjustRgb(rgb, -50));
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  const hl = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, 0, cx - r * 0.15, cy - r * 0.18, r * 0.55);
  hl.addColorStop(0, "rgba(255,255,255,0.65)");
  hl.addColorStop(0.5, "rgba(255,255,255,0.18)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = hl;
  ctx.fill();
  const rim = ctx.createRadialGradient(cx + r * 0.15, cy + r * 0.55, 0, cx + r * 0.1, cy + r * 0.4, r * 0.5);
  rim.addColorStop(0, "rgba(255,255,255,0.12)");
  rim.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = adjustRgb(rgb, -40);
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  spriteCache.set(key, oc);
  return oc;
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
    const sprite = getSprite(this.color, this.radius);
    const s = this.scale;
    const sw = sprite.width;
    const sh = sprite.height;
    const dw = sw * s;
    const dh = sh * s;
    ctx.drawImage(sprite, this.x - dw / 2, this.y - dh / 2, dw, dh);
  }
  drawSelected(ctx) {
    const r = this.radius * this.scale + 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  clone() {
    const b = new Ball(this.x, this.y, this.radius, this.color);
    b.targetX = this.targetX;
    b.targetY = this.targetY;
    b.row = this.row;
    b.col = this.col;
    b.scale = this.scale;
    b.targetScale = this.targetScale;
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
        const b = new Ball(p.x, p.y, this.ballRadius, this.rndColor());
        b.row = r;
        b.col = c;
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
        for (const b of g)
          b.color = this.rndColor();
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

//# debugId=A3E44C8A52CEBBC164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXHNyY1xcYmFsbHMudHMiLCAiLi5cXHNyY1xccGFydGljbGUudHMiLCAiLi5cXHNyY1xcZ2FtZS50cyIsICIuLlxcc3JjXFxzY3JpcHQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLy8gUHJlLXJlbmRlcmVkIGJhbGwgc3ByaXRlIGNhY2hlOiBjb2xvciDihpIgT2Zmc2NyZWVuQ2FudmFzXHJcbmNvbnN0IHNwcml0ZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE9mZnNjcmVlbkNhbnZhcz4oKTtcclxuY29uc3QgU1BSSVRFX1BBRCA9IDY7IC8vIGV4dHJhIHBpeGVscyBmb3Igc2hhZG93XHJcblxyXG5mdW5jdGlvbiBoZXhUb1JnYihoZXg6IHN0cmluZyk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XHJcbiAgICBjb25zdCBuID0gcGFyc2VJbnQoaGV4LnNsaWNlKDEpLCAxNik7XHJcbiAgICByZXR1cm4gW24gPj4gMTYsIChuID4+IDgpICYgMHhmZiwgbiAmIDB4ZmZdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGp1c3RSZ2IoW3IsIGcsIGJdOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0sIGFtdDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgcmdiKCR7TWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCByICsgYW10KSl9LCR7TWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBnICsgYW10KSl9LCR7TWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBiICsgYW10KSl9KWA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFNwcml0ZShjb2xvcjogc3RyaW5nLCByYWRpdXM6IG51bWJlcik6IE9mZnNjcmVlbkNhbnZhcyB7XHJcbiAgICBjb25zdCBrZXkgPSBgJHtjb2xvcn1fJHtyYWRpdXN9YDtcclxuICAgIGxldCBjYWNoZWQgPSBzcHJpdGVDYWNoZS5nZXQoa2V5KTtcclxuICAgIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XHJcblxyXG4gICAgY29uc3Qgc2l6ZSA9IChyYWRpdXMgKyBTUFJJVEVfUEFEKSAqIDI7XHJcbiAgICBjb25zdCBvYyA9IG5ldyBPZmZzY3JlZW5DYW52YXMoc2l6ZSwgc2l6ZSk7XHJcbiAgICBjb25zdCBjdHggPSBvYy5nZXRDb250ZXh0KCcyZCcpITtcclxuICAgIGNvbnN0IGN4ID0gcmFkaXVzICsgU1BSSVRFX1BBRDtcclxuICAgIGNvbnN0IGN5ID0gY3g7XHJcbiAgICBjb25zdCByID0gcmFkaXVzO1xyXG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IoY29sb3IpO1xyXG5cclxuICAgIC8vIE91dGVyIHNoYWRvdyAobGFyZ2VyLCBzb2Z0ZXIpXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKGN4ICsgMSwgY3kgKyAzLCByICsgMiwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9ICdyZ2JhKDAsMCwwLDAuMTgpJztcclxuICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgLy8gSW5uZXIgc2hhZG93ICh0aWdodGVyKVxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCArIDAuNSwgY3kgKyAxLjUsIHIgKyAwLjUsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgwLDAsMCwwLjEyKSc7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIC8vIEJhc2UgZ3JhZGllbnQg4oCUIHJpY2hlciBkZXB0aFxyXG4gICAgY29uc3QgZ3JhZCA9IGN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcclxuICAgICAgICBjeCAtIHIgKiAwLjMsIGN5IC0gciAqIDAuNCwgciAqIDAuMDUsXHJcbiAgICAgICAgY3ggKyByICogMC4wNSwgY3kgKyByICogMC4xNSwgciAqIDEuMDIsXHJcbiAgICApO1xyXG4gICAgZ3JhZC5hZGRDb2xvclN0b3AoMCwgYWRqdXN0UmdiKHJnYiwgNjApKTtcclxuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuMzUsIGFkanVzdFJnYihyZ2IsIDIwKSk7XHJcbiAgICBncmFkLmFkZENvbG9yU3RvcCgwLjYsIGNvbG9yKTtcclxuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAuODUsIGFkanVzdFJnYihyZ2IsIC0yNSkpO1xyXG4gICAgZ3JhZC5hZGRDb2xvclN0b3AoMSwgYWRqdXN0UmdiKHJnYiwgLTUwKSk7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCwgY3ksIHIsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBncmFkO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAvLyBQcmltYXJ5IHNwZWN1bGFyIGhpZ2hsaWdodCAodG9wLWxlZnQpXHJcbiAgICBjb25zdCBobCA9IGN0eC5jcmVhdGVSYWRpYWxHcmFkaWVudChcclxuICAgICAgICBjeCAtIHIgKiAwLjI4LCBjeSAtIHIgKiAwLjMyLCAwLFxyXG4gICAgICAgIGN4IC0gciAqIDAuMTUsIGN5IC0gciAqIDAuMTgsIHIgKiAwLjU1LFxyXG4gICAgKTtcclxuICAgIGhsLmFkZENvbG9yU3RvcCgwLCAncmdiYSgyNTUsMjU1LDI1NSwwLjY1KScpO1xyXG4gICAgaGwuYWRkQ29sb3JTdG9wKDAuNSwgJ3JnYmEoMjU1LDI1NSwyNTUsMC4xOCknKTtcclxuICAgIGhsLmFkZENvbG9yU3RvcCgxLCAncmdiYSgyNTUsMjU1LDI1NSwwKScpO1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgIGN0eC5hcmMoY3gsIGN5LCByLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gaGw7XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIC8vIEJvdHRvbSByaW0gbGlnaHQgKHJlZmxlY3RlZCBsaWdodCBmcm9tIHN1cmZhY2UpXHJcbiAgICBjb25zdCByaW0gPSBjdHguY3JlYXRlUmFkaWFsR3JhZGllbnQoXHJcbiAgICAgICAgY3ggKyByICogMC4xNSwgY3kgKyByICogMC41NSwgMCxcclxuICAgICAgICBjeCArIHIgKiAwLjEsIGN5ICsgciAqIDAuNCwgciAqIDAuNSxcclxuICAgICk7XHJcbiAgICByaW0uYWRkQ29sb3JTdG9wKDAsICdyZ2JhKDI1NSwyNTUsMjU1LDAuMTIpJyk7XHJcbiAgICByaW0uYWRkQ29sb3JTdG9wKDEsICdyZ2JhKDI1NSwyNTUsMjU1LDApJyk7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCwgY3ksIHIsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5maWxsU3R5bGUgPSByaW07XHJcbiAgICBjdHguZmlsbCgpO1xyXG5cclxuICAgIC8vIEVkZ2UgZGVmaW5pdGlvblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgY3R4LmFyYyhjeCwgY3ksIHIgLSAwLjUsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IGFkanVzdFJnYihyZ2IsIC00MCk7XHJcbiAgICBjdHgubGluZVdpZHRoID0gMC44O1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gMC4zO1xyXG4gICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgY3R4Lmdsb2JhbEFscGhhID0gMTtcclxuXHJcbiAgICBzcHJpdGVDYWNoZS5zZXQoa2V5LCBvYyk7XHJcbiAgICByZXR1cm4gb2M7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCYWxsIHtcclxuICAgIHB1YmxpYyB0YXJnZXRYOiBudW1iZXI7XHJcbiAgICBwdWJsaWMgdGFyZ2V0WTogbnVtYmVyO1xyXG4gICAgcHVibGljIHNjYWxlOiBudW1iZXIgPSAxO1xyXG4gICAgcHVibGljIHRhcmdldFNjYWxlOiBudW1iZXIgPSAxO1xyXG4gICAgcHVibGljIHJvdzogbnVtYmVyID0gMDtcclxuICAgIHB1YmxpYyBjb2w6IG51bWJlciA9IDA7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIHg6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgeTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyByYWRpdXM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMudGFyZ2V0WCA9IHg7XHJcbiAgICAgICAgdGhpcy50YXJnZXRZID0geTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUoc3BlZWQ6IG51bWJlciA9IDAuMyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBtb3ZpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3QgZHggPSB0aGlzLnRhcmdldFggLSB0aGlzLng7XHJcbiAgICAgICAgY29uc3QgZHkgPSB0aGlzLnRhcmdldFkgLSB0aGlzLnk7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IDAuNSB8fCBNYXRoLmFicyhkeSkgPiAwLjUpIHtcclxuICAgICAgICAgICAgdGhpcy54ICs9IGR4ICogc3BlZWQ7XHJcbiAgICAgICAgICAgIHRoaXMueSArPSBkeSAqIHNwZWVkO1xyXG4gICAgICAgICAgICBtb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMueCA9IHRoaXMudGFyZ2V0WDtcclxuICAgICAgICAgICAgdGhpcy55ID0gdGhpcy50YXJnZXRZO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZHMgPSB0aGlzLnRhcmdldFNjYWxlIC0gdGhpcy5zY2FsZTtcclxuICAgICAgICBpZiAoTWF0aC5hYnMoZHMpID4gMC4wMSkge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlICs9IGRzICogMC4zNTtcclxuICAgICAgICAgICAgbW92aW5nID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gdGhpcy50YXJnZXRTY2FsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtb3Zpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgZHJhdyhjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnNjYWxlIDwgMC4wMikgcmV0dXJuO1xyXG5cclxuICAgICAgICBjb25zdCBzcHJpdGUgPSBnZXRTcHJpdGUodGhpcy5jb2xvciwgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNjYWxlO1xyXG4gICAgICAgIGNvbnN0IHN3ID0gc3ByaXRlLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IHNoID0gc3ByaXRlLmhlaWdodDtcclxuICAgICAgICBjb25zdCBkdyA9IHN3ICogcztcclxuICAgICAgICBjb25zdCBkaCA9IHNoICogcztcclxuXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZShzcHJpdGUsIHRoaXMueCAtIGR3IC8gMiwgdGhpcy55IC0gZGggLyAyLCBkdywgZGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXdTZWxlY3RlZChjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLnJhZGl1cyAqIHRoaXMuc2NhbGUgKyA0O1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgciwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICcjZmZmJztcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQmFsbCB7XHJcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCYWxsKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgdGhpcy5jb2xvcik7XHJcbiAgICAgICAgYi50YXJnZXRYID0gdGhpcy50YXJnZXRYO1xyXG4gICAgICAgIGIudGFyZ2V0WSA9IHRoaXMudGFyZ2V0WTtcclxuICAgICAgICBiLnJvdyA9IHRoaXMucm93O1xyXG4gICAgICAgIGIuY29sID0gdGhpcy5jb2w7XHJcbiAgICAgICAgYi5zY2FsZSA9IHRoaXMuc2NhbGU7XHJcbiAgICAgICAgYi50YXJnZXRTY2FsZSA9IHRoaXMudGFyZ2V0U2NhbGU7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbn1cclxuIiwKICAgICJleHBvcnQgY2xhc3MgUGFydGljbGUge1xyXG4gICAgcHVibGljIGxpZmU6IG51bWJlciA9IDE7XHJcbiAgICBwcml2YXRlIGRlY2F5OiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIHg6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgeTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyByYWRpdXM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuZGVjYXkgPSAwLjAyNSArIE1hdGgucmFuZG9tKCkgKiAwLjAzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLnggKz0gdGhpcy52eDtcclxuICAgICAgICB0aGlzLnkgKz0gdGhpcy52eTtcclxuICAgICAgICB0aGlzLnZ5ICs9IDAuMTI7XHJcbiAgICAgICAgdGhpcy5saWZlIC09IHRoaXMuZGVjYXk7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgKj0gMC45NTtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWZlID4gMCAmJiB0aGlzLnJhZGl1cyA+IDAuMztcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heCgwLCB0aGlzLmxpZmUpO1xyXG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnJhZGl1cyAqIDI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCAtIHMgLyAyLCB0aGlzLnkgLSBzIC8gMiwgcywgcyk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNjb3JlUG9wdXAge1xyXG4gICAgcHJpdmF0ZSBsaWZlOiBudW1iZXIgPSAxO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyB4OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHk6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgdGV4dDogc3RyaW5nLFxyXG4gICAgICAgIHB1YmxpYyBjb2xvcjogc3RyaW5nLFxyXG4gICAgKSB7fVxyXG5cclxuICAgIHVwZGF0ZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLnkgLT0gMS4yO1xyXG4gICAgICAgIHRoaXMubGlmZSAtPSAwLjAyNTtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWZlID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heCgwLCB0aGlzLmxpZmUpO1xyXG4gICAgICAgIGN0eC5mb250ID0gJ2JvbGQgMTRweCBcIlNwYWNlIE1vbm9cIiwgXCJDb3VyaWVyIE5ld1wiLCBtb25vc3BhY2UnO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy50ZXh0LCB0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG4iLAogICAgImltcG9ydCB7IEJhbGwgfSBmcm9tICcuL2JhbGxzLmpzJztcclxuaW1wb3J0IHsgUGFydGljbGUsIFNjb3JlUG9wdXAgfSBmcm9tICcuL3BhcnRpY2xlLmpzJztcclxuXHJcbmNvbnN0IGVudW0gU3RhdGUge1xyXG4gICAgSURMRSxcclxuICAgIERSQUdHSU5HLFxyXG4gICAgU1dBUF9BTklNLFxyXG4gICAgQlJFQUtfQU5JTSxcclxuICAgIEZBTExfQU5JTSxcclxufVxyXG5cclxuY29uc3QgQ09MT1JTID0gW1xyXG4gICAgJyNFNzRDM0MnLCAvLyBjaGVycnlcclxuICAgICcjRjFDNDBGJywgLy8gc3VuZmxvd2VyXHJcbiAgICAnIzJFQ0M3MScsIC8vIGphZGVcclxuICAgICcjMzQ5OERCJywgLy8gc2t5XHJcbiAgICAnIzlCNTlCNicsIC8vIHZpb2xldFxyXG4gICAgJyNFNjdFMjInLCAvLyBjb3JhbFxyXG5dO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdhbWUge1xyXG4gICAgLy8gR3JpZFxyXG4gICAgcHJpdmF0ZSBncmlkOiBCYWxsW11bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSByb3dzID0gMTI7XHJcbiAgICBwcml2YXRlIGNvbHMgPSA4O1xyXG4gICAgcHJpdmF0ZSBjZWxsU2l6ZSA9IDQ0O1xyXG4gICAgcHJpdmF0ZSBiYWxsUmFkaXVzID0gMTg7XHJcbiAgICBwcml2YXRlIG9mZnNldFg6IG51bWJlcjtcclxuICAgIHByaXZhdGUgb2Zmc2V0WTogbnVtYmVyO1xyXG5cclxuICAgIC8vIFN0YXRlXHJcbiAgICBwcml2YXRlIHN0YXRlOiBTdGF0ZSA9IFN0YXRlLkZBTExfQU5JTTtcclxuICAgIHByaXZhdGUgZHJhZ2dpbmc6IEJhbGwgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgZHJhZ09yaWdpbjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9IHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXAxOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXAyOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHN3YXBJc1JldmVyc2UgPSBmYWxzZTtcclxuICAgIHByaXZhdGUgYW5pbUlkID0gMDtcclxuXHJcbiAgICAvLyBFZmZlY3RzXHJcbiAgICBwcml2YXRlIHBhcnRpY2xlczogUGFydGljbGVbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBwb3B1cHM6IFNjb3JlUG9wdXBbXSA9IFtdO1xyXG5cclxuICAgIC8vIFNjb3JlXHJcbiAgICBwcml2YXRlIHNjb3JlID0gMDtcclxuICAgIHByaXZhdGUgY29tYm8gPSAwO1xyXG4gICAgcHJpdmF0ZSBoaWdoU2NvcmUgPSAwO1xyXG5cclxuICAgIC8vIFVJIHJlZnNcclxuICAgIHByaXZhdGUgZWxTY29yZTogSFRNTEVsZW1lbnQ7XHJcbiAgICBwcml2YXRlIGVsQ29tYm86IEhUTUxFbGVtZW50O1xyXG4gICAgcHJpdmF0ZSBlbEhpZ2g6IEhUTUxFbGVtZW50O1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHByaXZhdGUgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCxcclxuICAgICAgICBwcml2YXRlIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELFxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy5vZmZzZXRYID0gKGNhbnZhcy53aWR0aCAtICh0aGlzLmNvbHMgLSAxKSAqIHRoaXMuY2VsbFNpemUpIC8gMjtcclxuICAgICAgICB0aGlzLm9mZnNldFkgPSAoY2FudmFzLmhlaWdodCAtICh0aGlzLnJvd3MgLSAxKSAqIHRoaXMuY2VsbFNpemUpIC8gMjtcclxuXHJcbiAgICAgICAgdGhpcy5lbFNjb3JlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Njb3JlJykhO1xyXG4gICAgICAgIHRoaXMuZWxDb21ibyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb21ibycpITtcclxuICAgICAgICB0aGlzLmVsSGlnaCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdoaWdoLXNjb3JlJykhO1xyXG5cclxuICAgICAgICB0aGlzLmhpZ2hTY29yZSA9IHBhcnNlSW50KGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjb2xvcm1hdGNoLWhzJykgfHwgJzAnKTtcclxuXHJcbiAgICAgICAgdGhpcy5iaW5kRXZlbnRzKCk7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBpbml0KCk6IHZvaWQge1xyXG4gICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuYW5pbUlkKTtcclxuICAgICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgICAgICB0aGlzLmNvbWJvID0gMDtcclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xyXG4gICAgICAgIHRoaXMucG9wdXBzID0gW107XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkZBTExfQU5JTTtcclxuXHJcbiAgICAgICAgdGhpcy5idWlsZEdyaWQoKTtcclxuICAgICAgICB0aGlzLnB1cmdlSW5pdGlhbE1hdGNoZXMoKTtcclxuICAgICAgICB0aGlzLmNhc2NhZGVFbnRyYW5jZSgpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlVUkoKTtcclxuICAgICAgICB0aGlzLmFuaW1JZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnRpY2spO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZXN0YXJ0KCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBHcmlkIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgcG9zKHI6IG51bWJlciwgYzogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgeDogdGhpcy5vZmZzZXRYICsgYyAqIHRoaXMuY2VsbFNpemUsXHJcbiAgICAgICAgICAgIHk6IHRoaXMub2Zmc2V0WSArIHIgKiB0aGlzLmNlbGxTaXplLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjZWxsKHB4OiBudW1iZXIsIHB5OiBudW1iZXIpIHtcclxuICAgICAgICBjb25zdCBjID0gTWF0aC5yb3VuZCgocHggLSB0aGlzLm9mZnNldFgpIC8gdGhpcy5jZWxsU2l6ZSk7XHJcbiAgICAgICAgY29uc3QgciA9IE1hdGgucm91bmQoKHB5IC0gdGhpcy5vZmZzZXRZKSAvIHRoaXMuY2VsbFNpemUpO1xyXG4gICAgICAgIGlmIChyID49IDAgJiYgciA8IHRoaXMucm93cyAmJiBjID49IDAgJiYgYyA8IHRoaXMuY29scykgcmV0dXJuIHsgciwgYyB9O1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcm5kQ29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIENPTE9SU1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBDT0xPUlMubGVuZ3RoKV07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEdyaWQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5ncmlkID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRbcl0gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMucG9zKHIsIGMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IG5ldyBCYWxsKHAueCwgcC55LCB0aGlzLmJhbGxSYWRpdXMsIHRoaXMucm5kQ29sb3IoKSk7XHJcbiAgICAgICAgICAgICAgICBiLnJvdyA9IHI7XHJcbiAgICAgICAgICAgICAgICBiLmNvbCA9IGM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVyZ2VJbml0aWFsTWF0Y2hlcygpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDIwMDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG0gPSB0aGlzLmZpbmRNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgIGlmIChtLmxlbmd0aCA9PT0gMCkgYnJlYWs7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZyBvZiBtKSBmb3IgKGNvbnN0IGIgb2YgZykgYi5jb2xvciA9IHRoaXMucm5kQ29sb3IoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXNjYWRlRW50cmFuY2UoKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgYi55ID0gYi50YXJnZXRZIC0gdGhpcy5jYW52YXMuaGVpZ2h0IC0gciAqIDIwIC0gTWF0aC5yYW5kb20oKSAqIDEwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBNYXRjaCBmaW5kaW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgZmluZE1hdGNoZXMoKTogQmFsbFtdW10ge1xyXG4gICAgICAgIGNvbnN0IG1hdGNoZXM6IEJhbGxbXVtdID0gW107XHJcblxyXG4gICAgICAgIC8vIEhvcml6b250YWxcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKSB7XHJcbiAgICAgICAgICAgIGxldCBydW46IEJhbGxbXSA9IFt0aGlzLmdyaWRbcl1bMF1dO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMTsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIuY29sb3IgPT09IHJ1blswXS5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1bi5wdXNoKGIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICAgICAgICAgICAgICBydW4gPSBbYl07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWZXJ0aWNhbFxyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgbGV0IHJ1bjogQmFsbFtdID0gW3RoaXMuZ3JpZFswXVtjXV07XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAxOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSB0aGlzLmdyaWRbcl1bY107XHJcbiAgICAgICAgICAgICAgICBpZiAoYi5jb2xvciA9PT0gcnVuWzBdLmNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuLnB1c2goYik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChydW4ubGVuZ3RoID49IDMpIG1hdGNoZXMucHVzaChydW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1biA9IFtiXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBHYW1lIGxvZ2ljIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc01hdGNoZXMoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IHRoaXMuZmluZE1hdGNoZXMoKTtcclxuXHJcbiAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29tYm8gPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVVSSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbWJvKys7XHJcblxyXG4gICAgICAgIGNvbnN0IHNldCA9IG5ldyBTZXQ8QmFsbD4oKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGcgb2YgbWF0Y2hlcykgZm9yIChjb25zdCBiIG9mIGcpIHNldC5hZGQoYik7XHJcblxyXG4gICAgICAgIGNvbnN0IHB0cyA9IHNldC5zaXplICogMTAgKiB0aGlzLmNvbWJvO1xyXG4gICAgICAgIHRoaXMuc2NvcmUgKz0gcHRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zY29yZSA+IHRoaXMuaGlnaFNjb3JlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlnaFNjb3JlID0gdGhpcy5zY29yZTtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvbG9ybWF0Y2gtaHMnLCBTdHJpbmcodGhpcy5oaWdoU2NvcmUpKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgLy8gRWZmZWN0c1xyXG4gICAgICAgIGxldCBzdW1YID0gMCwgc3VtWSA9IDA7XHJcbiAgICAgICAgZm9yIChjb25zdCBiIG9mIHNldCkge1xyXG4gICAgICAgICAgICB0aGlzLnNwYXduQnVyc3QoYi54LCBiLnksIGIuY29sb3IsIDYpO1xyXG4gICAgICAgICAgICBiLnRhcmdldFNjYWxlID0gMDtcclxuICAgICAgICAgICAgc3VtWCArPSBiLng7XHJcbiAgICAgICAgICAgIHN1bVkgKz0gYi55O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY3ggPSBzdW1YIC8gc2V0LnNpemU7XHJcbiAgICAgICAgY29uc3QgY3kgPSBzdW1ZIC8gc2V0LnNpemU7XHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSB0aGlzLmNvbWJvID4gMSA/IGArJHtwdHN9IHgke3RoaXMuY29tYm99YCA6IGArJHtwdHN9YDtcclxuICAgICAgICB0aGlzLnBvcHVwcy5wdXNoKG5ldyBTY29yZVBvcHVwKGN4LCBjeSAtIDEwLCBsYWJlbCwgJyNmZmYnKSk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlVUkoKTtcclxuICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuQlJFQUtfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdyYXZpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICBsZXQgd3JpdGUgPSB0aGlzLnJvd3MgLSAxO1xyXG5cclxuICAgICAgICAgICAgLy8gU2hpZnQgc3Vydml2aW5nIGJhbGxzIGRvd25cclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IHRoaXMucm93cyAtIDE7IHIgPj0gMDsgci0tKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIudGFyZ2V0U2NhbGUgPiAwLjUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAociAhPT0gd3JpdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW3dyaXRlXVtjXSA9IGI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFtyXVtjXSA9IG51bGwhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLnJvdyA9IHdyaXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLmNvbCA9IGM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHAgPSB0aGlzLnBvcyh3cml0ZSwgYyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIudGFyZ2V0WCA9IHAueDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi50YXJnZXRZID0gcC55O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB3cml0ZS0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBGaWxsIGVtcHR5IGNlbGxzIGZyb20gdG9wXHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSB3cml0ZTsgciA+PSAwOyByLS0pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHAgPSB0aGlzLnBvcyhyLCBjKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0WSA9IC10aGlzLmJhbGxSYWRpdXMgKiAyIC0gKHdyaXRlIC0gcikgKiB0aGlzLmNlbGxTaXplO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbmIgPSBuZXcgQmFsbChwLngsIHN0YXJ0WSwgdGhpcy5iYWxsUmFkaXVzLCB0aGlzLnJuZENvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0WCA9IHAueDtcclxuICAgICAgICAgICAgICAgIG5iLnRhcmdldFkgPSBwLnk7XHJcbiAgICAgICAgICAgICAgICBuYi5yb3cgPSByO1xyXG4gICAgICAgICAgICAgICAgbmIuY29sID0gYztcclxuICAgICAgICAgICAgICAgIG5iLnNjYWxlID0gMC42O1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0U2NhbGUgPSAxO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdID0gbmI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEZYIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgc3Bhd25CdXJzdCh4OiBudW1iZXIsIHk6IG51bWJlciwgY29sb3I6IHN0cmluZywgbjogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IChNYXRoLlBJICogMiAqIGkpIC8gbiArIE1hdGgucmFuZG9tKCkgKiAwLjQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHNwZCA9IDIuNSArIE1hdGgucmFuZG9tKCkgKiAzO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlcy5wdXNoKFxyXG4gICAgICAgICAgICAgICAgbmV3IFBhcnRpY2xlKHgsIHksIE1hdGguY29zKGEpICogc3BkLCBNYXRoLnNpbihhKSAqIHNwZCwgMiArIE1hdGgucmFuZG9tKCkgKiA0LCBjb2xvciksXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBJbnB1dCDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIGJpbmRFdmVudHMoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY3YgPSB0aGlzLmNhbnZhcztcclxuICAgICAgICBjdi5zdHlsZS5jdXJzb3IgPSAnZ3JhYic7XHJcblxyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGUgPT4gdGhpcy5vbkRvd24odGhpcy5tb3VzZVhZKGUpKSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZSA9PiB0aGlzLm9uTW92ZSh0aGlzLm1vdXNlWFkoZSkpKTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZSA9PiB0aGlzLm9uVXAodGhpcy5tb3VzZVhZKGUpKSk7XHJcblxyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB0aGlzLm9uRG93bih0aGlzLnRvdWNoWFkoZSkpOyB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25Nb3ZlKHRoaXMudG91Y2hYWShlKSk7IH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBlID0+IHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB0aGlzLm9uVXAodGhpcy50b3VjaFhZKGUpKTsgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG1vdXNlWFkoZTogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCBzeCA9IHRoaXMuY2FudmFzLndpZHRoIC8gci53aWR0aDtcclxuICAgICAgICBjb25zdCBzeSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHIuaGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiB7IHg6IChlLmNsaWVudFggLSByLmxlZnQpICogc3gsIHk6IChlLmNsaWVudFkgLSByLnRvcCkgKiBzeSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdG91Y2hYWShlOiBUb3VjaEV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdCA9IGUudG91Y2hlc1swXSB8fCBlLmNoYW5nZWRUb3VjaGVzWzBdO1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgICAgICBjb25zdCBzeCA9IHRoaXMuY2FudmFzLndpZHRoIC8gci53aWR0aDtcclxuICAgICAgICBjb25zdCBzeSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHIuaGVpZ2h0O1xyXG4gICAgICAgIHJldHVybiB7IHg6ICh0LmNsaWVudFggLSByLmxlZnQpICogc3gsIHk6ICh0LmNsaWVudFkgLSByLnRvcCkgKiBzeSB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25Eb3duKHA6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlICE9PSBTdGF0ZS5JRExFKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNlbGwocC54LCBwLnkpO1xyXG4gICAgICAgIGlmICghYykgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLmRyYWdnaW5nID0gdGhpcy5ncmlkW2Mucl1bYy5jXTtcclxuICAgICAgICB0aGlzLmRyYWdPcmlnaW4gPSB7IHg6IHRoaXMuZHJhZ2dpbmcudGFyZ2V0WCwgeTogdGhpcy5kcmFnZ2luZy50YXJnZXRZIH07XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkRSQUdHSU5HO1xyXG4gICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmN1cnNvciA9ICdncmFiYmluZyc7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbk1vdmUocDogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IFN0YXRlLkRSQUdHSU5HIHx8ICF0aGlzLmRyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZy54ID0gcC54O1xyXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcueSA9IHAueTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uVXAocDogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IFN0YXRlLkRSQUdHSU5HIHx8ICF0aGlzLmRyYWdnaW5nKSByZXR1cm47XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2dyYWInO1xyXG5cclxuICAgICAgICBjb25zdCBiID0gdGhpcy5kcmFnZ2luZztcclxuICAgICAgICBjb25zdCBvID0gdGhpcy5kcmFnT3JpZ2luITtcclxuICAgICAgICBjb25zdCBkeCA9IHAueCAtIG8ueDtcclxuICAgICAgICBjb25zdCBkeSA9IHAueSAtIG8ueTtcclxuXHJcbiAgICAgICAgLy8gU25hcCBiYWNrIHZpc3VhbGx5XHJcbiAgICAgICAgYi54ID0gYi50YXJnZXRYO1xyXG4gICAgICAgIGIueSA9IGIudGFyZ2V0WTtcclxuXHJcbiAgICAgICAgbGV0IHRyID0gYi5yb3csIHRjID0gYi5jb2w7XHJcbiAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1IHx8IE1hdGguYWJzKGR5KSA+IHRoaXMuY2VsbFNpemUgKiAwLjI1KSB7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhkeCkgPiBNYXRoLmFicyhkeSkpIHtcclxuICAgICAgICAgICAgICAgIHRjICs9IGR4ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRyICs9IGR5ID4gMCA/IDEgOiAtMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5kcmFnT3JpZ2luID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKHRyID49IDAgJiYgdHIgPCB0aGlzLnJvd3MgJiYgdGMgPj0gMCAmJiB0YyA8IHRoaXMuY29scyAmJiAodHIgIT09IGIucm93IHx8IHRjICE9PSBiLmNvbCkpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWdpblN3YXAoYiwgdGhpcy5ncmlkW3RyXVt0Y10pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGJlZ2luU3dhcChhOiBCYWxsLCBiOiBCYWxsKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zd2FwMSA9IGE7XHJcbiAgICAgICAgdGhpcy5zd2FwMiA9IGI7XHJcbiAgICAgICAgdGhpcy5zd2FwSXNSZXZlcnNlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIFN3YXAgaW4gZ3JpZFxyXG4gICAgICAgIHRoaXMuZ3JpZFthLnJvd11bYS5jb2xdID0gYjtcclxuICAgICAgICB0aGlzLmdyaWRbYi5yb3ddW2IuY29sXSA9IGE7XHJcblxyXG4gICAgICAgIGNvbnN0IFthciwgYWNdID0gW2Eucm93LCBhLmNvbF07XHJcbiAgICAgICAgYS5yb3cgPSBiLnJvdzsgYS5jb2wgPSBiLmNvbDtcclxuICAgICAgICBiLnJvdyA9IGFyOyBiLmNvbCA9IGFjO1xyXG5cclxuICAgICAgICBjb25zdCBwYSA9IHRoaXMucG9zKGEucm93LCBhLmNvbCk7XHJcbiAgICAgICAgY29uc3QgcGIgPSB0aGlzLnBvcyhiLnJvdywgYi5jb2wpO1xyXG4gICAgICAgIGEudGFyZ2V0WCA9IHBhLng7IGEudGFyZ2V0WSA9IHBhLnk7XHJcbiAgICAgICAgYi50YXJnZXRYID0gcGIueDsgYi50YXJnZXRZID0gcGIueTtcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLlNXQVBfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVuZG9Td2FwKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLnN3YXAxISwgYiA9IHRoaXMuc3dhcDIhO1xyXG5cclxuICAgICAgICB0aGlzLmdyaWRbYS5yb3ddW2EuY29sXSA9IGI7XHJcbiAgICAgICAgdGhpcy5ncmlkW2Iucm93XVtiLmNvbF0gPSBhO1xyXG5cclxuICAgICAgICBjb25zdCBbYXIsIGFjXSA9IFthLnJvdywgYS5jb2xdO1xyXG4gICAgICAgIGEucm93ID0gYi5yb3c7IGEuY29sID0gYi5jb2w7XHJcbiAgICAgICAgYi5yb3cgPSBhcjsgYi5jb2wgPSBhYztcclxuXHJcbiAgICAgICAgY29uc3QgcGEgPSB0aGlzLnBvcyhhLnJvdywgYS5jb2wpO1xyXG4gICAgICAgIGNvbnN0IHBiID0gdGhpcy5wb3MoYi5yb3csIGIuY29sKTtcclxuICAgICAgICBhLnRhcmdldFggPSBwYS54OyBhLnRhcmdldFkgPSBwYS55O1xyXG4gICAgICAgIGIudGFyZ2V0WCA9IHBiLng7IGIudGFyZ2V0WSA9IHBiLnk7XHJcblxyXG4gICAgICAgIHRoaXMuc3dhcElzUmV2ZXJzZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIFVwZGF0ZSAvIERyYXcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVCYWxscygpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgYW5pbSA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspXHJcbiAgICAgICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ncmlkW3JdW2NdPy51cGRhdGUoKSkgYW5pbSA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIGFuaW07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0aWNrID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIC8vIFBoeXNpY3NcclxuICAgICAgICB0aGlzLnBhcnRpY2xlcyA9IHRoaXMucGFydGljbGVzLmZpbHRlcihwID0+IHAudXBkYXRlKCkpO1xyXG4gICAgICAgIHRoaXMucG9wdXBzID0gdGhpcy5wb3B1cHMuZmlsdGVyKHAgPT4gcC51cGRhdGUoKSk7XHJcbiAgICAgICAgY29uc3QgYW5pbSA9IHRoaXMudXBkYXRlQmFsbHMoKTtcclxuXHJcbiAgICAgICAgLy8gU3RhdGUgbWFjaGluZVxyXG4gICAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLlNXQVBfQU5JTTpcclxuICAgICAgICAgICAgICAgIGlmICghYW5pbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN3YXBJc1JldmVyc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmZpbmRNYXRjaGVzKCkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudW5kb1N3YXAoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbWJvID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTWF0Y2hlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5CUkVBS19BTklNOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhbmltKSB0aGlzLmdyYXZpdHkoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTdGF0ZS5GQUxMX0FOSU06XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuaW0pIHRoaXMucHJvY2Vzc01hdGNoZXMoKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5kcmF3KCk7XHJcbiAgICAgICAgdGhpcy5hbmltSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy50aWNrKTtcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHsgY3R4LCBjYW52YXMgfSA9IHRoaXM7XHJcbiAgICAgICAgY29uc3QgdyA9IGNhbnZhcy53aWR0aCwgaCA9IGNhbnZhcy5oZWlnaHQ7XHJcblxyXG4gICAgICAgIC8vIEJhY2tncm91bmRcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJyMxNDE0MTQnO1xyXG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCB3LCBoKTtcclxuXHJcbiAgICAgICAgLy8gU3VidGxlIGdyaWQgZG90c1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjA2KSc7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB4ID0gdGhpcy5vZmZzZXRYICsgYyAqIHRoaXMuY2VsbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gdGhpcy5vZmZzZXRZICsgciAqIHRoaXMuY2VsbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgICAgICBjdHguYXJjKHgsIHksIDEuNSwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmZpbGwoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQmFsbHMgKG5vbi1kcmFnZ2luZyBmaXJzdClcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKVxyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIgJiYgYiAhPT0gdGhpcy5kcmFnZ2luZykgYi5kcmF3KGN0eCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRHJhZ2dpbmcgYmFsbCBvbiB0b3BcclxuICAgICAgICBpZiAodGhpcy5kcmFnZ2luZykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXdTZWxlY3RlZChjdHgpO1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXcoY3R4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBhcnRpY2xlcyAmIHBvcHVwc1xyXG4gICAgICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnBhcnRpY2xlcykgcC5kcmF3KGN0eCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBwIG9mIHRoaXMucG9wdXBzKSBwLmRyYXcoY3R4KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVUkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVVSSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmVsU2NvcmUudGV4dENvbnRlbnQgPSBTdHJpbmcodGhpcy5zY29yZSk7XHJcbiAgICAgICAgdGhpcy5lbEhpZ2gudGV4dENvbnRlbnQgPSBTdHJpbmcodGhpcy5oaWdoU2NvcmUpO1xyXG4gICAgICAgIGlmICh0aGlzLmNvbWJvID4gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmVsQ29tYm8udGV4dENvbnRlbnQgPSBgQ09NQk8geCR7dGhpcy5jb21ib31gO1xyXG4gICAgICAgICAgICB0aGlzLmVsQ29tYm8uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZWxDb21iby5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsCiAgICAiaW1wb3J0IHsgR2FtZSB9IGZyb20gJy4vZ2FtZS5qcyc7XHJcblxyXG5jb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbmNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpITtcclxuXHJcbmNvbnN0IGdhbWUgPSBuZXcgR2FtZShjYW52YXMsIGN0eCk7XHJcblxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGFydCcpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IGdhbWUucmVzdGFydCgpKTtcclxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLElBQU0sY0FBYyxJQUFJO0FBQ3hCLElBQU0sYUFBYTtBQUVuQixTQUFTLFFBQVEsQ0FBQyxLQUF1QztBQUFBLEVBQ3JELE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRTtBQUFBLEVBQ25DLE9BQU8sQ0FBQyxLQUFLLElBQUssS0FBSyxJQUFLLEtBQU0sSUFBSSxHQUFJO0FBQUE7QUFHOUMsU0FBUyxTQUFTLEVBQUUsR0FBRyxHQUFHLElBQThCLEtBQXFCO0FBQUEsRUFDekUsT0FBTyxPQUFPLEtBQUssSUFBSSxHQUFHLEtBQUssSUFBSSxLQUFLLElBQUksR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLEdBQUcsS0FBSyxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQztBQUFBO0FBR2xJLFNBQVMsU0FBUyxDQUFDLE9BQWUsUUFBaUM7QUFBQSxFQUMvRCxNQUFNLE1BQU0sR0FBRyxTQUFTO0FBQUEsRUFDeEIsSUFBSSxTQUFTLFlBQVksSUFBSSxHQUFHO0FBQUEsRUFDaEMsSUFBSTtBQUFBLElBQVEsT0FBTztBQUFBLEVBRW5CLE1BQU0sUUFBUSxTQUFTLGNBQWM7QUFBQSxFQUNyQyxNQUFNLEtBQUssSUFBSSxnQkFBZ0IsTUFBTSxJQUFJO0FBQUEsRUFDekMsTUFBTSxNQUFNLEdBQUcsV0FBVyxJQUFJO0FBQUEsRUFDOUIsTUFBTSxLQUFLLFNBQVM7QUFBQSxFQUNwQixNQUFNLEtBQUs7QUFBQSxFQUNYLE1BQU0sSUFBSTtBQUFBLEVBQ1YsTUFBTSxNQUFNLFNBQVMsS0FBSztBQUFB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
