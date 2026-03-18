export class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.scale = 1;
        this.targetScale = 1;
        this.row = 0;
        this.col = 0;
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
        }
        else {
            this.x = this.targetX;
            this.y = this.targetY;
        }
        const ds = this.targetScale - this.scale;
        if (Math.abs(ds) > 0.01) {
            this.scale += ds * 0.35;
            moving = true;
        }
        else {
            this.scale = this.targetScale;
        }
        return moving;
    }
    draw(ctx) {
        if (this.scale < 0.02)
            return;
        const r = this.radius * this.scale;
        // Hard shadow offset
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y + 3, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        // Flat circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        // Crisp white border
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    drawSelected(ctx) {
        const r = this.radius * this.scale + 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
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
