import { Application } from 'pixi.js';
import { Game } from './Game';

async function bootstrap() {
    const app = new Application();

    await app.init({
        resizeTo: window,
        background: '#1e1e1e',
        antialias: true,
    });

    document.body.style.margin = '0';
    document.body.appendChild(app.canvas);

    const root = document.createElement('div');
    root.id = 'ui-root';
    document.body.appendChild(root);

    const game = new Game(app, root);
    await game.init();
}

bootstrap().catch(console.error);