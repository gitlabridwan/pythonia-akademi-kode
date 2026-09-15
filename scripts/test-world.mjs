import assert from "node:assert/strict";
import { WorldEngine } from "../dist/world.js";

function createContext() {
  const gradient = { addColorStop() {} };
  const target = {
    measureText(text) { return { width: String(text).length * 8 }; },
    createRadialGradient() { return gradient; }
  };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return () => {};
    },
    set(object, property, value) {
      object[property] = value;
      return true;
    }
  });
}

const canvas = {
  width: 0,
  height: 0,
  getContext() { return createContext(); },
  getBoundingClientRect() { return { width: 1366, height: 768 }; }
};

globalThis.window = {
  devicePixelRatio: 1,
  innerWidth: 1366,
  innerHeight: 768,
  addEventListener() {}
};
globalThis.document = {
  querySelectorAll() { return []; },
  querySelector() { return null; },
  createElement() {
    return { width: 0, height: 0, getContext() { return createContext(); } };
  }
};
globalThis.ResizeObserver = class {
  observe() {}
};

const events = [];
const world = new WorldEngine(canvas, {
  getMissionStatus(id) { return id === "x-01" ? "current" : "locked"; },
  onNear(item) { events.push(["near", item?.id || null]); },
  onScene(item) { events.push(["scene", item.scene]); },
  onMove(position) { events.push(["move", position.scene]); },
  onMission(id) { events.push(["mission", id]); }
});
world.running = true;

assert.deepEqual(world.world, { width: 2680, height: 1960 });
assert.equal(world.sceneObjects().filter((item) => item.type === "door").length, 9);
assert.equal(world.sceneObjects().filter((item) => item.type === "npc").length, 4);
assert.equal(world.isBlocked(1340, 1255), false);
assert.equal(world.isBlocked(200, 200), true);
world.draw(0);

const startX = world.player.x;
world.keys.add("right");
world.update(.1, 1000);
world.keys.clear();
assert.equal(world.player.x > startX, true);

const algorithmDoor = world.sceneObjects().find((item) => item.id === "door-algorithms");
world.player.x = algorithmDoor.x;
world.player.y = algorithmDoor.y;
world.findNearest();
world.interact();
assert.equal(world.scene, "algorithms");
assert.deepEqual(world.world, { width: 1280, height: 820 });
assert.equal(world.sceneObjects().filter((item) => item.type === "site").length, 2);
assert.equal(world.sceneObjects().some((item) => item.type === "exit"), true);
world.draw(1);

world.player.x = 410;
world.player.y = 430;
world.findNearest();
world.interact();
assert.equal(events.some(([type, id]) => type === "mission" && id === "x-01"), true);

world.leaveBuilding();
assert.equal(world.scene, "city");
assert.equal(events.some(([type, scene]) => type === "move" && scene === "algorithms"), true);
assert.equal(events.some(([type, scene]) => type === "move" && scene === "city"), true);

console.log("Uji dunia berhasil: kota, 9 pintu, interior, collision, dan perpindahan scene siap.");
