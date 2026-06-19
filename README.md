![404 Snake](assets/404snake-logo.png)
# final-project-404nation
404 Snake is a Snakebird-style puzzle game for the Interactive Graphics final project.
## Play the Game
Coming soon...
## How to Run Locally
Install dependencies:
```bash
npm install
```
Start the development server:
```bash
npm run dev
```
Build the production version:
```bash
npm run build
```
## Controls
| Key | Action |
|------|------|
| W / Arrow Up | Move Up |
| A / Arrow Left | Move Left |
| S / Arrow Down | Move Down |
| D / Arrow Right | Move Right |
| R | Restart Level |
| U | Undo Move |
| P | Previous Level |
| N | Next Level |
| Esc | Show / Hide Game Controls |
| M | Return to Main Menu |
| 1 | Front Camera |
| 2 | Iso Camera |
| 3 | Orbit Camera |
| L | Toggle Key Light |
## Game Flow
The game opens on a main menu with:
- Start
- Level Select
During play, the in-game control panel is hidden by default and can be shown or hidden with `Esc`. Press `M` or use the control panel button to return to the main menu.
## Levels
Five levels are provided in this order:
- level-guide
- level-1
- level-2
- level-3
- level-4

The level files are stored in the `levels/` folder.
## Level Format
Each level is stored as a JSON file.
Example:
```json
{
  "id": "level-1",
  "name": "guide",
  "grid": [
    "........",
    "....F...",
    "....#E..",
    "........",
    "########"],
  "snake": [[2, 3], [1, 3]],
  "facing": "right"
}
```
### Fields
| Field | Description |
|---------|---------|
| id | Unique level identifier |
| name | Level name |
| grid | Level map represented by characters |
| snake | Initial snake coordinates, head first |
| facing | Initial snake direction |
### Cell Types
| Symbol | Meaning |
|---------|---------|
| # | Wall |
| . | Empty space |
| F | Fruit |
| ^ | Spikes |
| E | Exit |
