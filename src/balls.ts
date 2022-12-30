export class Ball {

        constructor(
                public x: number,
                public y: number,
                public radius: number,
                public color: string) {
        }

        public draw(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, shadow: boolean = false): void {
                context.beginPath();
                if (shadow) {
                        context.shadowColor = '#1c2d40';
                        context.shadowBlur = 10;
                }
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                context.fillStyle = this.color;
                context.fill();
        }

        public drawShadow(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
                context.beginPath();
                context.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2, false);
                context.fillStyle = 'rgba(0, 0, 0, 0.2)';
                context.fill();
        }

        public drawBorder(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
                context.beginPath();
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                context.strokeStyle = '#ecf0f1';
                context.stroke();
        }

        public move(x: number, y: number): void {
                this.x = x;
                this.y = y;
        }

        public canSwap(ball: Ball): boolean {
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

        public swap(ball: Ball): void {
                let temp: { x: number, y: number } = { x: this.x, y: this.y };
                this.move(ball.x, ball.y);
                ball.move(temp.x, temp.y);
        }

        public clone() {
                return new Ball(this.x, this.y, this.radius, this.color);
        }

}
