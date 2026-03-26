export class MazeGenerator {
    static generate(width, height, level) {
        const w = Math.max(5, width % 2 === 0 ? width + 1 : width);
        const h = Math.max(5, height % 2 === 0 ? height + 1 : height);
        let grid = Array(h)
            .fill()
            .map(() => Array(w).fill(1));
        const startX = 1,
            startY = 1;
        const endX = w - 2,
            endY = h - 2;

        const stack = [{ x: startX, y: startY }];
        grid[startY][startX] = 0;
        const dirs = [
            [0, -2],
            [2, 0],
            [0, 2],
            [-2, 0],
        ];
        while (stack.length) {
            const current = stack[stack.length - 1];
            const neighbors = [];
            for (let [dx, dy] of dirs) {
                const nx = current.x + dx,
                    ny = current.y + dy;
                if (
                    nx > 0 &&
                    nx < w - 1 &&
                    ny > 0 &&
                    ny < h - 1 &&
                    grid[ny][nx] === 1
                ) {
                    neighbors.push({ x: nx, y: ny, dx: dx / 2, dy: dy / 2 });
                }
            }
            if (neighbors.length) {
                const chosen =
                    neighbors[Math.floor(Math.random() * neighbors.length)];
                grid[chosen.y][chosen.x] = 0;
                grid[current.y + chosen.dy][current.x + chosen.dx] = 0;
                stack.push({ x: chosen.x, y: chosen.y });
            } else {
                stack.pop();
            }
        }
        grid[endY][endX] = 0;

        // мягкие стены (2)
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                if (grid[y][x] === 1 && Math.random() < 0.2) {
                    grid[y][x] = 2;
                }
            }
        }

        // эффекты пола: 0 - обычный, 3 - скользкий, 4 - липкий
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                if (grid[y][x] === 0 && Math.random() < 0.15) {
                    grid[y][x] = Math.random() < 0.5 ? 3 : 4;
                }
            }
        }

        return {
            grid,
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            width: w,
            height: h,
        };
    }
}
