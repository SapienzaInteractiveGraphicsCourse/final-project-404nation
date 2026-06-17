import level3 from "./levels/level-3.json";
import { loadLevel } from "./levels/loadLevel.js";
import { GameEngine } from "./engine/index.js";
import { InputManager } from "./ui/inputmanager.js";

const gameLevel = loadLevel(level3);
const engine = new GameEngine(gameLevel);
//验证初始化和有蛇的位置：
console.log("Engine state:");
console.log(engine.state);

new InputManager((direction) => {
    const result = engine.step(direction);
//调试输出:
    console.log("Move:", direction);
    console.log("Accepted:", result.accepted);
    console.log("Status:", engine.status);
    console.log("Head:", engine.state.segments[0]);
});