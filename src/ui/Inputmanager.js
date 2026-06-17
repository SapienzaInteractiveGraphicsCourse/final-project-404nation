export class InputManager {
    constructor(onMove) {
        this.onMove = onMove;

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
            }

            if (direction && this.onMove) {
                this.onMove(direction);
            }
        });
    }
}