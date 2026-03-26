import { MazeGenerator } from './maze.js';
import { TextureLoader } from './textures.js';

export class Game {
    constructor(canvas, mazeData, character, level, callbacks, textureLoader) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maze = mazeData.grid;
        this.width = mazeData.width;
        this.height = mazeData.height;
        this.start = mazeData.start;
        this.end = mazeData.end;
        this.character = character;
        this.level = level;
        this.onLevelComplete = callbacks.onLevelComplete;
        this.onGameOver = callbacks.onGameOver;
        this.textureLoader = textureLoader;

        this.pos = { x: this.start.x + 0.5, y: this.start.y + 0.5 };
        this.vel = { x: 0, y: 0 };
        this.keys = { up: false, down: false, left: false, right: false };
        this.lastTimestamp = 0;
        this.cellSize = 0;
        this.running = true;
        this.score = 0;
        this.timeLeft = 15;
        this.timerInterval = null;
        this.visionFlash = false;
        this.visionTimer = null;

        this.controlMode = 'keys'; // keys, mouse, joystick
        this.mouseTarget = null;
        this.joystickDir = { x: 0, y: 0 };

        this.initControls();
        this.startTimer();
        this.animate();
    }

    initControls() {
        const handleKeyDown = (e) => {
            const key = e.key;
            if (key === 'ArrowUp' || key === 'w') this.keys.up = true;
            if (key === 'ArrowDown' || key === 's') this.keys.down = true;
            if (key === 'ArrowLeft' || key === 'a') this.keys.left = true;
            if (key === 'ArrowRight' || key === 'd') this.keys.right = true;
            e.preventDefault();
        };
        const handleKeyUp = (e) => {
            const key = e.key;
            if (key === 'ArrowUp' || key === 'w') this.keys.up = false;
            if (key === 'ArrowDown' || key === 's') this.keys.down = false;
            if (key === 'ArrowLeft' || key === 'a') this.keys.left = false;
            if (key === 'ArrowRight' || key === 'd') this.keys.right = false;
            e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.controlMode === 'mouse' && this.running) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                this.mouseTarget = {
                    x: mouseX / this.cellSize,
                    y: mouseY / this.cellSize,
                };
            }
        });
    }

    setControlMode(mode) {
        this.controlMode = mode;
        if (mode !== 'mouse') this.mouseTarget = null;
    }

    setJoystickDirection(dir) {
        this.joystickDir = dir;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.running) return;
            this.timeLeft -= 1;
            document.getElementById('timer').innerText = Math.max(
                0,
                this.timeLeft,
            );
            if (this.timeLeft <= 0) {
                this.endGame(false);
            }
        }, 1000);
    }

    update(dt) {
        if (!this.running) return;
        let acc = this.character.acceleration;
        let turn = this.character.turnSpeed;
        let maxSpd = this.character.maxSpeed;
        let speedMult = 1;

        const cellX = Math.floor(this.pos.x);
        const cellY = Math.floor(this.pos.y);
        const tile = this.maze[cellY]?.[cellX];
        if (tile === 3 && this.character.skill !== 'noSlippery')
            speedMult = 1.5;
        if (tile === 4 && this.character.skill !== 'noSlippery')
            speedMult = 0.5;

        let moveDir = { x: 0, y: 0 };
        if (this.controlMode === 'keys') {
            if (this.keys.up) moveDir.y -= 1;
            if (this.keys.down) moveDir.y += 1;
            if (this.keys.left) moveDir.x -= 1;
            if (this.keys.right) moveDir.x += 1;
        } else if (this.controlMode === 'mouse' && this.mouseTarget) {
            const dx = this.mouseTarget.x - this.pos.x;
            const dy = this.mouseTarget.y - this.pos.y;
            const len = Math.hypot(dx, dy);
            if (len > 0.2) {
                moveDir.x = dx / len;
                moveDir.y = dy / len;
            }
        } else if (this.controlMode === 'joystick') {
            moveDir = { x: this.joystickDir.x, y: this.joystickDir.y };
        }

        if (moveDir.x !== 0 || moveDir.y !== 0) {
            let len = Math.hypot(moveDir.x, moveDir.y);
            moveDir.x /= len;
            moveDir.y /= len;
            this.vel.x += moveDir.x * acc * dt * speedMult;
            this.vel.y += moveDir.y * acc * dt * speedMult;
            let spd = Math.hypot(this.vel.x, this.vel.y);
            if (spd > maxSpd) {
                this.vel.x = (this.vel.x / spd) * maxSpd;
                this.vel.y = (this.vel.y / spd) * maxSpd;
            }
        } else {
            this.vel.x *= Math.pow(0.95, dt * 60);
            this.vel.y *= Math.pow(0.95, dt * 60);
        }

        let newX = this.pos.x + this.vel.x * dt;
        let newY = this.pos.y + this.vel.y * dt;
        if (this.canMove(newX, this.pos.y)) this.pos.x = newX;
        if (this.canMove(this.pos.x, newY)) this.pos.y = newY;

        const exitX = this.end.x + 0.5,
            exitY = this.end.y + 0.5;
        if (Math.hypot(this.pos.x - exitX, this.pos.y - exitY) < 0.4) {
            this.levelComplete();
        }

        if (this.character.skill === 'vision') {
            if (!this.visionTimer) {
                this.visionTimer = setInterval(() => {
                    this.visionFlash = !this.visionFlash;
                }, 400);
            }
        }
    }

    canMove(x, y) {
        const left = Math.floor(x - 0.4);
        const right = Math.floor(x + 0.4);
        const top = Math.floor(y - 0.4);
        const bottom = Math.floor(y + 0.4);
        for (let ix = left; ix <= right; ix++) {
            for (let iy = top; iy <= bottom; iy++) {
                if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height)
                    return false;
                let cell = this.maze[iy][ix];
                if (cell === 1) return false;
                if (cell === 2) {
                    if (
                        this.character.skill === 'breakSoft' &&
                        Math.hypot(this.vel.x, this.vel.y) > 4.0
                    ) {
                        this.maze[iy][ix] = 0;
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    levelComplete() {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.timerInterval);
        if (this.visionTimer) clearInterval(this.visionTimer);
        let timeBonus = Math.floor(this.timeLeft);
        let levelScore = 100 + timeBonus * 5;
        this.score += levelScore;
        document.getElementById('score').innerText = this.score;
        this.onLevelComplete(this.score, this.level, timeBonus);
    }

    endGame(victory = false) {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.timerInterval);
        if (this.visionTimer) clearInterval(this.visionTimer);
        this.onGameOver(this.score, this.level);
    }

    draw() {
        const size = Math.min(
            this.canvas.clientWidth,
            this.canvas.clientHeight,
        );
        this.canvas.width = this.canvas.height = size;
        this.cellSize = size / this.width;
        this.ctx.clearRect(0, 0, size, size);

        // Отрисовка лабиринта с текстурами
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.maze[y][x];
                let textureType = '';
                if (cell === 1) textureType = 'brick';
                else if (cell === 2) textureType = 'softwall';
                else if (cell === 3) textureType = 'floor_slippery';
                else if (cell === 4) textureType = 'floor_sticky';
                else textureType = 'floor_normal';

                const tex = this.textureLoader.getTexture(textureType);
                if (tex) {
                    if (
                        tex instanceof HTMLImageElement ||
                        tex instanceof HTMLCanvasElement
                    ) {
                        this.ctx.drawImage(
                            tex,
                            x * this.cellSize,
                            y * this.cellSize,
                            this.cellSize,
                            this.cellSize,
                        );
                    } else {
                        this.ctx.fillStyle = '#aaa';
                        this.ctx.fillRect(
                            x * this.cellSize,
                            y * this.cellSize,
                            this.cellSize,
                            this.cellSize,
                        );
                    }
                } else {
                    // fallback
                    this.ctx.fillStyle = '#aaa';
                    this.ctx.fillRect(
                        x * this.cellSize,
                        y * this.cellSize,
                        this.cellSize,
                        this.cellSize,
                    );
                }
                // добавим лёгкую тень для псевдо-3D (градиент сверху)
                const grad = this.ctx.createLinearGradient(
                    x * this.cellSize,
                    y * this.cellSize,
                    x * this.cellSize,
                    (y + 1) * this.cellSize,
                );
                grad.addColorStop(0, 'rgba(0,0,0,0.1)');
                grad.addColorStop(1, 'rgba(0,0,0,0.3)');
                this.ctx.fillStyle = grad;
                this.ctx.fillRect(
                    x * this.cellSize,
                    y * this.cellSize,
                    this.cellSize,
                    this.cellSize,
                );
            }
        }

        // выход
        const exitTex = this.textureLoader.getTexture('floor_normal');
        if (exitTex)
            this.ctx.drawImage(
                exitTex,
                this.end.x * this.cellSize,
                this.end.y * this.cellSize,
                this.cellSize,
                this.cellSize,
            );
        this.ctx.fillStyle = 'rgba(255,200,100,0.5)';
        this.ctx.fillRect(
            this.end.x * this.cellSize,
            this.end.y * this.cellSize,
            this.cellSize,
            this.cellSize,
        );

        // магический путь
        if (this.character.skill === 'vision' && this.visionFlash) {
            this.drawMagicPath();
        }

        // игрок - человекоподобная фигурка
        this.drawCharacter(
            this.pos.x * this.cellSize,
            this.pos.y * this.cellSize,
            this.cellSize,
        );
    }

    drawCharacter(x, y, size) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        const headSize = size * 0.3;
        const bodyHeight = size * 0.4;
        // тело
        ctx.fillStyle = this.character.color;
        ctx.fillRect(-size * 0.2, -size * 0.1, size * 0.4, bodyHeight);
        // голова
        ctx.fillStyle = '#f0c0a0';
        ctx.beginPath();
        ctx.arc(0, -size * 0.2, headSize, 0, 2 * Math.PI);
        ctx.fill();
        // глаза
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-size * 0.08, -size * 0.28, size * 0.05, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size * 0.08, -size * 0.28, size * 0.05, 0, 2 * Math.PI);
        ctx.fill();
        // руки (простые линии, анимация при движении)
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, -size * 0.05);
        ctx.lineTo(-size * 0.4, size * 0.1);
        ctx.lineWidth = size * 0.08;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.2, -size * 0.05);
        ctx.lineTo(size * 0.4, size * 0.1);
        ctx.stroke();
        // ноги
        ctx.beginPath();
        ctx.moveTo(-size * 0.15, size * 0.3);
        ctx.lineTo(-size * 0.3, size * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(size * 0.15, size * 0.3);
        ctx.lineTo(size * 0.3, size * 0.5);
        ctx.stroke();
        ctx.restore();
    }

    drawMagicPath() {
        // BFS поиск кратчайшего пути от текущей позиции до выхода
        const startCell = {
            x: Math.floor(this.pos.x),
            y: Math.floor(this.pos.y),
        };
        const endCell = { x: this.end.x, y: this.end.y };
        const queue = [{ x: startCell.x, y: startCell.y, path: [] }];
        const visited = Array(this.height)
            .fill()
            .map(() => Array(this.width).fill(false));
        let targetPath = null;
        while (queue.length && !targetPath) {
            const { x, y, path } = queue.shift();
            if (x === endCell.x && y === endCell.y) {
                targetPath = path;
                break;
            }
            if (visited[y][x]) continue;
            visited[y][x] = true;
            const dirs = [
                [0, -1],
                [1, 0],
                [0, 1],
                [-1, 0],
            ];
            for (let [dx, dy] of dirs) {
                const nx = x + dx,
                    ny = y + dy;
                if (
                    nx >= 0 &&
                    nx < this.width &&
                    ny >= 0 &&
                    ny < this.height &&
                    this.maze[ny][nx] !== 1
                ) {
                    queue.push({
                        x: nx,
                        y: ny,
                        path: [...path, { x: nx, y: ny }],
                    });
                }
            }
        }
        if (targetPath) {
            this.ctx.globalAlpha = 0.6;
            for (let step of targetPath) {
                this.ctx.fillStyle = '#ff66ff';
                this.ctx.fillRect(
                    step.x * this.cellSize,
                    step.y * this.cellSize,
                    this.cellSize,
                    this.cellSize,
                );
            }
            this.ctx.globalAlpha = 1;
        }
    }

    animate() {
        if (!this.running) return;
        const now = performance.now();
        let dt = Math.min(0.033, (now - (this.lastTimestamp || now)) / 1000);
        this.lastTimestamp = now;
        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}
