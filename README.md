# 404 Snake

![404 Snake](assets/404snake-logo.png)

Final project for the **Interactive Graphics** course held by Prof. Marco Schaerf.

**404 Snake** is a 2.5D Snakebird-style puzzle game developed with **Three.js**.
The player controls a snake-like character across floating platforms, collects all fruits, avoids spikes and void falls, and reaches the exit to complete each level.

## Play the Game

Check out the GitHub Page:

[Play 404 Snake](https://sapienzainteractivegraphicscourse.github.io/final-project-404nation/)

## Project Description

The project combines a pure JavaScript game engine with a Three.js visual layer.

The game includes:

* a grid-based puzzle system;
* a hierarchical animated snake model;
* manually implemented animations;
* fruit collection mechanics;
* gravity and falling behavior;
* spikes and void death;
* multiple puzzle levels;
* 2.5D rendering with lights, shadows, and materials;
* camera controls;
* undo and restart mechanics;
* a main menu and level selection screen.

The engine owns the authoritative game state, while the rendering layer only displays and animates the states returned by the engine.

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

Preview the production build:

```bash
npm run preview
```

## Controls

| Key                 | Action                    |
| ------------------- | ------------------------- |
| `W` / `Arrow Up`    | Move up                   |
| `A` / `Arrow Left`  | Move left                 |
| `S` / `Arrow Down`  | Move down                 |
| `D` / `Arrow Right` | Move right                |
| `R`                 | Restart level             |
| `U`                 | Undo move                 |
| `P`                 | Previous level            |
| `N`                 | Next level                |
| `Esc`               | Show / hide game controls |
| `M`                 | Return to main menu       |
| `1`                 | Front camera              |
| `2`                 | Isometric camera          |
| `3`                 | Orbit camera              |
| `L`                 | Toggle key light          |

## Game Flow

The game opens on a main menu with:

* **Start**
* **Level Select**

During gameplay, the control panel is hidden by default and can be shown or hidden with `Esc`.

The player must collect all fruits in the level before entering the exit.
If the snake touches spikes or falls into the void, the level is lost and can be restarted.

Press `M` or use the control panel button to return to the main menu.

## Levels

Eight levels are included:

1. `level-guide`
2. `level-1`
3. `level-2`
4. `level-3`
5. `level-4`
6. `level-5`
7. `level-6`
8. `level-7`

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
    "########"
  ],
  "snake": [[2, 3], [1, 3]],
  "facing": "right"
}
```

### Level Fields

| Field    | Description                                   |
| -------- | --------------------------------------------- |
| `id`     | Unique level identifier                       |
| `name`   | Level name shown in the game                  |
| `grid`   | Level map represented by characters           |
| `snake`  | Initial snake coordinates, ordered head first |
| `facing` | Initial snake direction                       |

### Cell Types

| Symbol | Meaning     |
| ------ | ----------- |
| `#`    | Wall        |
| `.`    | Empty space |
| `F`    | Fruit       |
| `^`    | Spikes      |
| `E`    | Exit        |

## Technical Structure

The project is divided into separate modules:

```text
src/
├── engine/       Game logic, movement, gravity, collisions, undo, win/death rules
├── snake-view/   Hierarchical snake model and animations
├── renderer/     Scene, camera, lights, materials, shadows, and level rendering
├── app/          Input, HUD, menus, level loading, and integration
└── shared/       Shared constants, cell definitions, and coordinate conversion
```

The engine does not depend on Three.js.
The visual modules consume the engine output and animate the result.

## Libraries Used

* [Three.js](https://threejs.org/)
* [tween.js](https://github.com/tweenjs/tween.js)
* [Vite](https://vite.dev/)

## Authors

In alphabetical order:

* Iova Sebastian-Gabriel `2275776`
* Yuanzhe Cheng `2235498`
* Xin Zeng `2253164`
* Xinzhi Ma `2235381`
