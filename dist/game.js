import { Ball } from './balls.js';
export class Game {
    constructor(canvas, context, shadow = true) {
        this.canvas = canvas;
        this.context = context;
        this.shadow = shadow;
        this.balls = [];
        this.draggingBall = null;
        this.originalBall = null;
        this.padding = 30;
        this.ballSize = 20;
        this.ballSpacing = this.ballSize + 5;
        this.colors = ['#7f8c8d', '#3498db', '#d91e18']; // '#e74c3c' 
        this.canvas.style.cursor = 'grab';
        this.witdh = this.canvas.width;
        this.height = this.canvas.height;
        let ballsPerRow = Math.floor((this.witdh - this.padding * 2) / (this.ballSize + (this.ballSpacing))) + 1;
        let ballsPerColumn = Math.floor((this.height - this.padding * 2) / (this.ballSize + this.ballSpacing)) + 1;
        const randomColor = () => { return this.colors[Math.floor(Math.random() * this.colors.length)]; };
        let x = this.padding;
        let y = this.padding;
        for (let i = 0; i < ballsPerColumn; i++) {
            let row = [];
            for (let j = 0; j < ballsPerRow; j++) {
                row.push(new Ball(x, y, this.ballSize, randomColor()));
                x += this.ballSize + this.ballSpacing;
            }
            this.balls.push(row);
            x = this.padding;
            y += this.ballSize + this.ballSpacing;
        }
        this.canvas.addEventListener('mousedown', (event) => { this.onPressHandle(event); });
        this.canvas.addEventListener('touchstart', (event) => { this.onPressHandle(event); });
        this.canvas.addEventListener('mousemove', (event) => { this.onMoveHandle(event); });
        this.canvas.addEventListener('touchmove', (event) => { this.onMoveHandle(event); });
        this.canvas.addEventListener('mouseup', (event) => { this.onReleaseHandle(event); });
        this.canvas.addEventListener('touchend', (event) => { this.onReleaseHandle(event); });
        this.updateBoard();
    }
    getBallAt(x, y) {
        const distance = (x, y, ball) => { return Math.sqrt(Math.pow(x - ball.x, 2) + Math.pow(y - ball.y, 2)); };
        let foundBall = null;
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
    drawBoard() {
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
            this.draggingBall.draw(this.canvas, this.context);
            this.draggingBall.drawBorder(this.canvas, this.context);
        }
    }
    updateBoard() {
        let matches = this.findMatches();
        while (matches.length > 0) {
            this.breakMatches(matches);
            this.fillBoard();
            matches = this.findMatches();
        }
        this.drawBoard();
    }
    showMatches() {
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
    fillBoard() {
        // fill transparent balls
        this.balls.forEach((row) => {
            row.forEach((ball) => {
                if (ball.color == 'transparent') {
                    ball.color = this.colors[Math.floor(Math.random() * this.colors.length)];
                }
            });
        });
    }
    findMatches() {
        let matches = [];
        this.balls.forEach((row) => {
            let match = [];
            row.forEach((ball) => {
                if (match.length == 0) {
                    match.push(ball);
                }
                else if (match[0].color == ball.color) {
                    match.push(ball);
                }
                else {
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
        const getColumnIndex = (ball) => {
            let index = null;
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
            let match = [];
            this.balls.forEach((row) => {
                if (match.length == 0) {
                    match.push(row[getColumnIndex(column)]);
                }
                else if (match[0].color == row[getColumnIndex(column)].color) {
                    match.push(row[getColumnIndex(column)]);
                }
                else {
                    if (match.length >= 3) {
                        matches.push(match);
                    }
                    match = [row[getColumnIndex(column)]];
                }
            });
            if (match.length >= 3) {
                matches.push(match);
            }
        });
        return matches;
    }
    breakMatches(matches) {
        matches.forEach((match) => {
            match.forEach((ball) => {
                this.balls.forEach((row) => {
                    row.forEach((column) => {
                        if (column == ball)
                            row[row.indexOf(column)] = new Ball(column.x, column.y, this.ballSize, 'transparent');
                    });
                });
            });
        });
    }
    onPressHandle(event) {
        if (event instanceof MouseEvent)
            this.canvas.style.cursor = 'grabbing';
        if (event instanceof TouchEvent)
            event.preventDefault();
        let coord = this.getCoordFromEvent(event);
        let ball = this.getBallAt(coord.x, coord.y);
        if (ball != null) {
            this.originalBall = ball.clone();
            this.draggingBall = ball;
        }
    }
    onMoveHandle(event) {
        if (this.draggingBall == null)
            return;
        if (event instanceof MouseEvent) {
            if (event.buttons === 0) {
                return;
            }
            else if (event.buttons === 1) {
                this.canvas.style.cursor = 'grabbing';
            }
        }
        if (event instanceof TouchEvent) {
            event.preventDefault();
        }
        let coord = this.getCoordFromEvent(event);
        this.draggingBall.move(coord.x, coord.y);
        this.drawBoard();
    }
    onReleaseHandle(event) {
        if (this.draggingBall == null)
            return;
        if (event instanceof MouseEvent)
            this.canvas.style.cursor = 'grab';
        let coord = this.getCoordFromEvent(event);
        const swap = (dragBall, targetBall) => {
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
        }
        else {
            this.draggingBall.move(this.originalBall.x, this.originalBall.y);
        }
        this.draggingBall = null;
        this.originalBall = null;
        this.updateBoard();
    }
    getCoordFromEvent(event) {
        let x;
        let y;
        if (event instanceof MouseEvent) {
            x = event.clientX;
            y = event.clientY;
        }
        else {
            if (event.touches.length == 0) {
                x = event.changedTouches[0].clientX;
                y = event.changedTouches[0].clientY;
            }
            else {
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
