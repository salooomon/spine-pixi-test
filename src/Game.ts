import { Application, Assets, Container} from "pixi.js";
import { Physics, Spine } from "@esotericsoftware/spine-pixi-v8";

enum FlowState {
    Idle = 'Idle',
    Intro = 'Intro',
    WaitingChoice = 'WaitingChoice',
    Resolving = 'Resolving',
}

type Buttons = {
    start: HTMLButtonElement;
    fail: HTMLButtonElement;
    success: HTMLButtonElement;
}

export class Game {
    private app: Application;
    private uiRoot: HTMLElement;

    private scene = new Container();
    private spine!: Spine;
    private state: FlowState = FlowState.Idle;
    private isBusy = false;

    private loaderView!: HTMLDivElement;
    private buttons!: Buttons;

    constructor(app: Application, uiRoot: HTMLElement) {
        this.app = app;
        this.uiRoot = uiRoot;
    }

    async init() {
        this.createLoader();
        this.createButtons();

        this.app.stage.addChild(this.scene);

        await this.loadAssets();
        this.createSpine();
        this.layout();
        window.addEventListener('resize', this.layout);

        this.hideLoader();
        this.setInitialButtons();
    }

    private createLoader() {
        const loader = document.createElement("div");
        loader.innerHTML = "Loading...";
        Object.assign(loader.style, {
            position: 'fixed',
            inset: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            background: 'rgba(0,0,0,0.6)',
            fontSize: '24px',
            zIndex: '10',
        });
        document.body.appendChild(loader);
        this.loaderView = loader;
    }

    private hideLoader() {
        this.loaderView.style.display = 'none';
    }

    private createButtons() {
        const wrap = document.createElement("div");

        Object.assign(wrap.style, {
            position: 'fixed',
            left: '50%',
            bottom: '24px',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            zIndex: '20',
        });

        const start = document.createElement("button");
        start.textContent = "Start";

        const fail = document.createElement("button");
        fail.textContent = "Fail";

        const success = document.createElement("button");
        success.textContent = "Success";

        [start, fail, success].forEach(btn => {
            Object.assign(btn.style, {
                padding: '12px',
                fontSize: '16px',
                cursor: 'pointer',
            });
        });

        start.onclick = () => void this.onStartClick();
        fail.onclick = () => void this.onFailClick();
        success.onclick = () => void this.onSuccessClick();

        wrap.append(start, fail, success);
        this.uiRoot.appendChild(wrap);

        this.buttons = { start, fail, success };
    }

    private setInitialButtons() {
        this.buttons.start.disabled = false;
        this.buttons.fail.disabled = true;
        this.buttons.success.disabled = true;
    }

    private setButtonsForWaitingChoice() {
        this.buttons.start.disabled = true;
        this.buttons.fail.disabled = false;
        this.buttons.success.disabled = false;
    }

    private setButtonsForAfterChoice() {
        this.buttons.start.disabled = true;
        this.buttons.fail.disabled = true;
        this.buttons.success.disabled = true;
    }

    private async loadAssets() {
        await Assets.load([
            'assets/spine/Frankin_hands_VFX.atlas',
            'assets/spine/Frankin_hands_VFX.json',
        ]);
    }

    private createSpine() {
        this.spine = Spine.from({
            atlas: 'assets/spine/Frankin_hands_VFX.atlas',
            skeleton: 'assets/spine/Frankin_hands_VFX.json',
        });

        this.spine.x = this.app.screen.width / 2;
        this.spine.y = this.app.screen.height / 2 + 150;
        this.spine.scale.set(0.5);

        this.setInitialOutPose();
        this.scene.addChild(this.spine);
    }

    private setInitialOutPose() {
        const entry = this.spine.state.setAnimation(0, 'Out', false);
        entry.trackTime = entry.animationEnd;

        this.spine.state.apply(this.spine.skeleton);
        this.spine.skeleton.updateWorldTransform(Physics.update);
        this.spine.state.clearTracks();
    }

    private layout = () => {
        if (!this.spine) return;

        this.spine.x = this.app.screen.width / 2;
        this.spine.y = this.app.screen.height / 2 + 150;
    }

    private async onStartClick() {
        if (this.isBusy || this.state !== FlowState.Idle) return;

        this.isBusy = true;
        this.state = FlowState.Intro;

        this.buttons.start.disabled = true;
        this.buttons.fail.disabled = true;
        this.buttons.success.disabled = true;

        await this.playOnce('In');
        await this.playForDuration('Start', 3000);
        this.playLoop('Idle');

        this.state = FlowState.WaitingChoice;
        this.isBusy = false;
        this.setButtonsForWaitingChoice();
    }
    private async onFailClick() {
        if (this.isBusy || this.state !== FlowState.WaitingChoice) return;

        this.isBusy = true;
        this.state = FlowState.Resolving;
        this.setButtonsForAfterChoice();

        await this.playOnce('Fail');
        await this.playOnce('Out');

        this.resetFlow();
    }

    private async onSuccessClick() {
        if (this.isBusy || this.state !== FlowState.WaitingChoice) return;

        this.isBusy = true;
        this.state = FlowState.Resolving;
        this.setButtonsForAfterChoice();

        await this.playOnce('Succes_start');
        await this.playForDuration('Succes_end', 1000);
        await this.playOnce('Out');

        this.resetFlow();
    }

    private async resetFlow() {
        this.state = FlowState.Idle;
        this.isBusy = false;
        this.setInitialButtons();
    }

    private playLoop(animationName: string) {
        this.spine.state.setAnimation(0, animationName, true);
    }

    private playOnce(animationName: string): Promise<void> {
        return new Promise((resolve) => {
            const entry = this.spine.state.setAnimation(0, animationName, false);

            const listener = {
                complete: (completedEntry: unknown) => {
                    if (completedEntry !== entry) return;
                    this.spine.state.removeListener(listener);
                    resolve();
                }
            };
            this.spine.state.addListener(listener);
        });
    }

    private playForDuration(animationName: string, durationMs: number): Promise<void> {
        return new Promise((resolve) => {
            this.spine.state.setAnimation(0, animationName, true);

            window.setTimeout(() => {
                resolve();
            }, durationMs);
        });
    }

}


