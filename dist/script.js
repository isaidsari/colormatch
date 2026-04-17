// src/balls.ts
var spriteCache = new Map;
var SPRITE_PAD = 6;
var RAINBOW_COLOR = "#RAINBOW";
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
function prewarmSprites(colors, radius) {
  for (const c of colors)
    getSprite(c, radius);
}
var INK = "rgba(18,12,8,0.88)";
var PERSONALITIES = [
  {
    eye: "normal",
    lookBias: 0.4,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, my + r * 0.01);
      ctx.quadraticCurveTo(r * 0.02, my + r * 0.14, r * 0.22, my - r * 0.05);
      ctx.stroke();
    }
  },
  {
    eye: "wide",
    lookBias: 0,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.ellipse(0, my, r * 0.11, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  },
  {
    eye: "normal",
    lookBias: 0,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.arc(0, my - r * 0.05, r * 0.22, 0.12, Math.PI - 0.12);
      ctx.stroke();
    }
  },
  {
    eye: "halfclosed",
    lookBias: 0.6,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.08, my);
      ctx.quadraticCurveTo(r * 0.06, my, r * 0.2, my - r * 0.06);
      ctx.stroke();
    }
  },
  {
    eye: "droopy",
    lookBias: -0.5,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, my);
      ctx.lineTo(r * 0.15, my);
      ctx.stroke();
    }
  },
  {
    eye: "normal",
    lookBias: 0,
    mouth: (ctx, r, my) => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.16, my - r * 0.01);
      ctx.quadraticCurveTo(-r * 0.06, my + r * 0.08, 0, my + r * 0.02);
      ctx.quadraticCurveTo(r * 0.06, my - r * 0.06, r * 0.16, my + r * 0.02);
      ctx.stroke();
    }
  }
];
var _faceTime = 0;
function updateFaceTime(dt) {
  _faceTime += dt;
}
function getFaceTime() {
  return _faceTime;
}
function drawEye(ctx, ex, ey, r, lx, ly, style) {
  const dotR = r * 0.115;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(ex + lx, ey + ly, dotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(ex + lx - dotR * 0.38, ey + ly - dotR * 0.42, dotR * 0.38, 0, Math.PI * 2);
  ctx.fill();
  if (style === "halfclosed") {
    ctx.fillStyle = "inherit";
    ctx.beginPath();
    ctx.rect(ex - dotR * 1.6, ey + ly - dotR * 1.8, dotR * 3.2, dotR * 1.1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(ex, ey + ly - dotR * 0.3, dotR * 1.5, dotR * 0.7, 0, Math.PI, 0);
    ctx.fill();
  } else if (style === "droopy") {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(ex, ey + ly - dotR * 0.1, dotR * 1.5, dotR * 0.55, 0, Math.PI, 0);
    ctx.fill();
  }
}
function drawFace(ctx, x, y, r, colorIndex, state, lookAtDx = 0, lookAtDy = 0, lookAtAmt = 0) {
  const t = _faceTime;
  const p = PERSONALITIES[colorIndex] ?? PERSONALITIES[0];
  const span = r * 0.34;
  const eyeY = -r * 0.1;
  const my = r * 0.36;
  const dotR = r * 0.115;
  const blink = Math.sin(t * 1.7 + colorIndex * 1.4) > 0.93;
  const maxIdleGaze = dotR * 0.5;
  const maxGaze = dotR * 1.3;
  const idleLx = (Math.sin(t * 0.7 + colorIndex * 0.8) + p.lookBias) * maxIdleGaze * 0.6;
  const idleLy = Math.cos(t * 0.6 + colorIndex) * maxIdleGaze * 0.35;
  const lookDist = Math.hypot(lookAtDx, lookAtDy) || 1;
  const targetLx = lookAtDx / lookDist * maxGaze;
  const targetLy = lookAtDy / lookDist * maxGaze * 0.7;
  const wide = state === "scared" || state === "landing";
  let lx, ly;
  if (state === "scared") {
    lx = Math.sin(t * 8 + colorIndex) * maxGaze * 0.8;
    ly = -maxGaze * 0.4;
  } else if (state === "landing") {
    lx = lookAtAmt > 0.05 ? targetLx * lookAtAmt : 0;
    ly = -maxGaze * 0.3;
  } else {
    lx = idleLx * (1 - lookAtAmt) + targetLx * lookAtAmt;
    ly = idleLy * (1 - lookAtAmt) + targetLy * lookAtAmt;
  }
  ctx.save();
  ctx.translate(x, y);
  if (lookAtAmt > 0.4 && state !== "scared" && state !== "selected") {
    const tilt = lookAtDx / lookDist * 0.045 * Math.min(1, lookAtAmt);
    ctx.rotate(tilt);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.048;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (wide) {
    for (const side of [-1, 1]) {
      const ex = side * span;
      const bigR = dotR * 1.5;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(ex + lx * 0.5, eyeY + ly, bigR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(ex + lx * 0.5 - bigR * 0.3, eyeY + ly - bigR * 0.35, bigR * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (blink) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * span - dotR * 1.2, eyeY);
      ctx.lineTo(side * span + dotR * 1.2, eyeY);
      ctx.stroke();
    }
  } else {
    const eyeStyle = state === "selected" ? "normal" : p.eye;
    for (const side of [-1, 1]) {
      drawEye(ctx, side * span, eyeY, r, lx * (state === "selected" ? 0 : 1), ly * (state === "selected" ? 0 : 1), eyeStyle);
    }
  }
  if (wide) {
    ctx.beginPath();
    ctx.ellipse(0, my, r * (state === "landing" ? 0.09 : 0.12), r * (state === "landing" ? 0.08 : 0.1), 0, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  } else if (state === "selected") {
    ctx.beginPath();
    ctx.arc(0, my - r * 0.04, r * 0.2, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else {
    p.mouth(ctx, r, my);
  }
  if (state === "scared") {
    const dt = (t * 2.5 + colorIndex * 0.7) % 1.8;
    if (dt <= 1) {
      ctx.globalAlpha = (1 - dt) * 0.5;
      ctx.fillStyle = "#aed6f1";
      const sdx = r * 0.6;
      const sdy = -r * 0.08 + dt * r * 0.4;
      ctx.beginPath();
      ctx.moveTo(sdx, sdy - r * 0.1);
      ctx.quadraticCurveTo(sdx + r * 0.06, sdy + r * 0.03, sdx, sdy + r * 0.07);
      ctx.quadraticCurveTo(sdx - r * 0.06, sdy + r * 0.03, sdx, sdy - r * 0.1);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
var RAINBOW_PALETTE = ["#E74C3C", "#F1C40F", "#2ECC71", "#3498DB", "#9B59B6", "#E67E22"];
function drawColorBombBody(ctx, x, y, r) {
  const t = _faceTime;
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.8);
  halo.addColorStop(0, `rgba(255,255,255,${0.22 + Math.sin(t * 2) * 0.05})`);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const segs = RAINBOW_PALETTE.length;
  const rot = t * 0.9;
  for (let i = 0;i < segs; i++) {
    const a0 = rot + i / segs * Math.PI * 2;
    const a1 = rot + (i + 1) / segs * Math.PI * 2 + 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 1.1, a0, a1);
    ctx.closePath();
    ctx.fillStyle = RAINBOW_PALETTE[i];
    ctx.fill();
  }
  const shade = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  shade.addColorStop(0, "rgba(255,255,255,0.35)");
  shade.addColorStop(0.55, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0;i < 3; i++) {
    const phase = (t * 1.5 + i * 2.1) % 3;
    if (phase > 1)
      continue;
    const ang = i * 2.09 + t * 0.4;
    const sr = r * (0.35 + i * 0.15);
    const sx = x + Math.cos(ang) * sr;
    const sy = y + Math.sin(ang) * sr;
    const sz = r * 0.09 * (1 - phase);
    ctx.globalAlpha = 1 - phase;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
  const hl = ctx.createRadialGradient(x - r * 0.22, y - r * 0.26, 0, x - r * 0.2, y - r * 0.25, r * 0.4);
  hl.addColorStop(0, "rgba(255,255,255,0.55)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fill();
}
function drawColorBombFace(ctx, x, y, r) {
  const t = _faceTime;
  ctx.save();
  ctx.translate(x, y);
  const span = r * 0.34;
  const eyeY = -r * 0.1;
  for (const side of [-1, 1]) {
    drawStar(ctx, side * span, eyeY, r * 0.14, r * 0.065, 5, t * 2);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, r * 0.28, r * 0.2, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
}
function drawStar(ctx, cx, cy, outer, inner, points, rot) {
  ctx.beginPath();
  for (let i = 0;i < points * 2; i++) {
    const a = rot + i / (points * 2) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0)
      ctx.moveTo(px, py);
    else
      ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.fill();
}
function drawStripedOverlay(ctx, x, y, r, horizontal) {
  const t = _faceTime;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  if (!horizontal)
    ctx.rotate(Math.PI / 2);
  const stripeH = r * 0.28;
  const span = r * 2.2;
  const period = stripeH * 2;
  const shift = t * 12 % period;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let sy = -span - period + shift;sy <= span; sy += period) {
    ctx.fillRect(-span, sy, span * 2, stripeH * 0.55);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  for (let sy = -span - period + shift;sy <= span; sy += period) {
    ctx.beginPath();
    ctx.moveTo(-span, sy);
    ctx.lineTo(span, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-span, sy + stripeH * 0.55);
    ctx.lineTo(span, sy + stripeH * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}
function drawCreationSparkle(ctx, x, y, r, age) {
  const t = 1 - Math.min(1, age / 0.6);
  if (t <= 0)
    return;
  ctx.save();
  ctx.globalAlpha = t;
  const rr = r * (1 + (1 - t) * 1.2);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2 * t;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.stroke();
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
  power = "none";
  powerCreateAge = Infinity;
  offsetX = 0;
  offsetY = 0;
  offsetVx = 0;
  offsetVy = 0;
  offsetTargetX = 0;
  offsetTargetY = 0;
  landingTimer = 0;
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
        if (impactV > 7) {
          this.landingTimer = 0.18;
          this.offsetVy -= Math.min(2, impactV * 0.15);
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
    if (this.powerCreateAge < 0.6) {
      this.powerCreateAge += 1 / 60;
    }
    if (this.landingTimer > 0) {
      this.landingTimer -= 1 / 60;
      if (this.landingTimer <= 0 && this.faceState === "landing") {
        this.faceState = "idle";
      }
    }
    this.offsetVx += (this.offsetTargetX - this.offsetX) * 0.18;
    this.offsetVy += (this.offsetTargetY - this.offsetY) * 0.18;
    this.offsetVx *= 0.82;
    this.offsetVy *= 0.82;
    this.offsetX += this.offsetVx;
    this.offsetY += this.offsetVy;
    this.offsetTargetX *= 0.88;
    this.offsetTargetY *= 0.88;
    return moving;
  }
  draw(ctx) {
    if (this.scale < 0.02)
      return;
    const s = this.scale;
    const breath = this.faceState === "idle" && this.targetScale === 1 ? Math.sin(_faceTime * 2 + this.breathPhase) * 0.004 : 0;
    const sy = s * this.squashY * (1 - breath);
    const sx = s * (2 - this.squashY) * (1 + breath);
    const vx = this.x + this.offsetX;
    const vy = this.y + this.offsetY;
    const pivotY = vy + this.radius;
    ctx.save();
    ctx.translate(vx, pivotY);
    ctx.scale(sx, sy);
    ctx.translate(-vx, -pivotY);
    if (this.power === "colorBomb") {
      drawColorBombBody(ctx, vx, vy, this.radius);
      if (s > 0.3)
        drawColorBombFace(ctx, vx, vy, this.radius);
    } else {
      const sprite = getSprite(this.color, this.radius);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(sprite, vx - sw / 2, vy - sh / 2);
      if (this.power === "stripedH" || this.power === "stripedV") {
        drawStripedOverlay(ctx, vx, vy, this.radius, this.power === "stripedH");
      }
      if (s > 0.3) {
        drawFace(ctx, vx, vy, this.radius, this.colorIndex, this.faceState, this.lookAtX - vx, this.lookAtY - vy, this.lookAtAmount);
      }
    }
    ctx.restore();
    if (this.powerCreateAge < 0.6) {
      drawCreationSparkle(ctx, vx, vy, this.radius, this.powerCreateAge);
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

class Shockwave {
  x;
  y;
  maxR;
  color;
  age = 0;
  dur;
  constructor(x, y, maxR, color, dur = 0.55) {
    this.x = x;
    this.y = y;
    this.maxR = maxR;
    this.color = color;
    this.dur = dur;
  }
  update() {
    this.age += 1 / 60;
    return this.age < this.dur;
  }
  draw(ctx) {
    const t = this.age / this.dur;
    const eased = 1 - Math.pow(1 - t, 3);
    const r = this.maxR * eased;
    const alpha = Math.max(0, 1 - t) * 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4 * (1 - t * 0.6);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12 * (1 - t);
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

// src/audio.ts
var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
var BASE_FREQ = 261.63;
var ctx = null;
var master = null;
var started = false;
var muted = localStorage.getItem("colormatch-mute") === "1";
var padOsc1 = null;
var padOsc2 = null;
var padGain = null;
var padFilter = null;
function freqOf(semi) {
  return BASE_FREQ * Math.pow(2, semi / 12);
}
function ensureCtx() {
  if (ctx)
    return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx)
    return;
  ctx = new Ctx;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.7;
  master.connect(ctx.destination);
}
function startOnGesture() {
  if (started)
    return;
  started = true;
  ensureCtx();
  if (ctx && ctx.state === "suspended")
    ctx.resume();
  startPad();
}
function initAudio() {
  const handler = () => startOnGesture();
  window.addEventListener("pointerdown", handler, { once: true, passive: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true, passive: true });
}
function isMuted() {
  return muted;
}
function setMuted(m) {
  muted = m;
  localStorage.setItem("colormatch-mute", m ? "1" : "0");
  if (master && ctx) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.linearRampToValueAtTime(m ? 0 : 0.7, now + 0.1);
  }
}
function playTone(opts) {
  if (!ctx || !master || muted)
    return;
  const now = ctx.currentTime + (opts.when ?? 0);
  const dur = opts.dur ?? 0.25;
  const peak = opts.gain ?? 0.18;
  const attack = opts.attack ?? 0.005;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "triangle";
  osc.frequency.value = opts.freq;
  if (opts.detune)
    osc.detune.value = opts.detune;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
function playNoiseBurst(when, dur, peak, cutoff) {
  if (!ctx || !master || muted)
    return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0;i < length; i++)
    data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const g = ctx.createGain();
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}
function startPad() {
  if (!ctx || !master || padOsc1)
    return;
  padGain = ctx.createGain();
  padGain.gain.value = 0.05;
  padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 800;
  padFilter.Q.value = 0.6;
  padOsc1 = ctx.createOscillator();
  padOsc1.type = "triangle";
  padOsc1.frequency.value = freqOf(-12);
  padOsc2 = ctx.createOscillator();
  padOsc2.type = "triangle";
  padOsc2.frequency.value = freqOf(-5);
  padOsc2.detune.value = 7;
  padOsc1.connect(padFilter);
  padOsc2.connect(padFilter);
  padFilter.connect(padGain);
  padGain.connect(master);
  padOsc1.start();
  padOsc2.start();
}
function setPadIntensity(intensity) {
  if (!ctx || !padGain || !padFilter)
    return;
  const now = ctx.currentTime;
  const cut = 600 + intensity * 240;
  padFilter.frequency.cancelScheduledValues(now);
  padFilter.frequency.linearRampToValueAtTime(cut, now + 0.3);
  padGain.gain.cancelScheduledValues(now);
  padGain.gain.linearRampToValueAtTime(0.04 + intensity * 0.012, now + 0.3);
}
function playMatch(combo, size) {
  ensureCtx();
  if (!ctx)
    return;
  const stepIdx = Math.min(SCALE.length - 1, combo - 1 + Math.max(0, size - 3));
  const semi = SCALE[stepIdx];
  playTone({ freq: freqOf(semi), dur: 0.22, type: "triangle", gain: 0.16 });
  playTone({ freq: freqOf(semi + 7), dur: 0.18, type: "sine", gain: 0.07, when: 0.01 });
  playNoiseBurst(0, 0.08, 0.07, 1400);
}
function playPowerCreated(isColorBomb) {
  ensureCtx();
  if (!ctx)
    return;
  const chord = isColorBomb ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
  chord.forEach((semi, i) => {
    playTone({
      freq: freqOf(semi + 12),
      dur: 0.5,
      type: "triangle",
      gain: 0.13,
      when: i * 0.04,
      attack: 0.01
    });
  });
  playTone({ freq: freqOf(24), dur: 0.7, type: "sine", gain: 0.08, when: 0.1 });
}
function playPowerDetonate(isColorBomb) {
  ensureCtx();
  if (!ctx)
    return;
  const notes = isColorBomb ? [0, 4, 7, 12, 16, 19, 24] : [0, 7, 12, 19];
  notes.forEach((semi, i) => {
    playTone({
      freq: freqOf(semi + 12),
      dur: 0.28,
      type: "triangle",
      gain: 0.12,
      when: i * 0.035
    });
  });
  playNoiseBurst(0, 0.3, 0.1, 600);
}
function playSwap() {
  ensureCtx();
  playTone({ freq: freqOf(7), dur: 0.06, type: "sine", gain: 0.05 });
  playTone({ freq: freqOf(12), dur: 0.06, type: "sine", gain: 0.05, when: 0.03 });
}
function playUndo() {
  ensureCtx();
  playTone({ freq: freqOf(4), dur: 0.08, type: "sine", gain: 0.06 });
  playTone({ freq: freqOf(-3), dur: 0.1, type: "sine", gain: 0.06, when: 0.04 });
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
  pendingPivot = null;
  pendingColorBombSwap = null;
  particles = [];
  popups = [];
  shockwaves = [];
  cursorX = 0;
  cursorY = 0;
  cursorActive = false;
  dragTrail = [];
  dragTilt = 0;
  lastDragX = 0;
  dragTiltTarget = 0;
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
  constructor(canvas, ctx2, logicalW = 380, logicalH = 600, onTickAmbient) {
    this.canvas = canvas;
    this.ctx = ctx2;
    this.onTickAmbient = onTickAmbient;
    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.offsetX = (logicalW - (this.cols - 1) * this.cellSize) / 2;
    this.offsetY = (logicalH - (this.rows - 1) * this.cellSize) / 2;
    this.elScore = document.getElementById("score");
    this.elHigh = document.getElementById("high-score");
    this.highScore = parseInt(localStorage.getItem("colormatch-hs") || "0");
    this.buildGridDotCache();
    prewarmSprites(COLORS, this.ballRadius);
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
    this.shockwaves = [];
    this.dragTrail = [];
    this.dragTilt = 0;
    this.dragTiltTarget = 0;
    this.state = 4 /* FALL_ANIM */;
    this.pendingPivot = null;
    this.pendingColorBombSwap = null;
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
        for (const b of g.balls) {
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
        if (b.color === run[0].color && b.color !== RAINBOW_COLOR) {
          run.push(b);
        } else {
          if (run.length >= 3)
            matches.push({ balls: run, orientation: "h" });
          run = [b];
        }
      }
      if (run.length >= 3)
        matches.push({ balls: run, orientation: "h" });
    }
    for (let c = 0;c < this.cols; c++) {
      let run = [this.grid[0][c]];
      for (let r = 1;r < this.rows; r++) {
        const b = this.grid[r][c];
        if (b.color === run[0].color && b.color !== RAINBOW_COLOR) {
          run.push(b);
        } else {
          if (run.length >= 3)
            matches.push({ balls: run, orientation: "v" });
          run = [b];
        }
      }
      if (run.length >= 3)
        matches.push({ balls: run, orientation: "v" });
    }
    return matches;
  }
  buildGridDotCache() {
    const oc = new OffscreenCanvas(this.logicalW, this.logicalH);
    const ctx2 = oc.getContext("2d");
    ctx2.fillStyle = "rgba(255,255,255,0.06)";
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        ctx2.beginPath();
        ctx2.arc(this.offsetX + c * this.cellSize, this.offsetY + r * this.cellSize, 1.5, 0, Math.PI * 2);
        ctx2.fill();
      }
    }
    this.gridDotCache = oc;
  }
  swapCreatesMatch(r1, c1, r2, c2) {
    const g = this.grid;
    if (g[r1][c1].power === "colorBomb" || g[r2][c2].power === "colorBomb")
      return true;
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
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        if (this.grid[r][c].power === "colorBomb") {
          if (c + 1 < this.cols)
            return [r, c, r, c + 1];
          if (c > 0)
            return [r, c, r, c - 1];
          if (r + 1 < this.rows)
            return [r, c, r + 1, c];
          if (r > 0)
            return [r, c, r - 1, c];
        }
      }
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
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        colors.push({ color: b.color, idx: b.colorIndex, power: b.power });
      }
    for (let i = colors.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    let k = 0;
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        this.grid[r][c].color = colors[k].color;
        this.grid[r][c].colorIndex = colors[k].idx;
        this.grid[r][c].power = colors[k].power;
        k++;
      }
    this.purgeInitialMatches();
  }
  activationAffected(p) {
    const out = [];
    if (p.power === "stripedH") {
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[p.row][c];
        if (b && b !== p && b.targetScale > 0.5)
          out.push(b);
      }
      playPowerDetonate(false);
    } else if (p.power === "stripedV") {
      for (let r = 0;r < this.rows; r++) {
        const b = this.grid[r][p.col];
        if (b && b !== p && b.targetScale > 0.5)
          out.push(b);
      }
      playPowerDetonate(false);
    } else if (p.power === "colorBomb") {
      const counts = new Map;
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++) {
          const b = this.grid[r][c];
          if (b && b.targetScale > 0.5 && b.color !== RAINBOW_COLOR) {
            counts.set(b.color, (counts.get(b.color) ?? 0) + 1);
          }
        }
      let best = "", bestN = 0;
      for (const [c, n] of counts)
        if (n > bestN) {
          best = c;
          bestN = n;
        }
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++) {
          const b = this.grid[r][c];
          if (b && b !== p && b.color === best && b.targetScale > 0.5)
            out.push(b);
        }
      playPowerDetonate(true);
    }
    return out;
  }
  applyAmbientCharacterBehaviors() {
    const GAZE_RADIUS = 240;
    const LEAN_MAX = 4.5;
    const LEAN_CELL = this.cellSize * 1.2;
    const dragging = this.dragging;
    const origin = this.dragOrigin;
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b || b.targetScale < 0.5)
          continue;
        if (this.cursorActive) {
          const dx = this.cursorX - b.x;
          const dy = this.cursorY - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < GAZE_RADIUS && b.lookAtAmount < 0.7) {
            b.lookAtX = this.cursorX;
            b.lookAtY = this.cursorY;
            const want = 0.4 + (1 - dist / GAZE_RADIUS) * 0.35;
            if (want > b.lookAtAmount)
              b.lookAtAmount = want;
          }
        }
        if (dragging && origin && b !== dragging) {
          const dx = origin.x - b.targetX;
          const dy = origin.y - b.targetY;
          const dist = Math.hypot(dx, dy);
          if (dist > 1 && dist < LEAN_CELL) {
            const fall = 1 - dist / LEAN_CELL;
            const nx = dx / dist;
            const ny = dy / dist;
            b.offsetTargetX = nx * LEAN_MAX * fall;
            b.offsetTargetY = ny * LEAN_MAX * fall;
          }
        }
      }
    }
  }
  pokeNeighborsWobble(src) {
    const REACH = this.cellSize * 2.2;
    for (let r = 0;r < this.rows; r++) {
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b || b === src || b.targetScale < 0.5)
          continue;
        const dx = b.x - src.x;
        const dy = b.y - src.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1 || dist > REACH)
          continue;
        const fall = 1 - dist / REACH;
        const kick = 2.6 * fall;
        b.offsetVx += dx / dist * kick;
        b.offsetVy += dy / dist * kick * 0.7;
      }
    }
  }
  spawnStripeFx(b) {
    const horizontal = b.power === "stripedH";
    const n = 14;
    for (let i = 0;i < n; i++) {
      const spread = (i - n / 2) * 1.2;
      const jitter = (Math.random() - 0.5) * 1.6;
      const vx = horizontal ? spread : jitter;
      const vy = horizontal ? jitter : spread;
      this.particles.push(new Particle(b.x, b.y, vx, vy, 2 + Math.random() * 2, b.color));
    }
  }
  spawnSparkleRing(b, color) {
    const n = 20;
    for (let i = 0;i < n; i++) {
      const a = Math.PI * 2 * i / n;
      const spd = 2 + Math.random() * 2;
      this.particles.push(new Particle(b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, 2 + Math.random() * 3, color));
    }
  }
  processMatches() {
    const groups = this.findMatches();
    const hasColorBombSwap = !!this.pendingColorBombSwap;
    if (groups.length === 0 && !hasColorBombSwap) {
      this.combo = 0;
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++)
          this.grid[r][c].faceState = "idle";
      if (!this.findValidMove()) {
        this.shuffleGrid();
        if (!this.findValidMove())
          this.shuffleGrid();
      }
      this.state = 0 /* IDLE */;
      this.idleTimer = 0;
      this.hintMove = null;
      this.pendingPivot = null;
      setPadIntensity(0);
      this.updateUI();
      return;
    }
    this.combo++;
    const preserve = new Set;
    const powerCreations = [];
    for (const g of groups) {
      if (g.balls.length < 4)
        continue;
      let pivot = null;
      const pending = this.pendingPivot;
      if (pending && g.balls.includes(pending) && pending.power === "none") {
        pivot = pending;
      } else {
        const candidate = g.balls[Math.floor(g.balls.length / 2)];
        if (candidate.power === "none")
          pivot = candidate;
      }
      if (!pivot)
        continue;
      const type = g.balls.length >= 5 ? "colorBomb" : g.orientation === "h" ? "stripedH" : "stripedV";
      preserve.add(pivot);
      powerCreations.push({ ball: pivot, type });
    }
    const destroy = new Set;
    const queue = [];
    if (this.pendingColorBombSwap) {
      const { bomb, partner } = this.pendingColorBombSwap;
      if (!preserve.has(bomb))
        destroy.add(bomb);
      const targetColor = partner.color;
      for (let r = 0;r < this.rows; r++)
        for (let c = 0;c < this.cols; c++) {
          const b = this.grid[r][c];
          if (b && b.color === targetColor && !preserve.has(b) && !destroy.has(b)) {
            destroy.add(b);
            if (b.power !== "none")
              queue.push(b);
          }
        }
      this.pendingColorBombSwap = null;
    }
    for (const g of groups) {
      for (const b of g.balls) {
        if (preserve.has(b))
          continue;
        if (!destroy.has(b)) {
          destroy.add(b);
          if (b.power !== "none")
            queue.push(b);
        }
      }
    }
    let chainCount = 0;
    while (queue.length > 0 && chainCount < 200) {
      chainCount++;
      const p = queue.shift();
      const affected = this.activationAffected(p);
      for (const b of affected) {
        if (preserve.has(b))
          continue;
        if (!destroy.has(b)) {
          destroy.add(b);
          if (b.power !== "none")
            queue.push(b);
        }
      }
    }
    let sumX = 0, sumY = 0;
    const representativeColors = [];
    for (const b of destroy) {
      b.faceState = "scared";
      b.targetScale = 0;
      const displayColor = b.color === RAINBOW_COLOR ? "#ffffff" : b.color;
      this.spawnBurst(b.x, b.y, displayColor, 8);
      if (b.power === "stripedH" || b.power === "stripedV") {
        this.spawnStripeFx(b);
        this.shockwaves.push(new Shockwave(b.x, b.y, 140, b.color, 0.5));
      } else if (b.power === "colorBomb") {
        this.spawnSparkleRing(b, "#ffffff");
        this.shockwaves.push(new Shockwave(b.x, b.y, 220, "#ffffff", 0.7));
      }
      this.pokeNeighborsWobble(b);
      sumX += b.x;
      sumY += b.y;
      if (displayColor !== "#ffffff" && representativeColors.length < 4) {
        representativeColors.push(displayColor);
      }
    }
    if (destroy.size >= 6) {
      const dw = destroy.size >= 12 ? 280 : 180;
      this.shockwaves.push(new Shockwave(sumX / destroy.size, sumY / destroy.size, dw, representativeColors[0] ?? "#ffffff", 0.6));
    }
    const cx = destroy.size > 0 ? sumX / destroy.size : this.logicalW / 2;
    const cy = destroy.size > 0 ? sumY / destroy.size : this.logicalH / 2;
    for (const { ball, type } of powerCreations) {
      ball.power = type;
      ball.powerCreateAge = 0;
      if (type === "colorBomb") {
        ball.color = RAINBOW_COLOR;
      }
      playPowerCreated(type === "colorBomb");
      this.spawnSparkleRing(ball, type === "colorBomb" ? "#ffffff" : ball.color);
    }
    const destroyCount = destroy.size;
    const basePoints = destroyCount * 10;
    const powerBonus = powerCreations.length * 50;
    const pts = (basePoints + powerBonus) * this.combo;
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("colormatch-hs", String(this.highScore));
    }
    const intensity = Math.min(this.combo + Math.floor(destroyCount / 4), 10);
    playMatch(this.combo, destroyCount);
    setPadIntensity(intensity);
    this.shakeMag = Math.min(2 + intensity * 1.6, 18);
    if (this.combo >= 2 || destroyCount >= 8) {
      this.flashAlpha = Math.min(0.08 + intensity * 0.03, 0.32);
      this.flashColor = representativeColors[0] ?? "#ffffff";
    }
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        const nb = this.grid[r][c];
        if (nb && !destroy.has(nb) && nb.targetScale > 0.5) {
          const dist = Math.hypot(nb.x - cx, nb.y - cy);
          if (dist < this.cellSize * 4) {
            nb.lookAtX = cx;
            nb.lookAtY = cy;
            nb.lookAtAmount = Math.min(1, this.cellSize * 4 / (dist + 1));
          }
        }
      }
    const label = this.combo > 1 ? `+${pts} x${this.combo}` : `+${pts}`;
    const popupScale = this.combo > 1 ? 1 + Math.min(intensity * 0.15, 0.8) : 1;
    this.popups.push(new ScorePopup(cx, cy - 10, label, "#fff", popupScale));
    if (this.combo >= 2) {
      this.comboDisplayText = `COMBO x${this.combo}`;
      this.comboDisplayAlpha = 1;
      this.comboDisplayScale = 1.6;
      this.comboDisplayColor = representativeColors[0] ?? "#fff";
    }
    this.pendingPivot = null;
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
    cv.addEventListener("mousemove", (e) => {
      const p = this.mouseXY(e);
      this.updateCursor(p, true);
      this.onMove(p);
    });
    cv.addEventListener("mouseup", (e) => this.onUp(this.mouseXY(e)));
    cv.addEventListener("mouseleave", () => {
      this.cursorActive = false;
    });
    cv.addEventListener("mouseenter", () => {
      this.cursorActive = true;
    });
    cv.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const p = this.touchXY(e);
      this.updateCursor(p, true);
      this.onDown(p);
    }, { passive: false });
    cv.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const p = this.touchXY(e);
      this.updateCursor(p, true);
      this.onMove(p);
    }, { passive: false });
    cv.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.cursorActive = false;
      this.onUp(this.touchXY(e));
    }, { passive: false });
  }
  updateCursor(p, active) {
    this.cursorX = p.x;
    this.cursorY = p.y;
    this.cursorActive = active;
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
    this.lastDragX = p.x;
    this.dragTilt = 0;
    this.dragTiltTarget = 0;
    this.dragTrail = [];
  }
  onMove(p) {
    if (this.state !== 1 /* DRAGGING */ || !this.dragging)
      return;
    const dx = p.x - this.lastDragX;
    this.dragTiltTarget = Math.max(-0.35, Math.min(0.35, dx * 0.06));
    this.lastDragX = p.x;
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
    this.pendingPivot = a;
    if (a.power === "colorBomb" && b.color !== RAINBOW_COLOR) {
      this.pendingColorBombSwap = { bomb: a, partner: b };
    } else if (b.power === "colorBomb" && a.color !== RAINBOW_COLOR) {
      this.pendingColorBombSwap = { bomb: b, partner: a };
    } else {
      this.pendingColorBombSwap = null;
    }
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
    playSwap();
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
    this.pendingColorBombSwap = null;
    this.pendingPivot = null;
    playUndo();
  }
  updateBalls() {
    let anim = false;
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b)
          continue;
        if (b === this.dragging) {
          anim = true;
          continue;
        }
        if (b.update())
          anim = true;
      }
    return anim;
  }
  tick = (now = 0) => {
    this.onTickAmbient?.(now);
    this.particles = this.particles.filter((p) => p.update());
    this.popups = this.popups.filter((p) => p.update());
    this.shockwaves = this.shockwaves.filter((s) => s.update());
    this.applyAmbientCharacterBehaviors();
    const anim = this.updateBalls();
    updateFaceTime(1 / 60);
    this.dragTilt += (this.dragTiltTarget - this.dragTilt) * 0.22;
    this.dragTiltTarget *= 0.86;
    if (this.dragging) {
      this.dragTrail.push({ x: this.dragging.x, y: this.dragging.y, age: 0 });
      if (this.dragTrail.length > 10)
        this.dragTrail.shift();
    }
    for (const t of this.dragTrail)
      t.age += 1 / 60;
    switch (this.state) {
      case 2 /* SWAP_ANIM */:
        if (!anim) {
          if (this.swapIsReverse) {
            this.state = 0 /* IDLE */;
          } else if (this.findMatches().length === 0 && !this.pendingColorBombSwap) {
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
    const { ctx: ctx2 } = this;
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
    ctx2.save();
    ctx2.translate(this.shakeX, this.shakeY);
    ctx2.fillStyle = "#141414";
    ctx2.fillRect(-10, -10, w + 20, h + 20);
    if (this.gridDotCache)
      ctx2.drawImage(this.gridDotCache, 0, 0);
    for (let r = 0;r < this.rows; r++)
      for (let c = 0;c < this.cols; c++) {
        const b = this.grid[r][c];
        if (b && b !== this.dragging)
          b.draw(ctx2);
      }
    if (this.dragTrail.length > 1) {
      const color = this.dragging?.color === RAINBOW_COLOR ? "#ffffff" : this.dragging?.color ?? "#ffffff";
      for (let i = 0;i < this.dragTrail.length - 1; i++) {
        const t = this.dragTrail[i];
        const age = t.age;
        const fade = Math.max(0, 1 - age * 3);
        if (fade <= 0)
          continue;
        ctx2.globalAlpha = fade * 0.28;
        ctx2.fillStyle = color;
        ctx2.beginPath();
        ctx2.arc(t.x, t.y, this.ballRadius * (0.45 + fade * 0.35), 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;
    }
    if (this.dragging) {
      const d = this.dragging;
      ctx2.save();
      ctx2.translate(d.x + d.offsetX, d.y + d.offsetY);
      ctx2.rotate(this.dragTilt);
      ctx2.translate(-(d.x + d.offsetX), -(d.y + d.offsetY));
      d.drawSelected(ctx2);
      d.draw(ctx2);
      ctx2.restore();
    }
    if (this.hintMove) {
      const [r1, c1, r2, c2] = this.hintMove;
      const pulse = 0.3 + Math.sin(getFaceTime() * 3) * 0.15;
      const b1 = this.grid[r1][c1];
      const b2 = this.grid[r2][c2];
      for (const b of [b1, b2]) {
        ctx2.save();
        ctx2.beginPath();
        ctx2.arc(b.x, b.y, this.ballRadius + 4, 0, Math.PI * 2);
        ctx2.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx2.lineWidth = 2;
        ctx2.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx2.shadowBlur = 10;
        ctx2.stroke();
        ctx2.restore();
      }
    }
    for (const s of this.shockwaves)
      s.draw(ctx2);
    for (const p of this.particles)
      p.draw(ctx2);
    for (const p of this.popups)
      p.draw(ctx2);
    if (this.flashAlpha > 0.005) {
      ctx2.globalAlpha = this.flashAlpha;
      ctx2.fillStyle = this.flashColor;
      ctx2.fillRect(-10, -10, w + 20, h + 20);
      ctx2.globalAlpha = 1;
      this.flashAlpha *= 0.85;
    }
    if (this.comboDisplayAlpha > 0.01) {
      ctx2.save();
      ctx2.globalAlpha = this.comboDisplayAlpha;
      const s = this.comboDisplayScale;
      const bx = w / 2;
      const by = 38;
      ctx2.translate(bx, by);
      ctx2.scale(s, s);
      ctx2.font = 'bold 22px "Space Mono", "Courier New", monospace';
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.shadowColor = this.comboDisplayColor;
      ctx2.shadowBlur = 16;
      ctx2.fillStyle = this.comboDisplayColor;
      ctx2.fillText(this.comboDisplayText, 0, 0);
      ctx2.shadowBlur = 8;
      ctx2.fillText(this.comboDisplayText, 0, 0);
      ctx2.restore();
      this.comboDisplayScale += (1 - this.comboDisplayScale) * 0.15;
      this.comboDisplayAlpha -= 0.012;
    }
    ctx2.restore();
  }
  updateUI() {
  }
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
  const ctx2 = ambientCtx;
  const w = ctx2.canvas.width;
  const h = ctx2.canvas.height;
  ctx2.clearRect(0, 0, w, h);
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
    ctx2.globalAlpha = Math.max(0, b.baseAlpha + Math.sin(b.t * b.alphaFreq + b.alphaPhase) * b.alphaAmp);
    ctx2.fillStyle = b.color;
    ctx2.beginPath();
    ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx2.fill();
  }
}

// src/script.ts
var bgCanvas = document.getElementById("bg-canvas");
initAmbient(bgCanvas);
var canvas = document.getElementById("canvas");
var ctx2 = canvas.getContext("2d");
var dpr = window.devicePixelRatio || 1;
var logicalW = 380;
var logicalH = 600;
canvas.width = logicalW * dpr;
canvas.height = logicalH * dpr;
canvas.style.width = `${logicalW}px`;
canvas.style.height = `${logicalH}px`;
ctx2.scale(dpr, dpr);
initAudio();
var game = new Game(canvas, ctx2, logicalW, logicalH, tickAmbient);
document.getElementById("restart")?.addEventListener("click", () => game.restart());
var muteBtn = document.getElementById("mute");
if (muteBtn) {
  const render = () => {
    muteBtn.textContent = isMuted() ? "♪ off" : "♪ on";
    muteBtn.classList.toggle("muted", isMuted());
  };
  render();
  muteBtn.addEventListener("click", () => {
    setMuted(!isMuted());
    render();
  });
}
