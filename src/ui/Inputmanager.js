export class InputManager {
    constructor(onMove, onRestart) {
        this.onMove = onMove;
        this.onRestart = onRestart;

        window.addEventListener("keydown", (event) => {
            let direction = null;

            switch (event.key.toLowerCase()) {
                case "w":
                    direction = "up";
                    break;
                case "a":
                    direction = "left";
                    break;
                case "s":
                    direction = "down";
                    break;
                case "d":
                    direction = "right";
                    break;
                case "r":
                    if (this.onRestart) {
                        this.onRestart();
                    }
                    return;
            }

            if (direction && this.onMove) {
                this.onMove(direction);
            }
        });
    }
}
