import * as THREE from "three";
import { createCharacterMesh, updateCharacterVisuals, triggerMuzzleFlash } from "./CharacterModel.js";
import { getTerrainHeight } from "./WorldBuilder.js";
import { WEAPONS } from "./WeaponSystem.js";
import { sounds } from "../audio/SoundManager.js";

const BOT_NAMES = [
  "Viper_99", "ShadowSniper", "DeltaGhost", "StormRider", "NightHawk",
  "BravoSix", "IronClad", "Raven_X", "Wolfpack", "ApexHunter",
  "ZeroCool", "Reaper42", "CobraKai", "Phoenix", "Titan_7",
  "Blaze_X", "GhostRider", "CyberSam", "Striker_01", "Maverick",
  "Spectre_8", "Wolverine", "Frostbite", "KevlarKing", "Deadshot"
];

const HOTSPOTS = [
  { x: -18, z: -16 },
  { x: -35, z: -22 },
  { x: 4, z: -25 },
  { x: 65, z: -35 },
  { x: 45, z: -15 },
  { x: -45, z: 45 },
  { x: 30, z: 50 },
  { x: -65, z: -10 }
];

export function createBots(count = 20, scene) {
  const bots = [];

  for (let i = 0; i < count; i++) {
    const name = BOT_NAMES[i % BOT_NAMES.length];
    const targetHotspot = HOTSPOTS[i % HOTSPOTS.length];
    const dropX = targetHotspot.x + (Math.random() - 0.5) * 50;
    const dropZ = targetHotspot.z + (Math.random() - 0.5) * 50;
    const dropY = 120 + Math.random() * 60;

    const possibleWeapons = ["m4a1", "thompson", "shotgun", "m4a1", "awm"];
    const weaponId = possibleWeapons[i % possibleWeapons.length];

    const charMesh = createCharacterMesh({
      isPlayer: false,
      skinIndex: i + 1,
      shirtColor: [0x52796f, 0x4a4e69, 0x6b4226, 0x3d405b, 0x582f2f][i % 5],
      initialWeapon: weaponId
    });
    charMesh.position.set(dropX, dropY, dropZ);
    scene.add(charMesh);

    bots.push({
      id: `bot_${i}`,
      name,
      mesh: charMesh,
      hitBox: charMesh.userData.hitBox,
      x: dropX,
      y: dropY,
      z: dropZ,
      hp: 100,
      shield: i % 2 === 0 ? 50 : 0,
      helmetLevel: i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0),
      vestLevel: i % 2 === 0 ? 1 : 0,
      weaponId,
      weapon: WEAPONS[weaponId] || WEAPONS.m4a1,
      state: "PARACHUTE",
      targetX: targetHotspot.x,
      targetZ: targetHotspot.z,
      fireTimer: 0,
      strafeDir: Math.random() > 0.5 ? 1 : -1,
      strafeTimer: 0,
      moveSpeed: 4.8 + Math.random() * 1.5,
      alive: true,
      descentSpeed: 20 + Math.random() * 8,
      tickOffset: i % 2
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
  bullets,
  scene,
  dt,
  frameCount = 0
}) {
  bots.forEach(bot => {
    if (!bot.alive) return;

    // Distance LOD optimization: Distant bots (>90m) skip alternate frames
    const distToPlayer = Math.hypot(playerPos.x - bot.x, playerPos.z - bot.z);
    if (distToPlayer > 90 && (frameCount + bot.tickOffset) % 2 !== 0 && bot.state !== "PARACHUTE") {
      return;
    }

    // --- 1. PARACHUTE PHASE ---
    if (bot.state === "PARACHUTE") {
      bot.y -= bot.descentSpeed * dt;
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
        bot.state = "PATROL";
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

    // --- 2. GROUND NAVIGATION & COMBAT ---
    const groundY = getTerrainHeight(bot.x, bot.z);
    bot.y = groundY;

    // Storm Check
    const distFromCenter = Math.hypot(bot.x - safeZone.x, bot.z - safeZone.z);
    if (distFromCenter > safeZone.radius) {
      bot.hp -= dt * safeZone.damage;
      if (bot.hp <= 0) {
        killBot(bot, scene, onBotKilled, onKillEvent, "Electric Storm");
        return;
      }
      bot.state = "FLEE_STORM";
    }

    let currentTarget = null;
    let targetDist = Infinity;

    if (playerHp > 0 && distToPlayer < 70) {
      currentTarget = { type: "player", pos: playerPos };
      targetDist = distToPlayer;
    }

    if (!currentTarget || targetDist > 40) {
      for (let i = 0; i < bots.length; i++) {
        const other = bots[i];
        if (!other.alive || other === bot || other.state === "PARACHUTE") continue;
        const oDist = Math.hypot(other.x - bot.x, other.z - bot.z);
        if (oDist < 45 && oDist < targetDist) {
          currentTarget = { type: "bot", entity: other, pos: other };
          targetDist = oDist;
          break;
        }
      }
    }

    if (bot.state === "FLEE_STORM") {
      const dx = safeZone.x - bot.x;
      const dz = safeZone.z - bot.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 5) {
        const step = (bot.moveSpeed + 1.8) * dt;
        bot.x += (dx / dist) * step;
        bot.z += (dz / dist) * step;
        bot.mesh.rotation.y = Math.atan2(dx, dz);
      } else {
        bot.state = "PATROL";
      }
    } else if (currentTarget && targetDist < 60) {
      bot.state = "ENGAGE";
      const dx = currentTarget.pos.x - bot.x;
      const dz = currentTarget.pos.z - bot.z;
      const angle = Math.atan2(dx, dz);
      bot.mesh.rotation.y = angle;

      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir *= -1;
        bot.strafeTimer = 1.0 + Math.random() * 1.5;
      }

      const perpX = Math.cos(angle) * bot.strafeDir;
      const perpZ = -Math.sin(angle) * bot.strafeDir;

      let forwardSpeed = targetDist > 25 ? 2.2 : (targetDist < 10 ? -2.2 : 0);
      bot.x += (Math.sin(angle) * forwardSpeed + perpX * 2.5) * dt;
      bot.z += (Math.cos(angle) * forwardSpeed + perpZ * 2.5) * dt;

      bot.fireTimer -= dt;
      if (bot.fireTimer <= 0) {
        executeBotShot(bot, currentTarget, scene, bullets, onPlayerHit, playerPos, onBotKilled, onKillEvent, distToPlayer);
        bot.fireTimer = bot.weapon.fireRate * (1.1 + Math.random() * 0.4);
      }
    } else {
      bot.state = "PATROL";
      const dx = bot.targetX - bot.x;
      const dz = bot.targetZ - bot.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 4 || Math.random() < 0.005) {
        const hotspot = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
        bot.targetX = hotspot.x + (Math.random() - 0.5) * 35;
        bot.targetZ = hotspot.z + (Math.random() - 0.5) * 35;
      } else {
        const step = bot.moveSpeed * dt;
        bot.x += (dx / dist) * step;
        bot.z += (dz / dist) * step;
        bot.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }

    bot.mesh.position.set(bot.x, bot.y, bot.z);
    updateCharacterVisuals(bot.mesh, {
      speed: bot.state === "ENGAGE" ? 2.5 : 4.5,
      isGrounded: true,
      isAiming: bot.state === "ENGAGE",
      weaponId: bot.weaponId,
      helmetLevel: bot.helmetLevel,
      vestLevel: bot.vestLevel,
      dt
    });
  });
}

function executeBotShot(bot, target, scene, bullets, onPlayerHit, playerPos, onBotKilled, onKillEvent, distToPlayer) {
  triggerMuzzleFlash(bot.mesh);

  if (distToPlayer < 120) {
    const panX = (bot.x - playerPos.x) / 100;
    sounds.playSpatialShoot(bot.weaponId, distToPlayer, panX);
  }

  // Only spawn visible tracer if reasonably close to player
  if (distToPlayer < 75) {
    const dx = target.pos.x - bot.x;
    const dy = (target.pos.y || 1.5) - (bot.y + 1.5);
    const dz = target.pos.z - bot.z;
    const dir = new THREE.Vector3(dx, dy, dz).normalize();

    const tracer = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffcc44 })
    );
    tracer.position.set(bot.x, bot.y + 1.5, bot.z);
    scene.add(tracer);
    bullets.push({ mesh: tracer, dir, speed: 140, life: 0.4 });
  }

  const hitChance = Math.max(0.2, 0.65 - distToPlayer * 0.008);
  if (Math.random() < hitChance) {
    const rawDamage = bot.weapon.damage * (0.65 + Math.random() * 0.35);

    if (target.type === "player") {
      onPlayerHit(Math.round(rawDamage), bot.name, bot.x, bot.z);
    } else if (target.type === "bot" && target.entity && target.entity.alive) {
      const victim = target.entity;
      if (victim.shield > 0) {
        const absorbed = Math.min(victim.shield, rawDamage);
        victim.shield -= absorbed;
        victim.hp -= (rawDamage - absorbed);
      } else {
        victim.hp -= rawDamage;
      }

      if (victim.hp <= 0) {
        killBot(victim, scene, onBotKilled, onKillEvent, bot.name, bot.weapon.name);
      }
    }
  }
}

function killBot(bot, scene, onBotKilled, onKillEvent, killerName, weaponName = "M4A1") {
  if (!bot.alive) return;
  bot.alive = false;
  scene.remove(bot.mesh);

  onKillEvent({
    killer: killerName,
    victim: bot.name,
    weapon: weaponName,
    isHeadshot: Math.random() < 0.25
  });

  onBotKilled(bot);
}
