// ============================================================================
// environment.ts  —  the shop interior for Boss for a Day
// Built from simple shapes in the Market Harvest style: a few mesh helpers, a
// gradient sky, soft daylight, and a stage-look retint so the light shifts from
// morning toward golden as the day advances. The player stands inside a shop:
// a wood floor, three walls, and a glass storefront looking out onto the street.
// No 3D model files are needed; real models can be swapped in later.
// ============================================================================

import {
  Mesh,
  Group,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  PlaneGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  Color,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  DirectionalLight,
  HemisphereLight,
  Fog,
  BackSide,
  DoubleSide,
  Vector3,
} from "@iwsdk/core";
import { ShopId, SHOPS } from "./shops";

// ----------------------------------------------------------------------------
// PALETTE  —  the WORLD colors (warm and naturalistic). The cream/navy/gold of
// the panels is reserved for signs and UI, so the buildings feel like a place.
// ----------------------------------------------------------------------------
export const PALETTE = {
  grass: "#7db84e",
  road: "#9a9488",
  sidewalk: "#cfc7b5",
  homeWall: "#f1d49a",
  homeRoof: "#c2593f",
  bankWall: "#d8d2c4",
  bankRoof: "#7a8a93",
  bankTrim: "#b9b1a0",
  storeWall: "#e7b27a",
  storeRoof: "#7b4a2c",
  awningA: "#c0432f",
  awningB: "#f3e9d2",
  wood: "#8b5e3c",
  woodDark: "#5b3a21",
  trunk: "#6e4a2c",
  leaf: "#4e8f3a",
  hedge: "#3f7a34", // the boundary hedge that fences the plaza in
  lamp: "#ffd98a",
  skyTop: "#3f8fd6",
  skyMid: "#8ec4ea",
  horizon: "#dceefb",
  sun: "#fff2d4",
  piggy: "#f59ab6",
  shopFloor: "#b98a52",
  shopWall: "#efe2c6",
  shopTrim: "#8b5e3c",
  // Warm bakery reskin: cream-and-rose palette, warm wood trim, checker floor.
  wallCream: "#f6e8cb",
  wainscot: "#e3a9a2",
  floorLight: "#efe0bf",
  floorDark: "#cf9a63",
  woodWarm: "#a9763f",
  woodDark2: "#7a4f2a",
  caseGlass: "#dff0f4",
  accentRose: "#d98a8f",
  // Bakery treats: crusts, frostings, and fillings for the case and shelf.
  breadCrust: "#c98a3e",
  breadDark: "#a5662a",
  frostPink: "#f3b6c4",
  frostCream: "#f7ecd0",
  cherryRed: "#c2402f",
  chocolate: "#5b3a24",
  glass: "#bcd8ec",
  counterTop: "#6b4a2e",
  register: "#3a4654",
  productA: "#d2452f",
  productB: "#e7b84a",
  productC: "#3a7bd5",
  teal: "#0E7C7B",
  // Ms. Delia, the baker: dress, apron, skin, hair, hat, and a touch of cheek.
  dressBlue: "#6f86a6",
  apronCream: "#f5ecd6",
  skinTone: "#e6b48f",
  hairBrown: "#5b3a24",
  hatWhite: "#f7f3ea",
  cheekPink: "#e8a0a0",
  // Surf shop reskin: sandy checker floor, ocean-blue walls, and Mr. Reyes.
  surfSand1: "#e6d2a6",
  surfSand2: "#cdb27e",
  surfWall: "#86c1da",
  surfWainscot: "#3f8aa6",
  boardRed: "#d2452f",
  boardYellow: "#e7b84a",
  boardTeal: "#27a3a3",
  reyesShirt: "#1f8fb0",
  reyesShorts: "#3a5f8a",
  reyesSkin: "#c8895a",
  reyesHair: "#3a2a20",
  reyesCap: "#16465c",
  // Repair shop reskin: cool gray checker floor, slate-blue walls, and Mr. Okafor.
  repairFloor1: "#cdd3d8",
  repairFloor2: "#a7b0b8",
  repairWall: "#bcc7cf",
  repairWainscot: "#46708c",
  okaforSkirt: "#46505a",
  okaforSmock: "#2f7d8a",
  okaforApron: "#e3e9ec",
  okaforSkin: "#7a4f33",
  okaforHair: "#1f1a18",
};

// Held so a per-shop reskin can repaint them after the shell is built: the floor
// checker texture and the solid wall / wainscot colors. Captured as the shell
// builds; left untouched for the bakery, recolored for surf.
let _floorMat: MeshLambertMaterial | null = null;
let _wallMats: MeshLambertMaterial[] = [];
let _wainscotMats: MeshLambertMaterial[] = [];

const SIGN_CREAM = "#f3e9d2"; // sign background (matches the panel cream)
const SIGN_NAVY = "#1F3A5F";  // sign text (matches the panel navy)

// ----------------------------------------------------------------------------
// STAGE LOOKS  —  the street's time of day shifts as the student ages. The new
// PROPS for each stage (the food truck in Stage 2, your storefront in Stage 3)
// are added with those stages; here we change the light and sky.
// ----------------------------------------------------------------------------
const stageState = {
  skyMat: null as MeshBasicMaterial | null,
  sun: null as DirectionalLight | null,
  hemi: null as HemisphereLight | null,
  fog: null as Fog | null,
  groundMats: [] as MeshLambertMaterial[],
  foliageMats: [] as { mat: { color: Color }; orig: Color }[],
};

function registerFoliage(mesh: Mesh) {
  const mat = mesh.material as MeshLambertMaterial;
  stageState.foliageMats.push({ mat, orig: mat.color.clone() });
}

const STAGE_LOOKS = {
  // Setup lobby: a calm neutral backdrop for the shop picker, before any shop.
  lobby: { skyTop: "#7e93a3", skyMid: "#a9bcc7", horizon: "#d4dee4", sun: "#fdf6ea", sunI: 1.7, hemiI: 1.05, ground: "#d4dee4", foliage: "#d4dee4" },
  // Morning (childhood): a fresh bright morning.
  morning: { skyTop: "#5aa6e0", skyMid: "#9fcdee", horizon: "#e3f1fb", sun: "#fff4dd", sunI: 2.3, hemiI: 1.15, ground: "#ffffff", foliage: "#ffffff" },
  // Midday (working years): a strong full midday.
  midday: { skyTop: "#2f86d8", skyMid: "#7fbcec", horizon: "#d6ebfb", sun: "#ffefbe", sunI: 2.7, hemiI: 1.2, ground: "#f3ffe4", foliage: "#eaffce" },
  // Afternoon (adult): a warm golden hour.
  afternoon: { skyTop: "#6f7fb8", skyMid: "#d9a878", horizon: "#f6cf9a", sun: "#ffba78", sunI: 2.0, hemiI: 0.98, ground: "#f0e0b8", foliage: "#e8b878" },
};

// Retint the whole street for a stage. Safe to call any number of times; every
// tint is computed from stored originals, never stacked. "select" maps to morning, "close" to afternoon.
export function setStageLook(world: any, stage: string) {
  void world;
  let key = stage;
  if (key === "select") key = "lobby";
  if (key === "close") key = "afternoon";
  const preset = (STAGE_LOOKS as any)[key];
  if (!preset) return;
  if (stageState.skyMat) {
    const old = stageState.skyMat.map;
    stageState.skyMat.map = makeSkyTexture(preset.skyTop, preset.skyMid, preset.horizon);
    stageState.skyMat.needsUpdate = true;
    if (old) old.dispose();
  }
  if (stageState.sun) {
    stageState.sun.color.set(preset.sun);
    stageState.sun.intensity = preset.sunI;
  }
  if (stageState.hemi) stageState.hemi.intensity = preset.hemiI;
  if (stageState.fog) stageState.fog.color.set(preset.horizon);
  for (const mat of stageState.groundMats) mat.color.set(preset.ground);
  const tint = new Color(preset.foliage);
  for (const f of stageState.foliageMats) {
    f.mat.color.copy(f.orig).multiply(tint);
  }
}

// ----------------------------------------------------------------------------
// SMALL SHAPE HELPERS  —  every scenery piece is made out of these.
// ----------------------------------------------------------------------------
function meshBox(w: number, h: number, d: number, color: string): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function meshCyl(rTop: number, rBot: number, h: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new CylinderGeometry(rTop, rBot, h, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}
function meshSphere(r: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new SphereGeometry(r, seg, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}
function meshCone(r: number, h: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new ConeGeometry(r, h, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}

// ----------------------------------------------------------------------------
// CANVAS TEXTURES  —  a gradient sky and readable signs, drawn once at startup.
// ----------------------------------------------------------------------------
function makeSkyTexture(top: string, mid: string, horizon: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// A small 2x2 checkerboard, drawn once and tiled across the bakery floor. The
// two colors alternate; the texture repeats so the squares read at a tile size
// that fits the room (about 6 across, 9 down the 11x16 floor).
function makeCheckerTexture(a: string, b: string): CanvasTexture {
  const S = 64;
  const half = S / 2;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  ctx.fillStyle = b;
  ctx.fillRect(half, 0, half, half);
  ctx.fillRect(0, half, half, half);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(6, 9);
  return tex;
}

function makeSignTexture(text: string): CanvasTexture {
  // Drawn at high resolution so the text stays crisp even on the wide overhead
  // banner, which stretches one texture across a much larger board than the
  // building signs. Low resolution there blurred "Main Street" into nothing.
  const W = 720;
  const H = 240;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = SIGN_CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = SIGN_NAVY;
  ctx.lineWidth = 16;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.fillStyle = SIGN_NAVY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Pick the largest font (up to a cap) that still fits, so longer names like
  // "Main Street" fill the board instead of shrinking to nothing.
  let size = 104;
  do {
    ctx.font = "bold " + size + "px sans-serif";
    size -= 4;
  } while (ctx.measureText(text).width > W - 72 && size > 24);
  ctx.fillText(text, W / 2, H / 2 + 4);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// A flat readable sign board (unlit so it never darkens), added to a building
// group facing the street (the building's +Z side).
function addBoardSign(group: Group, text: string, x: number, y: number, z: number) {
  const board = new Mesh(
    new PlaneGeometry(2.2, 0.72),
    new MeshBasicMaterial({ map: makeSignTexture(text), side: DoubleSide }),
  );
  board.position.set(x, y, z);
  group.add(board);
}

// ----------------------------------------------------------------------------
// SKY + LIGHTS
// ----------------------------------------------------------------------------
function buildSkyAndLights(world: any) {
  const scene = world.scene;

  // A big inside-out sphere painted with the sky gradient.
  const skyMat = new MeshBasicMaterial({
    map: makeSkyTexture(PALETTE.skyTop, PALETTE.skyMid, PALETTE.horizon),
    side: BackSide,
    fog: false,
  });
  const skyMesh = new Mesh(new SphereGeometry(120, 24, 16), skyMat);
  world.createTransformEntity(skyMesh);
  stageState.skyMat = skyMat;

  // Fog so distant things melt into the horizon color.
  const fog = new Fog(new Color(PALETTE.horizon), 28, 95);
  scene.fog = fog;
  stageState.fog = fog;

  // Soft sky light + a warm sun.
  const hemi = new HemisphereLight(new Color("#ffffff"), new Color("#7f9a6a"), 1.15);
  scene.add(hemi);
  stageState.hemi = hemi;

  const sun = new DirectionalLight(new Color(PALETTE.sun), 2.3);
  sun.position.set(12, 22, 8);
  scene.add(sun);
  stageState.sun = sun;
}

// ----------------------------------------------------------------------------
// THE SHOP FLOOR  —  the walkable wood floor. Returned to index.ts so it is
// registered as the LocomotionEnvironment the player stands on. It keeps its
// wood color and is lit by the day-shifting sun, warming as the day advances.
// ----------------------------------------------------------------------------
function buildShopFloor(world: any) {
  const floorMesh = new Mesh(
    new PlaneGeometry(11, 16),
    new MeshLambertMaterial({ map: makeCheckerTexture(PALETTE.floorLight, PALETTE.floorDark) }),
  );
  floorMesh.receiveShadow = true;
  const ground = world.createTransformEntity(floorMesh);
  ground.object3D!.rotation.x = -Math.PI / 2;
  ground.object3D!.position.set(0, 0, 0);
  _floorMat = floorMesh.material as MeshLambertMaterial;
  return ground;
}

// ----------------------------------------------------------------------------
// SHOP WALLS  —  three solid walls and a glass storefront, in ONE Group. This
// is the collision boundary: index.ts registers it as a LocomotionEnvironment,
// so the capsule bumps the walls and cannot leave the shop. The glass pane is
// see-through (low opacity) but still part of this Group, so it collides too and
// the player cannot walk out the front. The player spawns near the back wall,
// facing -z, looking down the shop toward the street through the glass.
// ----------------------------------------------------------------------------
export const BOUNDARY = { xHalf: 5.5, zBack: 8, zFront: -8, height: 3, thickness: 0.3 };

function buildShopWalls(world: any) {
  const g = new Group();

  // Back wall (behind you at spawn).
  const back = meshBox(11, 3, 0.3, PALETTE.wallCream);
  back.position.set(0, 1.5, 8);
  g.add(back);

  // Left and right walls, running the full depth.
  const left = meshBox(0.3, 3, 16, PALETTE.wallCream);
  left.position.set(-5.5, 1.5, 0);
  g.add(left);
  const right = meshBox(0.3, 3, 16, PALETTE.wallCream);
  right.position.set(5.5, 1.5, 0);
  g.add(right);

  // Wainscoting: a rose band along the bottom of the three solid walls, on the
  // room-side face of each (just inside the wall), giving the bakery a warm dado.
  const backBand = meshBox(11, 1.0, 0.1, PALETTE.wainscot);
  backBand.position.set(0, 0.5, 7.85);
  g.add(backBand);
  const leftBand = meshBox(0.1, 1.0, 16, PALETTE.wainscot);
  leftBand.position.set(-5.35, 0.5, 0);
  g.add(leftBand);
  const rightBand = meshBox(0.1, 1.0, 16, PALETTE.wainscot);
  rightBand.position.set(5.35, 0.5, 0);
  g.add(rightBand);

  // Glass storefront across the front (z = -8): a solid trim sill below, a
  // see-through pane in the middle, and a trim header above. The wood parts warm
  // to honey; the pane stays transparent (tinted to the cooler case glass).
  const sill = meshBox(11, 0.6, 0.3, PALETTE.woodWarm);
  sill.position.set(0, 0.3, -8);
  g.add(sill);
  const glass = new Mesh(
    new BoxGeometry(10.4, 2.0, 0.1),
    new MeshLambertMaterial({ color: new Color(PALETTE.caseGlass), transparent: true, opacity: 0.18 }),
  );
  glass.position.set(0, 1.6, -8);
  g.add(glass);
  const header = meshBox(11, 0.4, 0.3, PALETTE.woodWarm);
  header.position.set(0, 2.8, -8);
  g.add(header);

  _wallMats = [back.material as MeshLambertMaterial, left.material as MeshLambertMaterial, right.material as MeshLambertMaterial];
  _wainscotMats = [backBand.material as MeshLambertMaterial, leftBand.material as MeshLambertMaterial, rightBand.material as MeshLambertMaterial];

  return world.createTransformEntity(g);
}

// ----------------------------------------------------------------------------
// STOREFRONT SIGN  —  "Sweet Capital Bakery" mounted just inside the glass
// storefront (the front wall sits at z = -8). It hangs high near the top of the
// window and faces into the room (+z), so the player reads it walking in. A thin
// wood frame backs the printed board.
// ----------------------------------------------------------------------------
function buildStorefrontSign(world: any, name: string) {
  const g = new Group();

  // Thin wood frame, just behind the board.
  const frame = meshBox(4.2, 1.1, 0.06, PALETTE.woodWarm);
  frame.position.set(0, 0, -0.02);
  g.add(frame);

  // The printed sign, facing the room.
  const board = new Mesh(
    new PlaneGeometry(4, 0.9),
    new MeshBasicMaterial({ map: makeSignTexture(name), side: DoubleSide }),
  );
  board.position.set(0, 0, 0.02);
  g.add(board);

  const e = world.createTransformEntity(g);
  // A little in front of the storefront wall (z = -8), high near the window top.
  e.object3D!.position.set(0, 2.25, -7.7);
}

// ----------------------------------------------------------------------------
// STREET VIEW  —  what shows through the glass: a sidewalk, a road, and one
// building across the way for depth. Placed beyond the storefront (more negative
// z). The sky sphere and sun sit behind all of it and shift with the day.
// ----------------------------------------------------------------------------
function buildStreetView(world: any) {
  const sidewalk = new Mesh(new PlaneGeometry(12, 2.5), new MeshLambertMaterial({ color: new Color(PALETTE.sidewalk) }));
  const swE = world.createTransformEntity(sidewalk);
  swE.object3D!.rotation.x = -Math.PI / 2;
  swE.object3D!.position.set(0, 0.02, -9.6);

  const road = new Mesh(new PlaneGeometry(12, 5), new MeshLambertMaterial({ color: new Color(PALETTE.road) }));
  const roadE = world.createTransformEntity(road);
  roadE.object3D!.rotation.x = -Math.PI / 2;
  roadE.object3D!.position.set(0, 0.0, -12.5);

  const building = meshBox(6, 4, 4, PALETTE.bankWall);
  const buildingE = world.createTransformEntity(building);
  buildingE.object3D!.position.set(0, 2, -16);

  // Hand back the street pieces so the opening can hide them until a shop is chosen.
  return [swE, roadE, buildingE];
}

// ----------------------------------------------------------------------------
// STATION ANCHORS  —  where each panel/mentor sits inside the shop. The panels
// read these, so they move into the shop on their own. The names bank/business
// are leftover labels we rename when we reskin each phase.
// ----------------------------------------------------------------------------
export const STATIONS = {
  bank:     { x: -2.6, z: 0,  faceY: 0 },
  business: { x:  2.6, z: 0,  faceY: 0 },
  store:    { x:  0,   z: -3, faceY: 0 },
  home:     { x:  0,   z:  4, faceY: 0 },
};

// ============================================================================
// GUS  —  the Main Street cart shopkeeper and your money mentor. He wheels his
// cart to where you are, waves you over with a gold "!", and greets you when you
// walk up. His stage question (which feeds Money Smarts) arrives with the panel
// system in the next prompt; for now he is alive and says hello.
// ============================================================================

// Where Gus parks (and which way he faces). The one place to move him.
export const GUS_SPOT = { x: -2.6, z: 1.6, faceY: 0 };

// Break a sentence into lines that fit a given width, for the speech bubble.
function wrapLines(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draw a white speech bubble with navy text onto a canvas, wrapped to fit.
function makeBubbleTexture(text: string): CanvasTexture {
  const W = 460;
  const H = 240;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, W, H);
  const bx = 14;
  const by = 14;
  const bw = W - 28;
  const bh = H - 78;
  ctx.fillStyle = "#fffdf8";
  ctx.strokeStyle = SIGN_NAVY;
  ctx.lineWidth = 8;
  ctx.fillRect(bx, by, bw, bh);
  // a little tail pointing down toward Gus
  ctx.beginPath();
  ctx.moveTo(W / 2 - 28, by + bh);
  ctx.lineTo(W / 2 + 28, by + bh);
  ctx.lineTo(W / 2, by + bh + 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = SIGN_NAVY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Fit the text to the box: take the largest font (up to 30px) whose wrapped
  // lines fit inside the bubble both across and down, then center them. A long
  // greeting shrinks to stay inside instead of spilling over the border.
  const maxTextW = bw - 44;
  const maxTextH = bh - 28;
  let size = 30;
  let lines: string[] = [];
  let lh = 38;
  for (;;) {
    ctx.font = "bold " + size + "px sans-serif";
    lh = size * 1.25;
    lines = wrapLines(ctx, text, maxTextW);
    if (size <= 14 || lines.length * lh <= maxTextH) break;
    size -= 2;
  }

  const startY = by + bh / 2 - ((lines.length - 1) * lh) / 2;
  let li = 0;
  for (const ln of lines) {
    ctx.fillText(ln, W / 2, startY + li * lh);
    li = li + 1;
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// ---- Ms. Delia, the baker who owns the shop. A blue dress under a cream
// apron, shoulder-length brown hair, and a tall white baker's hat. She stands
// at GUS_SPOT facing the room (+z), just behind the sales counter, feet on the
// floor at y = 0. Built from the same shape helpers as the rest of the shop. ----
function buildDeliaFigure(): Group {
  const gus = new Group();

  // Dress: a cone skirt with a cylinder bodice above it.
  const skirt = meshCone(0.4, 0.9, PALETTE.dressBlue);
  skirt.position.set(0, 0.45, 0);
  gus.add(skirt);
  const bodice = meshCyl(0.2, 0.24, 0.5, PALETTE.dressBlue);
  bodice.position.set(0, 1.05, 0);
  gus.add(bodice);

  // Cream apron across the front.
  const apron = meshBox(0.4, 0.85, 0.05, PALETTE.apronCream);
  apron.position.set(0, 0.7, 0.34);
  gus.add(apron);

  // Arms down her sides, each with a hand at the end.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.dressBlue);
    arm.position.set(s * 0.26, 1.05, 0);
    gus.add(arm);
    const hand = meshSphere(0.06, PALETTE.skinTone);
    hand.position.set(s * 0.26, 0.82, 0);
    gus.add(hand);
  }

  // Head, with a rounded mass of hair behind it and a lock down each side.
  const head = meshSphere(0.19, PALETTE.skinTone);
  head.position.set(0, 1.52, 0);
  gus.add(head);
  const hairBack = meshSphere(0.21, PALETTE.hairBrown);
  hairBack.position.set(0, 1.52, -0.05);
  gus.add(hairBack);
  for (const s of [-1, 1]) {
    const lock = meshBox(0.09, 0.28, 0.14, PALETTE.hairBrown);
    lock.position.set(s * 0.17, 1.38, -0.02);
    gus.add(lock);
  }

  // White baker's hat: a band with a puffed top.
  const hatBand = meshCyl(0.16, 0.17, 0.14, PALETTE.hatWhite);
  hatBand.position.set(0, 1.68, 0);
  gus.add(hatBand);
  const hatPuff = meshSphere(0.19, PALETTE.hatWhite);
  hatPuff.position.set(0, 1.82, 0);
  gus.add(hatPuff);

  // Face: pink cheeks and dark eyes, set on the +z side so she faces the room.
  for (const s of [-1, 1]) {
    const cheek = meshSphere(0.035, PALETTE.cheekPink);
    cheek.position.set(s * 0.09, 1.49, 0.16);
    gus.add(cheek);
    const eye = meshSphere(0.025, "#3a2a20");
    eye.position.set(s * 0.07, 1.55, 0.17);
    gus.add(eye);
  }

  return gus;
}

// ---- Mr. Reyes, who owns the surf shop. Board shorts and sandals, a tee, short
// hair under a ball cap, standing at GUS_SPOT facing the room (+z). Built from
// the same shape helpers so he matches the rest of the shop. ----
function buildReyesFigure(): Group {
  const g = new Group();

  // Board shorts: two short legs, with sandals.
  for (const s of [-1, 1]) {
    const leg = meshCyl(0.1, 0.1, 0.55, PALETTE.reyesShorts);
    leg.position.set(s * 0.12, 0.4, 0);
    g.add(leg);
    const shoe = meshBox(0.16, 0.08, 0.26, "#3a2a20");
    shoe.position.set(s * 0.12, 0.07, 0.04);
    g.add(shoe);
  }

  // Tee shirt torso.
  const torso = meshCyl(0.22, 0.24, 0.6, PALETTE.reyesShirt);
  torso.position.set(0, 1.0, 0);
  g.add(torso);

  // Arms and hands.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.reyesShirt);
    arm.position.set(s * 0.27, 1.05, 0);
    g.add(arm);
    const hand = meshSphere(0.06, PALETTE.reyesSkin);
    hand.position.set(s * 0.27, 0.82, 0);
    g.add(hand);
  }

  // Head with short hair.
  const head = meshSphere(0.19, PALETTE.reyesSkin);
  head.position.set(0, 1.5, 0);
  g.add(head);
  const hair = meshSphere(0.2, PALETTE.reyesHair);
  hair.scale.set(1, 0.7, 1);
  hair.position.set(0, 1.57, -0.02);
  g.add(hair);

  // A cap: a round crown and a short brim facing the room (+z).
  const crown = meshCyl(0.18, 0.19, 0.14, PALETTE.reyesCap);
  crown.position.set(0, 1.64, 0);
  g.add(crown);
  const brim = meshBox(0.3, 0.04, 0.18, PALETTE.reyesCap);
  brim.position.set(0, 1.6, 0.2);
  g.add(brim);

  // Eyes on the +z side so he faces the room.
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.025, "#3a2a20");
    eye.position.set(s * 0.07, 1.52, 0.17);
    g.add(eye);
  }

  return g;
}

// ---- Ms. Okafor, who owns the repair shop. A work skirt and teal smock under a
// light apron with a screwdriver in the pocket, hair gathered into a bun, glasses
// across the eyes, standing at GUS_SPOT facing the room (+z). ----
function buildOkaforFigure(): Group {
  const g = new Group();

  // Work skirt and a teal smock bodice.
  const skirt = meshCone(0.4, 0.9, PALETTE.okaforSkirt);
  skirt.position.set(0, 0.45, 0);
  g.add(skirt);
  const bodice = meshCyl(0.2, 0.24, 0.5, PALETTE.okaforSmock);
  bodice.position.set(0, 1.05, 0);
  g.add(bodice);

  // A light apron with a pocket and a screwdriver tucked in it.
  const apron = meshBox(0.4, 0.72, 0.05, PALETTE.okaforApron);
  apron.position.set(0, 0.76, 0.34);
  g.add(apron);
  const pocket = meshBox(0.22, 0.16, 0.04, PALETTE.okaforSmock);
  pocket.position.set(0, 0.64, 0.37);
  g.add(pocket);
  const driver = meshCyl(0.014, 0.014, 0.18, "#d0d4d8");
  driver.position.set(0.06, 0.78, 0.39);
  g.add(driver);
  const driverGrip = meshBox(0.04, 0.06, 0.04, PALETTE.boardRed);
  driverGrip.position.set(0.06, 0.86, 0.39);
  g.add(driverGrip);

  // Arms and hands.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.okaforSmock);
    arm.position.set(s * 0.26, 1.05, 0);
    g.add(arm);
    const hand = meshSphere(0.06, PALETTE.okaforSkin);
    hand.position.set(s * 0.26, 0.82, 0);
    g.add(hand);
  }

  // Head, hair gathered into a bun.
  const head = meshSphere(0.19, PALETTE.okaforSkin);
  head.position.set(0, 1.52, 0);
  g.add(head);
  const hairBack = meshSphere(0.21, PALETTE.okaforHair);
  hairBack.position.set(0, 1.52, -0.05);
  g.add(hairBack);
  const bun = meshSphere(0.11, PALETTE.okaforHair);
  bun.position.set(0, 1.68, -0.12);
  g.add(bun);

  // Glasses across the eyes, then the eyes and a touch of cheek, on the +z side.
  const glasses = meshBox(0.26, 0.05, 0.03, "#2a2a2a");
  glasses.position.set(0, 1.52, 0.17);
  g.add(glasses);
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.022, "#3a2a20");
    eye.position.set(s * 0.07, 1.52, 0.16);
    g.add(eye);
    const cheek = meshSphere(0.03, PALETTE.cheekPink);
    cheek.position.set(s * 0.1, 1.48, 0.15);
    g.add(cheek);
  }

  return g;
}

// Build Gus, his cart, his gold "!", and his greeting bubble, then keep an eye
// on how close the player is and show the right thing.
function buildGus(world: any, shop: ShopId) {
  const GREETING = SHOPS[shop].ownerGreeting;
  const RADIUS = 4.2; // how close you must be for Gus to greet you

  // The owner figure, chosen by shop. Each is built at its own local origin and
  // then placed at GUS_SPOT below, just behind the counter, facing the room (+z).
  let gus: Group;
  if (shop === "surf") gus = buildReyesFigure();
  else if (shop === "repair") gus = buildOkaforFigure();
  else gus = buildDeliaFigure();

  // ---- The gold "!" that invites you over ----
  const bang = new Group();
  const barG = meshBox(0.1, 0.4, 0.1, "#c8962a");
  barG.position.set(0, 0.26, 0);
  bang.add(barG);
  const dotG = meshBox(0.1, 0.1, 0.1, "#c8962a");
  dotG.position.set(0, -0.02, 0);
  bang.add(dotG);
  bang.position.set(0, 2.7, 0);
  gus.add(bang);

  // Place Gus behind the counter.
  const gusE = world.createTransformEntity(gus);
  gusE.object3D!.position.set(GUS_SPOT.x, 0, GUS_SPOT.z);
  gusE.object3D!.rotation.y = GUS_SPOT.faceY;

  // ---- The greeting bubble. Parked over Gus's head it ran off the TOP of the
  // screen up close (eye height is ~1.6, the bubble sat at 3.1), so you could not
  // read it. Instead it floats in front of you, a little above eye level so it
  // still reads as Gus speaking from above, always faces you, and draws ON TOP so
  // his cart and awning never cover it. depthTest off + a high renderOrder keep
  // it over the world. ----
  const bubbleMat = new MeshBasicMaterial({
    map: makeBubbleTexture(GREETING),
    transparent: true,
    side: DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const bubble = new Mesh(new PlaneGeometry(2.3, 1.2), bubbleMat);
  bubble.renderOrder = 2000;
  const bubbleE = world.createTransformEntity(bubble);
  bubbleE.object3D!.position.set(GUS_SPOT.x, 3.1, GUS_SPOT.z);
  bubbleE.object3D!.visible = false;

  // ---- Watch how close the player is. Far out, Gus waves you over with the "!".
  // In the greeting band the bubble floats readably in front of you. Once you are
  // close enough for his question panel, the greeting steps aside for it. ----
  const GREET_FAR = RADIUS;  // start greeting at this range
  const GREET_NEAR = 3.0;    // inside here the question panel takes over (matches it)
  const GREET_DIST = 3.7;    // how far ahead of you the bubble floats (readable size)
  const GREET_RAISE = 0.22;  // just above eye level, so it still reads as "up" but stays on screen
  const camPos = new Vector3();
  const bubbleFwd = new Vector3();
  let t = 0;
  setInterval(function () {
    t = t + 1;
    const cam = world.camera;
    if (!cam) return;
    cam.getWorldPosition(camPos);
    const dx = camPos.x - GUS_SPOT.x;
    const dz = camPos.z - GUS_SPOT.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const showGreeting = dist <= GREET_FAR && dist > GREET_NEAR;
    bubbleE.object3D!.visible = showGreeting;
    bang.visible = dist > GREET_FAR;
    bang.position.y = 2.7 + Math.sin(t * 0.12) * 0.08;
    if (showGreeting) {
      cam.getWorldDirection(bubbleFwd);
      bubbleFwd.y = 0;
      if (bubbleFwd.lengthSq() < 1e-6) bubbleFwd.set(0, 0, -1);
      bubbleFwd.normalize();
      const px = camPos.x + bubbleFwd.x * GREET_DIST;
      const pz = camPos.z + bubbleFwd.z * GREET_DIST;
      bubbleE.object3D!.position.set(px, camPos.y + GREET_RAISE, pz);
      bubbleE.object3D!.rotation.set(0, Math.atan2(camPos.x - px, camPos.z - pz), 0, "YXZ");
    }
  }, 33);
}

// A reusable gold "!" beacon that the game floats over whatever station is the
// current target (the counter, the shop floor), generalizing the wave-you-over
// marker that used to live only above the owner. index.ts positions it, bobs it,
// and shows/hides it based on where you need to go next. Starts hidden.
export function buildBeacon(world: any) {
  const g = new Group();
  const bar = meshBox(0.12, 0.46, 0.12, "#c8962a");
  bar.position.set(0, 0.3, 0);
  g.add(bar);
  const dot = meshBox(0.12, 0.12, 0.12, "#c8962a");
  dot.position.set(0, 0.0, 0);
  g.add(dot);
  const e = world.createTransformEntity(g);
  e.object3D!.visible = false;
  return e;
}

// ============================================================================
// SHOP FURNITURE  —  the two fixtures the panels anchor to. The sales counter
// (with its little register) stands at the bank station, where the Morning and
// Daily Report panels appear; the display shelf of products stands at the
// business station, where the Midday panel appears. Each is a Group built around
// its own local origin, then dropped at its station the same way Gus's cart is.
// ============================================================================

// The sales counter: a glass bakery display case. A warm wood base carries a
// darker wood lip; a low-opacity glass box sits on the lip with little cakes,
// cupcakes, and a chocolate loaf arranged inside; a register sits at one end.
function buildSalesCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);

  const lip = meshBox(2.7, 0.08, 0.75, PALETTE.woodDark2);
  lip.position.set(0, 0.93, 0);
  g.add(lip);

  // The glass case: see-through so the treats inside read clearly.
  const glassCase = new Mesh(
    new BoxGeometry(2.5, 0.55, 0.65),
    new MeshLambertMaterial({ color: new Color(PALETTE.caseGlass), transparent: true, opacity: 0.22 }),
  );
  glassCase.position.set(0, 1.22, 0);
  g.add(glassCase);

  // ---- Treats inside the case, resting on the lip (~y 1.05), spread along x. ----
  // Two round cakes, each with a cherry on top.
  for (const cx of [-0.9, 0.3]) {
    const cake = meshCyl(0.18, 0.18, 0.16, PALETTE.frostCream);
    cake.position.set(cx, 1.05, 0.06);
    g.add(cake);
    const cherry = meshSphere(0.05, PALETTE.cherryRed);
    cherry.position.set(cx, 1.16, 0.06);
    g.add(cherry);
  }
  // Two cupcakes: a dark wrapper topped with a dome of pink frosting.
  for (const ux of [-0.5, 0.6]) {
    const cup = meshCyl(0.1, 0.13, 0.14, PALETTE.woodDark2);
    cup.position.set(ux, 1.05, -0.06);
    g.add(cup);
    const frosting = meshSphere(0.13, PALETTE.frostPink);
    frosting.position.set(ux, 1.18, -0.06);
    g.add(frosting);
  }
  // One chocolate loaf, a squashed sphere.
  const loaf = meshSphere(0.14, PALETTE.chocolate);
  loaf.scale.set(1.6, 0.8, 1);
  loaf.position.set(-0.05, 1.06, 0);
  g.add(loaf);

  // A small register at one end of the base top.
  const registerBody = meshBox(0.4, 0.28, 0.32, "#3a4654");
  registerBody.position.set(0.95, 1.05, 0);
  g.add(registerBody);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// The display shelf: a back board and three shelf boards stocked with bakery
// goods — bread loaves, baguettes on their side, and frosted cupcakes — resting
// on each board (z ~0.25). Every shelf carries all three for a full window.
function buildDisplayShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);

  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  // A round loaf of crusty bread, squashed into a loaf shape.
  function addLoaf(x: number, boardTop: number) {
    const loaf = meshSphere(0.16, PALETTE.breadCrust);
    loaf.scale.set(1.7, 0.85, 1);
    loaf.position.set(x, boardTop + 0.14, 0.25);
    g.add(loaf);
  }
  // A baguette lying on its side across the shelf.
  function addBaguette(x: number, boardTop: number) {
    const bag = meshCyl(0.06, 0.06, 0.7, PALETTE.breadCrust);
    bag.rotation.z = Math.PI / 2;
    bag.position.set(x, boardTop + 0.06, 0.25);
    g.add(bag);
  }
  // A cupcake: cream cup with a dome of pink frosting.
  function addCupcake(x: number, boardTop: number) {
    const cup = meshCyl(0.09, 0.12, 0.13, PALETTE.frostCream);
    cup.position.set(x, boardTop + 0.065, 0.25);
    g.add(cup);
    const frosting = meshSphere(0.12, PALETTE.frostPink);
    frosting.position.set(x, boardTop + 0.2, 0.25);
    g.add(frosting);
  }

  // Each shelf board's top surface (board sits at sy, 0.08 tall). A rotating mix
  // so no two shelves read the same across x = -0.7 / 0 / 0.7.
  const lowTop = 0.7 + 0.04;
  addLoaf(-0.7, lowTop);
  addBaguette(0, lowTop);
  addCupcake(0.7, lowTop);

  const midTop = 1.3 + 0.04;
  addBaguette(-0.7, midTop);
  addCupcake(0, midTop);
  addLoaf(0.7, midTop);

  const topTop = 1.9 + 0.04;
  addCupcake(-0.7, topTop);
  addLoaf(0, topTop);
  addBaguette(0.7, topTop);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ----------------------------------------------------------------------------
// SURF COUNTER  —  a wood stand with three surfboards leaning in a back rail and
// a small register, standing where the bakery case stands (the bank station).
// ----------------------------------------------------------------------------
function buildSurfCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);
  const lip = meshBox(2.7, 0.08, 0.78, PALETTE.woodDark2);
  lip.position.set(0, 0.93, 0);
  g.add(lip);

  // A back rail the boards lean against.
  const rail = meshBox(2.4, 0.1, 0.1, PALETTE.woodDark2);
  rail.position.set(0, 1.75, -0.22);
  g.add(rail);

  // Three boards: elongated flat ellipsoids, fanned slightly, each with a fin.
  const boardColors = [PALETTE.boardRed, PALETTE.boardYellow, PALETTE.boardTeal];
  let i = 0;
  for (const bx of [-0.7, 0, 0.7]) {
    const board = meshSphere(0.5, boardColors[i % 3]);
    board.scale.set(0.5, 2.0, 0.12);
    board.position.set(bx, 1.55, -0.1);
    board.rotation.z = bx * 0.14;
    g.add(board);
    const fin = meshCone(0.06, 0.16, "#2a2a2a");
    fin.position.set(bx, 0.66, 0.0);
    g.add(fin);
    i = i + 1;
  }

  const reg = meshBox(0.4, 0.28, 0.32, PALETTE.register);
  reg.position.set(0.95, 1.05, 0);
  g.add(reg);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// ----------------------------------------------------------------------------
// SURF SHELF  —  the same three-board shelf shape as the bakery, stocked with
// wetsuits, rash guards, wax, and sunscreen, at the business station.
// ----------------------------------------------------------------------------
function buildSurfShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);
  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  function wetsuit(x: number, top: number) {
    const w = meshBox(0.3, 0.52, 0.1, "#243240");
    w.position.set(x, top + 0.28, 0.25);
    g.add(w);
  }
  function rashguard(x: number, top: number, color: string) {
    const r = meshBox(0.34, 0.34, 0.08, color);
    r.position.set(x, top + 0.21, 0.25);
    g.add(r);
  }
  function waxStack(x: number, top: number) {
    const c = meshBox(0.16, 0.12, 0.16, "#f0ead2");
    c.position.set(x, top + 0.1, 0.25);
    g.add(c);
  }
  function sunscreen(x: number, top: number) {
    const s = meshCyl(0.06, 0.06, 0.2, "#f2a93a");
    s.position.set(x, top + 0.14, 0.25);
    g.add(s);
  }

  const lowTop = 0.74;
  wetsuit(-0.7, lowTop); rashguard(0, lowTop, PALETTE.boardRed); sunscreen(0.7, lowTop);
  const midTop = 1.34;
  rashguard(-0.7, midTop, PALETTE.boardTeal); waxStack(0, midTop); wetsuit(0.7, midTop);
  const topTop = 1.94;
  sunscreen(-0.7, topTop); wetsuit(0, topTop); rashguard(0.7, topTop, PALETTE.boardYellow);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ----------------------------------------------------------------------------
// REPAIR COUNTER  —  a worktop with a parts tray, a phone laid open for repair,
// a tablet propped up on a small stand, and a register, at the bank station.
// ----------------------------------------------------------------------------
function buildRepairCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);
  const top = meshBox(2.7, 0.08, 0.78, "#9aa3ab");
  top.position.set(0, 0.93, 0);
  g.add(top);

  // A parts tray with a few small chips.
  const tray = meshBox(0.7, 0.06, 0.4, "#3a4048");
  tray.position.set(-0.6, 1.0, 0);
  g.add(tray);
  for (const px of [-0.78, -0.6, -0.42]) {
    const chip = meshBox(0.08, 0.04, 0.08, PALETTE.boardTeal);
    chip.position.set(px, 1.05, 0.0);
    g.add(chip);
  }

  // A phone laid open on the bench, screen up.
  const phone = meshBox(0.18, 0.03, 0.34, "#2a3038");
  phone.position.set(0.15, 1.0, 0.05);
  g.add(phone);
  const phoneScreen = meshBox(0.15, 0.012, 0.3, "#5fb0e0");
  phoneScreen.position.set(0.15, 1.02, 0.05);
  g.add(phoneScreen);

  // A tablet propped upright on a little stand, facing the room.
  const stand = meshBox(0.06, 0.18, 0.12, "#3a4048");
  stand.position.set(0.7, 1.02, -0.05);
  g.add(stand);
  const tablet = meshBox(0.34, 0.46, 0.03, "#2a3038");
  tablet.position.set(0.7, 1.28, 0.0);
  tablet.rotation.x = -0.18;
  g.add(tablet);
  const tabletScreen = meshBox(0.3, 0.4, 0.012, "#7fd0f0");
  tabletScreen.position.set(0.7, 1.28, 0.02);
  tabletScreen.rotation.x = -0.18;
  g.add(tabletScreen);

  const reg = meshBox(0.4, 0.28, 0.32, PALETTE.register);
  reg.position.set(0.98, 1.05, 0);
  g.add(reg);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// ----------------------------------------------------------------------------
// REPAIR SHELF  —  the three-board shelf stocked with phones, tablets, and
// open laptops, at the business station.
// ----------------------------------------------------------------------------
function buildRepairShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);
  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  function phone(x: number, top: number, screen: string) {
    const b = meshBox(0.16, 0.3, 0.03, "#2a3038");
    b.position.set(x, top + 0.18, 0.25);
    g.add(b);
    const s = meshBox(0.13, 0.26, 0.012, screen);
    s.position.set(x, top + 0.19, 0.27);
    g.add(s);
  }
  function tablet(x: number, top: number) {
    const b = meshBox(0.3, 0.4, 0.03, "#2a3038");
    b.position.set(x, top + 0.23, 0.25);
    g.add(b);
    const s = meshBox(0.26, 0.36, 0.012, "#7fd0f0");
    s.position.set(x, top + 0.24, 0.27);
    g.add(s);
  }
  function laptop(x: number, top: number) {
    const base2 = meshBox(0.42, 0.03, 0.3, "#b8bfc6");
    base2.position.set(x, top + 0.06, 0.22);
    g.add(base2);
    const screen = meshBox(0.42, 0.28, 0.02, "#b8bfc6");
    screen.position.set(x, top + 0.2, 0.1);
    screen.rotation.x = -0.32;
    g.add(screen);
    const lit = meshBox(0.37, 0.23, 0.012, "#5fb0e0");
    lit.position.set(x, top + 0.2, 0.115);
    lit.rotation.x = -0.32;
    g.add(lit);
  }

  const lowTop = 0.74;
  phone(-0.75, lowTop, PALETTE.boardTeal); laptop(0.25, lowTop);
  const midTop = 1.34;
  tablet(-0.7, midTop); phone(0.15, midTop, "#5fb0e0"); phone(0.7, midTop, PALETTE.boardYellow);
  const topTop = 1.94;
  laptop(-0.45, topTop); tablet(0.55, topTop);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ============================================================================
// AMBIENT LIFE  —  a dog, a stroller, and two birds, so Main Street feels
// lived in. None of this changes the lesson; it is set dressing. Everything
// moves on one gentle loop, and it shares no state with the game. No new imports.
// ============================================================================
function buildDog() {
  const d = new Group();
  const body = meshBox(0.5, 0.26, 0.22, "#8a5a2b"); body.position.set(0, 0.3, 0); d.add(body);
  const head = meshBox(0.2, 0.2, 0.2, "#8a5a2b"); head.position.set(0.32, 0.36, 0); d.add(head);
  const snout = meshBox(0.12, 0.1, 0.1, "#6e4420"); snout.position.set(0.45, 0.31, 0); d.add(snout);
  for (const ez of [0.07, -0.07]) {
    const ear = meshBox(0.05, 0.12, 0.08, "#6e4420");
    ear.position.set(0.28, 0.48, ez);
    d.add(ear);
  }
  const tail = meshBox(0.18, 0.05, 0.05, "#8a5a2b"); tail.position.set(-0.3, 0.4, 0); tail.rotation.z = 0.7; d.add(tail);
  for (const lp of [[0.18, 0.09], [0.18, -0.09], [-0.18, 0.09], [-0.18, -0.09]]) {
    const leg = meshBox(0.07, 0.22, 0.07, "#6e4420");
    leg.position.set(lp[0], 0.11, lp[1]);
    d.add(leg);
  }
  return d;
}

function buildPasserby() {
  const p = new Group();
  const legs = meshCyl(0.1, 0.13, 0.5, "#39404c", 8); legs.position.set(0, 0.25, 0); p.add(legs);
  const coat = meshCyl(0.17, 0.13, 0.52, "#3a6ea5", 10); coat.position.set(0, 0.73, 0); p.add(coat);
  const head = meshSphere(0.13, "#e0b48c", 12); head.position.set(0, 1.04, 0); p.add(head);
  const hat = meshCyl(0.15, 0.15, 0.08, "#2b3550", 10); hat.position.set(0, 1.16, 0); p.add(hat);
  return p;
}

function buildBird(bodyColor: string) {
  const g = new Group();
  const body = meshSphere(0.12, bodyColor, 10); body.scale.set(1.3, 1, 1); g.add(body);
  const head = meshSphere(0.08, bodyColor, 10); head.position.set(0.13, 0.05, 0); g.add(head);
  const beak = meshCone(0.04, 0.09, "#e0a020", 8); beak.position.set(0.22, 0.05, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
  const wingL = meshBox(0.16, 0.03, 0.1, bodyColor); wingL.position.set(-0.02, 0.05, 0.12); g.add(wingL);
  const wingR = meshBox(0.16, 0.03, 0.1, bodyColor); wingR.position.set(-0.02, 0.05, -0.12); g.add(wingR);
  return { group: g, wingL: wingL, wingR: wingR };
}

function buildAmbientLife(world: any) {
  // A dog trotting in front of the shops.
  const dogObj = world.createTransformEntity(buildDog()).object3D!;
  dogObj.position.set(0, 0, -2.8);

  // Someone strolling along the road.
  const personObj = world.createTransformEntity(buildPasserby()).object3D!;
  personObj.position.set(0, 0, -4.4);

  // Two birds circling above the street.
  const b1 = buildBird("#3a7bd5");
  const bird1Obj = world.createTransformEntity(b1.group).object3D!;
  const b2 = buildBird("#c0563f");
  const bird2Obj = world.createTransformEntity(b2.group).object3D!;

  let t = 0;
  setInterval(function () {
    t = t + 1;

    // Dog: trots back and forth, faces the way it walks, with a little bounce.
    dogObj.position.set(Math.sin(t * 0.025) * 1.75, Math.abs(Math.sin(t * 0.3)) * 0.05, -10.5);
    dogObj.rotation.y = Math.cos(t * 0.025) > 0 ? 0 : Math.PI;

    // Person: a slow stroll along the road.
    personObj.position.set(Math.sin(t * 0.015) * 6.0, 0, -9.6);

    // Bird 1: a wide circle with flapping wings.
    const a1 = t * 0.03;
    bird1Obj.position.set(Math.cos(a1) * 5.0, 3.4 + Math.sin(t * 0.1) * 0.3, -12 + Math.sin(a1) * 4.0);
    bird1Obj.rotation.y = -a1;
    const flap1 = Math.sin(t * 0.8) * 0.6;
    b1.wingL.rotation.x = flap1;
    b1.wingR.rotation.x = -flap1;

    // Bird 2: a smaller, offset circle.
    const a2 = t * 0.026 + 2.0;
    bird2Obj.position.set(2 + Math.cos(a2) * 4.0, 3.9 + Math.sin(t * 0.12) * 0.3, -12 + Math.sin(a2) * 3.2);
    bird2Obj.rotation.y = -a2;
    const flap2 = Math.sin(t * 0.9) * 0.6;
    b2.wingL.rotation.x = flap2;
    b2.wingR.rotation.x = -flap2;
  }, 33);
}

// ----------------------------------------------------------------------------
// buildBaseWorld  —  the parts that are the same no matter which shop you run:
// the sky and lights, the walkable floor, the walls, and the street outside the
// window. Returns the floor (ground) and walls (boundary) so index.ts can make
// them locomotion collision, exactly as before.
// ----------------------------------------------------------------------------
export function buildBaseWorld(world: any) {
  buildSkyAndLights(world);
  const ground = buildShopFloor(world);
  const boundary = buildShopWalls(world);
  const street = buildStreetView(world);
  return { ground, boundary, street };
}

// ----------------------------------------------------------------------------
// recolorShop  —  repaint the captured shell materials for the chosen shop. The
// bakery keeps its default cream-and-rose look; surf gets a sandy checker floor
// and ocean-blue walls. Reuses the same materials, so nothing is rebuilt.
// ----------------------------------------------------------------------------
function recolorShop(shop: ShopId) {
  if (shop === "surf") {
    if (_floorMat) {
      const old = _floorMat.map;
      _floorMat.map = makeCheckerTexture(PALETTE.surfSand1, PALETTE.surfSand2);
      _floorMat.needsUpdate = true;
      if (old) old.dispose();
    }
    for (const m of _wallMats) m.color.set(PALETTE.surfWall);
    for (const m of _wainscotMats) m.color.set(PALETTE.surfWainscot);
  } else if (shop === "repair") {
    if (_floorMat) {
      const old = _floorMat.map;
      _floorMat.map = makeCheckerTexture(PALETTE.repairFloor1, PALETTE.repairFloor2);
      _floorMat.needsUpdate = true;
      if (old) old.dispose();
    }
    for (const m of _wallMats) m.color.set(PALETTE.repairWall);
    for (const m of _wainscotMats) m.color.set(PALETTE.repairWainscot);
  }
}

// ----------------------------------------------------------------------------
// buildShopProps  —  the parts that change per shop: the storefront sign, the
// sales counter and its case, the display shelf, and the owner. For now this
// always builds the bakery; the surf and repair versions arrive in the next
// two stages, switched on the shop argument.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// BAKERY SCENERY  —  café life in the open front of the room: two bistro tables
// with chairs, a specials board by the door, and two potted plants. Everything
// sits at z 4 and up, clear of the counter and shelf (z 0), the owner (z 1.6),
// and the walkway down the middle. Positions below are easy to nudge. Bakery only.
// ----------------------------------------------------------------------------
function buildBakeryScenery(world: any) {
  // Drop a finished group onto the floor at x,z, turned ry radians.
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // Round bistro table: metal base, slim pole, round wooden top (~0.76 tall).
  function table(): Group {
    const g = new Group();
    const base = meshCyl(0.26, 0.3, 0.05, "#6f6f6f");
    base.position.set(0, 0.03, 0);
    g.add(base);
    const pole = meshCyl(0.04, 0.04, 0.7, "#7c7c7c");
    pole.position.set(0, 0.4, 0);
    g.add(pole);
    const top = meshCyl(0.4, 0.4, 0.05, PALETTE.woodWarm);
    top.position.set(0, 0.76, 0);
    g.add(top);
    return g;
  }

  // Simple chair: seat, four legs, a low back. The back is on the -z side, so a
  // chair placed with ry 0 faces +z (toward the table in front of it).
  function chair(): Group {
    const g = new Group();
    const seat = meshBox(0.34, 0.05, 0.34, PALETTE.woodWarm);
    seat.position.set(0, 0.45, 0);
    g.add(seat);
    for (const lx of [-0.14, 0.14]) {
      for (const lz of [-0.14, 0.14]) {
        const leg = meshBox(0.045, 0.45, 0.045, PALETTE.woodDark2);
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }
    const back = meshBox(0.34, 0.42, 0.05, PALETTE.woodWarm);
    back.position.set(0, 0.68, -0.15);
    g.add(back);
    return g;
  }

  // Specials board: two posts holding a dark chalk slate. Faces +z at ry 0.
  function board(): Group {
    const g = new Group();
    for (const px of [-0.3, 0.3]) {
      const post = meshBox(0.05, 1.2, 0.05, PALETTE.woodDark2);
      post.position.set(px, 0.6, 0);
      g.add(post);
    }
    const frame = meshBox(0.74, 0.64, 0.06, PALETTE.woodWarm);
    frame.position.set(0, 1.0, 0);
    g.add(frame);
    const slate = meshBox(0.64, 0.54, 0.07, "#33403a");
    slate.position.set(0, 1.0, 0.015);
    g.add(slate);
    return g;
  }

  // Potted plant: terracotta pot, leafy dome.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.17, 0.12, 0.3, "#b5654d");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    const leaves = meshSphere(0.3, PALETTE.leaf);
    leaves.position.set(0, 0.55, 0);
    g.add(leaves);
    return g;
  }

  // --- Placement (x, z, turn). Nudge these to taste. ---
  // The open floor BEYOND the counter (z below 0), toward the storefront windows.
  // The counter and shelf sit at z 0; the front wall is at z -8; this fills between.
  // Three tables with facing chairs, spread across the space.
  place(table(), -3.0, -2.0, 0);
  place(chair(), -3.0, -1.4, 0);
  place(chair(), -3.0, -2.6, Math.PI);
  place(table(), 3.0, -2.0, 0);
  place(chair(), 3.0, -1.4, 0);
  place(chair(), 3.0, -2.6, Math.PI);
  place(table(), 0, -4.8, 0);
  place(chair(), 0, -4.2, 0);
  place(chair(), 0, -5.4, Math.PI);

  // Specials board to one side of the seating, turned to face in.
  place(board(), -3.6, -4.6, Math.PI / 2);

  // Plants in the back corners, by the storefront windows.
  place(plant(), 4.6, -6.2, 0);
  place(plant(), -4.6, -6.2, 0);
}

// ----------------------------------------------------------------------------
// SURF SCENERY  —  Atlantic Avenue Surf Co. Fills the open floor beyond the
// counter (z below 0), toward the storefront windows: a board rack, two
// driftwood benches, a wetsuit on a stand, and beach grass. Surf only.
// ----------------------------------------------------------------------------
function buildSurfScenery(world: any) {
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // One surfboard standing on its tail: colored body, a stripe, a small fin.
  function surfboard(color: string, stripe: string, h: number): Group {
    const g = new Group();
    const body = meshBox(0.42, h, 0.07, color);
    body.position.set(0, h / 2 + 0.1, 0);
    g.add(body);
    const str = meshBox(0.07, h, 0.075, stripe);
    str.position.set(0, h / 2 + 0.1, 0.002);
    g.add(str);
    const fin = meshBox(0.04, 0.16, 0.14, "#243640");
    fin.position.set(0, 0.18, -0.08);
    g.add(fin);
    return g;
  }

  // A floor rack holding three boards upright in a row.
  function boardRack(): Group {
    const g = new Group();
    const base = meshBox(1.7, 0.14, 0.42, "#8a6a45");
    base.position.set(0, 0.07, 0);
    g.add(base);
    const rail = meshBox(1.7, 0.07, 0.07, "#6a4f30");
    rail.position.set(0, 1.2, -0.16);
    g.add(rail);
    const b1 = surfboard("#e8794a", "#fff3e0", 1.6);
    b1.position.set(-0.55, 0, 0);
    g.add(b1);
    const b2 = surfboard("#2a8aa8", "#eaf6f8", 1.5);
    b2.position.set(0, 0, 0);
    g.add(b2);
    const b3 = surfboard("#e94f64", "#ffe0e6", 1.55);
    b3.position.set(0.55, 0, 0);
    g.add(b3);
    return g;
  }

  // A weathered driftwood bench: seat, four legs, two back slats.
  function bench(): Group {
    const g = new Group();
    const seat = meshBox(1.4, 0.08, 0.4, "#a89478");
    seat.position.set(0, 0.45, 0);
    g.add(seat);
    for (const lx of [-0.6, 0.6]) {
      for (const lz of [-0.15, 0.15]) {
        const leg = meshBox(0.07, 0.45, 0.07, "#8a7860");
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }
    for (const by of [0.62, 0.78]) {
      const slat = meshBox(1.4, 0.08, 0.05, "#a89478");
      slat.position.set(0, by, -0.16);
      g.add(slat);
    }
    return g;
  }

  // A wetsuit hanging on a stand.
  function wetsuit(): Group {
    const g = new Group();
    const base = meshCyl(0.24, 0.28, 0.05, "#5a5a5a");
    base.position.set(0, 0.025, 0);
    g.add(base);
    const post = meshCyl(0.04, 0.04, 1.5, "#6a6a6a");
    post.position.set(0, 0.75, 0);
    g.add(post);
    const bar = meshBox(0.5, 0.04, 0.04, "#6a6a6a");
    bar.position.set(0, 1.45, 0);
    g.add(bar);
    const torso = meshBox(0.36, 0.5, 0.14, "#1f2a33");
    torso.position.set(0, 1.12, 0.04);
    g.add(torso);
    const stripe = meshBox(0.36, 0.06, 0.15, "#2a8aa8");
    stripe.position.set(0, 0.98, 0.04);
    g.add(stripe);
    for (const lx of [-0.1, 0.1]) {
      const leg = meshBox(0.14, 0.5, 0.12, "#1f2a33");
      leg.position.set(lx, 0.66, 0.04);
      g.add(leg);
    }
    return g;
  }

  // Beach grass in a sandy pot.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.18, 0.13, 0.3, "#caa26a");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    for (const bx of [-0.07, 0, 0.07]) {
      for (const bz of [-0.06, 0.06]) {
        const blade = meshCone(0.05, 0.75, "#5aa46a");
        blade.position.set(bx, 0.62, bz);
        g.add(blade);
      }
    }
    return g;
  }

  // --- Placement (x, z, turn). Open floor beyond the counter; nudge to taste. ---
  place(boardRack(), 0, -5.2, 0);
  place(bench(), -3.2, -2.2, 0);
  place(bench(), 3.2, -2.2, 0);
  place(wetsuit(), -3.4, -4.6, 0);
  place(plant(), -4.6, -6.4, 0);
  place(plant(), 4.4, -5.2, 0);
}

// ----------------------------------------------------------------------------
// REPAIR SCENERY  —  Clarendon Device Repair. Fills the open floor beyond the
// counter (z below 0): a row of waiting seats, a tall parts shelf, a work table
// with a device on it, and two office plants. Repair only.
// ----------------------------------------------------------------------------
function buildRepairScenery(world: any) {
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // A row of three connected waiting-room seats on a metal frame.
  function waitingSeats(): Group {
    const g = new Group();
    const frame = "#7a828c";
    let sx = -0.7;
    for (let i = 0; i < 3; i++) {
      const seat = meshBox(0.46, 0.07, 0.44, "#46708c");
      seat.position.set(sx, 0.45, 0);
      g.add(seat);
      const back = meshBox(0.46, 0.42, 0.06, "#46708c");
      back.position.set(sx, 0.67, -0.19);
      g.add(back);
      sx += 0.7;
    }
    const rail = meshBox(2.25, 0.06, 0.1, frame);
    rail.position.set(0, 0.4, 0.1);
    g.add(rail);
    for (const lx of [-0.95, 0.95]) {
      const leg = meshBox(0.07, 0.4, 0.42, frame);
      leg.position.set(lx, 0.2, 0);
      g.add(leg);
    }
    return g;
  }

  // A tall parts shelf: four posts, three shelves, small colored boxes on each.
  function partsShelf(): Group {
    const g = new Group();
    const frame = "#5a626c";
    for (const px of [-0.7, 0.7]) {
      for (const pz of [-0.2, 0.2]) {
        const post = meshBox(0.06, 1.8, 0.06, frame);
        post.position.set(px, 0.9, pz);
        g.add(post);
      }
    }
    const cols = ["#46708c", "#c8704a", "#5aa46a", "#d6b24a", "#7a6aa8", "#4a90c8"];
    let ci = 0;
    for (const sy of [0.4, 0.9, 1.4]) {
      const shelf = meshBox(1.55, 0.05, 0.46, "#8a929c");
      shelf.position.set(0, sy, 0);
      g.add(shelf);
      for (const bx of [-0.45, 0, 0.45]) {
        const box = meshBox(0.3, 0.18, 0.3, cols[ci % cols.length]);
        box.position.set(bx, sy + 0.12, 0);
        g.add(box);
        ci++;
      }
    }
    return g;
  }

  // A small work table with a device and a tool on top.
  function workTable(): Group {
    const g = new Group();
    const top = meshBox(1.0, 0.06, 0.5, "#8a929c");
    top.position.set(0, 0.75, 0);
    g.add(top);
    for (const lx of [-0.42, 0.42]) {
      for (const lz of [-0.18, 0.18]) {
        const leg = meshBox(0.05, 0.75, 0.05, "#5a626c");
        leg.position.set(lx, 0.375, lz);
        g.add(leg);
      }
    }
    const device = meshBox(0.4, 0.03, 0.28, "#2a3038");
    device.position.set(-0.1, 0.79, 0);
    g.add(device);
    const screen = meshBox(0.34, 0.035, 0.22, "#4a90c8");
    screen.position.set(-0.1, 0.8, 0);
    g.add(screen);
    const tool = meshBox(0.16, 0.025, 0.03, "#c4c4c4");
    tool.position.set(0.28, 0.78, 0.1);
    g.add(tool);
    return g;
  }

  // A leafy office plant in a grey planter.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.16, 0.13, 0.3, "#6a6f76");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    const f1 = meshSphere(0.32, "#4e8f5a");
    f1.position.set(0, 0.56, 0);
    g.add(f1);
    const f2 = meshSphere(0.22, "#5aa46a");
    f2.position.set(0.12, 0.72, 0.08);
    g.add(f2);
    return g;
  }

  // --- Placement (x, z, turn). Open floor beyond the counter; nudge to taste. ---
  place(waitingSeats(), -2.8, -2.2, 0);
  place(workTable(), 3.2, -2.4, 0);
  place(partsShelf(), 0, -5.8, 0);
  place(plant(), -4.4, -5.6, 0);
  place(plant(), 4.4, -5.6, 0);
}

export function buildShopProps(world: any, shop: ShopId) {
  recolorShop(shop);
  buildStorefrontSign(world, SHOPS[shop].shopName);
  if (shop === "surf") {
    buildSurfCounter(world);
    buildSurfShelf(world);
    buildSurfScenery(world);
  } else if (shop === "repair") {
    buildRepairCounter(world);
    buildRepairShelf(world);
    buildRepairScenery(world);
  } else {
    buildSalesCounter(world);
    buildDisplayShelf(world);
    buildBakeryScenery(world);
  }
  buildGus(world, shop);
}

// ----------------------------------------------------------------------------
// buildEnvironment  —  kept so index.ts still works unchanged for now. It builds
// the shell and then the bakery props, exactly like before, and returns the same
// { ground, boundary }. The next stage switches index.ts over to call the two
// helpers directly so the props can wait until a shop is picked.
// ----------------------------------------------------------------------------
export function buildEnvironment(world: any) {
  const base = buildBaseWorld(world);
  buildShopProps(world, "bakery");
  return base;
}
