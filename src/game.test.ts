import { describe, expect, it } from "vitest";
import { game } from "./game";
import type { CoilState } from "./game";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";

const setup = async () => {
  const image = { width: 32, height: 32 } as ImageBitmap;
  const init = {
    input: { register() {} },
    assets: { loadImage: async () => image },
    audio: { load: async () => ({}) },
    diagnostics: { register() {} },
  } as unknown as InitApi<CoilState>;
  const [state, debug] = await game.initialize(init);
  return { state, debug };
};
const frame = (pressed: string[] = []) => {
  const edges = new Set(pressed);
  const played: string[] = [];
  const api = {
    input: {
      pressed: (name: string) => {
        const yes = edges.has(name);
        edges.delete(name);
        return yes;
      },
      pointer: () => ({
        x: -1,
        y: -1,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerSamples: () => [],
      pointerPressed: () => false,
      pointerReleased: () => false,
    },
    audio: {
      muted: () => false,
      setMuted() {},
      play: (cue: string) => played.push(cue),
      loop() {},
      stop() {},
      looping: () => false,
    },
  } as unknown as UpdateApi;
  return { api, played };
};
const step = (s: CoilState, api: UpdateApi, dt = 0.125) =>
  game.update(s, api, dt);

describe("Coil simulation", () => {
  it("opens on title and starts the specified chain on confirm", async () => {
    const { state } = await setup();
    expect(state.screen).toBe("title");
    const { api } = frame(["confirm"]);
    const next = step(state, api, 0);
    expect(next.screen).toBe("playing");
    expect(next.snake).toEqual([
      { col: 15, row: 8 },
      { col: 14, row: 8 },
      { col: 13, row: 8 },
    ]);
    expect(next.pellet).not.toBeNull();
  });

  it("confirms a pointer press and release delivered on separate frames", async () => {
    const { state } = await setup();
    const point = {
      x: 640,
      y: 460,
      id: 1,
      primary: true,
      device: "mouse" as const,
      button: "primary" as const,
      buttons: ["primary" as const],
    };
    const down = frame();
    const downApi = {
      ...down.api,
      input: {
        ...down.api.input,
        pointerSamples: () => [{ ...point, type: "down" as const }],
      },
    } as UpdateApi;
    let s = step(state, downApi, 0);
    const up = frame();
    const upApi = {
      ...up.api,
      input: {
        ...up.api.input,
        pointerSamples: () => [{ ...point, type: "up" as const, buttons: [] }],
      },
    } as UpdateApi;
    s = step(s, upApi, 0);
    expect(s.screen).toBe("playing");
  });

  it("moves exactly one cell per fixed tick and carries fractional time", async () => {
    const { state, debug } = await setup();
    let s = debug.setScreen(state, "playing");
    s = debug.setPellet(s, 25, 12);
    s = step(s, frame().api, 0.06);
    expect(s.snake[0]).toEqual({ col: 15, row: 8 });
    s = step(s, frame().api, 0.065);
    expect(s.snake[0]).toEqual({ col: 16, row: 8 });
    expect(s.ticks).toBe(1);
  });

  it("buffers perpendicular steering, grows and scores with an open combo", async () => {
    const { state, debug } = await setup();
    let s = debug.setScreen(state, "playing");
    s = debug.setSnake(s, [
      { col: 15, row: 8 },
      { col: 14, row: 8 },
      { col: 13, row: 8 },
    ]);
    s = debug.setPellet(s, 15, 7);
    s = debug.setDirection(s, "up");
    s = debug.setComboWindow(s, 1);
    s = debug.setCombo(s, 2);
    const { api, played } = frame();
    s = step(s, api);
    expect(s.snake).toHaveLength(4);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(3);
    expect(s.best).toBe(30);
    expect(played).toContain("eat");
    expect(played).toContain("combo-up");
  });

  it("allows entering a vacating tail but ends on a wall", async () => {
    const { state, debug } = await setup();
    let s = debug.setScreen(state, "playing");
    s = debug.setSnake(s, [
      { col: 2, row: 2 },
      { col: 2, row: 3 },
      { col: 1, row: 3 },
      { col: 1, row: 2 },
    ]);
    s = debug.setDirection(s, "left");
    s = debug.setPellet(s, 10, 10);
    s = step(s, frame().api);
    expect(s.screen).toBe("playing");
    s = debug.setSnake(s, [{ col: 1, row: 8 }]);
    s = debug.setDirection(s, "left");
    const { api, played } = frame();
    s = step(s, api);
    expect(s.screen).toBe("gameover");
    expect(played).toContain("death");
  });

  it("reports snapshots and enforces debug pose domains", async () => {
    const { state, debug } = await setup();
    expect(debug.snapshot(state)).toMatchObject({
      version: 1,
      mode: "classic",
      screen: "title",
      combo: 1,
      ticks: 0,
    });
    expect(debug.menuItemRect(state, 0)).not.toBeNull();
    expect(debug.menuItemRect(debug.setScreen(state, "playing"), 0)).toBeNull();
    expect(() => debug.setCombo(state, 6)).toThrow(RangeError);
    expect(() => debug.setPellet(state, 0, 0)).toThrow(RangeError);
  });
});
