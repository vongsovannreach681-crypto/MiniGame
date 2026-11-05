import * as THREE from "three";
import { getTerrainHeight, spawnLoot } from "./WorldBuilder.js";
import { sounds } from "../audio/SoundManager.js";

export class AirdropManager {
  constructor(scene) {
    this.scene = scene;
    this.activeDrops = [];
    this.planeMesh = null;
    this.planeActive = false;
    this.planePos = new THREE.Vector3();
    this.planeDir = new THREE.Vector3(1, 0, 0.4).normalize();
    this.timer = 45; // First airdrop at 45 seconds
  }

  update(dt, onAirdropAnnounce, lootItems) {
    this.timer -= dt;
    if (this.timer <= 0 && !this.planeActive) {
      this.spawnCargoPlane(onAirdropAnnounce);
      this.timer = 110; // next drop in 110s
    }

    // Update Cargo Plane Flyover
    if (this.planeActive && this.planeMesh) {
      this.planePos.addScaledVector(this.planeDir, 55 * dt);
      this.planeMesh.position.copy(this.planePos);

      // Check drop release trigger near center of island
      if (!this.droppedThisPass && Math.hypot(this.planePos.x, this.planePos.z) < 35) {
        this.droppedThisPass = true;
        this.releaseCrate(this.planePos.clone());
      }

      // Despawn plane once far away
      if (Math.hypot(this.planePos.x, this.planePos.z) > 260) {
        this.scene.remove(this.planeMesh);
        this.planeActive = false;
        this.planeMesh = null;
      }
    }

    // Update Falling / Active Supply Crates
    this.activeDrops.forEach(drop => {
      if (drop.state === "FALLING") {
        drop.y -= 12 * dt; // slow parachute glide
        drop.mesh.position.y = drop.y;

        const groundY = getTerrainHeight(drop.x, drop.z);
        if (drop.y <= groundY + 0.6) {
          drop.y = groundY + 0.6;
          drop.mesh.position.y = drop.y;
          drop.state = "LANDED";
          drop.parachute.visible = false;
          drop.smokeBeam.visible = true;
          sounds.playAirdropHorn();

          // Spawn legendary loot surrounding the crate
          spawnLoot(lootItems, this.scene, drop.x + 1.8, drop.y, drop.z, "awm");
          spawnLoot(lootItems, this.scene, drop.x - 1.8, drop.y, drop.z, "vest3");
          spawnLoot(lootItems, this.scene, drop.x, drop.y, drop.z + 1.8, "helmet3");
          spawnLoot(lootItems, this.scene, drop.x, drop.y, drop.z - 1.8, "medkit");
        }
      } else if (drop.state === "LANDED") {
        // Animate smoke flare beacon
        drop.smokeBeam.material.opacity = 0.6 + Math.sin(Date.now() * 0.005) * 0.2;
      }
    });
  }

  spawnCargoPlane(onAirdropAnnounce) {
    this.planeActive = true;
    this.droppedThisPass = false;

    // Start from ocean boundary
    this.planePos.set(-200, 130, -70);
    this.planeDir.set(1, 0, 0.35).normalize();

    const planeGroup = new THREE.Group();
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x4a5b63, roughness: 0.5, metalness: 0.6 });

    // Fuselage
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 26, 12), planeMat);
    body.rotation.z = Math.PI / 2;
    planeGroup.add(body);

    // Wings
    const wings = new THREE.Mesh(new THREE.BoxGeometry(32, 0.4, 6), planeMat);
    wings.position.set(0, 0.4, 0);
    planeGroup.add(wings);

    // Tail Fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4), planeMat);
    fin.position.set(-11, 3.2, 0);
    planeGroup.add(fin);

    planeGroup.position.copy(this.planePos);
    planeGroup.rotation.y = -Math.atan2(this.planeDir.z, this.planeDir.x);

    this.scene.add(planeGroup);
    this.planeMesh = planeGroup;

    if (onAirdropAnnounce) {
      onAirdropAnnounce("SUPPLY PLANE INCOMING - AIRDROP INBOUND!");
    }
  }

  releaseCrate(pos) {
    const crateGroup = new THREE.Group();
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.4, metalness: 0.3 });

    // Supply Crate Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), crateMat);
    box.castShadow = true;
    crateGroup.add(box);

    // Parachute
    const parachute = new THREE.Mesh(
      new THREE.ConeGeometry(4.2, 2.8, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c, side: THREE.DoubleSide })
    );
    parachute.rotation.x = Math.PI;
    parachute.position.y = 4.2;
    crateGroup.add(parachute);

    // Red Smoke Flare Column (active upon landing)
    const smokeBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.8, 48, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    smokeBeam.position.y = 24;
    smokeBeam.visible = false;
    crateGroup.add(smokeBeam);

    crateGroup.position.copy(pos);
    this.scene.add(crateGroup);

    this.activeDrops.push({
      mesh: crateGroup,
      parachute,
      smokeBeam,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      state: "FALLING"
    });
  }
}
