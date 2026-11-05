import * as THREE from "three";
import { sounds } from "../audio/SoundManager.js";

const PHASES = [
  { waitDuration: 40, shrinkDuration: 40, nextRadius: 85, damage: 2.5 },
  { waitDuration: 35, shrinkDuration: 35, nextRadius: 48, damage: 5.0 },
  { waitDuration: 30, shrinkDuration: 30, nextRadius: 24, damage: 9.0 },
  { waitDuration: 25, shrinkDuration: 25, nextRadius: 6, damage: 16.0 }
];

export class ZoneSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentX = 0;
    this.currentZ = 0;
    this.currentRadius = 135;
    this.startX = 0;
    this.startZ = 0;
    this.startRadius = 135;

    this.nextX = (Math.random() - 0.5) * 35;
    this.nextZ = (Math.random() - 0.5) * 35;
    this.nextRadius = PHASES[0].nextRadius;

    this.phaseIndex = 0;
    this.state = "WAITING"; // "WAITING" or "SHRINKING"
    this.timer = PHASES[0].waitDuration;
    this.damage = PHASES[0].damage;

    // 3D Shimmering Electric Storm Cylinder Wall
    const stormGeom = new THREE.CylinderGeometry(1, 1, 60, 64, 1, true);
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x33b5e5,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.stormMesh = new THREE.Mesh(stormGeom, stormMat);
    this.stormMesh.position.set(0, 30, 0);
    this.stormMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.scene.add(this.stormMesh);

    // Next Safe Zone Ring (white indicator)
    const nextGeom = new THREE.RingGeometry(0.97, 1.0, 64);
    nextGeom.rotateX(-Math.PI / 2);
    const nextMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.nextRingMesh = new THREE.Mesh(nextGeom, nextMat);
    this.nextRingMesh.position.set(this.nextX, 0.4, this.nextZ);
    this.nextRingMesh.scale.set(this.nextRadius, 1, this.nextRadius);
    this.scene.add(this.nextRingMesh);
  }

  update(dt, onZoneShrinkStart) {
    this.timer -= dt;
    const currentPhase = PHASES[this.phaseIndex] || PHASES[PHASES.length - 1];

    if (this.state === "WAITING") {
      if (this.timer <= 0) {
        // Transition to SHRINKING
        this.state = "SHRINKING";
        this.timer = currentPhase.shrinkDuration;
        this.startX = this.currentX;
        this.startZ = this.currentZ;
        this.startRadius = this.currentRadius;
        sounds.playZoneWarning();
        if (onZoneShrinkStart) {
          onZoneShrinkStart(`DANGER: Safe zone is now contracting!`);
        }
      }
    } else if (this.state === "SHRINKING") {
      const progress = 1 - Math.max(0, this.timer / currentPhase.shrinkDuration);
      this.currentRadius = THREE.MathUtils.lerp(this.startRadius, this.nextRadius, progress);
      this.currentX = THREE.MathUtils.lerp(this.startX, this.nextX, progress);
      this.currentZ = THREE.MathUtils.lerp(this.startZ, this.nextZ, progress);

      if (this.timer <= 0) {
        // Phase complete -> Advance to next phase
        this.phaseIndex++;
        if (this.phaseIndex < PHASES.length) {
          const nextPhase = PHASES[this.phaseIndex];
          this.state = "WAITING";
          this.timer = nextPhase.waitDuration;
          this.damage = nextPhase.damage;

          // Pick new safe zone inside the current radius
          const maxShift = (this.currentRadius - nextPhase.nextRadius) * 0.7;
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * maxShift;
          this.nextX = this.currentX + Math.cos(angle) * dist;
          this.nextZ = this.currentZ + Math.sin(angle) * dist;
          this.nextRadius = nextPhase.nextRadius;

          this.nextRingMesh.position.set(this.nextX, 0.4, this.nextZ);
          this.nextRingMesh.scale.set(this.nextRadius, 1, this.nextRadius);
        } else {
          // Final circle reached
          this.state = "WAITING";
          this.timer = 999;
        }
      }
    }

    // Update 3D Visual Mesh
    this.stormMesh.position.set(this.currentX, 30, this.currentZ);
    this.stormMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.stormMesh.material.opacity = 0.28 + Math.sin(Date.now() * 0.006) * 0.08;

    return {
      x: this.currentX,
      z: this.currentZ,
      radius: this.currentRadius,
      nextX: this.nextX,
      nextZ: this.nextZ,
      nextRadius: this.nextRadius,
      damage: this.damage,
      state: this.state,
      timer: Math.max(0, Math.ceil(this.timer)),
      phase: this.phaseIndex + 1
    };
  }
}
