export class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }
    draw(canvas, context, shadow) {
        context.beginPath();
        if (shadow) {
            context.shadowColor = '#1c2d40';
            context.shadowBlur = 10;
        }
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        context.fillStyle = this.color;
        context.fill();
    }
    drawShadow(canvas, context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2, false);
        context.fillStyle = 'rgba(0, 0, 0, 0.2)';
        context.fill();
    }
    drawBorder(canvas, context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        context.strokeStyle = '#ecf0f1';
        context.stroke();
    }
    move(x, y) {
        this.x = x;
        this.y = y;
    }
    canSwap(ball) {
        if (ball == null) {
            return false;
        }
        if (this === ball) {
            return false;
        }
        if (!(this.x === ball.x || this.y === ball.y)) {
            return false;
        }
        let dx = this.x - ball.x;
        let dy = this.y - ball.y;
        let distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
        let outer = (this.radius + ball.radius) * 2;
        return distance < outer;
    }
    swap(ball) {
        let temp = { x: this.x, y: this.y };
        this.move(ball.x, ball.y);
        ball.move(temp.x, temp.y);
    }
    clone() {
        return new Ball(this.x, this.y, this.radius, this.color);
    }
}
