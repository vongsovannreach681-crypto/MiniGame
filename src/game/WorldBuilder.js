import * as THREE from "three";
import { WEAPONS } from "./WeaponSystem.js";

// Procedural Height Function for the 360m Island Arena (Fast & Cached)
export function getTerrainHeight(x, z) {
  const dist = Math.hypot(x, z);
  if (dist > 125) {
    const t = Math.min(1, (dist - 125) / 20);
    return -1.0 * t;
  }

  const islandMask = Math.cos((dist / 125) * (Math.PI / 2));
  const h1 = Math.sin(x * 0.024 + 0.5) * Math.cos(z * 0.022 - 0.2) * 8.5;
  const h2 = Math.sin(x * 0.05 + 1.8) * Math.sin(z * 0.05 + 2.3) * 3.2;
  const h3 = Math.cos((x + z) * 0.015) * 4.0;

  const townDist = Math.hypot(x - (-15), z - (-15));
  const townFlat = Math.max(0, 1 - townDist / 40);

  let height = (h1 + h2 + h3 + 5.0) * islandMask;
  height = THREE.MathUtils.lerp(height, 2.5, townFlat * 0.85);

  return Math.max(0.1, height);
}

export function buildWorld(scene, graphicsQuality = "balanced") {
  const obstacles = [];
  const lootItems = [];
  const vehicles = [];
  const windTurbines = [];

  const isLow = graphicsQuality === "low" || graphicsQuality === "performance";

  // --- 1. PROCEDURAL TERRAIN (Optimized 80x80 segments) ---
  const terrainSegments = isLow ? 64 : 80;
  const terrainGeom = new THREE.PlaneGeometry(280, 280, terrainSegments, terrainSegments);
  terrainGeom.rotateX(-Math.PI / 2);

  const posAttr = terrainGeom.attributes.position;
  const colors = [];
  const grassColor = new THREE.Color(0x567d46);
  const sandColor = new THREE.Color(0xc9b77e);
  const rockColor = new THREE.Color(0x6e7065);
  const darkGrass = new THREE.Color(0x3e5e34);

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getTerrainHeight(x, z);
    posAttr.setY(i, y);

    const dist = Math.hypot(x, z);
    if (y < 0.6 || dist > 115) {
      colors.push(sandColor.r, sandColor.g, sandColor.b);
    } else if (y > 10.5) {
      colors.push(rockColor.r, rockColor.g, rockColor.b);
    } else if ((Math.sin(x * 0.4) + Math.cos(z * 0.4)) > 0.4) {
      colors.push(darkGrass.r, darkGrass.g, darkGrass.b);
    } else {
      colors.push(grassColor.r, grassColor.g, grassColor.b);
    }
  }

  terrainGeom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true
  });
  const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
  terrainMesh.receiveShadow = !isLow;
  scene.add(terrainMesh);

  // --- 2. OCEAN WATER SURFACE ---
  const oceanGeom = new THREE.CircleGeometry(250, 32);
  oceanGeom.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshLambertMaterial({
    color: 0x1d6a7d,
    transparent: true,
    opacity: 0.85
  });
  const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
  oceanMesh.position.y = 0.2;
  scene.add(oceanMesh);

  // --- 3. SKY & LIGHTING (Optimized lights, no redundant lights) ---
  scene.background = new THREE.Color(0x89b6c4);
  scene.fog = new THREE.FogExp2(0x89b6c4, 0.0035);

  const hemiLight = new THREE.HemisphereLight(0xe8f4f8, 0x4a5d3f, 1.3);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xfff6dc, 1.8);
  sun.position.set(-80, 140, 60);
  if (!isLow) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); // 1024 is smooth and 4x faster than 2048
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 320;
    const shadowRange = 110;
    sun.shadow.camera.left = -shadowRange;
    sun.shadow.camera.right = shadowRange;
    sun.shadow.camera.top = shadowRange;
    sun.shadow.camera.bottom = -shadowRange;
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);

  // --- 4. INSTANCED CLOUDS (1 single draw call for all clouds!) ---
  const cloudCount = 60;
  const cloudGeom = new THREE.DodecahedronGeometry(12, 0);
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });
  const instancedClouds = new THREE.InstancedMesh(cloudGeom, cloudMat, cloudCount);
  const dummy = new THREE.Object3D();
  const cloudData = [];

  for (let i = 0; i < cloudCount; i++) {
    const cx = (Math.random() - 0.5) * 320;
    const cy = 105 + Math.random() * 20;
    const cz = (Math.random() - 0.5) * 320;
    const sx = 1.2 + Math.random() * 1.4;
    const sy = 0.4 + Math.random() * 0.4;
    const sz = 1.0 + Math.random() * 1.2;

    dummy.position.set(cx, cy, cz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    instancedClouds.setMatrixAt(i, dummy.matrix);

    cloudData.push({ x: cx, y: cy, z: cz, sx, sy, sz, speed: 1.5 + Math.random() * 1.2 });
  }
  instancedClouds.instanceMatrix.needsUpdate = true;
  scene.add(instancedClouds);

  // --- 5. SECTORS & BUILDINGS ---
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x8e948f });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3d4743 });

  // Central Town Buildings
  const townBuildings = [
    { x: -18, z: -16, w: 14, d: 12, h: 6.5 },
    { x: -35, z: -22, w: 16, d: 14, h: 8.0 },
    { x: -12, z: -36, w: 12, d: 11, h: 6.0 },
    { x: 4, z: -25, w: 15, d: 13, h: 7.2 },
    { x: -30, z: -48, w: 18, d: 12, h: 6.5 },
    { x: 16, z: -10, w: 12, d: 10, h: 5.8 }
  ];

  townBuildings.forEach(b => {
    const y = getTerrainHeight(b.x, b.z);
    const bMesh = createOptimizedBuilding(b, y, concreteMat, roofMat);
    scene.add(bMesh);
    obstacles.push({ x: b.x, z: b.z, w: b.w, d: b.d, y, h: b.h, type: "building" });
    spawnBuildingLoot(lootItems, scene, b.x, y, b.z, b.w, b.d);
  });

  // Harbor & Piers
  const harborY = 0.8;
  const harborPier = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 55), concreteMat);
  harborPier.position.set(65, harborY, -35);
  scene.add(harborPier);
  obstacles.push({ x: 65, z: -35, w: 18, d: 55, y: harborY, h: 2, type: "pier" });

  const harborPier2 = new THREE.Mesh(new THREE.BoxGeometry(45, 1.2, 14), concreteMat);
  harborPier2.position.set(45, harborY, -15);
  scene.add(harborPier2);
  obstacles.push({ x: 45, z: -15, w: 45, d: 14, y: harborY, h: 2, type: "pier" });

  // Shipping Containers
  const containerColors = [0x992d22, 0x1f5c8b, 0xd4ac0d, 0x27ae60];
  const containerCoords = [
    { x: 62, z: -25, col: 0 },
    { x: 68, z: -25, col: 1 },
    { x: 65, z: -38, col: 2 },
    { x: 62, z: -50, col: 3 },
    { x: 42, z: -15, col: 1 },
    { x: 30, z: -15, col: 2 }
  ];

  containerCoords.forEach(c => {
    const cont = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 3.0, 2.6),
      new THREE.MeshLambertMaterial({ color: containerColors[c.col] })
    );
    cont.position.set(c.x, harborY + 1.5, c.z);
    scene.add(cont);
    obstacles.push({ x: c.x, z: c.z, w: 6, d: 3, y: harborY, h: 3, type: "container" });
    spawnLoot(lootItems, scene, c.x + 1.5, harborY + 0.5, c.z, "m4a1");
  });

  // Military Radar Base
  const radarPos = { x: -45, z: 45 };
  const radarY = getTerrainHeight(radarPos.x, radarPos.z);
  const bunker = new THREE.Mesh(
    new THREE.BoxGeometry(22, 5.5, 20),
    new THREE.MeshLambertMaterial({ color: 0x4f5451 })
  );
  bunker.position.set(radarPos.x, radarY + 2.75, radarPos.z);
  scene.add(bunker);
  obstacles.push({ x: radarPos.x, z: radarPos.z, w: 22, d: 20, y: radarY, h: 5.5, type: "building" });

  const dishGroup = createRadarDish();
  dishGroup.position.set(radarPos.x, radarY + 5.5, radarPos.z);
  scene.add(dishGroup);

  spawnLoot(lootItems, scene, radarPos.x - 3, radarY + 6.2, radarPos.z, "awm");
  spawnLoot(lootItems, scene, radarPos.x + 4, radarY + 0.5, radarPos.z + 5, "vest3");

  // Wind Turbines (3 spinning high-points)
  const turbineSpots = [{ x: 30, z: 50 }, { x: 55, z: 38 }, { x: 15, z: 68 }];
  turbineSpots.forEach(s => {
    const y = getTerrainHeight(s.x, s.z);
    const turbine = createWindTurbine(s.x, y, s.z);
    scene.add(turbine.mesh);
    windTurbines.push(turbine);
    obstacles.push({ x: s.x, z: s.z, w: 3, d: 3, y, h: 26, type: "turbine" });
  });

  // Roads
  buildRoadNetwork(scene);

  // --- 6. INSTANCED FOLIAGE (TREES, ROCKS, BUSHES: 3 DRAW CALLS FOR EVERYTHING!) ---
  populateInstancedFoliage(scene, obstacles);

  // --- 7. DRIVEABLE BUGGIES ---
  const buggySpots = [{ x: -5, z: -10 }, { x: 48, z: -22 }, { x: -35, z: 30 }];
  buggySpots.forEach(spot => {
    const y = getTerrainHeight(spot.x, spot.z);
    const buggy = createVehicleMesh();
    buggy.position.set(spot.x, y + 0.6, spot.z);
    scene.add(buggy);
    vehicles.push({
      mesh: buggy,
      x: spot.x,
      y: y + 0.6,
      z: spot.z,
      angle: Math.random() * Math.PI * 2,
      speed: 0,
      maxSpeed: 28,
      acceleration: 15,
      reverseSpeed: -10,
      turnSpeed: 2.2,
      health: 300,
      isOccupied: false
    });
  });

  // --- 8. GROUND LOOT ---
  populateWorldLoot(lootItems, scene);

  return {
    terrainMesh,
    oceanMesh,
    obstacles,
    lootItems,
    vehicles,
    windTurbines,
    clouds: { mesh: instancedClouds, data: cloudData }
  };
}

// Single-mesh combined building (reduces draw calls from 5 per house to 2)
function createOptimizedBuilding(b, y, wallMat, roofMat) {
  const g = new THREE.Group();
  g.position.set(b.x, y, b.z);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
  wall.position.y = b.h / 2;
  g.add(wall);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.0, 0.8, b.d + 1.0), roofMat);
  roof.position.y = b.h + 0.4;
  g.add(roof);

  return g;
}

// Radar Dish
function createRadarDish() {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0xb5bcc0 });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), metal);
  mast.position.y = 1.5;
  g.add(mast);

  const dishGroup = new THREE.Group();
  dishGroup.position.y = 3.0;
  g.add(dishGroup);

  const dish = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 3), metal);
  dish.rotation.x = 0.5;
  dishGroup.add(dish);

  g.userData = { dishGroup };
  return g;
}

// Wind Turbine
function createWindTurbine(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xdee2e6 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.3, 24, 8), whiteMat);
  tower.position.y = 12;
  g.add(tower);

  const rotor = new THREE.Group();
  rotor.position.set(0, 24, 1.5);
  g.add(rotor);

  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.1), whiteMat);
    blade.position.y = 5;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 3) * Math.PI * 2;
    pivot.add(blade);
    rotor.add(pivot);
  }

  return { mesh: g, rotor };
}

// Driveable Buggy
export function createVehicleMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2471a3 });
  const cageMat = new THREE.MeshLambertMaterial({ color: 0x1c2833 });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 3.8), bodyMat);
  chassis.position.y = 0.5;
  g.add(chassis);

  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 2.2), cageMat);
  cage.position.set(0, 1.35, -0.2);
  g.add(cage);

  const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10);
  wheelGeom.rotateZ(Math.PI / 2);

  const wheels = [];
  const offsets = [
    { x: -1.15, y: 0.45, z: 1.3 },
    { x: 1.15, y: 0.45, z: 1.3 },
    { x: -1.15, y: 0.45, z: -1.3 },
    { x: 1.15, y: 0.45, z: -1.3 }
  ];

  offsets.forEach(o => {
    const w = new THREE.Mesh(wheelGeom, tireMat);
    w.position.set(o.x, o.y, o.z);
    g.add(w);
    wheels.push(w);
  });

  g.userData = { wheels };
  return g;
}

// Asphalt Road
function buildRoadNetwork(scene) {
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3d4144 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

  const roads = [
    { x: -15, z: 0, w: 7.5, len: 150, rot: 0 },
    { x: 15, z: -25, w: 7.5, len: 110, rot: Math.PI / 2.3 }
  ];

  roads.forEach(r => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.len), roadMat);
    road.rotateX(-Math.PI / 2);
    road.rotation.z = r.rot;
    road.position.set(r.x, 0.28, r.z);
    scene.add(road);

    for (let d = -r.len / 2 + 6; d < r.len / 2 - 6; d += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4), stripeMat);
      dash.rotateX(-Math.PI / 2);
      dash.rotation.z = r.rot;
      dash.position.set(r.x + Math.sin(r.rot) * d, 0.3, r.z + Math.cos(r.rot) * d);
      scene.add(dash);
    }
  });
}

// --- INSTANCED FOLIAGE (3 DRAW CALLS IN TOTAL) ---
function populateInstancedFoliage(scene, obstacles) {
  const treeCount = 110;
  const dummy = new THREE.Object3D();

  // 1. Tree Trunks InstancedMesh (1 Draw Call)
  const trunkGeom = new THREE.CylinderGeometry(0.3, 0.45, 3.0, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x533d28 });
  const instancedTrunks = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);

  // 2. Tree Crowns InstancedMesh (1 Draw Call)
  const crownGeom = new THREE.ConeGeometry(2.4, 5.0, 6);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2d4f36 });
  const instancedCrowns = new THREE.InstancedMesh(crownGeom, crownMat, treeCount);

  let placed = 0;
  for (let i = 0; i < treeCount * 2 && placed < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 14 + Math.random() * 95;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;

    if (obstacles.some(b => Math.hypot(x - b.x, z - b.z) < Math.max(b.w, b.d) / 2 + 3)) continue;
    if (Math.abs(x - (-15)) < 6) continue;

    const y = getTerrainHeight(x, z);
    if (y < 0.6) continue;

    // Trunk Matrix
    dummy.position.set(x, y + 1.5, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    instancedTrunks.setMatrixAt(placed, dummy.matrix);

    // Crown Matrix
    dummy.position.set(x, y + 4.5, z);
    dummy.updateMatrix();
    instancedCrowns.setMatrixAt(placed, dummy.matrix);

    obstacles.push({ x, z, w: 1.2, d: 1.2, y, h: 7, type: "tree" });
    placed++;
  }

  instancedTrunks.instanceMatrix.needsUpdate = true;
  instancedCrowns.instanceMatrix.needsUpdate = true;
  scene.add(instancedTrunks);
  scene.add(instancedCrowns);

  // 3. Rocks InstancedMesh (1 Draw Call)
  const rockCount = 50;
  const rockGeom = new THREE.DodecahedronGeometry(1.4, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x666b6c });
  const instancedRocks = new THREE.InstancedMesh(rockGeom, rockMat, rockCount);

  let rocksPlaced = 0;
  for (let i = 0; i < rockCount * 2 && rocksPlaced < rockCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 15 + Math.random() * 92;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = getTerrainHeight(x, z);
    if (y < 0.4) continue;

    dummy.position.set(x, y + 0.6, z);
    dummy.scale.set(1.4, 0.8, 1.2);
    dummy.rotation.set(Math.random(), Math.random(), Math.random());
    dummy.updateMatrix();
    instancedRocks.setMatrixAt(rocksPlaced, dummy.matrix);

    obstacles.push({ x, z, w: 2.2, d: 2.2, y, h: 1.6, type: "rock" });
    rocksPlaced++;
  }

  instancedRocks.instanceMatrix.needsUpdate = true;
  scene.add(instancedRocks);
}

// Building Loot Spawner
function spawnBuildingLoot(lootItems, scene, bx, by, bz, bw, bd) {
  const pool = ["m4a1", "thompson", "shotgun", "ammo556", "ammo45", "medkit", "bandage", "energyDrink", "vest1", "helmet1"];
  const count = 2;
  for (let i = 0; i < count; i++) {
    const lx = bx + (Math.random() - 0.5) * (bw - 3);
    const lz = bz + (Math.random() - 0.5) * (bd - 3);
    const itemType = pool[Math.floor(Math.random() * pool.length)];
    spawnLoot(lootItems, scene, lx, by + 0.4, lz, itemType);
  }
}

// Global Ground Loot Spawner
function populateWorldLoot(lootItems, scene) {
  const lootTable = ["m4a1", "thompson", "shotgun", "ammo556", "ammo45", "medkit", "bandage", "vest2", "helmet2"];
  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 15 + Math.random() * 85;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = getTerrainHeight(x, z);
    if (y < 0.8) continue;

    const type = lootTable[Math.floor(Math.random() * lootTable.length)];
    spawnLoot(lootItems, scene, x, y + 0.4, z, type);
  }
}

// Optimized Loot Item (NO PointLights - uses emissive material glow for 100x better performance)
export function spawnLoot(lootItems, scene, x, y, z, type) {
  let color = 0x5dade2;
  if (type.startsWith("vest")) color = 0x27ae60;
  else if (type.startsWith("helmet")) color = 0x8e44ad;
  else if (type === "medkit" || type === "bandage" || type === "energyDrink") color = 0xe67e22;
  else if (type === "awm") color = 0xf1c40f;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.4, 0.75),
    new THREE.MeshLambertMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4
    })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  lootItems.push({
    mesh,
    type,
    x,
    y,
    z,
    active: true
  });
}
