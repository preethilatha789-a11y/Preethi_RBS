(() => {
  "use strict";

  const WORLD_W = 1280;
  const WORLD_H = 720;
  const GROUND_Y = 638;
  const SLING_X = 210;
  const SLING_Y = 508;
  const MAX_PULL = 112;
  const LAUNCH_SPEED_SCALE = 8.4;
  const GRAVITY = 780;

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const celCanvas = document.getElementById("celebration-canvas");
  const celCtx = celCanvas.getContext("2d");

  // UI Elements
  const hudEl = document.getElementById("hud");
  const levelBadgeEl = document.getElementById("level-badge");
  const pigsLeftEl = document.getElementById("pigs-left");
  const abilityHintEl = document.getElementById("ability-hint");
  const scoreValueEl = document.getElementById("score-value");
  const startOverlay = document.getElementById("start-overlay");
  const winOverlay = document.getElementById("win-overlay");
  const loseOverlay = document.getElementById("lose-overlay");
  const winScoreEl = document.getElementById("win-score");
  const winHeartsEl = document.getElementById("win-hearts");
  const btnSound = document.getElementById("btn-sound");
  const btnNextLevel = document.getElementById("btn-next-level");

  const BIRD_SPECS = {
    red: {
      name: "Ruby",
      r: 20,
      color: "#e62e2d",
      belly: "#f8d7da",
      crest: "#b81d1c",
      mass: 2.2,
      hint: "Tap mid-air for Sonic Chirp push!"
    },
    yellow: {
      name: "Sunny",
      r: 20,
      color: "#ffd43b",
      belly: "#fff9db",
      crest: "#e67700",
      mass: 2.0,
      hint: "Tap mid-air for Turbo Speed Dash!"
    },
    black: {
      name: "Boomer",
      r: 24,
      color: "#2b2d42",
      belly: "#8d99ae",
      crest: "#ff6b35",
      mass: 3.1,
      hint: "Tap mid-air (or wait) for Confetti Blast!"
    },
    pink: {
      name: "Hearty",
      r: 19,
      color: "#ff66a3",
      belly: "#ffe3f0",
      crest: "#d61f69",
      mass: 1.9,
      hint: "Tap mid-air to burst 3 Heart Birds!"
    }
  };

  const MATERIAL_PROPS = {
    glass: { density: 0.0014, hp: 65, restitution: 0.2, friction: 0.45, score: 250 },
    wood: { density: 0.0022, hp: 135, restitution: 0.16, friction: 0.62, score: 400 },
    stone: { density: 0.0038, hp: 290, restitution: 0.1, friction: 0.72, score: 700 },
    gift: { density: 0.0018, hp: 90, restitution: 0.25, friction: 0.55, score: 1000 },
    tnt: { density: 0.002, hp: 55, restitution: 0.15, friction: 0.65, score: 800 }
  };

  function makeBlock(x, y, w, h, material = "wood", angle = 0) {
    const props = MATERIAL_PROPS[material] || MATERIAL_PROPS.wood;
    const mass = Math.max(1.2, w * h * props.density);
    return {
      kind: "block",
      shape: "box",
      material,
      x,
      y,
      w,
      h,
      angle,
      vx: 0,
      vy: 0,
      omega: 0,
      mass,
      invMass: 1 / mass,
      inertia: (mass * (w * w + h * h)) / 12,
      invInertia: 12 / (mass * (w * w + h * h)),
      restitution: props.restitution,
      friction: props.friction,
      hp: props.hp,
      maxHp: props.hp,
      sleeping: true,
      sleepTimer: 0,
      dead: false
    };
  }

  function makePig(x, y, r = 21, king = false) {
    const mass = king ? 3.2 : 1.7;
    const hp = king ? 110 : 52;
    return {
      kind: "pig",
      shape: "circle",
      x,
      y,
      r,
      king,
      angle: 0,
      vx: 0,
      vy: 0,
      omega: 0,
      mass,
      invMass: 1 / mass,
      inertia: 0.5 * mass * r * r,
      invInertia: 1 / (0.5 * mass * r * r),
      restitution: 0.25,
      friction: 0.55,
      hp,
      maxHp: hp,
      hatColor: ["#ff4d8d", "#4dabf7", "#ffd43b", "#9775fa"][Math.floor(Math.random() * 4)],
      blinkTimer: Math.random() * 3,
      sleeping: true,
      sleepTimer: 0,
      dead: false
    };
  }

  // Ground top is GROUND_Y = 638. All y coordinates calculated cleanly from bottom up!
  const LEVELS = [
    {
      name: "Level 1: Party Tower",
      birds: ["red", "yellow", "black", "pink"],
      starThresholds: [14000, 26000, 36000],
      build() {
        const blocks = [];
        const pigs = [];
        // Base pillars at y = 638 - 50 = 588 (height 100)
        blocks.push(makeBlock(790, 588, 22, 100, "wood"));
        blocks.push(makeBlock(910, 588, 22, 100, "wood"));
        blocks.push(makeBlock(1030, 588, 22, 100, "wood"));
        // Floor beam 1: y = 538 - 10 = 528
        blocks.push(makeBlock(850, 528, 145, 20, "wood"));
        blocks.push(makeBlock(970, 528, 145, 20, "wood"));
        // TNT crate & gift between pillars
        blocks.push(makeBlock(850, 613, 48, 48, "tnt"));
        pigs.push(makePig(970, 617, 21, false));
        // Second tier pillars: y = 518 - 45 = 473 (height 90)
        blocks.push(makeBlock(820, 473, 20, 90, "glass"));
        blocks.push(makeBlock(910, 473, 20, 90, "wood"));
        blocks.push(makeBlock(1000, 473, 20, 90, "glass"));
        // Pig on second tier
        pigs.push(makePig(865, 497, 20, false));
        blocks.push(makeBlock(955, 496, 44, 44, "gift"));
        // Top roof beam: y = 428 - 10 = 418
        blocks.push(makeBlock(910, 418, 210, 20, "wood"));
        // Top mini glass cap & pig
        blocks.push(makeBlock(870, 383, 18, 50, "glass"));
        blocks.push(makeBlock(950, 383, 18, 50, "glass"));
        blocks.push(makeBlock(910, 349, 105, 18, "wood"));
        pigs.push(makePig(910, 388, 20, false));
        return { blocks, pigs };
      }
    },
    {
      name: "Level 2: Gift Fortress",
      birds: ["yellow", "pink", "black", "red", "yellow"],
      starThresholds: [18000, 31000, 42000],
      build() {
        const blocks = [];
        const pigs = [];
        // Left tower
        blocks.push(makeBlock(720, 588, 22, 100, "stone"));
        blocks.push(makeBlock(820, 588, 22, 100, "wood"));
        blocks.push(makeBlock(770, 528, 130, 20, "wood"));
        pigs.push(makePig(770, 617, 20, false));
        blocks.push(makeBlock(735, 478, 18, 80, "glass"));
        blocks.push(makeBlock(805, 478, 18, 80, "glass"));
        blocks.push(makeBlock(770, 429, 100, 18, "wood"));
        pigs.push(makePig(770, 497, 20, false));

        // Center TNT & Gift bridge
        blocks.push(makeBlock(900, 613, 48, 48, "tnt"));
        blocks.push(makeBlock(900, 565, 46, 46, "gift"));

        // Right tower
        blocks.push(makeBlock(980, 588, 22, 100, "wood"));
        blocks.push(makeBlock(1090, 588, 22, 100, "stone"));
        blocks.push(makeBlock(1035, 528, 140, 20, "wood"));
        pigs.push(makePig(1035, 617, 21, false));
        blocks.push(makeBlock(998, 473, 20, 90, "wood"));
        blocks.push(makeBlock(1072, 473, 20, 90, "wood"));
        blocks.push(makeBlock(1035, 418, 110, 20, "glass"));
        pigs.push(makePig(1035, 497, 21, false));
        blocks.push(makeBlock(1035, 386, 44, 44, "gift"));
        return { blocks, pigs };
      }
    },
    {
      name: "Level 3: Royal Cake Castle",
      birds: ["black", "yellow", "pink", "red", "black"],
      starThresholds: [22000, 36000, 48000],
      build() {
        const blocks = [];
        const pigs = [];
        // Wide castle base
        blocks.push(makeBlock(720, 583, 24, 110, "stone"));
        blocks.push(makeBlock(840, 583, 24, 110, "wood"));
        blocks.push(makeBlock(960, 583, 24, 110, "wood"));
        blocks.push(makeBlock(1080, 583, 24, 110, "stone"));

        blocks.push(makeBlock(780, 518, 148, 20, "wood"));
        blocks.push(makeBlock(900, 518, 140, 20, "stone"));
        blocks.push(makeBlock(1020, 518, 148, 20, "wood"));

        pigs.push(makePig(780, 617, 20, false));
        blocks.push(makeBlock(900, 613, 48, 48, "tnt"));
        pigs.push(makePig(1020, 617, 20, false));

        // Second floor
        blocks.push(makeBlock(760, 463, 20, 90, "glass"));
        blocks.push(makeBlock(840, 463, 20, 90, "wood"));
        blocks.push(makeBlock(960, 463, 20, 90, "wood"));
        blocks.push(makeBlock(1040, 463, 20, 90, "glass"));

        pigs.push(makePig(800, 487, 19, false));
        pigs.push(makePig(1000, 487, 19, false));
        blocks.push(makeBlock(900, 484, 48, 48, "tnt"));

        // Throne room platform
        blocks.push(makeBlock(900, 408, 305, 20, "wood"));
        // King Piggy in the center!
        blocks.push(makeBlock(845, 358, 18, 80, "glass"));
        blocks.push(makeBlock(955, 358, 18, 80, "glass"));
        blocks.push(makeBlock(900, 309, 136, 18, "wood"));
        pigs.push(makePig(900, 370, 27, true));
        blocks.push(makeBlock(770, 376, 44, 44, "gift"));
        blocks.push(makeBlock(1030, 376, 44, 44, "gift"));

        return { blocks, pigs };
      }
    }
  ];

  // Game State
  let selectedLevelIndex = 0;
  let mode = "menu"; // 'menu' | 'playing' | 'won' | 'lost'
  let score = 0;
  let bodies = []; // blocks & pigs
  let activeBirds = []; // birds currently in physics flight (including split mini birds)
  let birdQueue = []; // waiting bird type strings
  let currentBird = null; // bird loaded on slingshot
  let isDragging = false;
  let settleTimer = 0;
  let postWinTimer = 0;
  let screenShake = 0;
  let clouds = [];
  let particles = [];
  let popups = [];
  let trailDots = [];

  // Celebration State
  let celHearts = [];
  let celBirds = [];
  let celConfetti = [];
  let celFireworks = [];
  let heartsSentCount = 0;
  let celSpawnTimer = 0;

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * WORLD_W,
        y: 55 + Math.random() * 190,
        scale: 0.65 + Math.random() * 0.7,
        speed: 10 + Math.random() * 14
      });
    }
  }

  function createBirdObj(type, x, y) {
    const spec = BIRD_SPECS[type] || BIRD_SPECS.red;
    return {
      kind: "bird",
      shape: "circle",
      birdType: type,
      x,
      y,
      r: spec.r,
      angle: 0,
      vx: 0,
      vy: 0,
      omega: 0,
      mass: spec.mass,
      invMass: 1 / spec.mass,
      inertia: 0.5 * spec.mass * spec.r * spec.r,
      invInertia: 1 / (0.5 * spec.mass * spec.r * spec.r),
      restitution: 0.42,
      friction: 0.5,
      launched: false,
      abilityUsed: false,
      hasCollided: false,
      fuseTimer: 0,
      flightTime: 0,
      dead: false
    };
  }

  function loadLevel(idx) {
    selectedLevelIndex = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    const lvl = LEVELS[selectedLevelIndex];
    const built = lvl.build();
    bodies = [...built.blocks, ...built.pigs];
    birdQueue = [...lvl.birds];
    activeBirds = [];
    particles = [];
    popups = [];
    trailDots = [];
    score = 0;
    settleTimer = 0;
    postWinTimer = 0;
    screenShake = 0;
    isDragging = false;

    loadNextBird();
    updateHUD();

    levelBadgeEl.textContent = lvl.name;
    hudEl.classList.remove("hidden");
    startOverlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    loseOverlay.classList.add("hidden");
    window.soundFX.stopSong();
    clearCelebration();
    mode = "playing";
  }

  function loadNextBird() {
    if (birdQueue.length === 0) {
      currentBird = null;
      abilityHintEl.textContent = "Watching the crash...";
      return;
    }
    const nextType = birdQueue.shift();
    currentBird = createBirdObj(nextType, SLING_X, SLING_Y);
    abilityHintEl.textContent = BIRD_SPECS[nextType].hint;
  }

  function updateHUD() {
    const remainingPigs = bodies.filter((b) => b.kind === "pig" && !b.dead).length;
    pigsLeftEl.textContent = String(remainingPigs);
    scoreValueEl.textContent = score.toLocaleString();
  }

  function addPopup(x, y, text, color = "#fff") {
    popups.push({ x, y, text, color, life: 1.0, vy: -42 });
  }

  function spawnDebris(x, y, color, count = 10, shape = "rect") {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 210;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        size: 4 + Math.random() * 6,
        color,
        shape,
        angle: Math.random() * Math.PI * 2,
        omega: (Math.random() - 0.5) * 10,
        life: 0.65 + Math.random() * 0.45,
        maxLife: 1.0,
        gravity: 520
      });
    }
  }

  function spawnHeartParticle(x, y, count = 6) {
    const colors = ["#ff4d8d", "#ff758f", "#ff1e56", "#ff99c8"];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const spd = 70 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 8 + Math.random() * 7,
        color: colors[i % colors.length],
        shape: "heart",
        angle: 0,
        omega: 0,
        life: 0.95 + Math.random() * 0.4,
        maxLife: 1.2,
        gravity: -40
      });
    }
  }

  function wakeRegion(cx, cy, radius = 135) {
    const r2 = radius * radius;
    for (const b of bodies) {
      if (b.dead || !b.sleeping) continue;
      const dx = b.x - cx;
      const dy = b.y - cy;
      if (dx * dx + dy * dy <= r2) {
        b.sleeping = false;
        b.sleepTimer = 0;
      }
    }
  }

  function wakeAbove(source) {
    const halfW = source.shape === "box" ? source.w * 0.55 : source.r;
    for (const b of bodies) {
      if (b.dead || !b.sleeping || b === source) continue;
      const bw = b.shape === "box" ? b.w * 0.55 : b.r;
      if (Math.abs(b.x - source.x) <= halfW + bw + 12 && b.y < source.y + 8) {
        b.sleeping = false;
        b.sleepTimer = 0;
      }
    }
  }

  function explodeAt(cx, cy, radius = 155, force = 780, baseDamage = 180) {
    window.soundFX.playExplosion();
    screenShake = Math.max(screenShake, 14);
    spawnDebris(cx, cy, "#ff922b", 18, "circle");
    spawnDebris(cx, cy, "#ffd43b", 16, "rect");
    spawnHeartParticle(cx, cy, 8);
    addPopup(cx, cy - 28, "BOOM! 🎉", "#ff6b6b");

    wakeRegion(cx, cy, radius + 70);

    for (const b of bodies) {
      if (b.dead) continue;
      const dx = b.x - cx;
      const dy = b.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const nx = dist > 0.001 ? dx / dist : 0;
        const ny = dist > 0.001 ? dy / dist : -1;
        b.sleeping = false;
        b.vx += nx * force * falloff * Math.min(1.3, b.invMass * 1.6);
        b.vy += (ny * force - 160) * falloff * Math.min(1.3, b.invMass * 1.6);
        b.omega += (Math.random() - 0.5) * 8 * falloff;
        applyDamage(b, baseDamage * falloff);
      }
    }
  }

  function applyDamage(body, dmg) {
    if (body.dead || dmg <= 0) return;
    body.hp -= dmg;
    if (body.hp <= 0) {
      destroyBody(body);
    }
  }

  function destroyBody(body) {
    if (body.dead) return;
    body.dead = true;
    wakeAbove(body);
    wakeRegion(body.x, body.y, 110);

    if (body.kind === "pig") {
      score += body.king ? 8000 : 5000;
      window.soundFX.playPigPop();
      spawnDebris(body.x, body.y, "#8ce99a", 16, "circle");
      spawnHeartParticle(body.x, body.y, 5);
      addPopup(body.x, body.y - 20, body.king ? "+8000 👑" : "+5000 💥", "#fff");
      updateHUD();
      return;
    }

    const props = MATERIAL_PROPS[body.material] || MATERIAL_PROPS.wood;
    score += props.score;
    addPopup(body.x, body.y - 12, `+${props.score}`, "#ffe066");

    if (body.material === "tnt") {
      explodeAt(body.x, body.y, 165, 840, 210);
    } else if (body.material === "glass") {
      window.soundFX.playImpact("glass", 1.0);
      spawnDebris(body.x, body.y, "#a5f3fc", 14, "rect");
    } else if (body.material === "gift") {
      window.soundFX.playHeartPop();
      spawnHeartParticle(body.x, body.y, 10);
      spawnDebris(body.x, body.y, "#ff85a1", 12, "rect");
      addPopup(body.x, body.y - 34, "SURPRISE! 🎁", "#ff4d8d");
    } else if (body.material === "stone") {
      window.soundFX.playImpact("stone", 1.0);
      spawnDebris(body.x, body.y, "#adb5bd", 12, "rect");
    } else {
      window.soundFX.playImpact("wood", 0.9);
      spawnDebris(body.x, body.y, "#c97b36", 12, "rect");
    }
    updateHUD();
  }

  // Trigger mid-air ability on the latest launched bird
  function triggerAbility() {
    if (mode !== "playing") return;
    const bird = activeBirds.find((b) => !b.dead && b.launched && !b.abilityUsed && !b.hasCollided);
    if (!bird) {
      // Allow black bird explosion even after colliding if ability unused
      const blackBird = activeBirds.find(
        (b) => !b.dead && b.launched && b.birdType === "black" && !b.abilityUsed
      );
      if (blackBird) {
        blackBird.abilityUsed = true;
        window.soundFX.playAbility("black");
        explodeAt(blackBird.x, blackBird.y, 170, 860, 220);
        blackBird.dead = true;
      }
      return;
    }

    bird.abilityUsed = true;
    window.soundFX.playAbility(bird.birdType);

    if (bird.birdType === "yellow") {
      const spd = Math.hypot(bird.vx, bird.vy) || 1;
      const boost = 2.05;
      bird.vx = (bird.vx / spd) * Math.min(1300, spd * boost);
      bird.vy = (bird.vy / spd) * Math.min(1300, spd * boost) * 0.72;
      spawnDebris(bird.x, bird.y, "#ffd43b", 10, "circle");
      addPopup(bird.x, bird.y - 24, "TURBO! ⚡", "#ffd43b");
    } else if (bird.birdType === "black") {
      explodeAt(bird.x, bird.y, 175, 880, 230);
      bird.dead = true;
    } else if (bird.birdType === "pink") {
      spawnHeartParticle(bird.x, bird.y, 12);
      addPopup(bird.x, bird.y - 24, "HEART TRIO! 💖", "#ff85a1");
      const baseAngle = Math.atan2(bird.vy, bird.vx);
      const speed = Math.hypot(bird.vx, bird.vy);
      [-0.24, 0.24].forEach((offset) => {
        const clone = createBirdObj("pink", bird.x, bird.y);
        clone.r = 15;
        clone.mass = 1.4;
        clone.invMass = 1 / 1.4;
        clone.launched = true;
        clone.abilityUsed = true;
        clone.vx = Math.cos(baseAngle + offset) * speed * 1.05;
        clone.vy = Math.sin(baseAngle + offset) * speed * 1.05;
        activeBirds.push(clone);
      });
    } else {
      // Red bird sonic chirp burst
      spawnDebris(bird.x, bird.y, "#ff6b6b", 10, "circle");
      addPopup(bird.x, bird.y - 24, "CHIRP! 🐦", "#ff8787");
      bird.vx *= 1.18;
      wakeRegion(bird.x, bird.y, 140);
    }
  }

  // -------------------- 2D RIGID BODY PHYSICS --------------------
  function getBoxVertices(b) {
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    const hw = b.w * 0.5;
    const hh = b.h * 0.5;
    return [
      { x: b.x + (-hw * c - -hh * s), y: b.y + (-hw * s + -hh * c) },
      { x: b.x + (hw * c - -hh * s), y: b.y + (hw * s + -hh * c) },
      { x: b.x + (hw * c - hh * s), y: b.y + (hw * s + hh * c) },
      { x: b.x + (-hw * c - hh * s), y: b.y + (-hw * s + hh * c) }
    ];
  }

  function getBoxAxes(b) {
    const c = Math.cos(b.angle);
    const s = Math.sin(b.angle);
    return [
      { x: c, y: s },
      { x: -s, y: c }
    ];
  }

  function projectVerts(verts, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of verts) {
      const p = v.x * axis.x + v.y * axis.y;
      if (p < min) min = p;
      if (p > max) max = p;
    }
    return { min, max };
  }

  function clipSegmentToLine(v1, v2, normal, offset) {
    const out = [];
    const d1 = v1.x * normal.x + v1.y * normal.y - offset;
    const d2 = v2.x * normal.x + v2.y * normal.y - offset;
    if (d1 >= 0) out.push(v1);
    if (d2 >= 0) out.push(v2);
    if (d1 * d2 < 0) {
      const t = d1 / (d1 - d2);
      out.push({
        x: v1.x + t * (v2.x - v1.x),
        y: v1.y + t * (v2.y - v1.y)
      });
    }
    return out;
  }

  function findIncidentFace(incVerts, refNormal) {
    // Face whose outward normal is most anti-parallel to refNormal
    let bestDot = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < 4; i++) {
      const a = incVerts[i];
      const b = incVerts[(i + 1) % 4];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const len = Math.hypot(ex, ey) || 1;
      // Outward normal for CW vertices in y-down coords: (ey, -ex) or (-ey, ex).
      // Vertex order: (-hw,-hh), (hw,-hh), (hw,hh), (-hw,hh) -> CW in screen coords!
      // Edge 0 is top (rightward), outward normal should point UP (0, -1): (ey, -ex) -> (0, -1)
      const nx = ey / len;
      const ny = -ex / len;
      const d = nx * refNormal.x + ny * refNormal.y;
      if (d < bestDot) {
        bestDot = d;
        bestIdx = i;
      }
    }
    return [incVerts[bestIdx], incVerts[(bestIdx + 1) % 4]];
  }

  function collideBoxBox(A, B) {
    const vertsA = getBoxVertices(A);
    const vertsB = getBoxVertices(B);
    const axesA = getBoxAxes(A);
    const axesB = getBoxAxes(B);
    const axes = [axesA[0], axesA[1], axesB[0], axesB[1]];

    let minOverlap = Infinity;
    let bestAxis = null;
    let bestIdx = 0;

    for (let i = 0; i < 4; i++) {
      const ax = axes[i];
      const pA = projectVerts(vertsA, ax);
      const pB = projectVerts(vertsB, ax);
      const overlap = Math.min(pA.max, pB.max) - Math.max(pA.min, pB.min);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxis = ax;
        bestIdx = i;
      }
    }

    // Ensure normal points from A to B
    const dCenter = { x: B.x - A.x, y: B.y - A.y };
    let normal = { x: bestAxis.x, y: bestAxis.y };
    if (dCenter.x * normal.x + dCenter.y * normal.y < 0) {
      normal = { x: -normal.x, y: -normal.y };
    }

    const refIsA = bestIdx < 2;
    const refBox = refIsA ? A : B;
    const incVerts = refIsA ? vertsB : vertsA;
    const refNormal = refIsA ? normal : { x: -normal.x, y: -normal.y };

    // Reference face tangent & side planes
    const refVerts = refIsA ? vertsA : vertsB;
    const [inc0, inc1] = findIncidentFace(incVerts, refNormal);

    // Find reference face edge matching refNormal
    let bestRefDot = -Infinity;
    let refEdgeIdx = 0;
    for (let i = 0; i < 4; i++) {
      const a = refVerts[i];
      const b = refVerts[(i + 1) % 4];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const len = Math.hypot(ex, ey) || 1;
      const nx = ey / len;
      const ny = -ex / len;
      const d = nx * refNormal.x + ny * refNormal.y;
      if (d > bestRefDot) {
        bestRefDot = d;
        refEdgeIdx = i;
      }
    }

    const r1 = refVerts[refEdgeIdx];
    const r2 = refVerts[(refEdgeIdx + 1) % 4];
    const sideLen = Math.hypot(r2.x - r1.x, r2.y - r1.y) || 1;
    const sideDir = { x: (r2.x - r1.x) / sideLen, y: (r2.y - r1.y) / sideLen };

    let clipped = clipSegmentToLine(inc0, inc1, sideDir, r1.x * sideDir.x + r1.y * sideDir.y);
    if (clipped.length < 2) {
      return {
        normal,
        penetration: minOverlap,
        contacts: [{ x: (inc0.x + inc1.x) * 0.5, y: (inc0.y + inc1.y) * 0.5 }]
      };
    }
    const negSide = { x: -sideDir.x, y: -sideDir.y };
    clipped = clipSegmentToLine(clipped[0], clipped[1], negSide, r2.x * negSide.x + r2.y * negSide.y);

    const refOffset = r1.x * refNormal.x + r1.y * refNormal.y;
    const contacts = [];
    for (const pt of clipped) {
      const sep = pt.x * refNormal.x + pt.y * refNormal.y - refOffset;
      if (sep <= 0.5) {
        contacts.push(pt);
      }
    }

    if (contacts.length === 0) {
      contacts.push({
        x: (refBox.x + (refIsA ? B.x : A.x)) * 0.5,
        y: (refBox.y + (refIsA ? B.y : A.y)) * 0.5
      });
    }

    return { normal, penetration: minOverlap, contacts };
  }

  function collideCircleCircle(A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const rSum = A.r + B.r;
    const distSq = dx * dx + dy * dy;
    if (distSq >= rSum * rSum) return null;
    const dist = Math.sqrt(distSq);
    const normal = dist > 0.0001 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 };
    const penetration = rSum - dist;
    const cp = { x: A.x + normal.x * (A.r - penetration * 0.5), y: A.y + normal.y * (A.r - penetration * 0.5) };
    return { normal, penetration, contacts: [cp] };
  }

  function collideCircleBox(circle, box, circleIsA) {
    const c = Math.cos(-box.angle);
    const s = Math.sin(-box.angle);
    const dx = circle.x - box.x;
    const dy = circle.y - box.y;
    const localX = dx * c - dy * s;
    const localY = dx * s + dy * c;

    const hw = box.w * 0.5;
    const hh = box.h * 0.5;
    const clampedX = Math.max(-hw, Math.min(hw, localX));
    const clampedY = Math.max(-hh, Math.min(hh, localY));

    let diffX = localX - clampedX;
    let diffY = localY - clampedY;
    let distSq = diffX * diffX + diffY * diffY;
    let inside = false;

    if (distSq < 0.00001) {
      inside = true;
      const penX = hw - Math.abs(localX);
      const penY = hh - Math.abs(localY);
      if (penX < penY) {
        diffX = localX >= 0 ? 1 : -1;
        diffY = 0;
        distSq = 1;
      } else {
        diffX = 0;
        diffY = localY >= 0 ? 1 : -1;
        distSq = 1;
      }
    }

    if (!inside && distSq >= circle.r * circle.r) return null;

    const dist = Math.sqrt(distSq);
    let localNx = diffX / dist;
    let localNy = diffY / dist;
    const penetration = inside
      ? circle.r + Math.min(hw - Math.abs(localX), hh - Math.abs(localY))
      : circle.r - dist;

    // Transform normal & contact back to world space (from box to circle)
    const wc = Math.cos(box.angle);
    const ws = Math.sin(box.angle);
    let nx = localNx * wc - localNy * ws;
    let ny = localNx * ws + localNy * wc;

    const cp = {
      x: box.x + (clampedX * wc - clampedY * ws),
      y: box.y + (clampedX * ws + clampedY * wc)
    };

    // Normal must point from A to B
    if (circleIsA) {
      nx = -nx;
      ny = -ny;
    }

    return { normal: { x: nx, y: ny }, penetration, contacts: [cp] };
  }

  function resolvePair(A, B, manifold) {
    const { normal, penetration, contacts } = manifold;
    const totalInvMass = A.invMass + B.invMass;
    if (totalInvMass <= 0) return;

    // Wake up sleeping body if hit strongly
    const relVxApprox = B.vx - A.vx;
    const relVyApprox = B.vy - A.vy;
    const approxSpeed = Math.hypot(relVxApprox, relVyApprox);
    if (approxSpeed > 28) {
      if (A.sleeping) A.sleeping = false;
      if (B.sleeping) B.sleeping = false;
    }
    if (A.sleeping && B.sleeping) return;

    const count = contacts.length;
    let maxImpact = 0;

    for (const cp of contacts) {
      const rAx = cp.x - A.x;
      const rAy = cp.y - A.y;
      const rBx = cp.x - B.x;
      const rBy = cp.y - B.y;

      const vAx = A.vx - A.omega * rAy;
      const vAy = A.vy + A.omega * rAx;
      const vBx = B.vx - B.omega * rBy;
      const vBy = B.vy + B.omega * rBx;

      const rvx = vBx - vAx;
      const rvy = vBy - vAy;
      const velAlongNormal = rvx * normal.x + rvy * normal.y;
      if (velAlongNormal > 0) continue;

      maxImpact = Math.max(maxImpact, -velAlongNormal);

      const rACrossN = rAx * normal.y - rAy * normal.x;
      const rBCrossN = rBx * normal.y - rBy * normal.x;
      const denom =
        A.invMass +
        B.invMass +
        rACrossN * rACrossN * A.invInertia +
        rBCrossN * rBCrossN * B.invInertia;

      const e = -velAlongNormal > 85 ? Math.min(A.restitution, B.restitution) : 0;
      let j = (-(1 + e) * velAlongNormal) / denom;
      j /= count;

      const impX = j * normal.x;
      const impY = j * normal.y;

      if (!A.sleeping) {
        A.vx -= impX * A.invMass;
        A.vy -= impY * A.invMass;
        A.omega -= (rAx * impY - rAy * impX) * A.invInertia;
      }
      if (!B.sleeping) {
        B.vx += impX * B.invMass;
        B.vy += impY * B.invMass;
        B.omega += (rBx * impY - rBy * impX) * B.invInertia;
      }

      // Friction impulse
      const vAx2 = A.vx - A.omega * rAy;
      const vAy2 = A.vy + A.omega * rAx;
      const vBx2 = B.vx - B.omega * rBy;
      const vBy2 = B.vy + B.omega * rBx;
      const rvx2 = vBx2 - vAx2;
      const rvy2 = vBy2 - vAy2;
      const vn2 = rvx2 * normal.x + rvy2 * normal.y;
      let tx = rvx2 - vn2 * normal.x;
      let ty = rvy2 - vn2 * normal.y;
      const tLen = Math.hypot(tx, ty);
      if (tLen > 0.0001) {
        tx /= tLen;
        ty /= tLen;
        const rACrossT = rAx * ty - rAy * tx;
        const rBCrossT = rBx * ty - rBy * tx;
        const denomT =
          A.invMass +
          B.invMass +
          rACrossT * rACrossT * A.invInertia +
          rBCrossT * rBCrossT * B.invInertia;
        let jt = -(rvx2 * tx + rvy2 * ty) / denomT;
        jt /= count;
        const mu = Math.sqrt(A.friction * B.friction);
        jt = Math.max(-j * mu, Math.min(j * mu, jt));

        const fImpX = jt * tx;
        const fImpY = jt * ty;
        if (!A.sleeping) {
          A.vx -= fImpX * A.invMass;
          A.vy -= fImpY * A.invMass;
          A.omega -= (rAx * fImpY - rAy * fImpX) * A.invInertia;
        }
        if (!B.sleeping) {
          B.vx += fImpX * B.invMass;
          B.vy += fImpY * B.invMass;
          B.omega += (rBx * fImpY - rBy * fImpX) * B.invInertia;
        }
      }
    }

    // Positional correction (Baumgarte with slop)
    const slop = 0.6;
    const percent = 0.42;
    const corr = (Math.max(penetration - slop, 0) / totalInvMass) * percent;
    if (corr > 0) {
      if (!A.sleeping) {
        A.x -= corr * A.invMass * normal.x;
        A.y -= corr * A.invMass * normal.y;
      }
      if (!B.sleeping) {
        B.x += corr * B.invMass * normal.x;
        B.y += corr * B.invMass * normal.y;
      }
    }

    // Bird collision flag + bomb fuse
    if (A.kind === "bird" && !A.hasCollided) {
      A.hasCollided = true;
      if (A.birdType === "black" && !A.abilityUsed) A.fuseTimer = 0.9;
    }
    if (B.kind === "bird" && !B.hasCollided) {
      B.hasCollided = true;
      if (B.birdType === "black" && !B.abilityUsed) B.fuseTimer = 0.9;
    }

    // Impact damage & sounds
    if (maxImpact > 115) {
      const effSpeed = maxImpact - 95;
      const mRatioA = B.mass / (A.mass + B.mass);
      const mRatioB = A.mass / (A.mass + B.mass);
      if (A.kind !== "bird") {
        applyDamage(A, effSpeed * (0.28 + mRatioA * 0.45));
      }
      if (B.kind !== "bird") {
        applyDamage(B, effSpeed * (0.28 + mRatioB * 0.45));
      }
      const soundMat =
        A.kind === "block" ? A.material : B.kind === "block" ? B.material : "wood";
      window.soundFX.playImpact(soundMat, Math.min(1, maxImpact / 520));
      if (maxImpact > 340) {
        screenShake = Math.max(screenShake, 5);
      }
    }
  }

  function resolveGround(b) {
    if (b.dead || b.sleeping) return;

    if (b.shape === "circle") {
      const pen = b.y + b.r - GROUND_Y;
      if (pen > 0) {
        const impact = -b.vy;
        b.y -= pen;
        if (b.vy > 0) {
          const e = b.vy > 85 ? b.restitution : 0;
          b.vy = -b.vy * e;
          b.vx *= 0.86;
          b.omega = (b.vx / b.r) * 0.35;
        }
        if (b.kind === "bird" && !b.hasCollided) {
          b.hasCollided = true;
          if (b.birdType === "black" && !b.abilityUsed) b.fuseTimer = 0.9;
        }
        if (impact > 180 && b.kind !== "bird") {
          applyDamage(b, (impact - 150) * 0.35);
          window.soundFX.playImpact(b.material || "wood", Math.min(1, impact / 500));
        }
      }
      return;
    }

    const verts = getBoxVertices(b);
    const below = verts.filter((v) => v.y > GROUND_Y);
    if (below.length === 0) return;

    let maxPen = 0;
    for (const v of below) {
      maxPen = Math.max(maxPen, v.y - GROUND_Y);
    }
    b.y -= maxPen;

    for (const cp of below) {
      const rx = cp.x - b.x;
      const ry = cp.y - b.y;
      const vx = b.vx - b.omega * ry;
      const vy = b.vy + b.omega * rx;
      if (vy > 0) {
        const e = vy > 85 ? b.restitution : 0;
        const rCrossN = rx * -1; // normal = (0, -1)
        const denom = b.invMass + rCrossN * rCrossN * b.invInertia;
        const j = (-(1 + e) * -vy) / denom / below.length;
        b.vy -= j * b.invMass;
        b.omega += (rx * -j) * b.invInertia;

        // Horizontal ground friction
        const jt = Math.max(-j * b.friction, Math.min(j * b.friction, -vx / denom / below.length));
        b.vx += jt * b.invMass;
        b.omega += (-ry * jt) * b.invInertia;

        if (vy > 185) {
          applyDamage(b, (vy - 155) * 0.3);
          window.soundFX.playImpact(b.material, Math.min(1, vy / 500));
        }
      }
    }
  }

  function stepPhysics(dt) {
    const substeps = 3;
    const h = dt / substeps;
    const all = [...bodies, ...activeBirds].filter((b) => !b.dead);

    for (let s = 0; s < substeps; s++) {
      for (const b of all) {
        if (b.dead || b.sleeping) continue;
        b.vy += GRAVITY * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.angle += b.omega * h;
        b.vx *= 0.998;
        b.omega *= 0.988;
      }

      // Pairwise collisions
      for (let i = 0; i < all.length; i++) {
        const A = all[i];
        if (A.dead) continue;
        for (let j = i + 1; j < all.length; j++) {
          const B = all[j];
          if (B.dead) continue;
          if (A.sleeping && B.sleeping) continue;
          if (A.kind === "bird" && B.kind === "bird") continue;

          let manifold = null;
          if (A.shape === "box" && B.shape === "box") {
            manifold = collideBoxBox(A, B);
          } else if (A.shape === "circle" && B.shape === "circle") {
            manifold = collideCircleCircle(A, B);
          } else if (A.shape === "circle" && B.shape === "box") {
            manifold = collideCircleBox(A, B, true);
          } else {
            manifold = collideCircleBox(B, A, false);
          }
          if (manifold) {
            resolvePair(A, B, manifold);
          }
        }
        resolveGround(A);
      }
    }

    // Update sleep timers, bomb fuses, trails & cleanup off-screen
    for (const b of all) {
      if (b.dead) continue;

      if (b.kind === "bird") {
        b.flightTime += dt;
        if (!b.hasCollided && b.flightTime < 4 && Math.random() < 0.45) {
          trailDots.push({
            x: b.x,
            y: b.y,
            r: b.birdType === "pink" ? 4.5 : 3.2,
            color: b.birdType === "pink" ? "#ff85a1" : "rgba(255,255,255,0.75)",
            life: 1.0
          });
        }
        if (b.fuseTimer > 0) {
          b.fuseTimer -= dt;
          if (b.fuseTimer <= 0 && !b.abilityUsed) {
            b.abilityUsed = true;
            window.soundFX.playAbility("black");
            explodeAt(b.x, b.y, 170, 860, 220);
            b.dead = true;
          }
        }
        if (b.x > WORLD_W + 90 || b.x < -120 || b.y > WORLD_H + 80) {
          b.dead = true;
        }
      } else {
        // Offscreen pigs/blocks die
        if (b.x > WORLD_W + 100 || b.x < -100 || b.y > WORLD_H + 100) {
          if (b.kind === "pig") destroyBody(b);
          else b.dead = true;
        }
        // Sleep settling for non-bird bodies
        if (!b.sleeping) {
          const spd = Math.hypot(b.vx, b.vy);
          if (spd < 14 && Math.abs(b.omega) < 0.35 && b.y > 200) {
            b.sleepTimer += dt;
            if (b.sleepTimer > 0.5) {
              b.sleeping = true;
              b.vx = 0;
              b.vy = 0;
              b.omega = 0;
            }
          } else {
            b.sleepTimer = 0;
          }
        }
      }
    }

    bodies = bodies.filter((b) => !b.dead);
    activeBirds = activeBirds.filter((b) => !b.dead);
  }

  function updateGameplay(dt) {
    stepPhysics(dt);

    const remainingPigs = bodies.filter((b) => b.kind === "pig" && !b.dead).length;
    const anyMoving =
      bodies.some((b) => !b.sleeping && Math.hypot(b.vx, b.vy) > 22) ||
      activeBirds.some((b) => Math.hypot(b.vx, b.vy) > 26 || b.fuseTimer > 0);

    if (remainingPigs === 0) {
      postWinTimer += dt;
      if (postWinTimer > 0.95) {
        triggerWin();
      }
      return;
    }

    if (!currentBird) {
      if (!anyMoving) {
        settleTimer += dt;
        if (settleTimer > 0.65) {
          settleTimer = 0;
          if (birdQueue.length > 0) {
            activeBirds = [];
            loadNextBird();
            window.soundFX.playBirdChirp(1.1);
          } else {
            triggerLose();
          }
        }
      } else {
        settleTimer = 0;
        // Safety timeout so a slowly rolling bird doesn't stall forever
        if (activeBirds.every((b) => b.flightTime > 5.5)) {
          activeBirds = [];
        }
      }
    }
  }

  function triggerWin() {
    if (mode === "won") return;
    mode = "won";

    // Award unused bird bonus
    const unusedCount = birdQueue.length + (currentBird ? 1 : 0);
    if (unusedCount > 0) {
      score += unusedCount * 8000;
      updateHUD();
    }

    const lvl = LEVELS[selectedLevelIndex];
    const earnedStars = lvl.starThresholds.filter((t) => score >= t).length;
    const stars = Math.max(1, earnedStars);

    winScoreEl.textContent = score.toLocaleString();
    heartsSentCount = 12;
    winHeartsEl.textContent = `💖 ${heartsSentCount}`;

    const isLast = selectedLevelIndex >= LEVELS.length - 1;
    btnNextLevel.textContent = isLast ? "Play Level 1 ➡" : "Next Level ➡";

    // Reset star classes & animate sequentially
    [1, 2, 3].forEach((n) => {
      document.getElementById(`star-${n}`).classList.remove("earned");
    });

    winOverlay.classList.remove("hidden");
    startCelebrationShow();
    window.soundFX.playHappyBirthdaySong();

    for (let i = 1; i <= stars; i++) {
      setTimeout(() => {
        document.getElementById(`star-${i}`).classList.add("earned");
        window.soundFX.playStar(i - 1);
      }, i * 320);
    }
  }

  function triggerLose() {
    if (mode === "lost") return;
    mode = "lost";
    window.soundFX.playLose();
    loseOverlay.classList.remove("hidden");
  }

  // -------------------- CELEBRATION SHOW (HEARTS, BIRDS, FIREWORKS) --------------------
  function clearCelebration() {
    celHearts = [];
    celBirds = [];
    celConfetti = [];
    celFireworks = [];
    celCtx.clearRect(0, 0, WORLD_W, WORLD_H);
  }

  function spawnCelebrationBurst(cx, cy) {
    const heartColors = ["#ff2a6d", "#ff6b9d", "#ff99c8", "#ff477e", "#ffd166"];
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 190;
      celHearts.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        size: 12 + Math.random() * 14,
        color: heartColors[i % heartColors.length],
        wobble: Math.random() * 6,
        alpha: 1,
        rise: false
      });
    }
    const birdTypes = ["red", "yellow", "pink", "black"];
    celBirds.push({
      x: -40,
      y: 90 + Math.random() * 340,
      vx: 150 + Math.random() * 110,
      vy: (Math.random() - 0.5) * 40,
      type: birdTypes[Math.floor(Math.random() * birdTypes.length)],
      flap: Math.random() * 6,
      dir: 1
    });
  }

  function spawnFirework(x, y) {
    const palette = ["#ff4d8d", "#ffd43b", "#4dabf7", "#52e367", "#da77f2", "#ff922b"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + Math.random() * 0.15;
      const spd = 90 + Math.random() * 170;
      celFireworks.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        life: 0.9 + Math.random() * 0.45,
        size: 3.5 + Math.random() * 2.5
      });
    }
    window.soundFX.playFirework();
  }

  function startCelebrationShow() {
    clearCelebration();
    const birdTypes = ["red", "yellow", "pink", "red", "pink"];
    for (let i = 0; i < 5; i++) {
      const fromLeft = i % 2 === 0;
      celBirds.push({
        x: fromLeft ? -50 - i * 90 : WORLD_W + 50 + i * 90,
        y: 95 + i * 85,
        vx: (fromLeft ? 1 : -1) * (135 + Math.random() * 65),
        vy: 0,
        type: birdTypes[i],
        flap: i * 1.1,
        dir: fromLeft ? 1 : -1
      });
    }
    for (let i = 0; i < 45; i++) {
      celConfetti.push({
        x: Math.random() * WORLD_W,
        y: -Math.random() * WORLD_H,
        vx: (Math.random() - 0.5) * 60,
        vy: 85 + Math.random() * 110,
        w: 8 + Math.random() * 6,
        h: 5 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        omega: (Math.random() - 0.5) * 7,
        color: ["#ff4d8d", "#ffd43b", "#4dabf7", "#52e367", "#ff922b"][i % 5]
      });
    }
    spawnFirework(260, 170);
    setTimeout(() => {
      if (mode === "won") spawnFirework(1020, 165);
    }, 360);
  }

  function updateAndDrawCelebration(dt) {
    celCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    if (mode !== "won") return;

    celSpawnTimer += dt;
    if (celSpawnTimer > 0.22) {
      celSpawnTimer = 0;
      const heartColors = ["#ff2a6d", "#ff6b9d", "#ff85a1", "#e64980", "#ffd166"];
      celHearts.push({
        x: 60 + Math.random() * (WORLD_W - 120),
        y: WORLD_H + 20,
        vx: (Math.random() - 0.5) * 35,
        vy: -(85 + Math.random() * 85),
        size: 13 + Math.random() * 13,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        wobble: Math.random() * 6,
        alpha: 0.95,
        rise: true
      });
      if (Math.random() < 0.12) {
        spawnFirework(140 + Math.random() * (WORLD_W - 280), 90 + Math.random() * 180);
      }
    }

    // Confetti
    for (const c of celConfetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.angle += c.omega * dt;
      if (c.y > WORLD_H + 20) {
        c.y = -15;
        c.x = Math.random() * WORLD_W;
      }
      celCtx.save();
      celCtx.translate(c.x, c.y);
      celCtx.rotate(c.angle);
      celCtx.fillStyle = c.color;
      celCtx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      celCtx.restore();
    }

    // Fireworks
    for (const f of celFireworks) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 170 * dt;
      f.life -= dt;
      celCtx.globalAlpha = Math.max(0, f.life);
      celCtx.fillStyle = f.color;
      celCtx.beginPath();
      celCtx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      celCtx.fill();
    }
    celCtx.globalAlpha = 1;
    celFireworks = celFireworks.filter((f) => f.life > 0);

    // Flying Birthday Birds carrying hearts!
    for (const b of celBirds) {
      b.flap += dt * 11;
      b.x += b.vx * dt;
      b.y += Math.sin(b.flap * 0.45) * 45 * dt + b.vy * dt;
      if (b.dir === 1 && b.x > WORLD_W + 80) b.x = -80;
      if (b.dir === -1 && b.x < -80) b.x = WORLD_W + 80;

      celCtx.save();
      celCtx.translate(b.x, b.y);
      if (b.dir === -1) celCtx.scale(-1, 1);
      drawBirdSprite(celCtx, b.type, 22, true, Math.sin(b.flap) * 6);
      celCtx.restore();

      if (Math.random() < 0.08) {
        celHearts.push({
          x: b.x,
          y: b.y + 8,
          vx: (Math.random() - 0.5) * 20,
          vy: -45 - Math.random() * 35,
          size: 9 + Math.random() * 5,
          color: "#ff4d8d",
          wobble: Math.random() * 5,
          alpha: 0.9,
          rise: true
        });
      }
    }

    // Floating Hearts
    for (const h of celHearts) {
      h.wobble += dt * 4;
      h.x += (h.vx + Math.sin(h.wobble) * 18) * dt;
      h.y += h.vy * dt;
      if (!h.rise) {
        h.vy += 180 * dt;
        h.alpha -= dt * 0.75;
      } else if (h.y < -35) {
        h.alpha = 0;
      }
      if (h.alpha > 0) {
        celCtx.save();
        celCtx.globalAlpha = Math.max(0, h.alpha);
        drawHeart(celCtx, h.x, h.y, h.size, h.color);
        celCtx.restore();
      }
    }
    celHearts = celHearts.filter((h) => h.alpha > 0);
  }

  // -------------------- RENDERING --------------------
  function drawHeart(c, x, y, size, color) {
    c.save();
    c.translate(x, y);
    c.fillStyle = color;
    c.beginPath();
    const s = size * 0.5;
    c.moveTo(0, s * 0.65);
    c.bezierCurveTo(-s * 1.4, -s * 0.3, -s * 0.75, -s * 1.35, 0, -s * 0.45);
    c.bezierCurveTo(s * 0.75, -s * 1.35, s * 1.4, -s * 0.3, 0, s * 0.65);
    c.fill();
    c.restore();
  }

  function drawBackground(dt) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, "#4ea8de");
    sky.addColorStop(0.55, "#89d2f7");
    sky.addColorStop(1, "#d8f3dc");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD_W, GROUND_Y);

    // Sun glow
    ctx.save();
    const sunGrad = ctx.createRadialGradient(130, 105, 15, 130, 105, 120);
    sunGrad.addColorStop(0, "#fff9db");
    sunGrad.addColorStop(0.35, "#ffe066");
    sunGrad.addColorStop(1, "rgba(255, 224, 102, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(130, 105, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Drifting clouds
    for (const cl of clouds) {
      cl.x += cl.speed * dt;
      if (cl.x > WORLD_W + 140) cl.x = -140;
      ctx.save();
      ctx.translate(cl.x, cl.y);
      ctx.scale(cl.scale, cl.scale);
      ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.arc(28, -10, 36, 0, Math.PI * 2);
      ctx.arc(62, -2, 28, 0, Math.PI * 2);
      ctx.arc(32, 10, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Distant hills
    ctx.fillStyle = "#74c69d";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(220, 470, 480, GROUND_Y);
    ctx.quadraticCurveTo(790, 440, 1080, GROUND_Y);
    ctx.quadraticCurveTo(1200, 520, WORLD_W, 560);
    ctx.lineTo(WORLD_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Closer hills
    ctx.fillStyle = "#52b788";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.quadraticCurveTo(150, 540, 360, GROUND_Y);
    ctx.quadraticCurveTo(640, 525, 920, GROUND_Y);
    ctx.quadraticCurveTo(1120, 535, WORLD_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Ground soil & grass
    ctx.fillStyle = "#6c3f1d";
    ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
    ctx.fillStyle = "#8a5228";
    ctx.fillRect(0, GROUND_Y + 18, WORLD_W, 18);

    ctx.fillStyle = "#40916c";
    ctx.fillRect(0, GROUND_Y - 6, WORLD_W, 16);
    ctx.fillStyle = "#52b788";
    ctx.fillRect(0, GROUND_Y - 6, WORLD_W, 7);
  }

  function drawBirdSprite(c, type, r, withPartyHat = false, wingOffset = 0) {
    const spec = BIRD_SPECS[type] || BIRD_SPECS.red;

    // Tail feathers
    c.fillStyle = "#2b2d42";
    c.beginPath();
    c.moveTo(-r * 0.85, -3);
    c.lineTo(-r * 1.38, -10);
    c.lineTo(-r * 1.28, 0);
    c.lineTo(-r * 1.38, 9);
    c.closePath();
    c.fill();

    // Crest feather
    c.fillStyle = spec.crest;
    c.beginPath();
    c.ellipse(-2, -r - 4, 8, 5, -0.4, 0, Math.PI * 2);
    c.fill();

    // Body
    c.fillStyle = spec.color;
    c.strokeStyle = "#2b1608";
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Belly highlight
    c.fillStyle = spec.belly;
    c.beginPath();
    c.arc(2, r * 0.42, r * 0.56, 0, Math.PI);
    c.fill();

    // Optional flapping wing (for celebration birds!)
    if (withPartyHat) {
      c.fillStyle = spec.crest;
      c.beginPath();
      c.ellipse(-r * 0.25, wingOffset * 0.45, r * 0.42, r * 0.22, -0.3 + wingOffset * 0.06, 0, Math.PI * 2);
      c.fill();
    }

    // Eyes
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(r * 0.28, -r * 0.16, r * 0.24, 0, Math.PI * 2);
    c.arc(r * 0.62, -r * 0.16, r * 0.21, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#111";
    c.beginPath();
    c.arc(r * 0.34, -r * 0.16, r * 0.1, 0, Math.PI * 2);
    c.arc(r * 0.66, -r * 0.16, r * 0.09, 0, Math.PI * 2);
    c.fill();

    // Determined Angry Birds eyebrows
    c.strokeStyle = "#1b1108";
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(r * 0.05, -r * 0.42);
    c.lineTo(r * 0.46, -r * 0.28);
    c.lineTo(r * 0.84, -r * 0.4);
    c.stroke();

    // Beak
    c.fillStyle = "#ff9f1c";
    c.beginPath();
    c.moveTo(r * 0.45, 0);
    c.lineTo(r * 1.12, r * 0.14);
    c.lineTo(r * 0.45, r * 0.34);
    c.closePath();
    c.fill();
    c.strokeStyle = "#5c3614";
    c.lineWidth = 1.5;
    c.stroke();

    // Cute birthday party hat on Pink bird or celebration birds
    if (withPartyHat || type === "pink") {
      c.fillStyle = "#ffd43b";
      c.strokeStyle = "#9c1458";
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-7, -r + 2);
      c.lineTo(3, -r - 18);
      c.lineTo(12, -r + 2);
      c.closePath();
      c.fill();
      c.stroke();

      c.fillStyle = "#ff4d8d";
      c.beginPath();
      c.arc(3, -r - 19, 4, 0, Math.PI * 2);
      c.fill();
    }
  }

  function drawPig(p, dt) {
    p.blinkTimer -= dt;
    if (p.blinkTimer < -0.15) p.blinkTimer = 2 + Math.random() * 2.5;
    const blinking = p.blinkTimer < 0;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Ears
    ctx.fillStyle = "#69db7c";
    ctx.strokeStyle = "#1b4332";
    ctx.lineWidth = 2.2;
    [-p.r * 0.58, p.r * 0.58].forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, -p.r * 0.72, p.r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Body
    ctx.fillStyle = "#8ce99a";
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Party hat or King Crown!
    if (p.king) {
      ctx.fillStyle = "#ffd43b";
      ctx.strokeStyle = "#9c5200";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -p.r + 3);
      ctx.lineTo(-16, -p.r - 16);
      ctx.lineTo(-5, -p.r - 7);
      ctx.lineTo(0, -p.r - 20);
      ctx.lineTo(5, -p.r - 7);
      ctx.lineTo(16, -p.r - 16);
      ctx.lineTo(14, -p.r + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = p.hatColor;
      ctx.strokeStyle = "#3c1e08";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-8, -p.r + 2);
      ctx.lineTo(0, -p.r - 16);
      ctx.lineTo(8, -p.r + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd43b";
      ctx.beginPath();
      ctx.arc(0, -p.r - 17, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    if (blinking) {
      ctx.strokeStyle = "#1b4332";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.5, -2);
      ctx.lineTo(-p.r * 0.25, -2);
      ctx.moveTo(p.r * 0.25, -2);
      ctx.lineTo(p.r * 0.5, -2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-p.r * 0.36, -p.r * 0.1, p.r * 0.2, 0, Math.PI * 2);
      ctx.arc(p.r * 0.36, -p.r * 0.1, p.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(-p.r * 0.36, -p.r * 0.1, p.r * 0.08, 0, Math.PI * 2);
      ctx.arc(p.r * 0.36, -p.r * 0.1, p.r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snout
    ctx.fillStyle = "#b2f2bb";
    ctx.strokeStyle = "#2b8a3e";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, p.r * 0.18, p.r * 0.36, p.r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1b4332";
    ctx.beginPath();
    ctx.arc(-p.r * 0.13, p.r * 0.18, p.r * 0.07, 0, Math.PI * 2);
    ctx.arc(p.r * 0.13, p.r * 0.18, p.r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Bruise / worried expression if damaged
    if (p.hp < p.maxHp * 0.65) {
      ctx.strokeStyle = "#2b8a3e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, p.r * 0.55, p.r * 0.16, 0, Math.PI, true);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawBlock(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    const hw = b.w * 0.5;
    const hh = b.h * 0.5;
    const dmgRatio = 1 - b.hp / b.maxHp;

    if (b.material === "glass") {
      ctx.fillStyle = "rgba(165, 243, 252, 0.72)";
      ctx.strokeStyle = "#22b8cf";
      ctx.lineWidth = 2.2;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
      // Shine stripe
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(-hw + 3, -hh + 3, Math.max(4, b.w * 0.22), b.h - 6);
    } else if (b.material === "stone") {
      ctx.fillStyle = "#868e96";
      ctx.strokeStyle = "#343a40";
      ctx.lineWidth = 2.4;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
      ctx.fillStyle = "#adb5bd";
      ctx.fillRect(-hw + 3, -hh + 3, b.w - 6, 4);
    } else if (b.material === "tnt") {
      ctx.fillStyle = "#e03131";
      ctx.strokeStyle = "#5c1010";
      ctx.lineWidth = 2.5;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
      ctx.fillStyle = "#fff3bf";
      ctx.fillRect(-hw + 3, -9, b.w - 6, 18);
      ctx.fillStyle = "#c92a2a";
      ctx.font = "900 13px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TNT", 0, 1);
    } else if (b.material === "gift") {
      ctx.fillStyle = "#ff66a3";
      ctx.strokeStyle = "#9c1458";
      ctx.lineWidth = 2.4;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
      // Golden ribbon
      ctx.fillStyle = "#ffd43b";
      ctx.fillRect(-4, -hh, 8, b.h);
      ctx.fillRect(-hw, -4, b.w, 8);
    } else {
      // Wood
      ctx.fillStyle = "#d08540";
      ctx.strokeStyle = "#5c3310";
      ctx.lineWidth = 2.2;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
      ctx.strokeStyle = "rgba(92, 51, 16, 0.35)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-hw + 4, 0);
      ctx.lineTo(hw - 4, 0);
      ctx.stroke();
    }

    // Cracks when damaged
    if (dmgRatio > 0.35) {
      ctx.strokeStyle = "rgba(25, 25, 25, 0.6)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, -hh * 0.4);
      ctx.lineTo(0, 0);
      ctx.lineTo(hw * 0.45, hh * 0.25);
      if (dmgRatio > 0.65) {
        ctx.moveTo(hw * 0.2, -hh * 0.45);
        ctx.lineTo(-hw * 0.1, hh * 0.4);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSlingshotBack() {
    // Back wooden fork
    ctx.strokeStyle = "#4a2810";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y);
    ctx.lineTo(SLING_X, SLING_Y + 34);
    ctx.lineTo(SLING_X + 16, SLING_Y - 2);
    ctx.stroke();

    // Back rubber band
    const anchorX = SLING_X + 16;
    const anchorY = SLING_Y - 2;
    const pullX = currentBird ? currentBird.x : anchorX;
    const pullY = currentBird ? currentBird.y : anchorY;
    ctx.strokeStyle = "#3a1d0c";
    ctx.lineWidth = currentBird && isDragging ? 6 : 7;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(pullX, pullY);
    ctx.stroke();
  }

  function drawSlingshotFront() {
    const anchorX = SLING_X - 15;
    const anchorY = SLING_Y + 2;
    const pullX = currentBird ? currentBird.x : anchorX;
    const pullY = currentBird ? currentBird.y : anchorY;

    // Front rubber band
    ctx.strokeStyle = "#5c2f14";
    ctx.lineWidth = currentBird && isDragging ? 6 : 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(pullX, pullY);
    ctx.stroke();

    // Front wooden fork
    ctx.strokeStyle = "#6c3b17";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 36);
    ctx.lineTo(anchorX, anchorY);
    ctx.stroke();
  }

  function drawAimTrajectory() {
    if (!currentBird || !isDragging) return;
    const dx = SLING_X - currentBird.x;
    const dy = SLING_Y - currentBird.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14) return;

    const vx = dx * LAUNCH_SPEED_SCALE;
    const vy = dy * LAUNCH_SPEED_SCALE;
    for (let i = 1; i <= 14; i++) {
      const t = i * 0.075;
      const px = currentBird.x + vx * t;
      const py = currentBird.y + vy * t + 0.5 * GRAVITY * t * t;
      if (py > GROUND_Y) break;
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - i / 16})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2.5, 6 - i * 0.26), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWaitingQueue(timeSec) {
    birdQueue.forEach((type, idx) => {
      const x = SLING_X - 65 - idx * 46;
      const hop = Math.abs(Math.sin(timeSec * 3.2 + idx * 1.1)) * 7;
      const spec = BIRD_SPECS[type];
      const y = GROUND_Y - spec.r - hop;
      ctx.save();
      ctx.translate(x, y);
      drawBirdSprite(ctx, type, spec.r * 0.88, false, 0);
      ctx.restore();
    });
  }

  function drawWorld(dt, nowSec) {
    ctx.save();
    if (screenShake > 0.2) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      screenShake *= 0.86;
    } else {
      screenShake = 0;
    }

    drawBackground(dt);

    // Waiting birds & slingshot
    drawWaitingQueue(nowSec);
    drawSlingshotBack();

    // Trail dots
    for (const d of trailDots) {
      d.life -= dt * 0.65;
      if (d.life > 0) {
        ctx.save();
        ctx.globalAlpha = d.life;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    trailDots = trailDots.filter((d) => d.life > 0);

    drawAimTrajectory();

    // Current bird on slingshot
    if (currentBird) {
      ctx.save();
      ctx.translate(currentBird.x, currentBird.y);
      drawBirdSprite(ctx, currentBird.birdType, currentBird.r, false, 0);
      ctx.restore();
    }

    drawSlingshotFront();

    // Blocks & Pigs
    for (const b of bodies) {
      if (b.dead) continue;
      if (b.kind === "block") drawBlock(b);
      else if (b.kind === "pig") drawPig(b, dt);
    }

    // Active flying birds
    for (const bird of activeBirds) {
      if (bird.dead) continue;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.angle);
      drawBirdSprite(ctx, bird.birdType, bird.r, false, 0);
      ctx.restore();
    }

    // Debris & heart particles
    for (const p of particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.angle += p.omega * dt;
      if (p.life > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        if (p.shape === "heart") {
          drawHeart(ctx, p.x, p.y, p.size, p.color);
        } else if (p.shape === "circle") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.35, p.size, p.size * 0.7);
        }
        ctx.restore();
      }
    }
    particles = particles.filter((p) => p.life > 0);

    // Floating score popups
    for (const pop of popups) {
      pop.life -= dt * 0.9;
      pop.y += pop.vy * dt;
      if (pop.life > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, pop.life * 1.4);
        ctx.font = "900 22px Trebuchet MS, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#2b1608";
        ctx.strokeText(pop.text, pop.x, pop.y);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      }
    }
    popups = popups.filter((p) => p.life > 0);

    ctx.restore();
  }

  // -------------------- INPUT HANDLING --------------------
  function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WORLD_W,
      y: ((clientY - rect.top) / rect.height) * WORLD_H
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    window.soundFX.unlock();
    if (mode !== "playing") return;

    const pos = getCanvasPos(e.clientX, e.clientY);
    if (currentBird) {
      const dist = Math.hypot(pos.x - currentBird.x, pos.y - currentBird.y);
      if (dist <= 65 || Math.hypot(pos.x - SLING_X, pos.y - SLING_Y) <= 70) {
        isDragging = true;
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    // If a bird is mid-air, clicking anywhere triggers its special ability!
    if (activeBirds.length > 0) {
      triggerAbility();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isDragging || !currentBird || mode !== "playing") return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    let dx = pos.x - SLING_X;
    let dy = pos.y - SLING_Y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_PULL) {
      dx = (dx / dist) * MAX_PULL;
      dy = (dy / dist) * MAX_PULL;
    }
    // Keep above ground
    if (SLING_Y + dy > GROUND_Y - currentBird.r - 4) {
      dy = GROUND_Y - currentBird.r - 4 - SLING_Y;
    }
    currentBird.x = SLING_X + dx;
    currentBird.y = SLING_Y + dy;
    window.soundFX.playStretch(Math.min(1, dist / MAX_PULL));
  });

  function releaseSlingshot() {
    if (!isDragging || !currentBird) return;
    isDragging = false;

    const dx = SLING_X - currentBird.x;
    const dy = SLING_Y - currentBird.y;
    const pull = Math.hypot(dx, dy);
    if (pull < 18) {
      // Snap back gently if barely pulled
      currentBird.x = SLING_X;
      currentBird.y = SLING_Y;
      return;
    }

    currentBird.vx = dx * LAUNCH_SPEED_SCALE;
    currentBird.vy = dy * LAUNCH_SPEED_SCALE;
    currentBird.launched = true;
    activeBirds.push(currentBird);
    window.soundFX.playLaunch(currentBird.birdType);
    currentBird = null;
  }

  canvas.addEventListener("pointerup", releaseSlingshot);
  canvas.addEventListener("pointercancel", releaseSlingshot);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && mode === "playing") {
      e.preventDefault();
      triggerAbility();
    } else if (e.code === "KeyR" && mode === "playing") {
      loadLevel(selectedLevelIndex);
    }
  });

  // Click anywhere on win overlay background for extra hearts & birds!
  winOverlay.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    window.soundFX.unlock();
    const pos = getCanvasPos(e.clientX, e.clientY);
    spawnCelebrationBurst(pos.x, pos.y);
    window.soundFX.playHeartPop();
    heartsSentCount += 5;
    winHeartsEl.textContent = `💖 ${heartsSentCount}`;
  });

  // UI Button Bindings
  document.querySelectorAll(".level-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".level-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedLevelIndex = Number(chip.dataset.level) || 0;
      window.soundFX.unlock();
      window.soundFX.playBirdChirp(1.15);
    });
  });

  document.getElementById("btn-play").addEventListener("click", () => {
    window.soundFX.unlock();
    window.soundFX.playBirdChirp(1.2);
    loadLevel(selectedLevelIndex);
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    window.soundFX.unlock();
    loadLevel(selectedLevelIndex);
  });

  document.getElementById("btn-menu").addEventListener("click", () => {
    window.soundFX.stopSong();
    clearCelebration();
    mode = "menu";
    hudEl.classList.add("hidden");
    winOverlay.classList.add("hidden");
    loseOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
  });

  btnSound.addEventListener("click", () => {
    window.soundFX.unlock();
    const nextMuted = !window.soundFX.isMuted();
    window.soundFX.setMuted(nextMuted);
    btnSound.textContent = nextMuted ? "🔇" : "🔊";
  });

  document.getElementById("btn-celebrate-more").addEventListener("click", () => {
    window.soundFX.unlock();
    spawnCelebrationBurst(WORLD_W * 0.3, WORLD_H * 0.45);
    spawnCelebrationBurst(WORLD_W * 0.7, WORLD_H * 0.45);
    spawnFirework(WORLD_W * 0.5, 140);
    heartsSentCount += 10;
    winHeartsEl.textContent = `💖 ${heartsSentCount}`;
    window.soundFX.playHappyBirthdaySong();
  });

  btnNextLevel.addEventListener("click", () => {
    window.soundFX.unlock();
    loadLevel(selectedLevelIndex + 1);
  });

  document.getElementById("btn-replay-win").addEventListener("click", () => {
    window.soundFX.unlock();
    loadLevel(selectedLevelIndex);
  });

  document.getElementById("btn-retry").addEventListener("click", () => {
    window.soundFX.unlock();
    loadLevel(selectedLevelIndex);
  });

  document.getElementById("btn-lose-menu").addEventListener("click", () => {
    mode = "menu";
    hudEl.classList.add("hidden");
    loseOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
  });

  // -------------------- MAIN LOOP --------------------
  initClouds();
  // Show Level 1 tower alive in the background behind the start menu!
  const preview = LEVELS[0].build();
  bodies = [...preview.blocks, ...preview.pigs];
  birdQueue = [...LEVELS[0].birds];

  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;

    if (mode === "playing") {
      updateGameplay(dt);
    }
    drawWorld(dt, now / 1000);
    updateAndDrawCelebration(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
