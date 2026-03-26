export class Joystick {
    constructor(baseElement, callback) {
        this.base = baseElement;
        this.callback = callback;
        this.active = false;
        this.vector = { x: 0, y: 0 };
        this.thumb = null;
        this.init();
    }

    init() {
        this.base.style.position = 'relative';
        this.base.style.touchAction = 'none';
        this.thumb = document.createElement('div');
        this.thumb.className = 'joystick-thumb';
        this.base.appendChild(this.thumb);

        const handleMove = (clientX, clientY) => {
            const rect = this.base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const maxDist = rect.width / 2;
            let dist = Math.hypot(dx, dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
                dist = maxDist;
            }
            const normX = dx / maxDist;
            const normY = dy / maxDist;
            this.vector = { x: normX, y: normY };
            this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            if (this.callback) this.callback(this.vector);
        };

        const start = (e) => {
            e.preventDefault();
            this.active = true;
            const point = e.touches ? e.touches[0] : e;
            handleMove(point.clientX, point.clientY);
        };
        const move = (e) => {
            if (!this.active) return;
            e.preventDefault();
            const point = e.touches ? e.touches[0] : e;
            handleMove(point.clientX, point.clientY);
        };
        const end = () => {
            this.active = false;
            this.vector = { x: 0, y: 0 };
            this.thumb.style.transform = 'translate(-50%, -50%)';
            if (this.callback) this.callback(this.vector);
        };

        this.base.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
        this.base.addEventListener('touchstart', start);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', end);
    }
}
