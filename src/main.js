import level01 from "./levels/level01.json";
import { loadLevel } from "./levels/loadLevel.js";
import { InputManager } from "./ui/Inputmanager.js";
const level = loadLevel(level01);
console.log("Level loaded:");
console.log(level);
new InputManager();