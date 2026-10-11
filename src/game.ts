import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  BINDINGS,
  BITE_SECONDS,
  BOARD_X,
  BOARD_Y,
  CELL,
  COMBO_MAX,
  COMBO_WINDOW,
  COIL_DEBUG_VERSION,
  CUES,
  CUE_PATHS,
  DIRECTIONS,
  GAMEOVER_TEXT,
  GRID_COLS,
  GRID_ROWS,
  INTERIOR_MAX_COL,
  INTERIOR_MAX_ROW,
  INTERIOR_MIN_COL,
  INTERIOR_MIN_ROW,
  MODE,
  MODE_LABEL,
  OBSTACLE_CELLS,
  OVER_ITEMS,
  PAUSE_ITEMS,
  PELLET_POINTS,
  SCREENS,
  SCORE_LABEL,
  SPRITE_PATHS,
  START_CELLS,
  START_DIR,
  STAGE_CX,
  STAGE_W,
  STAGE_H,
  TAGLINE_TEXT,
  TITLE_ITEMS,
  TITLE_TEXT,
  TICK_SECONDS,
  TURN_QUEUE_MAX,
  BEST_LABEL,
  CLEARED_TEXT,
} from "./constants";
import type { Cell, Direction, Screen } from "./constants";

export const BACKGROUND = "#070914";
type Rect = { x: number; y: number; w: number; h: number };
type Sprites = {
  head: ImageBitmap[];
  body: ImageBitmap;
  corner: ImageBitmap;
  tail: ImageBitmap;
};
export interface CoilState {
  screen: Screen;
  menuIndex: number;
  titleIndex: number;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: Direction;
  turns: Direction[];
  snake: Cell[];
  pellet: Cell | null;
  obstacles: Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: Cell | null;
  accumulator: number;
  bite: number;
  pointerDownIndex: number | null;
  sprites: Sprites;
}
export interface CoilSnapshot {
  version: number;
  screen: Screen;
  menuIndex: number;
  titleIndex: number;
  mode: typeof MODE;
  score: number;
  best: number;
  combo: number;
  comboWindow: number;
  muted: boolean;
  ticks: number;
  simTime: number;
  dir: Direction;
  turns: Direction[];
  snake: Cell[];
  pellet: Cell | null;
  obstacles: Cell[];
  steering: boolean;
  travel: boolean;
  pelletRespawn: boolean;
  nextPellet: Cell | null;
}
export interface CoilDebugApi {
  version: number;
  reset(s: DeepReadonly<CoilState>): CoilState;
  reconcile(s: DeepReadonly<CoilState>): CoilState;
  snapshot(s: DeepReadonly<CoilState>): CoilSnapshot;
  menuItemRect(s: DeepReadonly<CoilState>, index: number): Rect | null;
  setScreen(s: DeepReadonly<CoilState>, screen: Screen): CoilState;
  setMenuIndex(s: DeepReadonly<CoilState>, index: number): CoilState;
  setScore(s: DeepReadonly<CoilState>, points: number): CoilState;
  setBest(s: DeepReadonly<CoilState>, points: number): CoilState;
  setCombo(s: DeepReadonly<CoilState>, multiplier: number): CoilState;
  setComboWindow(s: DeepReadonly<CoilState>, seconds: number): CoilState;
  setSnake(s: DeepReadonly<CoilState>, cells: readonly Cell[]): CoilState;
  setDirection(s: DeepReadonly<CoilState>, dir: Direction): CoilState;
  clearTurns(s: DeepReadonly<CoilState>): CoilState;
  setSnakeSteering(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setSnakeTravel(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setPellet(s: DeepReadonly<CoilState>, col: number, row: number): CoilState;
  clearPellet(s: DeepReadonly<CoilState>): CoilState;
  setPelletRespawn(s: DeepReadonly<CoilState>, enabled: boolean): CoilState;
  setNextPellet(
    s: DeepReadonly<CoilState>,
    col: number,
    row: number,
  ): CoilState;
  drawPelletCell(s: DeepReadonly<CoilState>): Cell | null;
}
const clone = (s: DeepReadonly<CoilState>): CoilState => ({
  ...s,
  turns: [...s.turns],
  snake: s.snake.map((c) => ({ ...c })),
  pellet: s.pellet && { ...s.pellet },
  obstacles: s.obstacles.map((c) => ({ ...c })),
  nextPellet: s.nextPellet && { ...s.nextPellet },
  sprites: { ...s.sprites, head: [...s.sprites.head] },
});
const isInterior = (c: Cell) =>
  c.col >= INTERIOR_MIN_COL &&
  c.col <= INTERIOR_MAX_COL &&
  c.row >= INTERIOR_MIN_ROW &&
  c.row <= INTERIOR_MAX_ROW;
const equal = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
const validCells = (s: Pick<CoilState, "snake" | "obstacles" | "pellet">) => {
  const used = [...s.snake, ...s.obstacles];
  return Array.from(
    {
      length:
        (INTERIOR_MAX_COL - INTERIOR_MIN_COL + 1) *
        (INTERIOR_MAX_ROW - INTERIOR_MIN_ROW + 1),
    },
    (_, i) => ({
      col: INTERIOR_MIN_COL + (i % (INTERIOR_MAX_COL - INTERIOR_MIN_COL + 1)),
      row:
        INTERIOR_MIN_ROW +
        Math.floor(i / (INTERIOR_MAX_COL - INTERIOR_MIN_COL + 1)),
    }),
  ).filter(
    (c) => !used.some((x) => equal(x, c)) && (!s.pellet || !equal(s.pellet, c)),
  );
};
const draw = (s: CoilState): Cell | null => {
  const cells = validCells(s);
  return cells.length ? cells[Math.floor(Math.random() * cells.length)]! : null;
};
const spawn = (s: CoilState): Cell | null => {
  const cells = validCells(s);
  const posed = s.nextPellet;
  s.nextPellet = null;
  if (!cells.length) return null;
  return posed && cells.some((c) => equal(c, posed))
    ? { ...posed }
    : cells[Math.floor(Math.random() * cells.length)]!;
};
const menuItems = (screen: Screen) =>
  screen === "title"
    ? TITLE_ITEMS
    : screen === "paused"
      ? PAUSE_ITEMS
      : screen === "gameover" || screen === "cleared"
        ? OVER_ITEMS
        : screen === "howto"
          ? ["BACK"]
          : [];
const menuRect = (screen: Screen, index: number): Rect | null => {
  if (index < 0 || index >= menuItems(screen).length) return null;
  const w = 360,
    h = 54,
    gap = 12;
  const x = STAGE_CX - w / 2;
  const start =
    screen === "title"
      ? 435
      : screen === "howto"
        ? 625
        : screen === "paused"
          ? 390
          : 470;
  return { x, y: start + index * (h + gap), w, h };
};
const assert = (ok: boolean, name: string): void => {
  if (!ok) throw new RangeError(`Coil debug: invalid ${name}`);
};
const freshRound = (s: CoilState): CoilState => {
  const n: CoilState = {
    ...s,
    screen: "playing" as Screen,
    menuIndex: 0,
    score: 0,
    combo: 1,
    comboWindow: 0,
    ticks: 0,
    simTime: 0,
    dir: START_DIR as Direction,
    turns: [],
    snake: START_CELLS.map((c) => ({ ...c })),
    pellet: null,
    obstacles: OBSTACLE_CELLS.map((c) => ({ ...c })),
    accumulator: 0,
    bite: 0,
  };
  n.pellet = spawn(n);
  if (!n.pellet) n.screen = "cleared";
  return n;
};

export const game: Game<CoilState, CoilDebugApi> = {
  async initialize(
    api: InitApi<CoilState>,
  ): Promise<[CoilState, CoilDebugApi]> {
    for (const action of ACTIONS)
      api.input.register(action, { keys: [...BINDINGS[action]] });
    const [head, body, corner, tail] = await Promise.all([
      Promise.all(SPRITE_PATHS.head.map((p) => api.assets.loadImage(p))),
      api.assets.loadImage(SPRITE_PATHS.body),
      api.assets.loadImage(SPRITE_PATHS.corner),
      api.assets.loadImage(SPRITE_PATHS.tail),
    ]);
    await Promise.all(
      Object.entries(CUE_PATHS).map(([cue, path]) => api.audio.load(cue, path)),
    );
    const state: CoilState = {
      screen: "title",
      menuIndex: 0,
      titleIndex: 0,
      score: 0,
      best: 0,
      combo: 1,
      comboWindow: 0,
      muted: false,
      ticks: 0,
      simTime: 0,
      dir: START_DIR as Direction,
      turns: [],
      snake: START_CELLS.map((c) => ({ ...c })),
      pellet: null,
      obstacles: OBSTACLE_CELLS.map((c) => ({ ...c })),
      steering: true,
      travel: true,
      pelletRespawn: true,
      nextPellet: null,
      accumulator: 0,
      bite: 0,
      pointerDownIndex: null,
      sprites: { head, body, corner, tail },
    };
    const debug: CoilDebugApi = {
      version: COIL_DEBUG_VERSION,
      reset(s) {
        const n = clone(s);
        return {
          ...n,
          screen: "title",
          menuIndex: 0,
          titleIndex: 0,
          score: 0,
          best: 0,
          combo: 1,
          comboWindow: 0,
          ticks: 0,
          simTime: 0,
          dir: START_DIR as Direction,
          turns: [],
          snake: START_CELLS.map((cell) => ({ ...cell })),
          pellet: null,
          obstacles: OBSTACLE_CELLS.map((cell) => ({ ...cell })),
          steering: true,
          travel: true,
          pelletRespawn: true,
          nextPellet: null,
          accumulator: 0,
          bite: 0,
          pointerDownIndex: null,
        };
      },
      reconcile(s) {
        return clone(s);
      },
      snapshot(s) {
        return {
          version: COIL_DEBUG_VERSION,
          screen: s.screen,
          menuIndex: s.menuIndex,
          titleIndex: s.titleIndex,
          mode: MODE,
          score: s.score,
          best: s.best,
          combo: s.combo,
          comboWindow: s.comboWindow,
          muted: s.muted,
          ticks: s.ticks,
          simTime: s.simTime,
          dir: s.dir,
          turns: [...s.turns],
          snake: s.snake.map((c) => ({ ...c })),
          pellet: s.pellet && { ...s.pellet },
          obstacles: s.obstacles.map((c) => ({ ...c })),
          steering: s.steering,
          travel: s.travel,
          pelletRespawn: s.pelletRespawn,
          nextPellet: s.nextPellet && { ...s.nextPellet },
        };
      },
      menuItemRect(_s, i) {
        assert(Number.isInteger(i) && i >= 0, "menu index");
        return menuRect(_s.screen, i);
      },
      setScreen(s, screen) {
        assert((SCREENS as readonly string[]).includes(screen), "screen");
        return { ...clone(s), screen };
      },
      setMenuIndex(s, i) {
        assert(
          Number.isInteger(i) &&
            i >= 0 &&
            i < Math.max(1, menuItems(s.screen).length),
          "menu index",
        );
        return { ...clone(s), menuIndex: i };
      },
      setScore(s, p) {
        assert(Number.isInteger(p) && p >= 0, "score");
        return { ...clone(s), score: p };
      },
      setBest(s, p) {
        assert(Number.isInteger(p) && p >= 0, "best");
        return { ...clone(s), best: p };
      },
      setCombo(s, m) {
        assert(Number.isInteger(m) && m >= 1 && m <= COMBO_MAX, "combo");
        return { ...clone(s), combo: m };
      },
      setComboWindow(s, x) {
        assert(
          Number.isFinite(x) && x >= 0 && x <= COMBO_WINDOW,
          "combo window",
        );
        return { ...clone(s), comboWindow: x };
      },
      setSnake(s, cells) {
        assert(cells.length > 0, "snake");
        const seen = new Set<string>();
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i]!;
          assert(
            Number.isInteger(c.col) &&
              Number.isInteger(c.row) &&
              isInterior(c) &&
              !s.obstacles.some((o) => equal(o, c)),
            "snake cell",
          );
          const key = `${c.col},${c.row}`;
          assert(!seen.has(key), "repeated snake cell");
          seen.add(key);
          if (i) {
            const p = cells[i - 1]!;
            assert(
              Math.abs(c.col - p.col) + Math.abs(c.row - p.row) === 1,
              "snake adjacency",
            );
          }
        }
        return { ...clone(s), snake: cells.map((c) => ({ ...c })) };
      },
      setDirection(s, d) {
        assert((DIRECTIONS as readonly string[]).includes(d), "direction");
        return { ...clone(s), dir: d };
      },
      clearTurns(s) {
        return { ...clone(s), turns: [] };
      },
      setSnakeSteering(s, v) {
        assert(typeof v === "boolean", "steering");
        return { ...clone(s), steering: v };
      },
      setSnakeTravel(s, v) {
        assert(typeof v === "boolean", "travel");
        return { ...clone(s), travel: v };
      },
      setPellet(s, col, row) {
        const c = { col, row };
        assert(
          Number.isInteger(col) &&
            Number.isInteger(row) &&
            isInterior(c) &&
            !s.snake.some((x) => equal(x, c)) &&
            !s.obstacles.some((x) => equal(x, c)),
          "pellet",
        );
        return { ...clone(s), pellet: c };
      },
      clearPellet(s) {
        return { ...clone(s), pellet: null };
      },
      setPelletRespawn(s, v) {
        assert(typeof v === "boolean", "pellet respawn");
        return { ...clone(s), pelletRespawn: v };
      },
      setNextPellet(s, col, row) {
        assert(
          Number.isInteger(col) &&
            col >= 0 &&
            col < GRID_COLS &&
            Number.isInteger(row) &&
            row >= 0 &&
            row < GRID_ROWS,
          "next pellet",
        );
        return { ...clone(s), nextPellet: { col, row } };
      },
      drawPelletCell(s) {
        return draw(clone(s));
      },
    };
    for (const [name, source] of Object.entries({
      screen: (s: DeepReadonly<CoilState>) => s.screen,
      score: (s: DeepReadonly<CoilState>) => s.score,
      best: (s: DeepReadonly<CoilState>) => s.best,
      combo: (s: DeepReadonly<CoilState>) => s.combo,
      window: (s: DeepReadonly<CoilState>) => s.comboWindow.toFixed(2),
      direction: (s: DeepReadonly<CoilState>) => s.dir,
      length: (s: DeepReadonly<CoilState>) => s.snake.length,
      head: (s: DeepReadonly<CoilState>) =>
        `${s.snake[0]?.col},${s.snake[0]?.row}`,
      pellet: (s: DeepReadonly<CoilState>) =>
        s.pellet ? `${s.pellet.col},${s.pellet.row}` : "none",
    }))
      api.diagnostics.register(name, source);
    return [state, debug];
  },
  update(
    state: DeepReadonly<CoilState>,
    api: UpdateApi,
    dt: number,
  ): CoilState {
    let s = clone(state);
    const wasMuted = api.audio.muted();
    if (api.input.pressed("mute")) api.audio.setMuted(!wasMuted);
    s.muted = api.audio.muted();
    const start = (n: CoilState) => {
      n = freshRound(n);
      api.audio.loop(CUES.music);
      return n;
    };
    const back = api.input.pressed("back"),
      pause = api.input.pressed("pause"),
      confirm = api.input.pressed("confirm");
    const dirs: Direction[] = ["up", "down", "left", "right"];
    if (s.screen === "playing") {
      if (back || pause) {
        s.screen = "paused";
        s.menuIndex = 0;
      } else {
        if (s.bite > 0) s.bite = Math.min(BITE_SECONDS, s.bite + dt);
        if (s.steering)
          for (const d of dirs)
            if (api.input.pressed(d) && s.turns.length < TURN_QUEUE_MAX)
              s.turns.push(d);
        s.accumulator += dt;
        s.simTime += dt;
      }
    } else {
      const items = menuItems(s.screen);
      if (items.length) {
        if (api.input.pressed("up"))
          s.menuIndex = (s.menuIndex + items.length - 1) % items.length;
        if (api.input.pressed("down"))
          s.menuIndex = (s.menuIndex + 1) % items.length;
      }
      const ptr = api.input.pointer();
      const sample = api.input.pointerSamples().filter((x) => x.primary);
      const select = (x: number, y: number) => {
        for (let i = 0; i < items.length; i++) {
          const r = menuRect(s.screen, i);
          if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
            s.menuIndex = i;
        }
      };
      select(ptr.x, ptr.y);
      for (const x of sample) select(x.x, x.y);
      let pointerConfirm = false;
      const itemAt = (x: number, y: number): number | null => {
        for (let i = 0; i < items.length; i++) {
          const r = menuRect(s.screen, i);
          if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
            return i;
        }
        return null;
      };
      for (const point of sample) {
        const index = itemAt(point.x, point.y);
        if (point.type === "down") {
          s.pointerDownIndex = index;
          if (index !== null) s.menuIndex = index;
        } else if (point.type === "up") {
          if (index !== null) s.menuIndex = index;
          if (index !== null && index === s.pointerDownIndex)
            pointerConfirm = true;
          s.pointerDownIndex = null;
        }
      }
      if (s.screen === "paused" && (back || pause)) {
        s.screen = "playing";
        s.menuIndex = 0;
      } else if (back && s.screen === "howto") {
        s.screen = "title";
        s.menuIndex = s.titleIndex;
      } else if (back && (s.screen === "gameover" || s.screen === "cleared")) {
        s.screen = "title";
        s.menuIndex = s.titleIndex;
      } else if (confirm || pointerConfirm) {
        if (s.screen === "title") {
          s.titleIndex = s.menuIndex;
          if (s.menuIndex === 0) s = start(s);
          else {
            s.screen = "howto";
            s.menuIndex = 0;
          }
        } else if (s.screen === "howto") {
          s.screen = "title";
          s.menuIndex = s.titleIndex;
        } else if (s.screen === "paused") {
          if (s.menuIndex === 0) {
            s.screen = "playing";
            s.menuIndex = 0;
          } else if (s.menuIndex === 1) s = start(s);
          else {
            s.screen = "title";
            s.menuIndex = s.titleIndex;
            api.audio.stop(CUES.music);
          }
        } else if (s.screen === "gameover" || s.screen === "cleared") {
          if (s.menuIndex === 0) s = start(s);
          else {
            s.screen = "title";
            s.menuIndex = s.titleIndex;
          }
        }
      }
    }
    while (s.screen === "playing" && s.accumulator + 1e-10 >= TICK_SECONDS) {
      s.accumulator -= TICK_SECONDS;
      s.ticks++;
      let direction = s.dir;
      if (s.steering && s.turns.length) {
        const candidate = s.turns.shift()!;
        const horizontal = direction === "left" || direction === "right";
        if (
          horizontal
            ? candidate === "up" || candidate === "down"
            : candidate === "left" || candidate === "right"
        )
          direction = candidate;
      }
      s.dir = direction;
      if (s.travel) {
        const v =
          direction === "up"
            ? { col: 0, row: -1 }
            : direction === "down"
              ? { col: 0, row: 1 }
              : direction === "left"
                ? { col: -1, row: 0 }
                : { col: 1, row: 0 };
        const head = s.snake[0]!;
        const next = { col: head.col + v.col, row: head.row + v.row };
        const eating = !!s.pellet && equal(next, s.pellet);
        const body = s.snake.slice(
          0,
          eating ? s.snake.length : s.snake.length - 1,
        );
        const fatal =
          !isInterior(next) ||
          s.obstacles.some((c) => equal(c, next)) ||
          body.some((c) => equal(c, next));
        if (fatal) {
          s.screen = "gameover";
          s.menuIndex = 0;
          api.audio.play(CUES.death);
          api.audio.stop(CUES.music);
          s.accumulator = 0;
          break;
        }
        s.snake = [next, ...(eating ? s.snake : s.snake.slice(0, -1))];
        if (eating) {
          const previousCombo = s.combo;
          const was = s.comboWindow > 0;
          s.combo = was ? Math.min(COMBO_MAX, s.combo + 1) : 1;
          s.score += PELLET_POINTS * s.combo;
          s.best = Math.max(s.best, s.score);
          s.comboWindow = COMBO_WINDOW;
          s.bite = 0.0001;
          if (s.combo > previousCombo) api.audio.play(CUES.comboUp);
          api.audio.play(CUES.eat);
          s.pellet = null;
          if (s.pelletRespawn) {
            s.pellet = spawn(s);
            if (!s.pellet) {
              s.screen = "cleared";
              s.menuIndex = 0;
              api.audio.stop(CUES.music);
            }
          }
        }
      }
      s.comboWindow = Math.max(0, s.comboWindow - TICK_SECONDS);
      if (s.comboWindow === 0) s.combo = 1;
    }
    if (s.screen !== "playing") s.accumulator = 0;
    s.best = Math.max(s.best, s.score);
    return s;
  },
  render(state: DeepReadonly<CoilState>, api: RenderApi): void {
    const c = api.ctx;
    c.imageSmoothingEnabled = false;
    const glow = (x: number, y: number, r: number, color: string) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    };
    c.fillStyle = "#090d1a";
    c.fillRect(0, 0, STAGE_W, STAGE_H);
    for (let i = 0; i < 28; i++) {
      c.fillStyle = `rgba(65,85,130,${0.025 + (i % 3) * 0.008})`;
      c.fillRect(i * 47, 0, 1, STAGE_H);
    }
    const bx = BOARD_X,
      by = BOARD_Y;
    c.fillStyle = "#0b1221";
    c.fillRect(bx, by, GRID_COLS * CELL, GRID_ROWS * CELL);
    c.fillStyle = "#26344e";
    for (let x = 0; x < GRID_COLS; x++) {
      c.fillRect(bx + x * CELL, by, CELL, CELL);
      c.fillRect(bx + x * CELL, by + (GRID_ROWS - 1) * CELL, CELL, CELL);
    }
    for (let y = 1; y < GRID_ROWS - 1; y++) {
      c.fillRect(bx, by + y * CELL, CELL, CELL);
      c.fillRect(bx + (GRID_COLS - 1) * CELL, by + y * CELL, CELL, CELL);
    }
    c.strokeStyle = "rgba(100,145,190,.12)";
    c.lineWidth = 1;
    for (let x = 1; x < GRID_COLS - 1; x++) {
      c.beginPath();
      c.moveTo(bx + x * CELL + 0.5, by + CELL);
      c.lineTo(bx + x * CELL + 0.5, by + (GRID_ROWS - 1) * CELL);
      c.stroke();
    }
    for (let y = 1; y < GRID_ROWS - 1; y++) {
      c.beginPath();
      c.moveTo(bx + CELL, by + y * CELL + 0.5);
      c.lineTo(bx + (GRID_COLS - 1) * CELL, by + y * CELL + 0.5);
      c.stroke();
    }
    c.strokeStyle = "#4b6688";
    c.lineWidth = 2;
    c.strokeRect(
      bx + 0.5,
      by + 0.5,
      GRID_COLS * CELL - 1,
      GRID_ROWS * CELL - 1,
    );
    for (const o of state.obstacles) {
      c.fillStyle = "#38455a";
      c.fillRect(
        bx + o.col * CELL + 3,
        by + o.row * CELL + 3,
        CELL - 6,
        CELL - 6,
      );
    }
    if (state.pellet) {
      const x = bx + state.pellet.col * CELL + CELL / 2,
        y = by + state.pellet.row * CELL + CELL / 2;
      glow(x, y, 23, "rgba(255,55,153,.34)");
      c.fillStyle = "#ff3f9e";
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffe0f2";
      c.beginPath();
      c.arc(x - 2, y - 3, 3, 0, Math.PI * 2);
      c.fill();
    }
    const cells = state.snake;
    for (let i = cells.length - 1; i >= 0; i--) {
      const p = cells[i]!;
      const x = bx + p.col * CELL,
        y = by + p.row * CELL;
      let image: ImageBitmap, rotation: number;
      if (i === 0) {
        const phase =
          state.bite > 0
            ? Math.min(3, 1 + Math.floor((state.bite / BITE_SECONDS) * 3))
            : 0;
        image = state.sprites.head[phase] ?? state.sprites.head[0]!;
        rotation =
          state.dir === "right"
            ? 0
            : state.dir === "down"
              ? Math.PI / 2
              : state.dir === "left"
                ? Math.PI
                : Math.PI * 1.5;
      } else if (i === cells.length - 1) {
        image = state.sprites.tail;
        const n = cells[i - 1]!;
        rotation =
          n.col > p.col
            ? 0
            : n.row > p.row
              ? Math.PI / 2
              : n.col < p.col
                ? Math.PI
                : Math.PI * 1.5;
      } else {
        const prev = cells[i - 1]!,
          next = cells[i + 1]!;
        const dx1 = prev.col - p.col,
          dy1 = prev.row - p.row,
          dx2 = next.col - p.col,
          dy2 = next.row - p.row;
        if (dx1 === -dx2 || dy1 === -dy2) {
          image = state.sprites.body;
          rotation = dy1 !== 0 ? Math.PI / 2 : 0;
        } else {
          image = state.sprites.corner;
          const dirs = new Set([`${dx1},${dy1}`, `${dx2},${dy2}`]);
          rotation =
            dirs.has("1,0") && dirs.has("0,1")
              ? 0
              : dirs.has("-1,0") && dirs.has("0,1")
                ? Math.PI / 2
                : dirs.has("-1,0") && dirs.has("0,-1")
                  ? Math.PI
                  : Math.PI * 1.5;
        }
      }
      c.save();
      c.translate(x + CELL / 2, y + CELL / 2);
      c.rotate(rotation);
      c.drawImage(image, -CELL / 2, -CELL / 2, CELL, CELL);
      c.restore();
      if (i === 0) glow(x + CELL / 2, y + CELL / 2, 29, "rgba(83,255,223,.18)");
    }
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = "#eaf6ff";
    c.font = "700 17px monospace";
    c.fillText(SCORE_LABEL, 180, 28);
    c.fillText(BEST_LABEL, 355, 28);
    c.fillText(MODE_LABEL, 1020, 28);
    c.font = "700 28px monospace";
    c.fillStyle = "#63ffe0";
    c.fillText(String(state.score).padStart(4, "0"), 180, 63);
    c.fillStyle = "#8fb6d8";
    c.fillText(String(state.best).padStart(4, "0"), 355, 63);
    c.font = "700 18px monospace";
    c.fillStyle = state.muted ? "#ff759d" : "#87a4bd";
    c.fillText(state.muted ? "◖ MUTED" : "◖ SOUND", 1020, 67);
    if (state.combo >= 2) {
      c.font = "700 21px monospace";
      c.fillStyle = "#ffe66d";
      c.fillText(`x${state.combo}`, 610, 52);
      c.fillStyle = "#25344a";
      c.fillRect(660, 43, 210, 10);
      c.fillStyle = "#ffcf5a";
      c.fillRect(
        660,
        43,
        210 * Math.max(0, state.comboWindow / COMBO_WINDOW),
        10,
      );
    }
    if (state.screen === "title") {
      panel(c);
      c.textAlign = "center";
      c.fillStyle = "#f1fbff";
      c.font = "900 88px monospace";
      c.fillText(TITLE_TEXT, 640, 222);
      c.fillStyle = "#73f9e0";
      c.font = "700 20px monospace";
      c.fillText(TAGLINE_TEXT, 640, 262);
      c.fillStyle = "#8db5ce";
      c.font = "700 16px monospace";
      c.fillText(`${BEST_LABEL}  ${state.best}`, 640, 315);
      drawMenu(c, state);
    } else if (state.screen === "howto") {
      panel(c);
      c.textAlign = "center";
      c.fillStyle = "#80ffe2";
      c.font = "700 31px monospace";
      c.fillText("HOW TO PLAY", 640, 114);
      c.textAlign = "left";
      c.fillStyle = "#dcecff";
      c.font = "16px monospace";
      const lines = [
        "The serpent never stops. Turn requests take effect on the next tick.",
        "Turn at right angles only; doubling back is impossible.",
        "A pellet adds one cell to your coil. Walls and your own body end the run.",
        "Eat again before the combo fades to raise your multiplier, up to x5.",
        "When its timer empties, your multiplier returns to x1.",
        "MOVE   Arrow keys / WASD     MENU   Enter / Space",
        "PAUSE  P / Escape            MUTE   M",
      ];
      lines.forEach((line, i) => c.fillText(line, 300, 190 + i * 44));
      drawMenu(c, state);
    } else if (
      state.screen === "paused" ||
      state.screen === "gameover" ||
      state.screen === "cleared"
    ) {
      panel(c);
      c.textAlign = "center";
      c.fillStyle = state.screen === "paused" ? "#8fffe1" : "#ff7fb3";
      c.font = "800 43px monospace";
      c.fillText(
        state.screen === "paused"
          ? "PAUSED"
          : state.screen === "cleared"
            ? CLEARED_TEXT
            : GAMEOVER_TEXT,
        640,
        250,
      );
      c.fillStyle = "#dcecff";
      c.font = "700 21px monospace";
      c.fillText(
        `${SCORE_LABEL}  ${state.score}     ${BEST_LABEL}  ${state.best}`,
        640,
        310,
      );
      drawMenu(c, state);
    }
  },
};
function panel(c: CanvasRenderingContext2D) {
  c.fillStyle = "rgba(4,8,20,.86)";
  c.fillRect(0, 0, STAGE_W, STAGE_H);
  c.strokeStyle = "rgba(78,250,221,.38)";
  c.lineWidth = 1;
  c.strokeRect(230, 72, 820, 576);
}
function drawMenu(c: CanvasRenderingContext2D, s: DeepReadonly<CoilState>) {
  const items = menuItems(s.screen);
  c.textAlign = "center";
  c.textBaseline = "middle";
  items.forEach((item, i) => {
    const r = menuRect(s.screen, i);
    if (!r) return;
    if (i === s.menuIndex) {
      c.fillStyle = "rgba(43,255,219,.15)";
      c.fillRect(r.x, r.y, r.w, r.h);
      c.strokeStyle = "#55f9d8";
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.fillStyle = "#a0ffe8";
    } else c.fillStyle = "#bed1e4";
    c.font = "700 19px monospace";
    c.fillText(item, 640, r.y + r.h / 2);
  });
}
