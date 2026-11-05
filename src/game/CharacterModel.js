import * as THREE from "three";
import { HELMETS, VESTS } from "./WeaponSystem.js";

const skinColors = [0xd4a373, 0xbc8a5f, 0x8b5e3c, 0xe0b589, 0xa67c52];
const shirtColors = [0x2f3e46, 0x354f52, 0x52796f, 0x4a4e69, 0x3a3d40, 0x5a3e2b];
const pantColors = [0x1f2421, 0x2b2d42, 0x333533, 0x3d405b];

// Shared geometry singletons to reduce memory allocations
const torsoGeom = new THREE.BoxGeometry(0.55, 0.65, 0.32);
const headGeom = new THREE.BoxGeometry(0.34, 0.36, 0.34);
const limbGeom = new THREE.BoxGeometry(0.16, 0.58, 0.16);
const legGeom = new THREE.BoxGeometry(0.2, 0.65, 0.2);
const bootGeom = new THREE.BoxGeometry(0.22, 0.2, 0.3);
const hitBoxGeom = new THREE.BoxGeometry(0.8, 2.0, 0.8);

export function createCharacterMesh({ isPlayer = false, skinIndex = 0, shirtColor = null, initialWeapon = "m4a1" } = {}) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: skinColors[skinIndex % skinColors.length] });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColor || shirtColors[skinIndex % shirtColors.length] });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pantColors[skinIndex % pantColors.length] });
  const bootMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Fast Invisible Hitbox for instantaneous, lightweight bullet raycasting
  const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitBox = new THREE.Mesh(hitBoxGeom, hitBoxMat);
  hitBox.position.y = 1.0;
  root.add(hitBox);

  // Main body
  const body = new THREE.Group();
  body.position.y = 0.95;
  root.add(body);

  // Torso
  const torso = new THREE.Mesh(torsoGeom, shirtMat);
  torso.position.y = 0.32;
  body.add(torso);

  // Tactical Vest
  const vestMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.52, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x222a27 })
  );
  vestMesh.position.y = 0.32;
  vestMesh.visible = false;
  body.add(vestMesh);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.86, 0);
  body.add(headGroup);

  const head = new THREE.Mesh(headGeom, skinMat);
  headGroup.add(head);

  // Modular Helmet Mesh
  const helmetGroup = new THREE.Group();
  const helmetDome = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.22, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2e382d })
  );
  helmetDome.position.y = 0.16;
  helmetGroup.add(helmetDome);
  helmetGroup.visible = false;
  headGroup.add(helmetGroup);

  // Foldable Parachute Canopy
  const parachuteGroup = new THREE.Group();
  parachuteGroup.position.set(0, 1.8, 0);
  parachuteGroup.visible = false;

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 1.2, 8, 1, true),
    new THREE.MeshLambertMaterial({
      color: isPlayer ? 0xe5a33c : 0xc7522a,
      side: THREE.DoubleSide
    })
  );
  canopy.rotation.x = Math.PI;
  canopy.position.y = 2.0;
  canopy.scale.set(1.3, 0.8, 1.3);
  parachuteGroup.add(canopy);
  body.add(parachuteGroup);

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 0.54, 0);
  body.add(leftArm);

  const leftArmMesh = new THREE.Mesh(limbGeom, shirtMat);
  leftArmMesh.position.y = -0.26;
  leftArm.add(leftArmMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 0.54, 0);
  body.add(rightArm);

  const rightArmMesh = new THREE.Mesh(limbGeom, shirtMat);
  rightArmMesh.position.y = -0.26;
  rightArm.add(rightArmMesh);

  // Weapon mount
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -0.6, 0.2);
  rightArm.add(weaponMount);

  // Build only the active weapon for this character
  const weaponMeshes = {};
  if (isPlayer) {
    // Player can switch between all weapons
    weaponMeshes.m4a1 = buildSimpleWeaponMesh(0x2d3436, 0.5);
    weaponMeshes.thompson = buildSimpleWeaponMesh(0x5a3825, 0.4);
    weaponMeshes.shotgun = buildSimpleWeaponMesh(0x4a2e1b, 0.55);
    weaponMeshes.awm = buildSimpleWeaponMesh(0x3d4f3e, 0.85);

    Object.entries(weaponMeshes).forEach(([id, mesh]) => {
      mesh.visible = id === initialWeapon;
      weaponMount.add(mesh);
    });
  } else {
    // Bot uses single assigned weapon mesh
    const botWep = buildSimpleWeaponMesh(0x2d3436, 0.55);
    weaponMount.add(botWep);
    weaponMeshes[initialWeapon] = botWep;
  }

  // Lightweight Muzzle Flash Sprite (No PointLight!)
  const flashSprite = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.2, 0),
    new THREE.MeshBasicMaterial({ color: 0xffea55, transparent: true, opacity: 0 })
  );
  flashSprite.position.set(0, 0.08, 0.8);
  weaponMount.add(flashSprite);

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0, 0);
  body.add(leftLeg);

  const leftLegMesh = new THREE.Mesh(legGeom, pantsMat);
  leftLegMesh.position.y = -0.32;
  leftLeg.add(leftLegMesh);

  const leftBoot = new THREE.Mesh(bootGeom, bootMat);
  leftBoot.position.set(0, -0.65, 0.05);
  leftLeg.add(leftBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0, 0);
  body.add(rightLeg);

  const rightLegMesh = new THREE.Mesh(legGeom, pantsMat);
  rightLegMesh.position.y = -0.32;
  rightLeg.add(rightLegMesh);

  const rightBoot = new THREE.Mesh(bootGeom, bootMat);
  rightBoot.position.set(0, -0.65, 0.05);
  rightLeg.add(rightBoot);

  root.userData = {
    body,
    headGroup,
    helmetGroup,
    helmetDome,
    vestMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
    weaponMeshes,
    flashSprite,
    parachuteGroup,
    hitBox,
    animTime: 0
  };

  hitBox.userData = { isHitBox: true, root };

  return root;
}

// Lightweight Single-Geometry Weapon Mesh (1 Draw Call per weapon!)
function buildSimpleWeaponMesh(colorHex, barrelLength = 0.5) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: colorHex });

  // Receiver
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.42), mat);
  body.position.set(0, 0.04, 0.1);
  g.add(body);

  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, barrelLength, 6), mat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, 0.3 + barrelLength / 2);
  g.add(barrel);

  // Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.09), mat);
  mag.position.set(0, -0.1, 0.18);
  g.add(mag);

  return g;
}

export function updateCharacterVisuals(charMesh, state) {
  const {
    speed = 0,
    isSprinting = false,
    isGrounded = true,
    isCrouching = false,
    isAiming = false,
    isParachuting = false,
    weaponId = "m4a1",
    helmetLevel = 0,
    vestLevel = 0,
    recoilKick = 0,
    dt = 0.016
  } = state;

  const data = charMesh.userData;
  if (!data) return;

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

  if (data.weaponMeshes) {
    Object.keys(data.weaponMeshes).forEach(key => {
      data.weaponMeshes[key].visible = key === weaponId;
    });
  }

  if (data.parachuteGroup) {
    data.parachuteGroup.visible = isParachuting;
  }

  const animSpeed = isSprinting ? 12 : 7;
  if (speed > 0.2 && isGrounded && !isParachuting) {
    data.animTime += dt * animSpeed;
  } else {
    data.animTime = 0;
  }

  const swing = Math.sin(data.animTime) * (isSprinting ? 0.7 : 0.4);

  if (isParachuting) {
    data.leftLeg.rotation.x = 0.2;
    data.rightLeg.rotation.x = -0.15;
    data.leftArm.rotation.x = -2.7;
    data.rightArm.rotation.x = -2.7;
    return;
  }

  const targetBodyY = isCrouching ? 0.6 : 0.95;
  data.body.position.y = targetBodyY;

  if (!isGrounded) {
    data.leftLeg.rotation.x = 0.3;
    data.rightLeg.rotation.x = -0.2;
  } else if (speed > 0.2) {
    data.leftLeg.rotation.x = swing;
    data.rightLeg.rotation.x = -swing;
  } else {
    data.leftLeg.rotation.x = 0;
    data.rightLeg.rotation.x = 0;
  }

  const isArmed = weaponId !== "fists";
  if (isArmed) {
    const baseArmX = isAiming ? -1.55 : -1.45;
    const recoilOffset = recoilKick * 0.25;

    data.rightArm.rotation.x = baseArmX + recoilOffset;
    data.rightArm.rotation.y = -0.15;
    data.leftArm.rotation.x = baseArmX - 0.1;
    data.leftArm.rotation.y = 0.6;
  } else {
    if (speed > 0.2) {
      data.leftArm.rotation.x = -swing * 0.8;
      data.rightArm.rotation.x = swing * 0.8;
    } else {
      data.leftArm.rotation.x = -0.8;
      data.rightArm.rotation.x = -0.8;
    }
  }

  if (data.flashSprite && data.flashSprite.material.opacity > 0) {
    data.flashSprite.material.opacity = Math.max(0, data.flashSprite.material.opacity - dt * 25);
  }
}

export function triggerMuzzleFlash(charMesh) {
  const data = charMesh.userData;
  if (!data || !data.flashSprite) return;
  data.flashSprite.material.opacity = 0.95;
}
