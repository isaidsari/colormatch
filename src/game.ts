import { Ball } from './balls.js';

export class Game {

        private balls: Ball[][] = [];

        private draggingBall: Ball = null;
        private originalBall: Ball = null;

        private witdh: number;
        private height: number;

        private padding: number = 30;
        private ballSize: number = 20;
        private ballSpacing: number = this.ballSize + 5;

        private colors: string[] = ['#7f8c8d', '#3498db', '#e74c3c'] // '#d91e18' 

        public shadow: boolean = false;
        private score: number = 0;


        constructor(
                private canvas: HTMLCanvasElement,
                private context: CanvasRenderingContext2D) {

                this.canvas.style.cursor = 'grab';

                this.witdh = this.canvas.width;
                this.height = this.canvas.height;

                let ballsPerRow = Math.floor((this.witdh - this.padding * 2) / (this.ballSize + (this.ballSpacing))) + 1;
                let ballsPerColumn = Math.floor((this.height - this.padding * 2) / (this.ballSize + this.ballSpacing)) + 1;

                const randomColor = (): string => { return this.colors[Math.floor(Math.random() * this.colors.length)] };

                let x = this.padding;
                let y = this.padding;

                for (let i = 0; i < ballsPerColumn; i++) {
                        let row: Ball[] = [];
                        for (let j = 0; j < ballsPerRow; j++) {
                                row.push(new Ball(x, y, this.ballSize, randomColor()));
                                x += this.ballSize + this.ballSpacing;
                        }
                        this.balls.push(row);
                        x = this.padding;
                        y += this.ballSize + this.ballSpacing;
                }

                this.canvas.addEventListener('mousedown', (event) => { this.onPressHandle(event) });
                this.canvas.addEventListener('touchstart', (event) => { this.onPressHandle(event) });

                this.canvas.addEventListener('mousemove', (event) => { this.onMoveHandle(event) });
                this.canvas.addEventListener('touchmove', (event) => { this.onMoveHandle(event) });

                this.canvas.addEventListener('mouseup', (event) => { this.onReleaseHandle(event) });
                this.canvas.addEventListener('touchend', (event) => { this.onReleaseHandle(event) });

                const shadowSwitch = document.getElementById('switch') as HTMLInputElement;
                shadowSwitch.addEventListener('change', (event) => {
                        this.shadow = shadowSwitch.checked;
                        this.context.restore();
                        this.drawBoard();
                });

                this.updateBoard();

                this.score = 0;
                this.updateScore();
                
        }

        public getBallAt(x: number, y: number): Ball {
                const distance = (x: number, y: number, ball: Ball): number => { return Math.sqrt(Math.pow(x - ball.x, 2) + Math.pow(y - ball.y, 2)) };

                let foundBall: Ball = null;
                this.balls.forEach((row) => {
                        row.forEach((ball) => {
                                if (distance(x, y, ball) < this.ballSize && ball != this.draggingBall) {
                                        foundBall = ball;
                                }
                        });
                });
                if (foundBall == null) {
                        //throw new Error('no ball found');
                }
                return foundBall;
        }

        public drawBoard(): void {
                this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.context.fillStyle = '#2c3e50';
                this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

                this.balls.forEach((row) => {
                        row.forEach((ball) => {
                                if (ball != this.draggingBall)
                                        ball.draw(this.canvas, this.context, this.shadow);
                        });
                });

                if (this.draggingBall != null) {
                        this.draggingBall.draw(this.canvas, this.context, this.shadow);
                        this.draggingBall.drawBorder(this.canvas, this.context);
                }
        }

        private updateScore(): void {
                document.getElementById('score').innerHTML = this.score.toString();
        }

        public updateBoard(): void {

                let matches = this.findMatches();

                let brokenBalls = 0;

                while (matches.length > 0) {
                        brokenBalls += this.breakMatches(matches);
                        this.fillBoard();
                        matches = this.findMatches();
                }

                this.score += brokenBalls;
                this.updateScore();

                this.drawBoard();
        }

        private showMatches(): void {
                let matches = this.findMatches();

                if (matches.length > 0) {
                        matches.forEach((match) => {
                                this.context.beginPath();
                                //this.context.moveTo(match[0].x, match[0].y);
                                match.forEach((ball) => {
                                        this.context.lineTo(ball.x, ball.y);
                                });
                                this.context.strokeStyle = '#ecf0f1';
                                this.context.stroke();
                        });
                }
        }

        public fillBoard(): void {

                // fill transparent balls
                this.balls.forEach((row) => {
                        row.forEach((ball) => {
                                if (ball.color == 'transparent') {
                                        ball.color = this.colors[Math.floor(Math.random() * this.colors.length)];
                                }
                        });
                });
        }

        public findMatches(): Ball[][] {
                let matches: Ball[][] = [];
                this.balls.forEach((row) => {
                        let match: Ball[] = [];
                        row.forEach((ball) => {
                                if (match.length == 0) {
                                        match.push(ball);
                                } else if (match[0].color == ball.color) {
                                        match.push(ball);
                                } else {
                                        if (match.length >= 3) {
                                                matches.push(match);
                                        }
                                        match = [ball];
                                }
                        });
                        if (match.length >= 3) {
                                matches.push(match);
                        }
                });
                const getColumnIndex = (ball: Ball): number => {
                        let index: number = null;
                        this.balls.forEach((row) => {
                                row.forEach((column) => {
                                        if (column == ball) {
                                                index = row.indexOf(column);
                                        }
                                });
                        });
                        return index;
                };
                this.balls[0].forEach((column) => {
                        let match: Ball[] = [];
                        this.balls.forEach((row) => {
                                if (match.length == 0) {
                                        match.push(row[getColumnIndex(column)]);
                                } else if (match[0].color == row[getColumnIndex(column)].color) {
                                        match.push(row[getColumnIndex(column)]);
                                } else {
                                        if (match.length >= 3) {
                                                matches.push(match);
                                        }
                                        match = [row[getColumnIndex(column)]];
                                }
                        });
                        if (match.length >= 3) {
                                matches.push(match);
                        }
                }
                );
                return matches;
        }

        public breakMatches(matches: Ball[][]): number {
                let brokenBalls = 0;

                matches.forEach((match) => {
                        match.forEach((ball) => {
                                this.balls.forEach((row) => {
                                        row.forEach((column) => {
                                                if (column == ball) {
                                                        row[row.indexOf(column)] = new Ball(column.x, column.y, this.ballSize, 'transparent');
                                                        brokenBalls++;
                                                }
                                        });
                                });
                        });
                });
                return brokenBalls;
        }

        private onPressHandle(event: MouseEvent | TouchEvent): void {
                if (event instanceof MouseEvent)
                        this.canvas.style.cursor = 'grabbing';

                if (event instanceof TouchEvent)
                        event.preventDefault();

                let coord: { x: number, y: number } = this.getCoordFromEvent(event);

                let ball = this.getBallAt(coord.x, coord.y);
                if (ball != null) {
                        this.originalBall = ball.clone();
                        this.draggingBall = ball;
                }
        }

        private onMoveHandle(event: MouseEvent | TouchEvent): void {
                if (this.draggingBall == null)
                        return;

                if (event instanceof MouseEvent) {
                        if ((event as MouseEvent).buttons === 0) {
                                return;
                        } else if ((event as MouseEvent).buttons === 1) {
                                this.canvas.style.cursor = 'grabbing';
                        }
                }
                if (event instanceof TouchEvent) {
                        event.preventDefault();
                }

                let coord: { x: number, y: number } = this.getCoordFromEvent(event);
                this.draggingBall.move(coord.x, coord.y);

                this.drawBoard();
        }

        private onReleaseHandle(event: MouseEvent | TouchEvent): void {
                if (this.draggingBall == null)
                        return;

                if (event instanceof MouseEvent)
                        this.canvas.style.cursor = 'grab';

                let coord: { x: number, y: number } = this.getCoordFromEvent(event);

                const swap = (dragBall: Ball, targetBall: Ball): void => {
                        dragBall.move(this.originalBall.x, this.originalBall.y);
                        dragBall.swap(targetBall);
                        let dragBallIdx = { x: this.balls.indexOf(this.balls.find((row) => row.indexOf(dragBall) != -1)), y: this.balls[this.balls.indexOf(this.balls.find((row) => row.indexOf(dragBall) != -1))].indexOf(dragBall) };
                        let targetBallIdx = { x: this.balls.indexOf(this.balls.find((row) => row.indexOf(targetBall) != -1)), y: this.balls[this.balls.indexOf(this.balls.find((row) => row.indexOf(targetBall) != -1))].indexOf(targetBall) };

                        this.balls[dragBallIdx.x][dragBallIdx.y] = targetBall;
                        this.balls[targetBallIdx.x][targetBallIdx.y] = dragBall;
                };

                let ball = this.getBallAt(coord.x, coord.y);
                if (this.originalBall.canSwap(ball)) {
                        swap(this.draggingBall, ball);
                } else {
                        this.draggingBall.move(this.originalBall.x, this.originalBall.y);
                }

                this.draggingBall = null;
                this.originalBall = null;

                this.updateBoard();
        }

        private getCoordFromEvent(event: MouseEvent | TouchEvent): { x: number, y: number } {
                let x: number;
                let y: number;
                if (event instanceof MouseEvent) {
                        x = event.clientX;
                        y = event.clientY;
                } else {
                        if (event.touches.length == 0) {
                                x = event.changedTouches[0].clientX;
                                y = event.changedTouches[0].clientY;
                        } else {
                                x = event.touches[0].clientX;
                                y = event.touches[0].clientY;
                        }
                }
                let rect = this.canvas.getBoundingClientRect();
                x -= rect.left;
                y -= rect.top;
                return { x, y };
        }

}
