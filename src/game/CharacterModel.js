import * as THREE from "three";
import { WEAPONS, HELMETS, VESTS } from "./WeaponSystem.js";

// Reusable materials & geometries for optimal rendering performance
const skinColors = [0xd4a373, 0xbc8a5f, 0x8b5e3c, 0xe0b589, 0xa67c52];
const shirtColors = [0x2f3e46, 0x354f52, 0x52796f, 0x4a4e69, 0x3a3d40, 0x5a3e2b];
const pantColors = [0x1f2421, 0x2b2d42, 0x333533, 0x3d405b];

export function createCharacterMesh({ isPlayer = false, skinIndex = 0, shirtColor = null } = {}) {
  const root = new THREE.Group();
  root.castShadow = true;
  root.receiveShadow = true;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColors[skinIndex % skinColors.length],
    roughness: 0.8
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtColor || shirtColors[skinIndex % shirtColors.length],
    roughness: 0.7
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantColors[skinIndex % pantColors.length],
    roughness: 0.85
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const darkDetailMat = new THREE.MeshStandardMaterial({ color: 0x111618, roughness: 0.6 });

  // Main body container for animation pivots
  const body = new THREE.Group();
  body.position.y = 0.95;
  root.add(body);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), shirtMat);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torso.position.y = 0.32;
  body.add(torso);

  // Tactical Vest (Dynamic Armor Mesh)
  const vestMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.59, 0.52, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x222a27, roughness: 0.8 })
  );
  vestMesh.position.y = 0.32;
  vestMesh.visible = false; // enabled when vest is equipped
  body.add(vestMesh);

  // Tactical Pouches on belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.1, 0.34), darkDetailMat);
  belt.position.y = 0.05;
  body.add(belt);

  // Neck & Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 8), skinMat);
  neck.position.y = 0.72;
  body.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.92, 0);
  body.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Tactical Goggles / Sunglasses
  const goggles = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.11, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x0f171e, roughness: 0.2, metalness: 0.8 })
  );
  goggles.position.set(0, 0.05, 0.16);
  headGroup.add(goggles);

  // Modular Helmet Mesh
  const helmetGroup = new THREE.Group();
  const helmetDome = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.22, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2e382d, roughness: 0.6 })
  );
  helmetDome.position.y = 0.16;
  const helmetVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.08, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x111618, metalness: 0.5 })
  );
  helmetVisor.position.set(0, 0.08, 0.18);
  helmetGroup.add(helmetDome);
  helmetGroup.add(helmetVisor);
  helmetGroup.visible = false; // enabled when helmet is equipped
  headGroup.add(helmetGroup);

  // Backpack on back
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.5, 0.24),
    new THREE.MeshStandardMaterial({ color: isPlayer ? 0x22353b : 0x3d352e, roughness: 0.8 })
  );
  backpack.position.set(0, 0.32, -0.25);
  backpack.castShadow = true;
  body.add(backpack);

  // Parachute model (attached to backpack, folded normally, unfolds during jump)
  const parachuteGroup = new THREE.Group();
  parachuteGroup.position.set(0, 1.8, 0);
  parachuteGroup.visible = false;

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 1.4, 12, 1, true),
    new THREE.MeshStandardMaterial({
      color: isPlayer ? 0xe5a33c : 0xc7522a,
      side: THREE.DoubleSide,
      roughness: 0.7
    })
  );
  canopy.rotation.x = Math.PI;
  canopy.position.y = 2.2;
  canopy.scale.set(1.4, 0.8, 1.4);
  parachuteGroup.add(canopy);

  // Parachute suspension lines
  const linesGeom = new THREE.BufferGeometry();
  const linePoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = Math.cos(angle) * 2.2;
    const pz = Math.sin(angle) * 2.2;
    linePoints.push(0, 0, 0); // attached to shoulders
    linePoints.push(px, 2.2, pz); // canopy rim
  }
  linesGeom.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3));
  const lines = new THREE.LineSegments(
    linesGeom,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  parachuteGroup.add(lines);
  body.add(parachuteGroup);

  // --- ARMS (SHOULDER PIVOTS) ---
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.36, 0.56, 0);
  body.add(leftArm);

  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), shirtMat);
  leftArmMesh.position.y = -0.26;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), skinMat);
  leftHand.position.y = -0.58;
  leftArm.add(leftHand);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.36, 0.56, 0);
  body.add(rightArm);

  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), shirtMat);
  rightArmMesh.position.y = -0.26;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), skinMat);
  rightHand.position.y = -0.58;
  rightArm.add(rightHand);

  // Weapon mount attached to right hand
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.62, 0.22);
  rightArm.add(weaponMount);

  // 3D Weapon Models inside weaponMount
  const weaponMeshes = {};
  weaponMeshes.m4a1 = buildM4A1Mesh();
  weaponMeshes.thompson = buildThompsonMesh();
  weaponMeshes.shotgun = buildShotgunMesh();
  weaponMeshes.awm = buildAWMMesh();

  Object.entries(weaponMeshes).forEach(([id, mesh]) => {
    mesh.visible = false;
    weaponMount.add(mesh);
  });

  // Muzzle flash light & visual sprite
  const muzzleFlash = new THREE.PointLight(0xffaa33, 0, 8);
  muzzleFlash.position.set(0, 0.08, 0.95);
  weaponMount.add(muzzleFlash);

  const flashSprite = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22, 1),
    new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0 })
  );
  flashSprite.position.set(0, 0.08, 0.95);
  weaponMount.add(flashSprite);

  // --- LEGS (HIP PIVOTS) ---
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0, 0);
  body.add(leftLeg);

  const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), pantsMat);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.32), bootMat);
  leftBoot.position.set(0, -0.65, 0.05);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0, 0);
  body.add(rightLeg);

  const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.2), pantsMat);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.32), bootMat);
  rightBoot.position.set(0, -0.65, 0.05);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);

  root.userData = {
    body,
    headGroup,
    helmetGroup,
    helmetDome,
    vestMesh,
    backpack,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
    weaponMeshes,
    muzzleFlash,
    flashSprite,
    parachuteGroup,
    animTime: 0,
    recoilAmount: 0
  };

  return root;
}

// --- 3D WEAPON MODELS ---
function buildM4A1Mesh() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x1f2428, metalness: 0.8, roughness: 0.3 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3035, roughness: 0.7 });

  // Body / Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), dark);
  receiver.position.set(0, 0.04, 0.1);
  g.add(receiver);

  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, 0.55);
  g.add(barrel);

  // Muzzle brake
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.06, 0.82);
  g.add(muzzle);

  // Curved Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.1), dark);
  mag.position.set(0, -0.12, 0.2);
  mag.rotation.x = 0.25;
  g.add(mag);

  // Telescopic Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.28), dark);
  stock.position.set(0, 0.02, -0.22);
  g.add(stock);

  // Red Dot / Holo Sight
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), metal);
  sight.position.set(0, 0.13, 0.12);
  g.add(sight);

  return g;
}

function buildThompsonMesh() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3825, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x222629, metalness: 0.7, roughness: 0.4 });

  // Receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.4), metal);
  body.position.set(0, 0.03, 0.1);
  g.add(body);

  // Barrel with fins
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.42, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.05, 0.48);
  g.add(barrel);

  // Classic Drum Magazine
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), metal);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, -0.09, 0.18);
  g.add(drum);

  // Wooden Stock & Foregrip
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.26), wood);
  stock.position.set(0, -0.03, -0.2);
  g.add(stock);

  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.07), wood);
  foregrip.position.set(0, -0.07, 0.38);
  g.add(foregrip);

  return g;
}

function buildShotgunMesh() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2e3338, metalness: 0.75, roughness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.7 });

  // Receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.38), metal);
  body.position.set(0, 0.04, 0.05);
  g.add(body);

  // Dual Barrels (Chamber & Mag Tube)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.07, 0.52);
  g.add(barrel);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), metal);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0.02, 0.48);
  g.add(tube);

  // Ribbed Pump Slide
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10), wood);
  pump.rotation.x = Math.PI / 2;
  pump.position.set(0, 0.02, 0.42);
  g.add(pump);

  // Wooden Buttstock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.32), wood);
  stock.position.set(0, -0.02, -0.24);
  g.add(stock);

  return g;
}

function buildAWMMesh() {
  const g = new THREE.Group();
  const oliveGreen = new THREE.MeshStandardMaterial({ color: 0x3d4f3e, roughness: 0.5 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x16191c, metalness: 0.85, roughness: 0.25 });

  // Long Chassis
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.65), oliveGreen);
  stock.position.set(0, 0.02, -0.05);
  g.add(stock);

  // Heavy Sniper Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.85, 8), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, 0.72);
  g.add(barrel);

  // Muzzle Brake
  const brake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.14), darkMetal);
  brake.position.set(0, 0.06, 1.18);
  g.add(brake);

  // 8x High-Power Sniper Scope
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.35, 12), darkMetal);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.18, 0.12);
  g.add(scopeTube);

  const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), darkMetal);
  scopeMount.position.set(0, 0.11, 0.12);
  g.add(scopeMount);

  // Folded Bipod under barrel
  const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), darkMetal);
  bipod.position.set(0, -0.02, 0.65);
  g.add(bipod);

  return g;
}

// Update Character Animations & Visual State each frame
export function updateCharacterVisuals(charMesh, state) {
  const {
    speed = 0,
    isSprinting = false,
    isGrounded = true,
    isCrouching = false,
    isAiming = false,
    isParachuting = false,
    weaponId = "m4a1",
    activeWeaponMesh = null,
    helmetLevel = 0,
    vestLevel = 0,
    recoilKick = 0,
    reloadProgress = 0,
    dt = 0.016
  } = state;

  const data = charMesh.userData;
  if (!data) return;

  // Equipment visibility & styling
  if (data.helmetGroup) {
    data.helmetGroup.visible = helmetLevel > 0;
    if (helmetLevel > 0 && HELMETS[helmetLevel]) {
      data.helmetDome.material.color.setHex(HELMETS[helmetLevel].color);
    }
  }

  if (data.vestMesh) {
    data.vestMesh.visible = vestLevel > 0;
    if (vestLevel > 0 && VESTS[vestLevel]) {
      data.vestMesh.material.color.setHex(VESTS[vestLevel].color);
    }
  }

  // Active weapon mesh toggle
  if (data.weaponMeshes) {
    Object.keys(data.weaponMeshes).forEach(key => {
      data.weaponMeshes[key].visible = key === weaponId;
    });
  }

  // Parachute canopy visibility
  if (data.parachuteGroup) {
    data.parachuteGroup.visible = isParachuting;
  }

  // Animation cycle accumulator
  const animSpeed = isSprinting ? 12 : 7;
  if (speed > 0.2 && isGrounded && !isParachuting) {
    data.animTime += dt * animSpeed;
  } else {
    data.animTime = THREE.MathUtils.lerp(data.animTime, 0, dt * 5);
  }

  const swing = Math.sin(data.animTime) * (isSprinting ? 0.75 : 0.45);

  // Parachuting Pose
  if (isParachuting) {
    data.leftLeg.rotation.x = 0.2;
    data.rightLeg.rotation.x = -0.15;
    data.leftArm.rotation.x = -2.7; // holding riser
    data.rightArm.rotation.x = -2.7;
    data.leftArm.rotation.z = -0.3;
    data.rightArm.rotation.z = 0.3;
    data.body.position.y = 0.95;
    return;
  }

  // Crouching stance
  const targetBodyY = isCrouching ? 0.58 : 0.95;
  data.body.position.y = THREE.MathUtils.lerp(data.body.position.y, targetBodyY, dt * 12);

  // Legs Animation
  if (!isGrounded) {
    // Airborne / jumping
    data.leftLeg.rotation.x = 0.35;
    data.rightLeg.rotation.x = -0.25;
  } else if (speed > 0.2) {
    // Walking / Running
    data.leftLeg.rotation.x = swing;
    data.rightLeg.rotation.x = -swing;
  } else {
    // Idle stance
    data.leftLeg.rotation.x = THREE.MathUtils.lerp(data.leftLeg.rotation.x, 0, dt * 8);
    data.rightLeg.rotation.x = THREE.MathUtils.lerp(data.rightLeg.rotation.x, 0, dt * 8);
  }

  // Arms & Weapon Aiming Animation
  const isArmed = weaponId !== "fists";
  if (isArmed) {
    // Tactical shooting stance: 2-handed grip aimed forward
    const baseArmX = isAiming ? -1.55 : -1.45;
    const baseArmZ = isAiming ? 0.05 : 0.12;

    // Recoil kick effect
    const recoilOffset = recoilKick * 0.3;

    data.rightArm.rotation.x = baseArmX + recoilOffset;
    data.rightArm.rotation.y = -0.18;
    data.rightArm.rotation.z = baseArmZ;

    // Left arm supports the front guard of the rifle
    data.leftArm.rotation.x = baseArmX - 0.1 + recoilOffset * 0.6;
    data.leftArm.rotation.y = 0.65;
    data.leftArm.rotation.z = -0.3;

    // Reloading animation: right arm drops to mag, left holds gun
    if (reloadProgress > 0) {
      const reloadSwing = Math.sin(reloadProgress * Math.PI) * 0.7;
      data.rightArm.rotation.x += reloadSwing;
      data.leftArm.rotation.x += reloadSwing * 0.3;
    }
  } else {
    // Unarmed (Fists): Natural arm swing when walking/running
    if (speed > 0.2) {
      data.leftArm.rotation.x = -swing * 0.9;
      data.rightArm.rotation.x = swing * 0.9;
      data.leftArm.rotation.z = -0.1;
      data.rightArm.rotation.z = 0.1;
    } else {
      // Idle boxer guard
      data.leftArm.rotation.x = -0.85;
      data.rightArm.rotation.x = -0.85;
      data.leftArm.rotation.z = -0.25;
      data.rightArm.rotation.z = 0.25;
    }
  }

  // Smooth decay of muzzle flash
  if (data.muzzleFlash && data.muzzleFlash.intensity > 0) {
    data.muzzleFlash.intensity = Math.max(0, data.muzzleFlash.intensity - dt * 25);
    data.flashSprite.material.opacity = Math.max(0, data.flashSprite.material.opacity - dt * 25);
  }
}

// Trigger weapon firing muzzle flash effect
export function triggerMuzzleFlash(charMesh) {
  const data = charMesh.userData;
  if (!data || !data.muzzleFlash) return;
  data.muzzleFlash.intensity = 5.0;
  data.flashSprite.material.opacity = 0.9;
}
