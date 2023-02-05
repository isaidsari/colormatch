var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
    }
    draw(canvas, context, shadow = false) {
        return __awaiter(this, void 0, void 0, function* () {
            context.beginPath();
            if (shadow) {
                context.shadowColor = Ball.shadowColor;
                context.shadowBlur = 10;
            }
            else {
                context.shadowColor = 'transparent';
                context.shadowBlur = 0;
            }
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            context.fillStyle = this.color;
            context.fill();
            // animate
            let r = this.radius;
            let i = 0;
            let interval = setInterval(() => {
                context.beginPath();
                context.arc(this.x, this.y, r, 0, Math.PI * 2, false);
                context.fillStyle = this.color;
                context.fill();
                r += 1;
                i++;
                if (i > 5) {
                    clearInterval(interval);
                }
            }, 50);
        });
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
Ball.shadowColor = '#1c2d40';
