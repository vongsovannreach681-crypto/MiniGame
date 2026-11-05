import * as THREE from "three";
import { createCharacterMesh, updateCharacterVisuals, triggerMuzzleFlash } from "./CharacterModel.js";
import { getTerrainHeight, spawnLoot } from "./WorldBuilder.js";
import { WEAPONS } from "./WeaponSystem.js";
import { sounds } from "../audio/SoundManager.js";

const BOT_NAMES = [
  "Viper_99", "ShadowSniper", "DeltaGhost", "StormRider", "NightHawk",
  "BravoSix", "IronClad", "Raven_X", "Wolfpack", "ApexHunter",
  "ZeroCool", "Reaper42", "CobraKai", "Phoenix", "Titan_7",
  "Blaze_X", "GhostRider", "CyberSam", "Striker_01", "Maverick",
  "Spectre_8", "Wolverine", "Frostbite", "KevlarKing", "Deadshot",
  "BulletProof", "Phantom", "Slayer99", "AlphaOne", "Vanguard"
];

const HOTSPOTS = [
  { x: -18, z: -16 }, // Central Town
  { x: -35, z: -22 }, // Town West
  { x: 4, z: -25 },   // Town East
  { x: 65, z: -35 },  // Harbor
  { x: 45, z: -15 },  // Harbor Piers
  { x: -45, z: 45 },  // Radar Base
  { x: -30, z: 32 },  // Radar Hill
  { x: 30, z: 50 },   // Windmills
  { x: -65, z: -10 }  // Lumber Mill
];

export function createBots(count = 25, scene) {
  const bots = [];

  for (let i = 0; i < count; i++) {
    const name = BOT_NAMES[i % BOT_NAMES.length];
    const targetHotspot = HOTSPOTS[i % HOTSPOTS.length];
    const dropX = targetHotspot.x + (Math.random() - 0.5) * 55;
    const dropZ = targetHotspot.z + (Math.random() - 0.5) * 55;
    const dropY = 140 + Math.random() * 80;

    const charMesh = createCharacterMesh({
      isPlayer: false,
      skinIndex: i + 1,
      shirtColor: [0x52796f, 0x4a4e69, 0x6b4226, 0x3d405b, 0x582f2f][i % 5]
    });
    charMesh.position.set(dropX, dropY, dropZ);
    scene.add(charMesh);

    // Initial loadout assigned
    const possibleWeapons = ["m4a1", "thompson", "shotgun", "m4a1", "awm"];
    const weaponId = possibleWeapons[i % possibleWeapons.length];

    bots.push({
      id: `bot_${i}`,
      name,
      mesh: charMesh,
      x: dropX,
      y: dropY,
      z: dropZ,
      vx: 0,
      vz: 0,
      hp: 100,
      shield: i % 2 === 0 ? 50 : 0,
      maxHp: 100,
      maxShield: 100,
      helmetLevel: i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0),
      vestLevel: i % 2 === 0 ? 1 : 0,
      weaponId,
      weapon: WEAPONS[weaponId],
      state: "PARACHUTE", // PARACHUTE, LOOT, PATROL, ENGAGE, FLEE_STORM
      targetX: targetHotspot.x,
      targetZ: targetHotspot.z,
      targetEntity: null,
      fireTimer: 0,
      burstCount: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 0,
      moveSpeed: 4.8 + Math.random() * 1.5,
      alive: true,
      descentSpeed: 18 + Math.random() * 8,
      killCount: 0
    });
  }

  return bots;
}

export function updateBots({
  bots,
  playerPos,
  playerHp,
  onPlayerHit,
  onBotKilled,
  onKillEvent,
  safeZone,
  obstacles,
  bullets,
  scene,
  dt
}) {
  bots.forEach(bot => {
    if (!bot.alive) return;

    // --- 1. PARACHUTE PHASE ---
    if (bot.state === "PARACHUTE") {
      bot.y -= bot.descentSpeed * dt;
      // Drift toward landing hotspot
      const dx = bot.targetX - bot.x;
      const dz = bot.targetZ - bot.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 2) {
        bot.x += (dx / dist) * 12 * dt;
        bot.z += (dz / dist) * 12 * dt;
        bot.mesh.rotation.y = Math.atan2(dx, dz);
      }

      const groundY = getTerrainHeight(bot.x, bot.z);
      if (bot.y <= groundY + 0.5) {
        bot.y = groundY;
        bot.state = "PATROL"; // Touchdown!
        bot.mesh.userData.parachuteGroup.visible = false;
      }

      bot.mesh.position.set(bot.x, bot.y, bot.z);
      updateCharacterVisuals(bot.mesh, {
        speed: 10,
        isGrounded: false,
        isParachuting: true,
        weaponId: bot.weaponId,
        helmetLevel: bot.helmetLevel,
        vestLevel: bot.vestLevel,
        dt
      });
      return;
    }

    // --- 2. GROUND NAVIGATION & BEHAVIOR ---
    const groundY = getTerrainHeight(bot.x, bot.z);
    bot.y = groundY;

    // Storm Damage Check
    const distFromCenter = Math.hypot(bot.x - safeZone.x, bot.z - safeZone.z);
    if (distFromCenter > safeZone.radius) {
      bot.hp -= dt * safeZone.damage;
      if (bot.hp <= 0) {
        killBot(bot, scene, onBotKilled, onKillEvent, "Electric Storm");
        return;
      }
      bot.state = "FLEE_STORM";
    }

    // Determine Targets (Player or Other Bots)
    let currentTarget = null;
    let targetDist = Infinity;

    // Check Player distance
    if (playerHp > 0) {
      const pDist = Math.hypot(playerPos.x - bot.x, playerPos.z - bot.z);
      if (pDist < 75) {
        currentTarget = { type: "player", pos: playerPos, hp: playerHp };
        targetDist = pDist;
      }
    }

    // Check Other Bots
    if (!currentTarget || targetDist > 45) {
      bots.forEach(other => {
        if (!other.alive || other === bot || other.state === "PARACHUTE") return;
        const oDist = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (oDist < 60 && oDist < targetDist) {
          currentTarget = { type: "bot", entity: other, pos: other, hp: other.hp };
          targetDist = oDist;
        }
      });
    }

    // State Logic
    if (bot.state === "FLEE_STORM") {
      // Sprint directly to center of safe zone
      const dx = safeZone.x - bot.x;
      const dz = safeZone.z - bot.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 5) {
        const step = (bot.moveSpeed + 2.0) * dt;
        bot.x += (dx / dist) * step;
        bot.z += (dz / dist) * step;
        bot.mesh.rotation.y = Math.atan2(dx, dz);
      } else {
        bot.state = "PATROL";
      }
    } else if (currentTarget && targetDist < 65) {
      // --- COMBAT STATE ---
      bot.state = "ENGAGE";
      const dx = currentTarget.pos.x - bot.x;
      const dz = currentTarget.pos.z - bot.z;
      const angle = Math.atan2(dx, dz);
      bot.mesh.rotation.y = angle;

      // Strafe sideways during firefight
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir *= -1;
        bot.strafeTimer = 1.0 + Math.random() * 1.5;
      }

      // Move while keeping distance
      const perpX = Math.cos(angle) * bot.strafeDir;
      const perpZ = -Math.sin(angle) * bot.strafeDir;

      let forwardSpeed = 0;
      if (targetDist > 30) forwardSpeed = 2.5; // close in
      if (targetDist < 12) forwardSpeed = -2.5; // back up

      const moveX = (Math.sin(angle) * forwardSpeed + perpX * 2.8) * dt;
      const moveZ = (Math.cos(angle) * forwardSpeed + perpZ * 2.8) * dt;

      // Basic obstacle avoid
      bot.x += moveX;
      bot.z += moveZ;

      // Fire weapon
      bot.fireTimer -= dt;
      if (bot.fireTimer <= 0) {
        executeBotShot(bot, currentTarget, scene, bullets, onPlayerHit, playerPos, onBotKilled, onKillEvent);
        bot.fireTimer = bot.weapon.fireRate * (1.1 + Math.random() * 0.4);
      }
    } else {
      // --- PATROL / WANDER ---
      bot.state = "PATROL";
      const dx = bot.targetX - bot.x;
      const dz = bot.targetZ - bot.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4 || Math.random() < 0.005) {
        // Pick new patrol point
        const hotspot = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
        bot.targetX = hotspot.x + (Math.random() - 0.5) * 40;
        bot.targetZ = hotspot.z + (Math.random() - 0.5) * 40;
      } else {
        const step = bot.moveSpeed * dt;
        bot.x += (dx / dist) * step;
        bot.z += (dz / dist) * step;
        bot.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }

    bot.mesh.position.set(bot.x, bot.y, bot.z);
    updateCharacterVisuals(bot.mesh, {
      speed: bot.state === "ENGAGE" ? 3.0 : (bot.state === "FLEE_STORM" ? 6.5 : 4.5),
      isGrounded: true,
      isAiming: bot.state === "ENGAGE",
      weaponId: bot.weaponId,
      helmetLevel: bot.helmetLevel,
      vestLevel: bot.vestLevel,
      dt
    });
  });
}

function executeBotShot(bot, target, scene, bullets, onPlayerHit, playerPos, onBotKilled, onKillEvent) {
  triggerMuzzleFlash(bot.mesh);

  // Distant audio with 3D stereo panning
  const distToPlayer = Math.hypot(bot.x - playerPos.x, bot.z - playerPos.z);
  const panX = (bot.x - playerPos.x) / 100;
  sounds.playSpatialShoot(bot.weaponId, distToPlayer, panX);

  // Direction with realistic bot inaccuracy spread
  const accuracy = 0.065;
  const dx = target.pos.x - bot.x + (Math.random() - 0.5) * accuracy * distToPlayer;
  const dy = (target.pos.y || 1.5) - (bot.y + 1.5) + (Math.random() - 0.5) * 0.5;
  const dz = target.pos.z - bot.z + (Math.random() - 0.5) * accuracy * distToPlayer;
  const dir = new THREE.Vector3(dx, dy, dz).normalize();

  // Bullet tracer
  const tracer = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcc44 })
  );
  tracer.position.set(bot.x, bot.y + 1.5, bot.z);
  scene.add(tracer);
  bullets.push({
    mesh: tracer,
    origin: new THREE.Vector3(bot.x, bot.y + 1.5, bot.z),
    dir,
    speed: 140,
    life: 0.6
  });

  // Hit calculation
  const hitChance = Math.max(0.2, 0.7 - distToPlayer * 0.007);
  if (Math.random() < hitChance) {
    const rawDamage = bot.weapon.damage * (0.65 + Math.random() * 0.4);

    if (target.type === "player") {
      onPlayerHit(Math.round(rawDamage), bot.name, bot.x, bot.z);
    } else if (target.type === "bot" && target.entity && target.entity.alive) {
      const victim = target.entity;
      // Shield absorbs first
      if (victim.shield > 0) {
        const absorbed = Math.min(victim.shield, rawDamage);
        victim.shield -= absorbed;
        victim.hp -= (rawDamage - absorbed);
      } else {
        victim.hp -= rawDamage;
      }

      if (victim.hp <= 0) {
        bot.killCount++;
        killBot(victim, scene, onBotKilled, onKillEvent, bot.name, bot.weapon.name);
      }
    }
  }
}

function killBot(bot, scene, onBotKilled, onKillEvent, killerName, weaponName = "M4A1") {
  if (!bot.alive) return;
  bot.alive = false;

  // Drop Death Crate with high-tier loot
  spawnDeathCrate(scene, bot.x, bot.y, bot.z, bot);

  // Remove character mesh
  scene.remove(bot.mesh);

  onKillEvent({
    killer: killerName,
    victim: bot.name,
    weapon: weaponName,
    isHeadshot: Math.random() < 0.25
  });

  onBotKilled(bot);
}

function spawnDeathCrate(scene, x, y, z, bot) {
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x27ae60,
    roughness: 0.5,
    metalness: 0.4
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.2), crateMat);
  crate.position.set(x, y + 0.45, z);
  crate.castShadow = true;
  scene.add(crate);

  // Green beacon light
  const light = new THREE.PointLight(0x2ecc71, 1.5, 6);
  light.position.set(x, y + 1.2, z);
  scene.add(light);
}
