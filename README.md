# Coil

Coil is a neon grid serpent. Guide the ever moving coil through a bordered arena, eat pellets to grow, and chain quick eats to build a score multiplier before its timer fades.

## Install and run

```sh
npm ci
npm run dev
```

Open the local Vite URL in a browser. The game also runs as a static site after:

```sh
npm run build
npm run preview
```

The production files are emitted to `dist/` and can be hosted at the site root or under a path prefix.

## Controls

- **Move:** Arrow keys or **W A S D**. Turns are buffered and take effect on the next tick; the snake can only turn at right angles.
- **Menus:** Up/down to select, **Enter** or **Space** to confirm, **Escape** to go back.
- **Pause:** **P** or **Escape** during a round.
- **Mute:** **M** on any screen.

Pellets grow the snake by one cell. Walls and the snake's body end the round. Eating again within the combo window raises the multiplier, up to x5.
