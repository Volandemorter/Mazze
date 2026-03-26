export class TextureLoader {
    constructor() {
        this.textures = {
            brick: null,
            softwall: null,
            floor_normal: null,
            floor_slippery: null,
            floor_sticky: null,
        };
        this.loaded = false;
    }

    async loadAll() {
        const basePath = 'assets/';
        const images = {
            brick: 'brick.png',
            softwall: 'softwall.png',
            floor_normal: 'floor_normal.png',
            floor_slippery: 'floor_slippery.png',
            floor_sticky: 'floor_sticky.png',
        };
        const promises = [];
        for (const [key, file] of Object.entries(images)) {
            promises.push(
                this.loadImage(basePath + file)
                    .then((img) => {
                        this.textures[key] = img;
                    })
                    .catch(() => {
                        // fallback: создаём canvas-текстуру
                        this.textures[key] = this.createFallbackTexture(key);
                    }),
            );
        }
        await Promise.all(promises);
        this.loaded = true;
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    createFallbackTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        switch (type) {
            case 'brick':
                ctx.fillStyle = '#b85c1a';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#9a3e0e';
                for (let i = 0; i < 4; i++) ctx.fillRect(5, i * 16 + 5, 54, 4);
                ctx.fillStyle = '#d17a2a';
                for (let i = 0; i < 3; i++)
                    ctx.fillRect(10 + i * 20, 10, 12, 8);
                for (let i = 0; i < 3; i++)
                    ctx.fillRect(10 + i * 20, 30, 12, 8);
                break;
            case 'softwall':
                ctx.fillStyle = '#c0a080';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#a07040';
                for (let i = 0; i < 10; i++) ctx.fillRect(8, i * 6 + 4, 48, 2);
                break;
            case 'floor_normal':
                ctx.fillStyle = '#a0a0a0';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#808080';
                for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 8, 64, 1);
                break;
            case 'floor_slippery':
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 5; i++) ctx.fillRect(i * 12, 0, 6, 64);
                break;
            case 'floor_sticky':
                ctx.fillStyle = '#886633';
                ctx.fillRect(0, 0, 64, 64);
                ctx.fillStyle = '#553322';
                for (let i = 0; i < 30; i++)
                    ctx.fillRect(Math.random() * 64, Math.random() * 64, 4, 4);
                break;
        }
        return canvas;
    }

    getTexture(type) {
        if (!this.loaded) return null;
        const img = this.textures[type];
        if (img instanceof HTMLImageElement) {
            return img;
        } else {
            // canvas элемент
            return img;
        }
    }
}
