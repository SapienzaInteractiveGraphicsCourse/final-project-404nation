import { CELL_TYPES } from "../shared/cells.js";
const ALL_CELL_CHARS = Object.values(CELL_TYPES);
export function loadLevel(data) {
    if (!data.grid){
        throw new Error("无地图 missing grid");
    }
    if (!data.snake){
        throw new Error("无蛇 missing snake");
    } 
    if (!data.facing){
        throw new Error("无朝向 missing fact");
    }
    if (data.snake.length === 0){
        throw new Error("无蛇身 empty Snake");
    }
    for (const row of data.grid) {
        for (const cell of row) {
            if (!ALL_CELL_CHARS.includes(cell)) {
                throw new Error(`Invalid cell type: ${cell}`);
            }
        }
    }
    return data;
}