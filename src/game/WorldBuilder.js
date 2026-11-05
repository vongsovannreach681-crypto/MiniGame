import * as THREE from "three";
import { WEAPONS, HELMETS, VESTS, MEDS } from "./WeaponSystem.js";

// Procedural Height Function for the 360m Island Arena
export function getTerrainHeight(x, z) {
  const dist = Math.hypot(x, z);
  if (dist > 125) {
    // Ocean drop-off
    const t = Math.min(1, (dist - 125) / 20);
    return -1.0 * t;
  }

  // Smooth island shape tapering to sea level at edges
  const islandMask = Math.cos((dist / 125) * (Math.PI / 2));
  
  // Rolling hills & ridges
  const h1 = Math.sin(x * 0.024 + 0.5) * Math.cos(z * 0.022 - 0.2) * 8.5;
  const h2 = Math.sin(x * 0.05 + 1.8) * Math.sin(z * 0.05 + 2.3) * 3.2;
  const h3 = Math.cos((x + z) * 0.015) * 4.0;

  // Flatten central town area (around -20, -15) and harbor (around 45, -35)
  const townDist = Math.hypot(x - (-15), z - (-15));
  const townFlat = Math.max(0, 1 - townDist / 40);

  let height = (h1 + h2 + h3 + 5.0) * islandMask;
  height = THREE.MathUtils.lerp(height, 2.5, townFlat * 0.85);

  return Math.max(0.1, height);
}

// Procedural World Builder
export function buildWorld(scene) {
  const obstacles = [];
  const lootItems = [];
  const vehicles = [];
  const windTurbines = [];
  const clouds = [];

  // --- 1. PROCEDURAL TERRAIN MESH WITH VERTEX DISPLACEMENT ---
  const terrainSegments = 160;
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

    // Vertex color based on elevation & slope
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

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true
  });
  const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // --- 2. OCEAN WATER SURFACE ---
  const oceanGeom = new THREE.CircleGeometry(260, 64);
  oceanGeom.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x1d6a7d,
    roughness: 0.25,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88
  });
  const oceanMesh = new THREE.Mesh(oceanGeom, oceanMat);
  oceanMesh.position.y = 0.2;
  scene.add(oceanMesh);

  // --- 3. PROCEDURAL SKY DOME & LIGHTING ---
  scene.background = new THREE.Color(0x89b6c4);
  scene.fog = new THREE.FogExp2(0x89b6c4, 0.0038);

  const hemiLight = new THREE.HemisphereLight(0xe8f4f8, 0x4a5d3f, 1.4);
  scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xfff6dc, 2.2);
  sun.position.set(-80, 140, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 380;
  const shadowRange = 140;
  sun.shadow.camera.left = -shadowRange;
  sun.shadow.camera.right = shadowRange;
  sun.shadow.camera.top = shadowRange;
  sun.shadow.camera.bottom = -shadowRange;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Procedural Clouds in the sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    transparent: true,
    opacity: 0.75
  });
  for (let i = 0; i < 18; i++) {
    const cloud = new THREE.Group();
    const cx = (Math.random() - 0.5) * 360;
    const cz = (Math.random() - 0.5) * 360;
    cloud.position.set(cx, 110 + Math.random() * 25, cz);

    const puffs = 4 + Math.floor(Math.random() * 5);
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(12 + Math.random() * 14, 1),
        cloudMat
      );
      puff.position.set(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 25
      );
      puff.scale.set(1.4, 0.6, 1.2);
      cloud.add(puff);
    }
    scene.add(cloud);
    clouds.push(cloud);
  }

  // --- 4. SECTORS & BUILDINGS ---
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x939994, roughness: 0.9 });
  const woodPlankMat = new THREE.MeshStandardMaterial({ color: 0x7a5b3e, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x414d48, roughness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x3d4447, metalness: 0.8, roughness: 0.3 });

  // A. CENTRAL TOWN (Multiple houses with rooms & loot)
  const townBuildings = [
    { x: -18, z: -16, w: 14, d: 12, h: 6.5, type: "house" },
    { x: -35, z: -22, w: 16, d: 14, h: 8.0, type: "largeHouse" },
    { x: -12, z: -36, w: 12, d: 11, h: 6.0, type: "house" },
    { x: 4, z: -25, w: 15, d: 13, h: 7.2, type: "house" },
    { x: -30, z: -48, w: 18, d: 12, h: 6.5, type: "warehouse" },
    { x: 16, z: -10, w: 12, d: 10, h: 5.8, type: "house" }
  ];

  townBuildings.forEach(b => {
    const y = getTerrainHeight(b.x, b.z);
    const buildingGroup = createDetailedBuilding(b, y, concreteMat, roofMat, woodPlankMat);
    scene.add(buildingGroup);
    obstacles.push({ x: b.x, z: b.z, w: b.w, d: b.d, y, h: b.h, type: "building" });

    // Spawn 2-3 loot items inside / around each building
    spawnBuildingLoot(lootItems, scene, b.x, y, b.z, b.w, b.d);
  });

  // B. NAVAL HARBOR & DOCKS (Piers, Shipping Containers Maze)
  const harborY = 0.8;
  const harborPier = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 55), concreteMat);
  harborPier.position.set(65, harborY, -35);
  harborPier.receiveShadow = true;
  scene.add(harborPier);
  obstacles.push({ x: 65, z: -35, w: 18, d: 55, y: harborY, h: 2, type: "pier" });

  const harborPier2 = new THREE.Mesh(new THREE.BoxGeometry(45, 1.2, 14), concreteMat);
  harborPier2.position.set(45, harborY, -15);
  harborPier2.receiveShadow = true;
  scene.add(harborPier2);
  obstacles.push({ x: 45, z: -15, w: 45, d: 14, y: harborY, h: 2, type: "pier" });

  // Shipping Containers (Tactical maze with CQB loot)
  const containerColors = [0x992d22, 0x1f5c8b, 0xd4ac0d, 0x27ae60, 0x566573];
  const containerCoords = [
    { x: 62, z: -25, rot: 0, col: 0 },
    { x: 68, z: -25, rot: 0, col: 1 },
    { x: 65, z: -38, rot: Math.PI / 2, col: 2 },
    { x: 62, z: -50, rot: 0, col: 3 },
    { x: 68, z: -50, rot: 0, col: 0 },
    { x: 42, z: -15, rot: 0, col: 4 },
    { x: 30, z: -15, rot: 0, col: 1 },
    { x: 50, z: -15, rot: 0, col: 2 }
  ];

  containerCoords.forEach(c => {
    const contMat = new THREE.MeshStandardMaterial({
      color: containerColors[c.col],
      roughness: 0.6,
      metalness: 0.5
    });
    const cont = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.0, 2.6), contMat);
    cont.position.set(c.x, harborY + 1.5, c.z);
    cont.rotation.y = c.rot;
    cont.castShadow = true;
    cont.receiveShadow = true;
    scene.add(cont);
    obstacles.push({ x: c.x, z: c.z, w: 6, d: 3, y: harborY, h: 3, type: "container" });

    // Harbor high tier weapon spawn
    spawnLoot(lootItems, scene, c.x + 2, harborY + 0.5, c.z, "m4a1");
  });

  // Dock Crane
  const craneGroup = createCraneMesh();
  craneGroup.position.set(70, harborY + 0.6, -58);
  scene.add(craneGroup);

  // C. MILITARY RADAR BASE (High ground fortress)
  const radarBasePos = { x: -45, z: 45 };
  const radarY = getTerrainHeight(radarBasePos.x, radarBasePos.y);

  // Radar Bunker
  const bunker = new THREE.Mesh(
    new THREE.BoxGeometry(22, 5.5, 20),
    new THREE.MeshStandardMaterial({ color: 0x4f5451, roughness: 0.95 })
  );
  bunker.position.set(radarBasePos.x, radarY + 2.75, radarBasePos.z);
  bunker.castShadow = true;
  bunker.receiveShadow = true;
  scene.add(bunker);
  obstacles.push({ x: radarBasePos.x, z: radarBasePos.z, w: 22, d: 20, y: radarY, h: 5.5, type: "building" });

  // Rotating Radar Dish on top of bunker
  const radarDishGroup = createRadarDish();
  radarDishGroup.position.set(radarBasePos.x, radarY + 5.5, radarBasePos.z);
  scene.add(radarDishGroup);

  // Military Watchtowers
  const tower1 = createWatchtower(-30, 32);
  const tower2 = createWatchtower(-60, 58);
  scene.add(tower1.mesh);
  scene.add(tower2.mesh);
  obstacles.push(tower1.obstacle);
  obstacles.push(tower2.obstacle);

  // Top military base loot
  spawnLoot(lootItems, scene, radarBasePos.x - 3, radarY + 6.2, radarBasePos.z, "awm");
  spawnLoot(lootItems, scene, radarBasePos.x + 4, radarY + 0.5, radarBasePos.z + 5, "vest3");
  spawnLoot(lootItems, scene, radarBasePos.x, radarY + 0.5, radarBasePos.z - 6, "helmet3");

  // D. WIND FARM RIDGE (3 Spinning Wind Turbines)
  const turbineSpots = [
    { x: 30, z: 50 },
    { x: 55, z: 38 },
    { x: 15, z: 68 }
  ];

  turbineSpots.forEach(s => {
    const y = getTerrainHeight(s.x, s.z);
    const turbine = createWindTurbine(s.x, y, s.z);
    scene.add(turbine.mesh);
    windTurbines.push(turbine);
    obstacles.push({ x: s.x, z: s.z, w: 3, d: 3, y, h: 28, type: "turbine" });
  });

  // E. LUMBER MILL & DEPOT
  const lumberPos = { x: -65, z: -10 };
  const lumberY = getTerrainHeight(lumberPos.x, lumberPos.z);
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(24, 7, 16),
    new THREE.MeshStandardMaterial({ color: 0x5a483a, roughness: 0.9 })
  );
  shed.position.set(lumberPos.x, lumberY + 3.5, lumberPos.z);
  shed.castShadow = true;
  shed.receiveShadow = true;
  scene.add(shed);
  obstacles.push({ x: lumberPos.x, z: lumberPos.z, w: 24, d: 16, y: lumberY, h: 7, type: "building" });

  // Piles of timber logs
  createLogPiles(scene, lumberPos.x + 18, lumberY, lumberPos.z);

  // --- 5. ROADS & ASPHALT SYSTEM ---
  buildRoadNetwork(scene);

  // --- 6. VEGETATION: TREES, PALMS, BUSHES & ROCKS ---
  populateFoliage(scene, obstacles);

  // --- 7. DRIVEABLE BUGGIES / VEHICLES ---
  const buggySpots = [
    { x: -5, z: -10 },
    { x: 48, z: -22 },
    { x: -35, z: 30 }
  ];

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
      vx: 0,
      vz: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 0,
      maxSpeed: 28,
      acceleration: 14,
      reverseSpeed: -10,
      turnSpeed: 2.2,
      health: 300,
      isOccupied: false
    });
  });

  // --- 8. GLOBAL GROUND SCATTER LOOT ---
  populateWorldLoot(lootItems, scene);

  return {
    terrainMesh,
    oceanMesh,
    obstacles,
    lootItems,
    vehicles,
    windTurbines,
    radarDishGroup,
    clouds
  };
}

// Detailed Building with Doorways and Windows
function createDetailedBuilding(b, y, wallMat, roofMat, woodMat) {
  const g = new THREE.Group();
  g.position.set(b.x, y, b.z);

  // Walls
  const wall = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
  wall.position.y = b.h / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  // Overhanging Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.2, 0.9, b.d + 1.2), roofMat);
  roof.position.y = b.h + 0.45;
  roof.castShadow = true;
  g.add(roof);

  // Doorway recess
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 3.2, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x181c19 })
  );
  door.position.set(0, 1.6, b.d / 2 + 0.05);
  g.add(door);

  // Windows
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x2a3e47,
    roughness: 0.1,
    metalness: 0.9
  });
  [-b.w / 3, b.w / 3].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), winMat);
    win.position.set(wx, 2.8, b.d / 2 + 0.05);
    g.add(win);
  });

  return g;
}

// Watchtower Structure
function createWatchtower(x, z) {
  const y = getTerrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const metal = new THREE.MeshStandardMaterial({ color: 0x3d4345, metalness: 0.8, roughness: 0.4 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e523b, roughness: 0.85 });

  // 4 Legs
  const legGeom = new THREE.CylinderGeometry(0.18, 0.22, 11, 6);
  [-2, 2].forEach(lx => {
    [-2, 2].forEach(lz => {
      const leg = new THREE.Mesh(legGeom, metal);
      leg.position.set(lx, 5.5, lz);
      leg.castShadow = true;
      g.add(leg);
    });
  });

  // Sniper Platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.5, 5.5), wood);
  platform.position.y = 11;
  platform.receiveShadow = true;
  g.add(platform);

  // Railing
  const rail = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 0.15), metal);
  rail.position.set(0, 11.6, 2.7);
  g.add(rail);

  return {
    mesh: g,
    obstacle: { x, z, w: 5.5, d: 5.5, y, h: 12, type: "watchtower" }
  };
}

// Radar Dish
function createRadarDish() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xc4cacf, metalness: 0.8, roughness: 0.2 });

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.5, 8), metal);
  mast.position.y = 1.75;
  g.add(mast);

  const dishGroup = new THREE.Group();
  dishGroup.position.y = 3.5;
  g.add(dishGroup);

  const dish = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3), metal);
  dish.rotation.x = 0.5;
  dishGroup.add(dish);

  g.userData = { dishGroup };
  return g;
}

// Wind Turbine
function createWindTurbine(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe6e8eb, roughness: 0.4 });

  // Tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 26, 12), whiteMat);
  tower.position.y = 13;
  tower.castShadow = true;
  g.add(tower);

  // Nacelle
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 5.0), whiteMat);
  nacelle.position.set(0, 26, 0.5);
  g.add(nacelle);

  // Rotor Blades Group
  const rotor = new THREE.Group();
  rotor.position.set(0, 26, 3.0);
  g.add(rotor);

  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 0.15), whiteMat);
    blade.position.y = 6;
    const bladePivot = new THREE.Group();
    bladePivot.rotation.z = (i / 3) * Math.PI * 2;
    bladePivot.add(blade);
    rotor.add(bladePivot);
  }

  return { mesh: g, rotor };
}

// Dock Crane
function createCraneMesh() {
  const g = new THREE.Group();
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xdcae3b, metalness: 0.6, roughness: 0.4 });

  const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 24, 3), yellowMat);
  tower.position.y = 12;
  g.add(tower);

  const boom = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 34), yellowMat);
  boom.position.set(0, 24, 8);
  g.add(boom);

  return g;
}

// Timber Log Piles
function createLogPiles(scene, x, y, z) {
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 });
  const geom = new THREE.CylinderGeometry(0.4, 0.4, 7, 8);
  geom.rotateZ(Math.PI / 2);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4 - row; col++) {
      const log = new THREE.Mesh(geom, logMat);
      log.position.set(x + (col - (4 - row) / 2) * 0.9, y + 0.45 + row * 0.75, z);
      log.castShadow = true;
      scene.add(log);
    }
  }
}

// Driveable 4x4 Buggy Mesh
export function createVehicleMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2471a3, roughness: 0.4, metalness: 0.6 });
  const cageMat = new THREE.MeshStandardMaterial({ color: 0x17202a, metalness: 0.8, roughness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, metalness: 0.8 });

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 4.2), bodyMat);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  g.add(chassis);

  // Bull bar on front
  const bullBar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.3), cageMat);
  bullBar.position.set(0, 0.6, 2.2);
  g.add(bullBar);

  // Roll Cage Tubular Frame
  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.4, 2.4), cageMat);
  cage.position.set(0, 1.45, -0.2);
  g.add(cage);

  // Headlights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
  [-0.7, 0.7].forEach(lx => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), lightMat);
    light.position.set(lx, 0.65, 2.25);
    g.add(light);
  });

  // 4 Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 16);
  wheelGeom.rotateZ(Math.PI / 2);

  const wheels = [];
  const wheelOffsets = [
    { x: -1.2, y: 0.45, z: 1.4 },
    { x: 1.2, y: 0.45, z: 1.4 },
    { x: -1.2, y: 0.45, z: -1.4 },
    { x: 1.2, y: 0.45, z: -1.4 }
  ];

  wheelOffsets.forEach(wo => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wo.x, wo.y, wo.z);

    const tire = new THREE.Mesh(wheelGeom, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.48, 8), rimMat);
    rim.rotateZ(Math.PI / 2);
    wheelGroup.add(rim);

    g.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  g.userData = { wheels };
  return g;
}

// Asphalt Road Network
function buildRoadNetwork(scene) {
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3d4144, roughness: 0.95 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

  // Main arterial road segments connecting sectors
  const roads = [
    { x: -15, z: 0, w: 8, len: 160, rot: 0 }, // North-South central artery
    { x: 15, z: -25, w: 8, len: 120, rot: Math.PI / 2.3 } // Route to Harbor
  ];

  roads.forEach(r => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.len), roadMat);
    road.rotateX(-Math.PI / 2);
    road.rotation.z = r.rot;
    road.position.set(r.x, 0.3, r.z);
    road.receiveShadow = true;
    scene.add(road);

    // Dashed center yellow line
    for (let d = -r.len / 2 + 5; d < r.len / 2 - 5; d += 9) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 4), stripeMat);
      dash.rotateX(-Math.PI / 2);
      dash.rotation.z = r.rot;
      dash.position.set(
        r.x + Math.sin(r.rot) * d,
        0.32,
        r.z + Math.cos(r.rot) * d
      );
      scene.add(dash);
    }
  });
}

// Natural Foliage (Pine Trees, Palms, Bushes, Rocks)
function populateFoliage(scene, obstacles) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x533d28, roughness: 0.9 });
  const pineFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2d4f36, roughness: 0.8 });
  const palmFoliageMat = new THREE.MeshStandardMaterial({ color: 0x3e7b4a, roughness: 0.7 });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x386641, roughness: 0.85 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x636869, roughness: 0.95 });

  // 120 Pine & Deciduous Trees across the island
  for (let i = 0; i < 140; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 15 + Math.random() * 95;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;

    // Skip building and road overlaps
    if (obstacles.some(b => Math.hypot(x - b.x, z - b.z) < Math.max(b.w, b.d) / 2 + 4)) continue;
    if (Math.abs(x - (-15)) < 7) continue; // road clearance

    const y = getTerrainHeight(x, z);
    if (y < 0.6) continue;

    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.2, 6), trunkMat);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);

    // 3 tiered conical crowns
    for (let c = 0; c < 3; c++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(2.8 - c * 0.6, 3.4 - c * 0.4, 7),
        pineFoliageMat
      );
      crown.position.y = 3.2 + c * 1.8;
      crown.castShadow = true;
      tree.add(crown);
    }

    scene.add(tree);
    obstacles.push({ x, z, w: 1.2, d: 1.2, y, h: 8, type: "tree" });
  }

  // 45 Bushes (Players & Bots can hide inside!)
  for (let i = 0; i < 55; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 20 + Math.random() * 85;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = getTerrainHeight(x, z);
    if (y < 0.8) continue;

    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + Math.random() * 0.8, 1), bushMat);
    bush.position.set(x, y + 0.9, z);
    bush.scale.set(1.4, 0.85, 1.3);
    bush.castShadow = true;
    scene.add(bush);
  }

  // 50 Boulders & Rocks for bullet cover
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 15 + Math.random() * 95;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = getTerrainHeight(x, z);
    if (y < 0.4) continue;

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.6, 0),
      rockMat
    );
    rock.position.set(x, y + 0.8, z);
    rock.scale.set(1.5, 0.9, 1.2);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    obstacles.push({ x, z, w: 2.5, d: 2.5, y, h: 2, type: "rock" });
  }
}

// Building Loot Spawner
function spawnBuildingLoot(lootItems, scene, bx, by, bz, bw, bd) {
  const pool = ["m4a1", "thompson", "shotgun", "ammo556", "ammo45", "medkit", "bandage", "energyDrink", "vest1", "helmet1"];
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const lx = bx + (Math.random() - 0.5) * (bw - 3);
    const lz = bz + (Math.random() - 0.5) * (bd - 3);
    const itemType = pool[Math.floor(Math.random() * pool.length)];
    spawnLoot(lootItems, scene, lx, by + 0.5, lz, itemType);
  }
}

// Global Scatter Loot
function populateWorldLoot(lootItems, scene) {
  const lootTable = [
    "m4a1", "thompson", "shotgun", "ammo556", "ammo45", "ammo12g",
    "medkit", "bandage", "energyDrink", "vest2", "helmet2"
  ];

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 15 + Math.random() * 85;
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = getTerrainHeight(x, z);
    if (y < 0.8) continue;

    const type = lootTable[Math.floor(Math.random() * lootTable.length)];
    spawnLoot(lootItems, scene, x, y + 0.45, z, type);
  }
}

// Procedural 3D Loot Item Spawner
export function spawnLoot(lootItems, scene, x, y, z, type) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  let color = 0x5dade2;
  let iconText = type.toUpperCase();

  if (type.startsWith("vest")) {
    color = 0x27ae60;
  } else if (type.startsWith("helmet")) {
    color = 0x8e44ad;
  } else if (type === "medkit" || type === "bandage" || type === "energyDrink") {
    color = 0xe67e22;
  } else if (type === "awm") {
    color = 0xf1c40f; // Legendary Gold
  }

  // 3D Box / Item Representation
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.45, 0.8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.5
    })
  );
  box.castShadow = true;
  group.add(box);

  // Floating Rarity Beam / Glow Light
  const light = new THREE.PointLight(color, 1.2, 5);
  light.position.y = 0.6;
  group.add(light);

  scene.add(group);
  lootItems.push({
    group,
    type,
    x,
    y,
    z,
    active: true,
    rotSpeed: 1.2
  });
}
