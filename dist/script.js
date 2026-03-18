// src/balls.ts
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
    const r = this.radius * this.scale;
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
  "#ff0054",
  "#00e5ff",
  "#b388ff",
  "#ffea00",
  "#00e676",
  "#2979ff",
  "#ff6d00"
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
  numColors = 5;
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
    this.numColors = 5;
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
    return COLORS[Math.floor(Math.random() * this.numColors)];
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
    if (this.score >= 1500 && this.numColors < 7)
      this.numColors = 7;
    else if (this.score >= 600 && this.numColors < 6)
      this.numColors = 6;
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
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let r = 0;r < this.rows; r++) {
      const y = this.offsetY + r * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.offsetX - this.cellSize / 2, y);
      ctx.lineTo(this.offsetX + (this.cols - 1) * this.cellSize + this.cellSize / 2, y);
      ctx.stroke();
    }
    for (let c = 0;c < this.cols; c++) {
      const x = this.offsetX + c * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.offsetY - this.cellSize / 2);
      ctx.lineTo(x, this.offsetY + (this.rows - 1) * this.cellSize + this.cellSize / 2);
      ctx.stroke();
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

//# debugId=93CD9C68CC19403F64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXHNyY1xcYmFsbHMudHMiLCAiLi5cXHNyY1xccGFydGljbGUudHMiLCAiLi5cXHNyY1xcZ2FtZS50cyIsICIuLlxcc3JjXFxzY3JpcHQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiZXhwb3J0IGNsYXNzIEJhbGwge1xyXG4gICAgcHVibGljIHRhcmdldFg6IG51bWJlcjtcclxuICAgIHB1YmxpYyB0YXJnZXRZOiBudW1iZXI7XHJcbiAgICBwdWJsaWMgc2NhbGU6IG51bWJlciA9IDE7XHJcbiAgICBwdWJsaWMgdGFyZ2V0U2NhbGU6IG51bWJlciA9IDE7XHJcbiAgICBwdWJsaWMgcm93OiBudW1iZXIgPSAwO1xyXG4gICAgcHVibGljIGNvbDogbnVtYmVyID0gMDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwdWJsaWMgeDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB5OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHJhZGl1czogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyBjb2xvcjogc3RyaW5nLFxyXG4gICAgKSB7XHJcbiAgICAgICAgdGhpcy50YXJnZXRYID0geDtcclxuICAgICAgICB0aGlzLnRhcmdldFkgPSB5O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZShzcGVlZDogbnVtYmVyID0gMC4zKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IG1vdmluZyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjb25zdCBkeCA9IHRoaXMudGFyZ2V0WCAtIHRoaXMueDtcclxuICAgICAgICBjb25zdCBkeSA9IHRoaXMudGFyZ2V0WSAtIHRoaXMueTtcclxuICAgICAgICBpZiAoTWF0aC5hYnMoZHgpID4gMC41IHx8IE1hdGguYWJzKGR5KSA+IDAuNSkge1xyXG4gICAgICAgICAgICB0aGlzLnggKz0gZHggKiBzcGVlZDtcclxuICAgICAgICAgICAgdGhpcy55ICs9IGR5ICogc3BlZWQ7XHJcbiAgICAgICAgICAgIG1vdmluZyA9IHRydWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy54ID0gdGhpcy50YXJnZXRYO1xyXG4gICAgICAgICAgICB0aGlzLnkgPSB0aGlzLnRhcmdldFk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkcyA9IHRoaXMudGFyZ2V0U2NhbGUgLSB0aGlzLnNjYWxlO1xyXG4gICAgICAgIGlmIChNYXRoLmFicyhkcykgPiAwLjAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUgKz0gZHMgKiAwLjM1O1xyXG4gICAgICAgICAgICBtb3ZpbmcgPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSB0aGlzLnRhcmdldFNjYWxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1vdmluZztcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2NhbGUgPCAwLjAyKSByZXR1cm47XHJcblxyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLnJhZGl1cyAqIHRoaXMuc2NhbGU7XHJcblxyXG4gICAgICAgIC8vIEhhcmQgc2hhZG93IG9mZnNldFxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCArIDIsIHRoaXMueSArIDMsIHIsIDAsIE1hdGguUEkgKiAyKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMC4zKSc7XHJcbiAgICAgICAgY3R4LmZpbGwoKTtcclxuXHJcbiAgICAgICAgLy8gRmxhdCBjaXJjbGVcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgciwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNvbG9yO1xyXG4gICAgICAgIGN0eC5maWxsKCk7XHJcblxyXG4gICAgICAgIC8vIENyaXNwIHdoaXRlIGJvcmRlclxyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKHRoaXMueCwgdGhpcy55LCByLCAwLCBNYXRoLlBJICogMik7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4xMiknO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxLjU7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGRyYXdTZWxlY3RlZChjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLnJhZGl1cyAqIHRoaXMuc2NhbGUgKyA0O1xyXG5cclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyh0aGlzLngsIHRoaXMueSwgciwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9ICcjZmZmJztcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY2xvbmUoKTogQmFsbCB7XHJcbiAgICAgICAgY29uc3QgYiA9IG5ldyBCYWxsKHRoaXMueCwgdGhpcy55LCB0aGlzLnJhZGl1cywgdGhpcy5jb2xvcik7XHJcbiAgICAgICAgYi50YXJnZXRYID0gdGhpcy50YXJnZXRYO1xyXG4gICAgICAgIGIudGFyZ2V0WSA9IHRoaXMudGFyZ2V0WTtcclxuICAgICAgICBiLnJvdyA9IHRoaXMucm93O1xyXG4gICAgICAgIGIuY29sID0gdGhpcy5jb2w7XHJcbiAgICAgICAgYi5zY2FsZSA9IHRoaXMuc2NhbGU7XHJcbiAgICAgICAgYi50YXJnZXRTY2FsZSA9IHRoaXMudGFyZ2V0U2NhbGU7XHJcbiAgICAgICAgcmV0dXJuIGI7XHJcbiAgICB9XHJcbn1cclxuIiwKICAgICJleHBvcnQgY2xhc3MgUGFydGljbGUge1xyXG4gICAgcHVibGljIGxpZmU6IG51bWJlciA9IDE7XHJcbiAgICBwcml2YXRlIGRlY2F5OiBudW1iZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHVibGljIHg6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgeTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eDogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyB2eTogbnVtYmVyLFxyXG4gICAgICAgIHB1YmxpYyByYWRpdXM6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgY29sb3I6IHN0cmluZyxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMuZGVjYXkgPSAwLjAyNSArIE1hdGgucmFuZG9tKCkgKiAwLjAzO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLnggKz0gdGhpcy52eDtcclxuICAgICAgICB0aGlzLnkgKz0gdGhpcy52eTtcclxuICAgICAgICB0aGlzLnZ5ICs9IDAuMTI7XHJcbiAgICAgICAgdGhpcy5saWZlIC09IHRoaXMuZGVjYXk7XHJcbiAgICAgICAgdGhpcy5yYWRpdXMgKj0gMC45NTtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWZlID4gMCAmJiB0aGlzLnJhZGl1cyA+IDAuMztcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heCgwLCB0aGlzLmxpZmUpO1xyXG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnJhZGl1cyAqIDI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY29sb3I7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KHRoaXMueCAtIHMgLyAyLCB0aGlzLnkgLSBzIC8gMiwgcywgcyk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNjb3JlUG9wdXAge1xyXG4gICAgcHJpdmF0ZSBsaWZlOiBudW1iZXIgPSAxO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgIHB1YmxpYyB4OiBudW1iZXIsXHJcbiAgICAgICAgcHVibGljIHk6IG51bWJlcixcclxuICAgICAgICBwdWJsaWMgdGV4dDogc3RyaW5nLFxyXG4gICAgICAgIHB1YmxpYyBjb2xvcjogc3RyaW5nLFxyXG4gICAgKSB7fVxyXG5cclxuICAgIHVwZGF0ZSgpOiBib29sZWFuIHtcclxuICAgICAgICB0aGlzLnkgLT0gMS4yO1xyXG4gICAgICAgIHRoaXMubGlmZSAtPSAwLjAyNTtcclxuICAgICAgICByZXR1cm4gdGhpcy5saWZlID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBkcmF3KGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKTogdm9pZCB7XHJcbiAgICAgICAgY3R4LnNhdmUoKTtcclxuICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heCgwLCB0aGlzLmxpZmUpO1xyXG4gICAgICAgIGN0eC5mb250ID0gJ2JvbGQgMTRweCBcIlNwYWNlIE1vbm9cIiwgXCJDb3VyaWVyIE5ld1wiLCBtb25vc3BhY2UnO1xyXG4gICAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gdGhpcy5jb2xvcjtcclxuICAgICAgICBjdHguZmlsbFRleHQodGhpcy50ZXh0LCB0aGlzLngsIHRoaXMueSk7XHJcbiAgICAgICAgY3R4LnJlc3RvcmUoKTtcclxuICAgIH1cclxufVxyXG4iLAogICAgImltcG9ydCB7IEJhbGwgfSBmcm9tICcuL2JhbGxzLmpzJztcclxuaW1wb3J0IHsgUGFydGljbGUsIFNjb3JlUG9wdXAgfSBmcm9tICcuL3BhcnRpY2xlLmpzJztcclxuXHJcbmNvbnN0IGVudW0gU3RhdGUge1xyXG4gICAgSURMRSxcclxuICAgIERSQUdHSU5HLFxyXG4gICAgU1dBUF9BTklNLFxyXG4gICAgQlJFQUtfQU5JTSxcclxuICAgIEZBTExfQU5JTSxcclxufVxyXG5cclxuY29uc3QgQ09MT1JTID0gW1xyXG4gICAgJyNmZjAwNTQnLCAvLyByZWRcclxuICAgICcjMDBlNWZmJywgLy8gY3lhblxyXG4gICAgJyNiMzg4ZmYnLCAvLyBsYXZlbmRlclxyXG4gICAgJyNmZmVhMDAnLCAvLyB5ZWxsb3dcclxuICAgICcjMDBlNjc2JywgLy8gZ3JlZW5cclxuICAgICcjMjk3OWZmJywgLy8gYmx1ZVxyXG4gICAgJyNmZjZkMDAnLCAvLyBvcmFuZ2VcclxuXTtcclxuXHJcbmV4cG9ydCBjbGFzcyBHYW1lIHtcclxuICAgIC8vIEdyaWRcclxuICAgIHByaXZhdGUgZ3JpZDogQmFsbFtdW10gPSBbXTtcclxuICAgIHByaXZhdGUgcm93cyA9IDEyO1xyXG4gICAgcHJpdmF0ZSBjb2xzID0gODtcclxuICAgIHByaXZhdGUgY2VsbFNpemUgPSA0NDtcclxuICAgIHByaXZhdGUgYmFsbFJhZGl1cyA9IDE4O1xyXG4gICAgcHJpdmF0ZSBvZmZzZXRYOiBudW1iZXI7XHJcbiAgICBwcml2YXRlIG9mZnNldFk6IG51bWJlcjtcclxuXHJcbiAgICAvLyBTdGF0ZVxyXG4gICAgcHJpdmF0ZSBzdGF0ZTogU3RhdGUgPSBTdGF0ZS5GQUxMX0FOSU07XHJcbiAgICBwcml2YXRlIGRyYWdnaW5nOiBCYWxsIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIGRyYWdPcmlnaW46IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwMTogQmFsbCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwMjogQmFsbCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzd2FwSXNSZXZlcnNlID0gZmFsc2U7XHJcbiAgICBwcml2YXRlIGFuaW1JZCA9IDA7XHJcblxyXG4gICAgLy8gRWZmZWN0c1xyXG4gICAgcHJpdmF0ZSBwYXJ0aWNsZXM6IFBhcnRpY2xlW10gPSBbXTtcclxuICAgIHByaXZhdGUgcG9wdXBzOiBTY29yZVBvcHVwW10gPSBbXTtcclxuXHJcbiAgICAvLyBTY29yZVxyXG4gICAgcHJpdmF0ZSBzY29yZSA9IDA7XHJcbiAgICBwcml2YXRlIGNvbWJvID0gMDtcclxuICAgIHByaXZhdGUgaGlnaFNjb3JlID0gMDtcclxuICAgIHByaXZhdGUgbnVtQ29sb3JzID0gNTtcclxuXHJcbiAgICAvLyBVSSByZWZzXHJcbiAgICBwcml2YXRlIGVsU2NvcmU6IEhUTUxFbGVtZW50O1xyXG4gICAgcHJpdmF0ZSBlbENvbWJvOiBIVE1MRWxlbWVudDtcclxuICAgIHByaXZhdGUgZWxIaWdoOiBIVE1MRWxlbWVudDtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsXHJcbiAgICAgICAgcHJpdmF0ZSBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcclxuICAgICkge1xyXG4gICAgICAgIHRoaXMub2Zmc2V0WCA9IChjYW52YXMud2lkdGggLSAodGhpcy5jb2xzIC0gMSkgKiB0aGlzLmNlbGxTaXplKSAvIDI7XHJcbiAgICAgICAgdGhpcy5vZmZzZXRZID0gKGNhbnZhcy5oZWlnaHQgLSAodGhpcy5yb3dzIC0gMSkgKiB0aGlzLmNlbGxTaXplKSAvIDI7XHJcblxyXG4gICAgICAgIHRoaXMuZWxTY29yZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzY29yZScpITtcclxuICAgICAgICB0aGlzLmVsQ29tYm8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tYm8nKSE7XHJcbiAgICAgICAgdGhpcy5lbEhpZ2ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaGlnaC1zY29yZScpITtcclxuXHJcbiAgICAgICAgdGhpcy5oaWdoU2NvcmUgPSBwYXJzZUludChsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY29sb3JtYXRjaC1ocycpIHx8ICcwJyk7XHJcblxyXG4gICAgICAgIHRoaXMuYmluZEV2ZW50cygpO1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaW5pdCgpOiB2b2lkIHtcclxuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLmFuaW1JZCk7XHJcbiAgICAgICAgdGhpcy5zY29yZSA9IDA7XHJcbiAgICAgICAgdGhpcy5jb21ibyA9IDA7XHJcbiAgICAgICAgdGhpcy5wYXJ0aWNsZXMgPSBbXTtcclxuICAgICAgICB0aGlzLnBvcHVwcyA9IFtdO1xyXG4gICAgICAgIHRoaXMubnVtQ29sb3JzID0gNTtcclxuICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRkFMTF9BTklNO1xyXG5cclxuICAgICAgICB0aGlzLmJ1aWxkR3JpZCgpO1xyXG4gICAgICAgIHRoaXMucHVyZ2VJbml0aWFsTWF0Y2hlcygpO1xyXG4gICAgICAgIHRoaXMuY2FzY2FkZUVudHJhbmNlKCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVVSSgpO1xyXG4gICAgICAgIHRoaXMuYW5pbUlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMudGljayk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHJlc3RhcnQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIEdyaWQg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBwb3MocjogbnVtYmVyLCBjOiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiB0aGlzLm9mZnNldFggKyBjICogdGhpcy5jZWxsU2l6ZSxcclxuICAgICAgICAgICAgeTogdGhpcy5vZmZzZXRZICsgciAqIHRoaXMuY2VsbFNpemUsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNlbGwocHg6IG51bWJlciwgcHk6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IGMgPSBNYXRoLnJvdW5kKChweCAtIHRoaXMub2Zmc2V0WCkgLyB0aGlzLmNlbGxTaXplKTtcclxuICAgICAgICBjb25zdCByID0gTWF0aC5yb3VuZCgocHkgLSB0aGlzLm9mZnNldFkpIC8gdGhpcy5jZWxsU2l6ZSk7XHJcbiAgICAgICAgaWYgKHIgPj0gMCAmJiByIDwgdGhpcy5yb3dzICYmIGMgPj0gMCAmJiBjIDwgdGhpcy5jb2xzKSByZXR1cm4geyByLCBjIH07XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBybmRDb2xvcigpIHtcclxuICAgICAgICByZXR1cm4gQ09MT1JTW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubnVtQ29sb3JzKV07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEdyaWQoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5ncmlkID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICB0aGlzLmdyaWRbcl0gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMucG9zKHIsIGMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IG5ldyBCYWxsKHAueCwgcC55LCB0aGlzLmJhbGxSYWRpdXMsIHRoaXMucm5kQ29sb3IoKSk7XHJcbiAgICAgICAgICAgICAgICBiLnJvdyA9IHI7XHJcbiAgICAgICAgICAgICAgICBiLmNvbCA9IGM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcHVyZ2VJbml0aWFsTWF0Y2hlcygpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDIwMDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG0gPSB0aGlzLmZpbmRNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgIGlmIChtLmxlbmd0aCA9PT0gMCkgYnJlYWs7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZyBvZiBtKSBmb3IgKGNvbnN0IGIgb2YgZykgYi5jb2xvciA9IHRoaXMucm5kQ29sb3IoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjYXNjYWRlRW50cmFuY2UoKTogdm9pZCB7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgYi55ID0gYi50YXJnZXRZIC0gdGhpcy5jYW52YXMuaGVpZ2h0IC0gciAqIDIwIC0gTWF0aC5yYW5kb20oKSAqIDEwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBNYXRjaCBmaW5kaW5nIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgZmluZE1hdGNoZXMoKTogQmFsbFtdW10ge1xyXG4gICAgICAgIGNvbnN0IG1hdGNoZXM6IEJhbGxbXVtdID0gW107XHJcblxyXG4gICAgICAgIC8vIEhvcml6b250YWxcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKSB7XHJcbiAgICAgICAgICAgIGxldCBydW46IEJhbGxbXSA9IFt0aGlzLmdyaWRbcl1bMF1dO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMTsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIuY29sb3IgPT09IHJ1blswXS5jb2xvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1bi5wdXNoKGIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICAgICAgICAgICAgICBydW4gPSBbYl07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJ1bi5sZW5ndGggPj0gMykgbWF0Y2hlcy5wdXNoKHJ1bik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWZXJ0aWNhbFxyXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgdGhpcy5jb2xzOyBjKyspIHtcclxuICAgICAgICAgICAgbGV0IHJ1bjogQmFsbFtdID0gW3RoaXMuZ3JpZFswXVtjXV07XHJcbiAgICAgICAgICAgIGZvciAobGV0IHIgPSAxOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSB0aGlzLmdyaWRbcl1bY107XHJcbiAgICAgICAgICAgICAgICBpZiAoYi5jb2xvciA9PT0gcnVuWzBdLmNvbG9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcnVuLnB1c2goYik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChydW4ubGVuZ3RoID49IDMpIG1hdGNoZXMucHVzaChydW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJ1biA9IFtiXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocnVuLmxlbmd0aCA+PSAzKSBtYXRjaGVzLnB1c2gocnVuKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBtYXRjaGVzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKUgOKUgCBHYW1lIGxvZ2ljIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgcHJvY2Vzc01hdGNoZXMoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgbWF0Y2hlcyA9IHRoaXMuZmluZE1hdGNoZXMoKTtcclxuXHJcbiAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29tYm8gPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVVSSgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbWJvKys7XHJcblxyXG4gICAgICAgIGNvbnN0IHNldCA9IG5ldyBTZXQ8QmFsbD4oKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGcgb2YgbWF0Y2hlcykgZm9yIChjb25zdCBiIG9mIGcpIHNldC5hZGQoYik7XHJcblxyXG4gICAgICAgIGNvbnN0IHB0cyA9IHNldC5zaXplICogMTAgKiB0aGlzLmNvbWJvO1xyXG4gICAgICAgIHRoaXMuc2NvcmUgKz0gcHRzO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5zY29yZSA+IHRoaXMuaGlnaFNjb3JlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGlnaFNjb3JlID0gdGhpcy5zY29yZTtcclxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NvbG9ybWF0Y2gtaHMnLCBTdHJpbmcodGhpcy5oaWdoU2NvcmUpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIERpZmZpY3VsdHkgcHJvZ3Jlc3Npb25cclxuICAgICAgICBpZiAodGhpcy5zY29yZSA+PSAxNTAwICYmIHRoaXMubnVtQ29sb3JzIDwgNykgdGhpcy5udW1Db2xvcnMgPSA3O1xyXG4gICAgICAgIGVsc2UgaWYgKHRoaXMuc2NvcmUgPj0gNjAwICYmIHRoaXMubnVtQ29sb3JzIDwgNikgdGhpcy5udW1Db2xvcnMgPSA2O1xyXG5cclxuICAgICAgICAvLyBFZmZlY3RzXHJcbiAgICAgICAgbGV0IHN1bVggPSAwLCBzdW1ZID0gMDtcclxuICAgICAgICBmb3IgKGNvbnN0IGIgb2Ygc2V0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3Bhd25CdXJzdChiLngsIGIueSwgYi5jb2xvciwgNik7XHJcbiAgICAgICAgICAgIGIudGFyZ2V0U2NhbGUgPSAwO1xyXG4gICAgICAgICAgICBzdW1YICs9IGIueDtcclxuICAgICAgICAgICAgc3VtWSArPSBiLnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjeCA9IHN1bVggLyBzZXQuc2l6ZTtcclxuICAgICAgICBjb25zdCBjeSA9IHN1bVkgLyBzZXQuc2l6ZTtcclxuICAgICAgICBjb25zdCBsYWJlbCA9IHRoaXMuY29tYm8gPiAxID8gYCske3B0c30geCR7dGhpcy5jb21ib31gIDogYCske3B0c31gO1xyXG4gICAgICAgIHRoaXMucG9wdXBzLnB1c2gobmV3IFNjb3JlUG9wdXAoY3gsIGN5IC0gMTAsIGxhYmVsLCAnI2ZmZicpKTtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVVSSgpO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5CUkVBS19BTklNO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ3Jhdml0eSgpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgIGxldCB3cml0ZSA9IHRoaXMucm93cyAtIDE7XHJcblxyXG4gICAgICAgICAgICAvLyBTaGlmdCBzdXJ2aXZpbmcgYmFsbHMgZG93blxyXG4gICAgICAgICAgICBmb3IgKGxldCByID0gdGhpcy5yb3dzIC0gMTsgciA+PSAwOyByLS0pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGIgPSB0aGlzLmdyaWRbcl1bY107XHJcbiAgICAgICAgICAgICAgICBpZiAoYi50YXJnZXRTY2FsZSA+IDAuNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyICE9PSB3cml0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRbd3JpdGVdW2NdID0gYjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkW3JdW2NdID0gbnVsbCE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIucm93ID0gd3JpdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIuY29sID0gYztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMucG9zKHdyaXRlLCBjKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi50YXJnZXRYID0gcC54O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLnRhcmdldFkgPSBwLnk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZpbGwgZW1wdHkgY2VsbHMgZnJvbSB0b3BcclxuICAgICAgICAgICAgZm9yIChsZXQgciA9IHdyaXRlOyByID49IDA7IHItLSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcCA9IHRoaXMucG9zKHIsIGMpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRZID0gLXRoaXMuYmFsbFJhZGl1cyAqIDIgLSAod3JpdGUgLSByKSAqIHRoaXMuY2VsbFNpemU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuYiA9IG5ldyBCYWxsKHAueCwgc3RhcnRZLCB0aGlzLmJhbGxSYWRpdXMsIHRoaXMucm5kQ29sb3IoKSk7XHJcbiAgICAgICAgICAgICAgICBuYi50YXJnZXRYID0gcC54O1xyXG4gICAgICAgICAgICAgICAgbmIudGFyZ2V0WSA9IHAueTtcclxuICAgICAgICAgICAgICAgIG5iLnJvdyA9IHI7XHJcbiAgICAgICAgICAgICAgICBuYi5jb2wgPSBjO1xyXG4gICAgICAgICAgICAgICAgbmIuc2NhbGUgPSAwLjY7XHJcbiAgICAgICAgICAgICAgICBuYi50YXJnZXRTY2FsZSA9IDE7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbcl1bY10gPSBuYjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLkZBTExfQU5JTTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgRlgg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSBzcGF3bkJ1cnN0KHg6IG51bWJlciwgeTogbnVtYmVyLCBjb2xvcjogc3RyaW5nLCBuOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBhID0gKE1hdGguUEkgKiAyICogaSkgLyBuICsgTWF0aC5yYW5kb20oKSAqIDAuNDtcclxuICAgICAgICAgICAgY29uc3Qgc3BkID0gMi41ICsgTWF0aC5yYW5kb20oKSAqIDM7XHJcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVzLnB1c2goXHJcbiAgICAgICAgICAgICAgICBuZXcgUGFydGljbGUoeCwgeSwgTWF0aC5jb3MoYSkgKiBzcGQsIE1hdGguc2luKGEpICogc3BkLCAyICsgTWF0aC5yYW5kb20oKSAqIDQsIGNvbG9yKSxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g4pSA4pSAIElucHV0IOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxyXG5cclxuICAgIHByaXZhdGUgYmluZEV2ZW50cygpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBjdiA9IHRoaXMuY2FudmFzO1xyXG4gICAgICAgIGN2LnN0eWxlLmN1cnNvciA9ICdncmFiJztcclxuXHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZSA9PiB0aGlzLm9uRG93bih0aGlzLm1vdXNlWFkoZSkpKTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBlID0+IHRoaXMub25Nb3ZlKHRoaXMubW91c2VYWShlKSkpO1xyXG4gICAgICAgIGN2LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBlID0+IHRoaXMub25VcCh0aGlzLm1vdXNlWFkoZSkpKTtcclxuXHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25Eb3duKHRoaXMudG91Y2hYWShlKSk7IH0sIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcbiAgICAgICAgY3YuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZSA9PiB7IGUucHJldmVudERlZmF1bHQoKTsgdGhpcy5vbk1vdmUodGhpcy50b3VjaFhZKGUpKTsgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgICAgICBjdi5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGUgPT4geyBlLnByZXZlbnREZWZhdWx0KCk7IHRoaXMub25VcCh0aGlzLnRvdWNoWFkoZSkpOyB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgbW91c2VYWShlOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgciA9IHRoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIGNvbnN0IHN4ID0gdGhpcy5jYW52YXMud2lkdGggLyByLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IHN5ID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gci5oZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIHsgeDogKGUuY2xpZW50WCAtIHIubGVmdCkgKiBzeCwgeTogKGUuY2xpZW50WSAtIHIudG9wKSAqIHN5IH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB0b3VjaFhZKGU6IFRvdWNoRXZlbnQpIHtcclxuICAgICAgICBjb25zdCB0ID0gZS50b3VjaGVzWzBdIHx8IGUuY2hhbmdlZFRvdWNoZXNbMF07XHJcbiAgICAgICAgY29uc3QgciA9IHRoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgIGNvbnN0IHN4ID0gdGhpcy5jYW52YXMud2lkdGggLyByLndpZHRoO1xyXG4gICAgICAgIGNvbnN0IHN5ID0gdGhpcy5jYW52YXMuaGVpZ2h0IC8gci5oZWlnaHQ7XHJcbiAgICAgICAgcmV0dXJuIHsgeDogKHQuY2xpZW50WCAtIHIubGVmdCkgKiBzeCwgeTogKHQuY2xpZW50WSAtIHIudG9wKSAqIHN5IH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBvbkRvd24ocDogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUgIT09IFN0YXRlLklETEUpIHJldHVybjtcclxuXHJcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY2VsbChwLngsIHAueSk7XHJcbiAgICAgICAgaWYgKCFjKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMuZHJhZ2dpbmcgPSB0aGlzLmdyaWRbYy5yXVtjLmNdO1xyXG4gICAgICAgIHRoaXMuZHJhZ09yaWdpbiA9IHsgeDogdGhpcy5kcmFnZ2luZy50YXJnZXRYLCB5OiB0aGlzLmRyYWdnaW5nLnRhcmdldFkgfTtcclxuICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuRFJBR0dJTkc7XHJcbiAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3Vyc29yID0gJ2dyYWJiaW5nJztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIG9uTW92ZShwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmRyYWdnaW5nLnggPSBwLng7XHJcbiAgICAgICAgdGhpcy5kcmFnZ2luZy55ID0gcC55O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25VcChwOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZSAhPT0gU3RhdGUuRFJBR0dJTkcgfHwgIXRoaXMuZHJhZ2dpbmcpIHJldHVybjtcclxuICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jdXJzb3IgPSAnZ3JhYic7XHJcblxyXG4gICAgICAgIGNvbnN0IGIgPSB0aGlzLmRyYWdnaW5nO1xyXG4gICAgICAgIGNvbnN0IG8gPSB0aGlzLmRyYWdPcmlnaW4hO1xyXG4gICAgICAgIGNvbnN0IGR4ID0gcC54IC0gby54O1xyXG4gICAgICAgIGNvbnN0IGR5ID0gcC55IC0gby55O1xyXG5cclxuICAgICAgICAvLyBTbmFwIGJhY2sgdmlzdWFsbHlcclxuICAgICAgICBiLnggPSBiLnRhcmdldFg7XHJcbiAgICAgICAgYi55ID0gYi50YXJnZXRZO1xyXG5cclxuICAgICAgICBsZXQgdHIgPSBiLnJvdywgdGMgPSBiLmNvbDtcclxuICAgICAgICBpZiAoTWF0aC5hYnMoZHgpID4gdGhpcy5jZWxsU2l6ZSAqIDAuMjUgfHwgTWF0aC5hYnMoZHkpID4gdGhpcy5jZWxsU2l6ZSAqIDAuMjUpIHtcclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKGR4KSA+IE1hdGguYWJzKGR5KSkge1xyXG4gICAgICAgICAgICAgICAgdGMgKz0gZHggPiAwID8gMSA6IC0xO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdHIgKz0gZHkgPiAwID8gMSA6IC0xO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYWdnaW5nID0gbnVsbDtcclxuICAgICAgICB0aGlzLmRyYWdPcmlnaW4gPSBudWxsO1xyXG5cclxuICAgICAgICBpZiAodHIgPj0gMCAmJiB0ciA8IHRoaXMucm93cyAmJiB0YyA+PSAwICYmIHRjIDwgdGhpcy5jb2xzICYmICh0ciAhPT0gYi5yb3cgfHwgdGMgIT09IGIuY29sKSkge1xyXG4gICAgICAgICAgICB0aGlzLmJlZ2luU3dhcChiLCB0aGlzLmdyaWRbdHJdW3RjXSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZSA9IFN0YXRlLklETEU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYmVnaW5Td2FwKGE6IEJhbGwsIGI6IEJhbGwpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnN3YXAxID0gYTtcclxuICAgICAgICB0aGlzLnN3YXAyID0gYjtcclxuICAgICAgICB0aGlzLnN3YXBJc1JldmVyc2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gU3dhcCBpbiBncmlkXHJcbiAgICAgICAgdGhpcy5ncmlkW2Eucm93XVthLmNvbF0gPSBiO1xyXG4gICAgICAgIHRoaXMuZ3JpZFtiLnJvd11bYi5jb2xdID0gYTtcclxuXHJcbiAgICAgICAgY29uc3QgW2FyLCBhY10gPSBbYS5yb3csIGEuY29sXTtcclxuICAgICAgICBhLnJvdyA9IGIucm93OyBhLmNvbCA9IGIuY29sO1xyXG4gICAgICAgIGIucm93ID0gYXI7IGIuY29sID0gYWM7XHJcblxyXG4gICAgICAgIGNvbnN0IHBhID0gdGhpcy5wb3MoYS5yb3csIGEuY29sKTtcclxuICAgICAgICBjb25zdCBwYiA9IHRoaXMucG9zKGIucm93LCBiLmNvbCk7XHJcbiAgICAgICAgYS50YXJnZXRYID0gcGEueDsgYS50YXJnZXRZID0gcGEueTtcclxuICAgICAgICBiLnRhcmdldFggPSBwYi54OyBiLnRhcmdldFkgPSBwYi55O1xyXG5cclxuICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuU1dBUF9BTklNO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdW5kb1N3YXAoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgYSA9IHRoaXMuc3dhcDEhLCBiID0gdGhpcy5zd2FwMiE7XHJcblxyXG4gICAgICAgIHRoaXMuZ3JpZFthLnJvd11bYS5jb2xdID0gYjtcclxuICAgICAgICB0aGlzLmdyaWRbYi5yb3ddW2IuY29sXSA9IGE7XHJcblxyXG4gICAgICAgIGNvbnN0IFthciwgYWNdID0gW2Eucm93LCBhLmNvbF07XHJcbiAgICAgICAgYS5yb3cgPSBiLnJvdzsgYS5jb2wgPSBiLmNvbDtcclxuICAgICAgICBiLnJvdyA9IGFyOyBiLmNvbCA9IGFjO1xyXG5cclxuICAgICAgICBjb25zdCBwYSA9IHRoaXMucG9zKGEucm93LCBhLmNvbCk7XHJcbiAgICAgICAgY29uc3QgcGIgPSB0aGlzLnBvcyhiLnJvdywgYi5jb2wpO1xyXG4gICAgICAgIGEudGFyZ2V0WCA9IHBhLng7IGEudGFyZ2V0WSA9IHBhLnk7XHJcbiAgICAgICAgYi50YXJnZXRYID0gcGIueDsgYi50YXJnZXRZID0gcGIueTtcclxuXHJcbiAgICAgICAgdGhpcy5zd2FwSXNSZXZlcnNlID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVXBkYXRlIC8gRHJhdyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZUJhbGxzKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCBhbmltID0gZmFsc2U7XHJcbiAgICAgICAgZm9yIChsZXQgciA9IDA7IHIgPCB0aGlzLnJvd3M7IHIrKylcclxuICAgICAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKylcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmdyaWRbcl1bY10/LnVwZGF0ZSgpKSBhbmltID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gYW5pbTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHRpY2sgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgLy8gUGh5c2ljc1xyXG4gICAgICAgIHRoaXMucGFydGljbGVzID0gdGhpcy5wYXJ0aWNsZXMuZmlsdGVyKHAgPT4gcC51cGRhdGUoKSk7XHJcbiAgICAgICAgdGhpcy5wb3B1cHMgPSB0aGlzLnBvcHVwcy5maWx0ZXIocCA9PiBwLnVwZGF0ZSgpKTtcclxuICAgICAgICBjb25zdCBhbmltID0gdGhpcy51cGRhdGVCYWxscygpO1xyXG5cclxuICAgICAgICAvLyBTdGF0ZSBtYWNoaW5lXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3RhdGUuU1dBUF9BTklNOlxyXG4gICAgICAgICAgICAgICAgaWYgKCFhbmltKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3dhcElzUmV2ZXJzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlID0gU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuZmluZE1hdGNoZXMoKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51bmRvU3dhcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tYm8gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NNYXRjaGVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkJSRUFLX0FOSU06XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuaW0pIHRoaXMuZ3Jhdml0eSgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN0YXRlLkZBTExfQU5JTTpcclxuICAgICAgICAgICAgICAgIGlmICghYW5pbSkgdGhpcy5wcm9jZXNzTWF0Y2hlcygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmRyYXcoKTtcclxuICAgICAgICB0aGlzLmFuaW1JZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnRpY2spO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGRyYXcoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgeyBjdHgsIGNhbnZhcyB9ID0gdGhpcztcclxuICAgICAgICBjb25zdCB3ID0gY2FudmFzLndpZHRoLCBoID0gY2FudmFzLmhlaWdodDtcclxuXHJcbiAgICAgICAgLy8gRmxhdCBCR1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzExMSc7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIHcsIGgpO1xyXG5cclxuICAgICAgICAvLyBHcmlkIGxpbmVzXHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4wNCknO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxO1xyXG4gICAgICAgIGZvciAobGV0IHIgPSAwOyByIDwgdGhpcy5yb3dzOyByKyspIHtcclxuICAgICAgICAgICAgY29uc3QgeSA9IHRoaXMub2Zmc2V0WSArIHIgKiB0aGlzLmNlbGxTaXplO1xyXG4gICAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgICAgIGN0eC5tb3ZlVG8odGhpcy5vZmZzZXRYIC0gdGhpcy5jZWxsU2l6ZSAvIDIsIHkpO1xyXG4gICAgICAgICAgICBjdHgubGluZVRvKHRoaXMub2Zmc2V0WCArICh0aGlzLmNvbHMgLSAxKSAqIHRoaXMuY2VsbFNpemUgKyB0aGlzLmNlbGxTaXplIC8gMiwgeSk7XHJcbiAgICAgICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCB0aGlzLmNvbHM7IGMrKykge1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gdGhpcy5vZmZzZXRYICsgYyAqIHRoaXMuY2VsbFNpemU7XHJcbiAgICAgICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICAgICAgY3R4Lm1vdmVUbyh4LCB0aGlzLm9mZnNldFkgLSB0aGlzLmNlbGxTaXplIC8gMik7XHJcbiAgICAgICAgICAgIGN0eC5saW5lVG8oeCwgdGhpcy5vZmZzZXRZICsgKHRoaXMucm93cyAtIDEpICogdGhpcy5jZWxsU2l6ZSArIHRoaXMuY2VsbFNpemUgLyAyKTtcclxuICAgICAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQmFsbHMgKG5vbi1kcmFnZ2luZyBmaXJzdClcclxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMucm93czsgcisrKVxyXG4gICAgICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IHRoaXMuY29sczsgYysrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gdGhpcy5ncmlkW3JdW2NdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGIgJiYgYiAhPT0gdGhpcy5kcmFnZ2luZykgYi5kcmF3KGN0eCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRHJhZ2dpbmcgYmFsbCBvbiB0b3BcclxuICAgICAgICBpZiAodGhpcy5kcmFnZ2luZykge1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXdTZWxlY3RlZChjdHgpO1xyXG4gICAgICAgICAgICB0aGlzLmRyYWdnaW5nLmRyYXcoY3R4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFBhcnRpY2xlcyAmIHBvcHVwc1xyXG4gICAgICAgIGZvciAoY29uc3QgcCBvZiB0aGlzLnBhcnRpY2xlcykgcC5kcmF3KGN0eCk7XHJcbiAgICAgICAgZm9yIChjb25zdCBwIG9mIHRoaXMucG9wdXBzKSBwLmRyYXcoY3R4KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyDilIDilIAgVUkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVVSSgpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmVsU2NvcmUudGV4dENvbnRlbnQgPSBTdHJpbmcodGhpcy5zY29yZSk7XHJcbiAgICAgICAgdGhpcy5lbEhpZ2gudGV4dENvbnRlbnQgPSBTdHJpbmcodGhpcy5oaWdoU2NvcmUpO1xyXG4gICAgICAgIGlmICh0aGlzLmNvbWJvID4gMSkge1xyXG4gICAgICAgICAgICB0aGlzLmVsQ29tYm8udGV4dENvbnRlbnQgPSBgQ09NQk8geCR7dGhpcy5jb21ib31gO1xyXG4gICAgICAgICAgICB0aGlzLmVsQ29tYm8uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuZWxDb21iby5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiIsCiAgICAiaW1wb3J0IHsgR2FtZSB9IGZyb20gJy4vZ2FtZS5qcyc7XHJcblxyXG5jb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2FudmFzJykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XHJcbmNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpITtcclxuXHJcbmNvbnN0IGdhbWUgPSBuZXcgR2FtZShjYW52YXMsIGN0eCk7XHJcblxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGFydCcpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IGdhbWUucmVzdGFydCgpKTtcclxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjtBQUFPLE1BQU0sS0FBSztBQUFBLEVBU0g7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQVhKO0FBQUEsRUFDQTtBQUFBLEVBQ0EsUUFBZ0I7QUFBQSxFQUNoQixjQUFzQjtBQUFBLEVBQ3RCLE1BQWM7QUFBQSxFQUNkLE1BQWM7QUFBQSxFQUVyQixXQUFXLENBQ0EsR0FDQSxHQUNBLFFBQ0EsT0FDVDtBQUpTO0FBQ0E7QUFDQTtBQUNBO0FBRVAsU0FBSyxVQUFVO0FBQ2YsU0FBSyxVQUFVO0FBQUE7QUFBQSxFQUduQixNQUFNLENBQUMsUUFBZ0IsS0FBYztBQUNq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QzVDO0FBR0osUUFBSSxLQUFLLFVBQVU7QUFDZixXQUFLLFNBQVMsYUFBYSxHQUFHO0FBQzlCLFdBQUssU0FBUyxLQUFLLEdBQUc7QUFBQSxJQUMxQjtBQUdBLGVBQVcsS0FBSyxLQUFLO0FBQVcsUUFBRSxLQUFLLEdBQUc7QUFDMUMsZUFBVyxLQUFLLEtBQUs7QUFBUSxRQUFFLEtBQUssR0FBRztBQUFBO0FBQUEsRUFLbkMsUUFBUSxHQUFTO0FBQ3JCLFNBQUssUUFBUSxjQUFjLE9BQU8sS0FBSyxLQUFLO0FBQzVDLFNBQUssT0FBTyxjQUFjLE9BQU8sS0FBSyxTQUFTO0FBQy9DLFFBQUksS0FBSyxRQUFRLEdBQUc7QUFDaEIsV0FBSyxRQUFRLGNBQWMsVUFBVSxLQUFLO0FBQzFDLFdBQUssUUFBUSxVQUFVLElBQUksU0FBUztBQUFBLElBQ3hDLE9BQU87QUFDSCxXQUFLLFFBQVEsVUFBVSxPQUFPLFNBQVM7QUFBQTtBQUFBO0FBR25EOzs7QUNoZkEsSUFBTSxTQUFTLFNBQVMsZUFBZSxRQUFRO0FBQy9DLElBQU0sTUFBTSxPQUFPLFdBQVcsSUFBSTtBQUVsQyxJQUFNLE9BQU8sSUFBSSxLQUFLLFFBQVEsR0FBRztBQUVqQyxTQUFTLGVBQWUsU0FBUyxHQUFHLGlCQUFpQixTQUFTLE1BQU0sS0FBSyxRQUFRLENBQUM7IiwKICAiZGVidWdJZCI6ICI5M0NEOUM2OENDMTk0MDNGNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
