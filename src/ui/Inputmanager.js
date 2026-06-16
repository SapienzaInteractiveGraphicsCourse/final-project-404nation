export class InputManager {
    constructor(){
        window.addEventListener("keydown",(event)=>{
            let direction=null;
            switch(event.key.toLowerCase()){
                case "w":
                direction="up";
                break;
                case "a":
                direction="left";
                break;
                case "s":
                direction="down";
                break;
                case "d":
                direction="right";
                break;
            }
            if(direction){
                console.log("Move:",direction);
            }
    });
}
}