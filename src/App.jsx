import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { sounds } from "./audio/SoundManager.js";
import { WEAPONS, HELMETS, VESTS, MEDS } from "./game/WeaponSystem.js";
import { createCharacterMesh, updateCharacterVisuals, triggerMuzzleFlash } from "./game/CharacterModel.js";
import { buildWorld, getTerrainHeight, spawnLoot } from "./game/WorldBuilder.js";
import { createBots, updateBots } from "./game/BotAI.js";
import { AirdropManager } from "./game/Airdrop.js";
import { ZoneSystem } from "./game/ZoneSystem.js";

import HUD from "./components/HUD.jsx";
import Minimap from "./components/Minimap.jsx";
import TacticalMap from "./components/TacticalMap.jsx";
import ScopeOverlay from "./components/ScopeOverlay.jsx";
import ParachuteOverlay from "./components/ParachuteOverlay.jsx";
import KillFeed from "./components/KillFeed.jsx";
import Menu from "./components/Menu.jsx";
import GameOverModal from "./components/GameOverModal.jsx";
import TouchControls from "./components/TouchControls.jsx";

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export default function App() {
  const mountRef = useRef(null);

  // Detect Mobile / Touch Capability
  const [isMobile] = useState(() => {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  });

  // Game UI States
  const [inMenu, setInMenu] = useState(true);
  const [paused, setPaused] = useState(false);
  const [tacticalMapOpen, setTacticalMapOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [spectating, setSpectating] = useState(false);

  // Performance Settings (Defaults to performance on mobile for solid 60 FPS)
  const [graphicsQuality, setGraphicsQuality] = useState(() => {
    return isMobile ? "performance" : "balanced";
  });
  const [sensitivity, setSensitivity] = useState(1.0);
  const [volume, setVolume] = useState(0.8);

  // HUD State
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(0);
  const [boost, setBoost] = useState(0);
  const [helmetLevel, setHelmetLevel] = useState(0);
  const [vestLevel, setVestLevel] = useState(0);

  const [activeWeaponId, setActiveWeaponId] = useState("fists");
  const [weaponSlots, setWeaponSlots] = useState([WEAPONS.fists]);
  const [ammo, setAmmo] = useState(0);
  const [reserve, setReserve] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [reloadTimer, setReloadTimer] = useState(0);

  const [kills, setKills] = useState(0);
  const [headshots, setHeadshots] = useState(0);
  const [damageDealt, setDamageDealt] = useState(0);
  const [aliveCount, setAliveCount] = useState(21);
  const [survivalTime, setSurvivalTime] = useState(0);

  const [dropState, setDropState] = useState("IN_PLANE");
  const [altitude, setAltitude] = useState(220);
  const [airspeed, setAirspeed] = useState(50);

  const [interactionPrompt, setInteractionPrompt] = useState(null);
  const [drivingVehicle, setDrivingVehicle] = useState(null);
  const [hitmarker, setHitmarker] = useState(null);
  const [damageFlash, setDamageFlash] = useState(false);
  const [isAiming, setIsAiming] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  const [zoneInfo, setZoneInfo] = useState({
    x: 0,
    z: 0,
    radius: 135,
    nextX: 0,
    nextZ: 0,
    nextRadius: 85,
    state: "WAITING",
    timer: 40,
    damage: 2.5
  });

  const [killEvents, setKillEvents] = useState([]);
  const [gunfirePings, setGunfirePings] = useState([]);
  const [playerMapPos, setPlayerMapPos] = useState({ x: 0, z: 0 });
  const [playerMapYaw, setPlayerMapYaw] = useState(0);

  // Engine References
  const engineRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    bots: [],
    obstacles: [],
    lootItems: [],
    vehicles: [],
    bullets: [],
    airdropManager: null,
    zoneSystem: null,
    windTurbines: [],
    clouds: null,
    keys: {},
    mouse: { x: 0, y: 0, isDown: false, isRightDown: false },
    touchMove: { x: 0, y: 0, sprint: false },
    yaw: 0,
    pitch: 0.25,
    recoilKick: 0,
    playerPos: new THREE.Vector3(0, 220, -100),
    playerVel: new THREE.Vector3(0, 0, 0),
    planePos: new THREE.Vector3(-140, 220, -140),
    planeDir: new THREE.Vector3(1, 0, 1).normalize(),
    planeMesh: null,
    isGrounded: true,
    activeVehicle: null,
    inventory: {
      weapons: [WEAPONS.fists],
      activeIdx: 0,
      ammoPool: { "5.56mm": 60, ".45 ACP": 80, "12 Gauge": 18, ".300 Mag": 10 },
      magPool: { m4a1: 30, thompson: 40, shotgun: 6, awm: 5, fists: 0 },
      medkits: 1,
      bandages: 3,
      energyDrinks: 2
    },
    fireCooldown: 0,
    reloadProgress: 0,
    pointerLocked: false,
    frameCount: 0
  });

  // Start / Restart Match
  const startGame = useCallback(() => {
    setInMenu(false);
    setGameOver(false);
    setWon(false);
    setSpectating(false);
    setHp(100);
    setShield(0);
    setBoost(0);
    setHelmetLevel(0);
    setVestLevel(0);
    setKills(0);
    setHeadshots(0);
    setDamageDealt(0);
    setAliveCount(21);
    setSurvivalTime(0);
    setDropState("IN_PLANE");
    setAltitude(220);
    setActiveWeaponId("fists");
    setWeaponSlots([WEAPONS.fists]);

    const eng = engineRef.current;
    eng.inventory.weapons = [WEAPONS.fists];
    eng.inventory.activeIdx = 0;
    eng.planePos.set(-140, 220, -140);
    eng.playerPos.set(-140, 220, -140);
    eng.playerVel.set(0, 0, 0);
    eng.activeVehicle = null;

    if (eng.renderer && !isMobile) {
      eng.renderer.domElement.requestPointerLock?.();
    }
  }, [isMobile]);

  // Eject from Plane
  const ejectFromPlane = useCallback(() => {
    const eng = engineRef.current;
    if (dropState !== "IN_PLANE") return;
    setDropState("FREEFALL");
    sounds.playWindRush?.();
    eng.playerPos.copy(eng.planePos);
    eng.playerVel.set(eng.planeDir.x * 25, -20, eng.planeDir.z * 25);
  }, [dropState]);

  // Open Parachute
  const deployParachute = useCallback(() => {
    if (dropState !== "FREEFALL") return;
    setDropState("GLIDING");
    sounds.playParachuteOpen();
    const eng = engineRef.current;
    eng.playerVel.y = -8;
  }, [dropState]);

  // Switch Active Weapon
  const switchWeapon = useCallback((weaponId) => {
    const eng = engineRef.current;
    const idx = eng.inventory.weapons.findIndex(w => w.id === weaponId);
    if (idx !== -1) {
      eng.inventory.activeIdx = idx;
      const w = eng.inventory.weapons[idx];
      setActiveWeaponId(w.id);
      setAmmo(eng.inventory.magPool[w.id] || 0);
      setReserve(eng.inventory.ammoPool[w.ammoType] || 0);
      setReloading(false);
      eng.reloadProgress = 0;
      sounds.playClick(sounds.ctx?.currentTime || 0, 1000, 0.05);
    }
  }, []);

  // Use Healing / Boost Meds
  const useMed = useCallback((medType) => {
    const eng = engineRef.current;
    if (medType === "medkit" && eng.inventory.medkits > 0 && hp < 100) {
      eng.inventory.medkits--;
      sounds.playHeal();
      setHp(100);
    } else if (medType === "bandage" && eng.inventory.bandages > 0 && hp < 75) {
      eng.inventory.bandages--;
      sounds.playHeal();
      setHp(prev => Math.min(75, prev + 15));
    } else if (medType === "energyDrink" && eng.inventory.energyDrinks > 0) {
      eng.inventory.energyDrinks--;
      sounds.playPickup();
      setBoost(prev => Math.min(100, prev + 40));
    }
  }, [hp]);

  // Three.js Mount & Main Loop
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- RENDERER INITIALIZATION (Optimized for 60 FPS) ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 400);

    const isPerf = graphicsQuality === "performance";
    const pixelRatio = isPerf || isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isPerf,
      powerPreference: "high-performance",
      precision: isPerf ? "mediump" : "highp"
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);

    if (graphicsQuality === "high") {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      renderer.shadowMap.enabled = false;
    }
    mount.appendChild(renderer.domElement);

    // Build Island Arena
    const worldData = buildWorld(scene, graphicsQuality);

    // Build Cargo Transport Plane
    const planeMat = new THREE.MeshLambertMaterial({ color: 0x3d494f });
    const planeMesh = new THREE.Group();
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 34, 8), planeMat);
    fuselage.rotation.z = Math.PI / 2;
    planeMesh.add(fuselage);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(42, 0.5, 7), planeMat);
    planeMesh.add(wings);
    scene.add(planeMesh);

    // Player Character Mesh
    const playerMesh = createCharacterMesh({ isPlayer: true, skinIndex: 0, shirtColor: 0x1f3a4d });
    scene.add(playerMesh);

    // Initialize 20 Optimized AI Bots
    const bots = createBots(20, scene);

    // Airdrop & Zone Systems
    const airdropManager = new AirdropManager(scene);
    const zoneSystem = new ZoneSystem(scene);

    // Engine Reference Cache
    const eng = engineRef.current;
    eng.scene = scene;
    eng.camera = camera;
    eng.renderer = renderer;
    eng.player = playerMesh;
    eng.bots = bots;
    eng.obstacles = worldData.obstacles;
    eng.lootItems = worldData.lootItems;
    eng.vehicles = worldData.vehicles;
    eng.airdropManager = airdropManager;
    eng.zoneSystem = zoneSystem;
    eng.windTurbines = worldData.windTurbines;
    eng.clouds = worldData.clouds;
    eng.planeMesh = planeMesh;

    // --- EVENT LISTENERS ---
    const canvas = renderer.domElement;

    const onKeyDown = e => {
      eng.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === "KeyF") {
        if (dropState === "IN_PLANE") {
          ejectFromPlane();
        } else if (eng.activeVehicle) {
          eng.activeVehicle.isOccupied = false;
          eng.playerPos.add(new THREE.Vector3(2.5, 0, 0));
          eng.activeVehicle = null;
          setDrivingVehicle(null);
          sounds.updateEngine(0, false);
        } else {
          checkInteract(eng);
        }
      }

      if (e.code === "Space" && dropState === "FREEFALL") deployParachute();
      if (e.code === "Digit1" && eng.inventory.weapons[0]) switchWeapon(eng.inventory.weapons[0].id);
      if (e.code === "Digit2" && eng.inventory.weapons[1]) switchWeapon(eng.inventory.weapons[1].id);
      if (e.code === "Digit3" && eng.inventory.weapons[2]) switchWeapon(eng.inventory.weapons[2].id);
      if (e.code === "KeyR") handleReload(eng);
      if (e.code === "KeyH") useMed("medkit");
      if (e.code === "KeyM") setTacticalMapOpen(prev => !prev);
      if (e.code === "KeyC") setIsCrouching(prev => !prev);
    };

    const onKeyUp = e => { eng.keys[e.code] = false; };

    const onMouseDown = e => {
      if (isMobile) return;
      if (e.button === 0) {
        if (!eng.pointerLocked) {
          canvas.requestPointerLock?.();
          return;
        }
        eng.mouse.isDown = true;
        handleShoot(eng);
      } else if (e.button === 2) {
        e.preventDefault();
        eng.mouse.isRightDown = true;
        setIsAiming(true);
      }
    };

    const onMouseUp = e => {
      if (isMobile) return;
      if (e.button === 0) eng.mouse.isDown = false;
      if (e.button === 2) {
        eng.mouse.isRightDown = false;
        setIsAiming(false);
      }
    };

    const onMouseMove = e => {
      if (!eng.pointerLocked) return;
      const sens = 0.0022 * sensitivity;
      eng.yaw -= e.movementX * sens;
      eng.pitch = clamp(eng.pitch + e.movementY * sens, -0.6, 0.95);
    };

    const onPointerLockChange = () => {
      eng.pointerLocked = document.pointerLockElement === canvas;
    };

    const onContextMenu = e => e.preventDefault();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", onResize);

    // --- GAME INTERACTION & HIGH-SPEED SHOOTING ---
    function checkInteract(engine) {
      const nearbyVehicle = engine.vehicles.find(
        v => Math.hypot(v.x - engine.playerPos.x, v.z - engine.playerPos.z) < 4.0
      );
      if (nearbyVehicle) {
        engine.activeVehicle = nearbyVehicle;
        nearbyVehicle.isOccupied = true;
        setDrivingVehicle(nearbyVehicle);
        sounds.playPickup();
        return;
      }

      const lootIndex = engine.lootItems.findIndex(
        l => l.active && Math.hypot(l.x - engine.playerPos.x, l.z - engine.playerPos.z) < 3.0
      );
      if (lootIndex !== -1) {
        const item = engine.lootItems[lootIndex];
        item.active = false;
        scene.remove(item.mesh);
        sounds.playPickup();

        if (WEAPONS[item.type]) {
          const newWep = WEAPONS[item.type];
          const exists = engine.inventory.weapons.find(w => w.id === newWep.id);
          if (!exists) {
            engine.inventory.weapons.push(newWep);
            setWeaponSlots([...engine.inventory.weapons]);
          }
          engine.inventory.magPool[newWep.id] = newWep.magSize;
          switchWeapon(newWep.id);
        } else if (item.type.startsWith("vest")) {
          const lvl = parseInt(item.type.replace("vest", ""), 10);
          setVestLevel(lvl);
          setShield(VESTS[lvl].maxShield);
        } else if (item.type.startsWith("helmet")) {
          const lvl = parseInt(item.type.replace("helmet", ""), 10);
          setHelmetLevel(lvl);
        } else if (item.type === "medkit") {
          engine.inventory.medkits++;
        } else if (item.type === "bandage") {
          engine.inventory.bandages += 3;
        } else if (item.type === "energyDrink") {
          engine.inventory.energyDrinks++;
        } else if (item.type.startsWith("ammo")) {
          const map = { ammo556: "5.56mm", ammo45: ".45 ACP", ammo12g: "12 Gauge" };
          const t = map[item.type] || "5.56mm";
          engine.inventory.ammoPool[t] = (engine.inventory.ammoPool[t] || 0) + 60;
          const currW = engine.inventory.weapons[engine.inventory.activeIdx];
          if (currW && currW.ammoType === t) setReserve(engine.inventory.ammoPool[t]);
        }
      }
    }

    function handleShoot(engine) {
      if (gameOver || paused || dropState !== "GROUND" || engine.activeVehicle) return;
      const currentWep = engine.inventory.weapons[engine.inventory.activeIdx] || WEAPONS.fists;

      if (engine.fireCooldown > 0 || engine.reloadProgress > 0) return;

      if (currentWep.id !== "fists") {
        const curMag = engine.inventory.magPool[currentWep.id] || 0;
        if (curMag <= 0) {
          handleReload(engine);
          return;
        }
        engine.inventory.magPool[currentWep.id] = curMag - 1;
        setAmmo(curMag - 1);
      }

      engine.fireCooldown = currentWep.fireRate;
      engine.recoilKick = currentWep.recoil;
      triggerMuzzleFlash(engine.player);
      sounds.playShoot(currentWep.id);

      // Gunfire ping on minimap
      setGunfirePings(prev => [
        ...prev.slice(-4),
        { x: engine.playerPos.x, z: engine.playerPos.z, time: Date.now() }
      ]);

      // FAST O(N) RAYCASTING (Tests only bot hitboxes, NO recursive mesh traversal!)
      const pellets = currentWep.pellets || 1;
      const activeBots = engine.bots.filter(b => b.alive && b.hitBox);
      const hitBoxes = activeBots.map(b => b.hitBox);

      for (let p = 0; p < pellets; p++) {
        const spreadFactor = eng.mouse.isRightDown
          ? currentWep.adsSpread
          : (isCrouching ? currentWep.spread * 0.5 : currentWep.spread);

        const spreadX = (Math.random() - 0.5) * spreadFactor;
        const spreadY = (Math.random() - 0.5) * spreadFactor;

        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

        const hits = ray.intersectObjects(hitBoxes, false); // non-recursive!

        if (hits.length > 0 && hits[0].distance < currentWep.range) {
          const hit = hits[0];
          const targetBot = activeBots.find(b => b.hitBox === hit.object);

          if (targetBot && targetBot.alive) {
            const isHead = hit.point.y > targetBot.y + 1.6;
            let dmg = isHead
              ? currentWep.damage * currentWep.headshotMult
              : currentWep.damage;

            if (isHead && targetBot.helmetLevel > 0) {
              dmg *= 1 - HELMETS[targetBot.helmetLevel].reduction;
            }

            dmg = Math.round(dmg);
            setDamageDealt(prev => prev + dmg);

            sounds.playHit(isHead);
            setHitmarker({ isHeadshot: isHead, damage: dmg });
            setTimeout(() => setHitmarker(null), 300);

            if (targetBot.shield > 0) {
              const absorbed = Math.min(targetBot.shield, dmg);
              targetBot.shield -= absorbed;
              targetBot.hp -= (dmg - absorbed);
            } else {
              targetBot.hp -= dmg;
            }

            if (targetBot.hp <= 0) {
              targetBot.alive = false;
              scene.remove(targetBot.mesh);
              setKills(prev => prev + 1);
              if (isHead) setHeadshots(prev => prev + 1);

              addKillEvent({
                killer: "Player",
                victim: targetBot.name,
                weapon: currentWep.name,
                isHeadshot: isHead,
                isPlayer: true
              });
            }
          }
        }

        // Lightweight Tracer
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.x += spreadX;
        dir.y += spreadY;
        dir.normalize();

        const tracer = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0xffea88 })
        );
        tracer.position.copy(camera.position).addScaledVector(dir, 1.8);
        scene.add(tracer);
        engine.bullets.push({ mesh: tracer, dir, speed: 180, life: 0.35 });
      }
    }

    function handleReload(engine) {
      const curW = engine.inventory.weapons[engine.inventory.activeIdx];
      if (!curW || curW.id === "fists" || engine.reloadProgress > 0) return;

      const mag = engine.inventory.magPool[curW.id] || 0;
      const need = curW.magSize - mag;
      const res = engine.inventory.ammoPool[curW.ammoType] || 0;

      if (need > 0 && res > 0) {
        setReloading(true);
        sounds.playReload();
        engine.reloadProgress = 0.01;
      }
    }

    function addKillEvent(event) {
      setKillEvents(prev => [
        { ...event, id: Date.now() + Math.random() },
        ...prev.slice(0, 4)
      ]);
      setAliveCount(eng.bots.filter(b => b.alive).length + (hp > 0 ? 1 : 0));
    }

    eng.handleShoot = () => handleShoot(eng);
    eng.handleReload = () => handleReload(eng);
    eng.checkInteract = () => checkInteract(eng);

    // --- ANIMATION FRAME LOOP ---
    const clock = new THREE.Clock();
    let animId = null;

    const dummyObj = new THREE.Object3D();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.04);
      eng.frameCount++;

      if (inMenu) {
        const t = clock.getElapsedTime() * 0.15;
        camera.position.set(Math.sin(t) * 90, 45, Math.cos(t) * 90);
        camera.lookAt(0, 15, 0);
        renderer.render(scene, camera);
        return;
      }

      if (paused) {
        renderer.render(scene, camera);
        return;
      }

      // Wind Turbines (smooth 30fps update)
      if (eng.frameCount % 2 === 0) {
        eng.windTurbines.forEach(wt => {
          if (wt.rotor) wt.rotor.rotation.z += dt * 3.6;
        });
      }

      // Airdrop System
      eng.airdropManager.update(dt, text => {
        addKillEvent({ killer: "SYSTEM", victim: text, weapon: "CARGO" });
      }, eng.lootItems);

      // Zone System
      const zData = eng.zoneSystem.update(dt, warn => {
        addKillEvent({ killer: "ZONE", victim: warn, weapon: "BLUE STORM" });
      });
      setZoneInfo(zData);

      setSurvivalTime(prev => prev + dt);

      // --- 1. PARACHUTE / FLIGHT PHASE ---
      if (dropState === "IN_PLANE") {
        eng.planePos.addScaledVector(eng.planeDir, 45 * dt);
        eng.planeMesh.position.copy(eng.planePos);
        eng.planeMesh.rotation.y = -Math.atan2(eng.planeDir.z, eng.planeDir.x);
        eng.playerPos.copy(eng.planePos);

        if (Math.hypot(eng.planePos.x, eng.planePos.z) > 130) ejectFromPlane();

        camera.position.set(eng.planePos.x - 22, eng.planePos.y + 12, eng.planePos.z - 22);
        camera.lookAt(eng.planePos.x, eng.planePos.y, eng.planePos.z);
        setAltitude(eng.planePos.y);
        setAirspeed(45);
      } else if (dropState === "FREEFALL" || dropState === "GLIDING") {
        const isGlide = dropState === "GLIDING";
        const fallSpeed = isGlide ? 7.5 : (26 + eng.pitch * 20);
        eng.playerPos.y -= fallSpeed * dt;

        const forward = new THREE.Vector3(-Math.sin(eng.yaw), 0, -Math.cos(eng.yaw));
        const right = new THREE.Vector3(Math.cos(eng.yaw), 0, -Math.sin(eng.yaw));
        const glideSpeed = isGlide ? 14 : 22;
        eng.playerPos.addScaledVector(forward, glideSpeed * dt);

        if (eng.touchMove && (eng.touchMove.x !== 0 || eng.touchMove.y !== 0)) {
          eng.playerPos.addScaledVector(forward, -eng.touchMove.y * glideSpeed * dt * 0.5);
          eng.playerPos.addScaledVector(right, eng.touchMove.x * glideSpeed * dt * 0.5);
        }

        const groundY = getTerrainHeight(eng.playerPos.x, eng.playerPos.z);
        setAltitude(eng.playerPos.y - groundY);
        setAirspeed(Math.hypot(glideSpeed, fallSpeed));

        if (dropState === "FREEFALL" && eng.playerPos.y <= groundY + 45) {
          deployParachute();
        }

        if (eng.playerPos.y <= groundY + 0.5) {
          eng.playerPos.y = groundY;
          setDropState("GROUND");
          eng.player.userData.parachuteGroup.visible = false;
          sounds.playLand?.();
        }

        eng.player.position.copy(eng.playerPos);
        eng.player.rotation.y = eng.yaw + Math.PI;

        updateCharacterVisuals(eng.player, {
          speed: glideSpeed,
          isGrounded: false,
          isParachuting: isGlide,
          dt
        });

        const camTarget = eng.playerPos.clone().add(new THREE.Vector3(0, 1.8, 0));
        const camOffset = new THREE.Vector3(
          Math.sin(eng.yaw) * 6,
          3.2 + eng.pitch * 2.5,
          Math.cos(eng.yaw) * 6
        );
        camera.position.copy(camTarget).add(camOffset);
        camera.lookAt(camTarget);
      } else if (dropState === "GROUND") {
        handleGroundMovement(eng, dt);
      }

      // --- 2. BOTS UPDATE (with distance LOD) ---
      updateBots({
        bots: eng.bots,
        playerPos: eng.playerPos,
        playerHp: hp,
        onPlayerHit: (dmg, botName, bx, bz) => {
          setDamageFlash(true);
          setTimeout(() => setDamageFlash(false), 200);
          sounds.playHurt();

          setShield(curShield => {
            if (curShield > 0) {
              const absorb = Math.min(curShield, dmg);
              const remaining = dmg - absorb;
              setHp(h => Math.max(0, h - remaining));
              return curShield - absorb;
            }
            setHp(h => Math.max(0, h - dmg));
            return 0;
          });

          setGunfirePings(prev => [
            ...prev.slice(-4),
            { x: bx, z: bz, time: Date.now() }
          ]);
        },
        onBotKilled: () => {
          setAliveCount(eng.bots.filter(b => b.alive).length + (hp > 0 ? 1 : 0));
        },
        onKillEvent: evt => addKillEvent(evt),
        safeZone: {
          x: zData.x,
          z: zData.z,
          radius: zData.radius,
          damage: zData.damage
        },
        bullets: eng.bullets,
        scene,
        dt,
        frameCount: eng.frameCount
      });

      // Update Bullet Tracers
      for (let i = eng.bullets.length - 1; i >= 0; i--) {
        const b = eng.bullets[i];
        b.mesh.position.addScaledVector(b.dir, b.speed * dt);
        b.life -= dt;
        if (b.life <= 0) {
          scene.remove(b.mesh);
          eng.bullets.splice(i, 1);
        }
      }

      // Storm damage check
      if (dropState === "GROUND" && hp > 0) {
        const distFromCenter = Math.hypot(eng.playerPos.x - zData.x, eng.playerPos.z - zData.z);
        if (distFromCenter > zData.radius) {
          setHp(h => {
            const next = Math.max(0, h - dt * zData.damage);
            if (next <= 0 && !gameOver) handleGameOver(false);
            return next;
          });
        }
      }

      // Win / Loss condition
      const remainingBots = eng.bots.filter(b => b.alive).length;
      if (hp <= 0 && !gameOver) {
        handleGameOver(false);
      } else if (remainingBots === 0 && hp > 0 && !gameOver) {
        handleGameOver(true);
      }

      setPlayerMapPos({ x: eng.playerPos.x, z: eng.playerPos.z });
      setPlayerMapYaw(eng.yaw);

      renderer.render(scene, camera);
    };

    function handleGroundMovement(engine, dt) {
      engine.fireCooldown = Math.max(0, engine.fireCooldown - dt);
      engine.recoilKick = Math.max(0, engine.recoilKick - dt * 4);

      const curW = engine.inventory.weapons[engine.inventory.activeIdx];
      if (curW && curW.auto && engine.mouse.isDown && engine.fireCooldown <= 0) {
        handleShoot(engine);
      }

      if (engine.reloadProgress > 0) {
        engine.reloadProgress += dt / (curW ? curW.reloadTime : 1.5);
        if (engine.reloadProgress >= 1) {
          const mag = engine.inventory.magPool[curW.id] || 0;
          const need = curW.magSize - mag;
          const res = engine.inventory.ammoPool[curW.ammoType] || 0;
          const take = Math.min(need, res);
          engine.inventory.magPool[curW.id] = mag + take;
          engine.inventory.ammoPool[curW.ammoType] = res - take;
          setAmmo(engine.inventory.magPool[curW.id]);
          setReserve(engine.inventory.ammoPool[curW.ammoType]);
          engine.reloadProgress = 0;
          setReloading(false);
        }
      }

      // Vehicle Driving
      if (engine.activeVehicle) {
        const veh = engine.activeVehicle;
        const touchForward = engine.touchMove ? -engine.touchMove.y : 0;
        const touchSteer = engine.touchMove ? -engine.touchMove.x : 0;

        const accel = (engine.keys.KeyW || touchForward > 0.15 ? veh.acceleration : 0) -
                      (engine.keys.KeyS || touchForward < -0.15 ? 12 : 0);
        veh.speed = clamp(veh.speed + accel * dt - veh.speed * 0.8 * dt, veh.reverseSpeed, veh.maxSpeed);

        const steer = (engine.keys.KeyA ? 1 : 0) - (engine.keys.KeyD ? 1 : 0) + touchSteer;
        veh.angle += steer * veh.turnSpeed * dt * (veh.speed / veh.maxSpeed);

        veh.x += Math.sin(veh.angle) * veh.speed * dt;
        veh.z += Math.cos(veh.angle) * veh.speed * dt;
        veh.y = getTerrainHeight(veh.x, veh.z) + 0.6;

        veh.mesh.position.set(veh.x, veh.y, veh.z);
        veh.mesh.rotation.y = veh.angle;

        if (veh.mesh.userData.wheels) {
          veh.mesh.userData.wheels.forEach(w => {
            w.rotation.x += veh.speed * dt * 2;
          });
        }

        sounds.updateEngine(Math.abs(veh.speed) / veh.maxSpeed, true);

        engine.playerPos.set(veh.x, veh.y + 0.3, veh.z);
        engine.player.position.copy(engine.playerPos);

        const camTarget = new THREE.Vector3(veh.x, veh.y + 1.8, veh.z);
        const camOffset = new THREE.Vector3(
          Math.sin(veh.angle) * -8.2,
          3.6,
          Math.cos(veh.angle) * -8.2
        );
        camera.position.copy(camTarget).add(camOffset);
        camera.lookAt(camTarget);

        // Roadkill check
        engine.bots.forEach(bot => {
          if (!bot.alive) return;
          if (Math.hypot(bot.x - veh.x, bot.z - veh.z) < 2.5 && Math.abs(veh.speed) > 6) {
            bot.alive = false;
            scene.remove(bot.mesh);
            setKills(k => k + 1);
            sounds.playHurt();
            addKillEvent({ killer: "Player", victim: bot.name, weapon: "4x4 Buggy Roadkill", isPlayer: true });
          }
        });

        return;
      }

      // On-foot movement
      const sprint = engine.keys.ShiftLeft || engine.keys.ShiftRight || (engine.touchMove && engine.touchMove.sprint);
      setIsSprinting(sprint);

      const baseSpeed = sprint ? 8.8 : (isCrouching ? 3.0 : 5.4);
      const speedMult = boost > 0 ? 1.15 : 1.0;
      const moveSpeed = baseSpeed * speedMult;

      const forward = new THREE.Vector3(-Math.sin(engine.yaw), 0, -Math.cos(engine.yaw));
      const right = new THREE.Vector3(Math.cos(engine.yaw), 0, -Math.sin(engine.yaw));
      const move = new THREE.Vector3();

      if (engine.keys.KeyW || engine.keys.ArrowUp) move.add(forward);
      if (engine.keys.KeyS || engine.keys.ArrowDown) move.sub(forward);
      if (engine.keys.KeyD || engine.keys.ArrowRight) move.add(right);
      if (engine.keys.KeyA || engine.keys.ArrowLeft) move.sub(right);

      if (engine.touchMove && (engine.touchMove.x !== 0 || engine.touchMove.y !== 0)) {
        move.addScaledVector(forward, -engine.touchMove.y);
        move.addScaledVector(right, engine.touchMove.x);
      }

      const isMoving = move.lengthSq() > 0;
      if (isMoving) {
        move.normalize().multiplyScalar(moveSpeed * dt);
        const nx = engine.playerPos.x + move.x;
        const nz = engine.playerPos.z + move.z;

        if (!collides(nx, engine.playerPos.z, engine.obstacles)) engine.playerPos.x = nx;
        if (!collides(engine.playerPos.x, nz, engine.obstacles)) engine.playerPos.z = nz;

        if (Math.random() < (sprint ? 0.08 : 0.04)) {
          sounds.playFootstep("grass");
        }
      }

      const terrainY = getTerrainHeight(engine.playerPos.x, engine.playerPos.z);
      if (engine.playerPos.y <= terrainY + 0.1) {
        engine.playerPos.y = terrainY;
        engine.playerVel.y = 0;
        engine.isGrounded = true;

        if (engine.keys.Space) {
          engine.playerVel.y = 7.5;
          engine.isGrounded = false;
          sounds.playJump();
        }
      } else {
        engine.playerVel.y -= 22 * dt;
        engine.playerPos.y += engine.playerVel.y * dt;
        engine.isGrounded = false;
      }

      engine.player.position.copy(engine.playerPos);
      engine.player.rotation.y = engine.yaw + Math.PI;

      updateCharacterVisuals(engine.player, {
        speed: isMoving ? moveSpeed : 0,
        isSprinting: sprint,
        isGrounded: engine.isGrounded,
        isCrouching,
        isAiming: eng.mouse.isRightDown,
        weaponId: curW ? curW.id : "fists",
        helmetLevel,
        vestLevel,
        recoilKick: engine.recoilKick,
        reloadProgress: engine.reloadProgress,
        dt
      });

      const shoulderX = eng.mouse.isRightDown ? 0.55 : 0.8;
      const camDist = eng.mouse.isRightDown ? 2.4 : 5.6;
      const camHeight = isCrouching ? 1.5 : 2.0;

      const camTarget = engine.playerPos.clone().add(new THREE.Vector3(0, camHeight, 0));
      const rightVec = new THREE.Vector3(Math.cos(engine.yaw), 0, -Math.sin(engine.yaw));
      camTarget.addScaledVector(rightVec, shoulderX);

      const camOffset = new THREE.Vector3(
        Math.sin(engine.yaw) * Math.cos(engine.pitch) * camDist,
        1.2 + engine.pitch * 2.6,
        Math.cos(engine.yaw) * Math.cos(engine.pitch) * camDist
      );

      camera.position.copy(camTarget).add(camOffset);
      camera.lookAt(camTarget);

      const targetFov = eng.mouse.isRightDown ? (curW?.zoomFov || 50) : 65;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 14);
      camera.updateProjectionMatrix();

      // Check nearby interactables (throttled every 6 frames)
      if (engine.frameCount % 6 === 0) {
        updateInteractionPrompt(engine);
      }
    }

    function collides(x, z, obstacles) {
      if (Math.hypot(x, z) > 130) return true;
      return obstacles.some(b => Math.abs(x - b.x) < b.w / 2 + 0.6 && Math.abs(z - b.z) < b.d / 2 + 0.6);
    }

    function updateInteractionPrompt(engine) {
      const v = engine.vehicles.find(
        veh => Math.hypot(veh.x - engine.playerPos.x, veh.z - engine.playerPos.z) < 4.0
      );
      if (v) {
        setInteractionPrompt("DRIVE 4x4 BUGGY");
        return;
      }

      const loot = engine.lootItems.find(
        l => l.active && Math.hypot(l.x - engine.playerPos.x, l.z - engine.playerPos.z) < 2.8
      );
      if (loot) {
        const name = WEAPONS[loot.type]?.name || loot.type.toUpperCase();
        setInteractionPrompt(`EQUIP / LOOT [${name}]`);
        return;
      }

      setInteractionPrompt(null);
    }

    function handleGameOver(isVictory) {
      setGameOver(true);
      setWon(isVictory);
      if (isVictory) sounds.playVictory();
      else sounds.playDefeat();
      if (document.pointerLockElement) document.exitPointerLock();
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [sensitivity, inMenu, paused, gameOver, dropState, ejectFromPlane, deployParachute, switchWeapon, useMed, graphicsQuality, isMobile]);

  // Touch Controller Callbacks
  const handleTouchMove = useCallback(({ x, y, sprint }) => {
    engineRef.current.touchMove = { x, y, sprint };
  }, []);

  const handleTouchLook = useCallback(({ dx, dy }) => {
    const eng = engineRef.current;
    const sens = 0.0035 * sensitivity;
    eng.yaw -= dx * sens;
    eng.pitch = clamp(eng.pitch + dy * sens, -0.6, 0.95);
  }, [sensitivity]);

  const handleTouchFireStart = useCallback(() => {
    const eng = engineRef.current;
    eng.mouse.isDown = true;
    if (eng.handleShoot) eng.handleShoot();
  }, []);

  const handleTouchFireEnd = useCallback(() => {
    engineRef.current.mouse.isDown = false;
  }, []);

  const handleTouchJump = useCallback(() => {
    const eng = engineRef.current;
    if (dropState === "FREEFALL") {
      deployParachute();
    } else if (eng.isGrounded) {
      eng.playerVel.y = 7.5;
      eng.isGrounded = false;
      sounds.playJump();
    }
  }, [dropState, deployParachute]);

  const handleTouchCrouch = useCallback(() => {
    setIsCrouching(prev => !prev);
  }, []);

  const handleTouchReload = useCallback(() => {
    const eng = engineRef.current;
    if (eng.handleReload) eng.handleReload();
  }, []);

  const handleTouchInteract = useCallback(() => {
    const eng = engineRef.current;
    if (dropState === "IN_PLANE") {
      ejectFromPlane();
    } else if (eng.activeVehicle) {
      eng.activeVehicle.isOccupied = false;
      eng.playerPos.add(new THREE.Vector3(2.5, 0, 0));
      eng.activeVehicle = null;
      setDrivingVehicle(null);
      sounds.updateEngine(0, false);
    } else if (eng.checkInteract) {
      eng.checkInteract();
    }
  }, [dropState, ejectFromPlane]);

  const handleTouchToggleAds = useCallback(() => {
    setIsAiming(prev => {
      const next = !prev;
      engineRef.current.mouse.isRightDown = next;
      return next;
    });
  }, []);

  return (
    <main className="app-shell">
      <div className="game-canvas" ref={mountRef} />

      {inMenu && (
        <Menu
          onStartGame={startGame}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          volume={volume}
          setVolume={setVolume}
          graphicsQuality={graphicsQuality}
          setGraphicsQuality={setGraphicsQuality}
        />
      )}

      {!inMenu && (
        <>
          <HUD
            hp={hp}
            shield={shield}
            boost={boost}
            helmetLevel={helmetLevel}
            vestLevel={vestLevel}
            activeWeaponId={activeWeaponId}
            weaponSlots={weaponSlots}
            ammo={ammo}
            reserve={reserve}
            reloading={reloading}
            reloadTimer={reloadTimer}
            kills={kills}
            aliveCount={aliveCount}
            zoneInfo={zoneInfo}
            gameTime={survivalTime}
            interactionPrompt={interactionPrompt}
            drivingVehicle={drivingVehicle}
            hitmarker={hitmarker}
            damageFlash={damageFlash}
            isAiming={isAiming}
            isCrouching={isCrouching}
            isSprinting={isSprinting}
            onSwitchWeapon={switchWeapon}
            onUseMed={useMed}
            onTogglePause={() => setPaused(p => !p)}
          />

          <Minimap
            playerPos={playerMapPos}
            playerYaw={playerMapYaw}
            zone={zoneInfo}
            vehicles={engineRef.current.vehicles}
            airdropDrops={engineRef.current.airdropManager?.activeDrops || []}
            gunfirePings={gunfirePings}
            onOpenMap={() => setTacticalMapOpen(true)}
          />

          <ParachuteOverlay
            state={dropState}
            altitude={altitude}
            speed={airspeed}
            onEject={ejectFromPlane}
            onDeployParachute={deployParachute}
          />

          <ScopeOverlay active={isAiming} weaponId={activeWeaponId} />

          <KillFeed events={killEvents} />

          {tacticalMapOpen && (
            <TacticalMap
              playerPos={playerMapPos}
              playerYaw={playerMapYaw}
              zone={zoneInfo}
              vehicles={engineRef.current.vehicles}
              airdropDrops={engineRef.current.airdropManager?.activeDrops || []}
              onClose={() => setTacticalMapOpen(false)}
            />
          )}

          {isMobile && (
            <TouchControls
              onMove={handleTouchMove}
              onLook={handleTouchLook}
              onFireStart={handleTouchFireStart}
              onFireEnd={handleTouchFireEnd}
              onJump={handleTouchJump}
              onCrouch={handleTouchCrouch}
              onReload={handleTouchReload}
              onInteract={handleTouchInteract}
              onToggleAds={handleTouchToggleAds}
              isAiming={isAiming}
              isCrouching={isCrouching}
              interactionPrompt={interactionPrompt}
              drivingVehicle={drivingVehicle}
              dropState={dropState}
              onEject={ejectFromPlane}
              onDeployParachute={deployParachute}
            />
          )}

          {gameOver && (
            <GameOverModal
              won={won}
              rank={aliveCount}
              kills={kills}
              headshots={headshots}
              damageDealt={damageDealt}
              survivalTime={Math.floor(survivalTime)}
              onPlayAgain={startGame}
              onSpectate={() => {
                setGameOver(false);
                setSpectating(true);
              }}
              onReturnMenu={() => {
                setGameOver(false);
                setInMenu(true);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
