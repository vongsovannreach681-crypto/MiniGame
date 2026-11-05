import React from "react";
import { WEAPONS, HELMETS, VESTS } from "../game/WeaponSystem.js";

export default function HUD({
  hp,
  shield,
  boost,
  helmetLevel,
  vestLevel,
  activeWeaponId,
  weaponSlots,
  ammo,
  reserve,
  reloading,
  reloadTimer,
  kills,
  aliveCount,
  zoneInfo,
  gameTime,
  interactionPrompt,
  drivingVehicle,
  hitmarker,
  damageFlash,
  isAiming,
  isCrouching,
  isSprinting,
  onSwitchWeapon,
  onUseMed,
  onTogglePause
}) {
  const activeWeapon = WEAPONS[activeWeaponId] || WEAPONS.fists;
  const hpPercent = Math.max(0, Math.min(100, hp));
  const shieldPercent = Math.max(0, Math.min(100, shield));
  const boostPercent = Math.max(0, Math.min(100, boost));

  return (
    <div className="game-hud-root">
      {/* Red screen flash when taking damage */}
      {damageFlash && <div className="damage-vignette" />}

      {/* TOP HEADER */}
      <div className="top-hud">
        <div className="brand-mark">
          ISLAND <b>OPS</b> <small>BATTLE ROYALE</small>
        </div>

        <div className="match-stats">
          <span className="stat-pill alive">
            <i className="dot alive-dot" /> ALIVE <b>{aliveCount}</b>
          </span>
          <span className="stat-pill kills">
            <i className="skull-icon">💀</i> KILLS <b>{kills}</b>
          </span>
          <span className="stat-pill zone">
            <i className="zone-icon">⏱</i> {zoneInfo.state === "SHRINKING" ? "SHRINKING" : "NEXT ZONE"}{" "}
            <b>{zoneInfo.timer}s</b>
          </span>
        </div>

        <button className="pause-btn" onClick={onTogglePause}>
          PAUSE [ESC]
        </button>
      </div>

      {/* DYNAMIC CROSSHAIR & HITMARKER */}
      {!isAiming && (
        <div
          className={`dynamic-crosshair ${isSprinting ? "spread-sprint" : isCrouching ? "tight-crouch" : ""}`}
        >
          <div className="ch-line top" />
          <div className="ch-line bottom" />
          <div className="ch-line left" />
          <div className="ch-line right" />
          <div className="ch-dot" />

          {/* Hitmarker X */}
          {hitmarker && (
            <div className={`hitmarker-x ${hitmarker.isHeadshot ? "headshot" : ""}`}>
              <div className="hm-slash1" />
              <div className="hm-slash2" />
              {hitmarker.isHeadshot && <span className="crit-text">HEADSHOT!</span>}
              <span className="dmg-number">-{hitmarker.damage}</span>
            </div>
          )}
        </div>
      )}

      {/* INTERACTION PROMPT */}
      {interactionPrompt && (
        <div className="interaction-prompt">
          <div className="key-badge">F</div>
          <span>{interactionPrompt}</span>
        </div>
      )}

      {/* VEHICLE SPEEDOMETER (WHEN DRIVING) */}
      {drivingVehicle && (
        <div className="vehicle-hud">
          <div className="veh-title">4x4 DESERT BUGGY</div>
          <div className="veh-speed">
            {Math.round(Math.abs(drivingVehicle.speed) * 3.6)} <small>KM/H</small>
          </div>
          <div className="veh-health-bar">
            <div
              className="veh-health-fill"
              style={{ width: `${(drivingVehicle.health / 300) * 100}%` }}
            />
          </div>
          <div className="veh-hint">[F] EXIT VEHICLE • [W/S] DRIVE • [A/D] STEER</div>
        </div>
      )}

      {/* BOTTOM LEFT: HEALTH, SHIELD, ARMOR BADGES & MEDS */}
      <div className="bottom-left-hud">
        {/* Armor & Shield Bar */}
        {shield > 0 && (
          <div className="shield-bar-wrapper">
            <div className="stat-meta">
              <span>SHIELD</span>
              <b>{Math.ceil(shield)}</b>
            </div>
            <div className="shield-track">
              <div className="shield-fill" style={{ width: `${shieldPercent}%` }} />
            </div>
          </div>
        )}

        {/* Health Bar */}
        <div className="health-bar-wrapper">
          <div className="stat-meta">
            <span>HEALTH</span>
            <b className={hp < 30 ? "hp-danger" : ""}>{Math.ceil(hp)} / 100</b>
          </div>
          <div className="health-track">
            <div
              className={`health-fill ${hp < 30 ? "critical" : ""}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Boost Energy Bar */}
        {boost > 0 && (
          <div className="boost-track">
            <div className="boost-fill" style={{ width: `${boostPercent}%` }} />
          </div>
        )}

        {/* Equipment Badges & Med Quick-Pills */}
        <div className="equipment-row">
          <span className={`gear-badge ${helmetLevel > 0 ? "active" : ""}`}>
            🪖 {helmetLevel > 0 ? `LV.${helmetLevel}` : "NO HELMET"}
          </span>
          <span className={`gear-badge ${vestLevel > 0 ? "active" : ""}`}>
            🛡️ {vestLevel > 0 ? `LV.${vestLevel}` : "NO VEST"}
          </span>
          <button className="med-quick-btn" onClick={() => onUseMed("medkit")} title="Heal 100 HP">
            ✚ FIRST AID [H]
          </button>
        </div>
      </div>

      {/* BOTTOM RIGHT: WEAPONS & AMMO */}
      <div className="bottom-right-hud">
        {/* Weapon Slots Tabs (1, 2, 3) */}
        <div className="weapon-slots-bar">
          {weaponSlots.map((w, idx) => (
            <button
              key={idx}
              className={`slot-tab ${activeWeaponId === w.id ? "active-slot" : ""}`}
              onClick={() => onSwitchWeapon(w.id)}
            >
              <span className="slot-num">{idx + 1}</span>
              <span className="slot-name">{w.name}</span>
            </button>
          ))}
        </div>

        {/* Active Weapon Card */}
        <div className="active-weapon-card">
          <div className="weapon-caliber">
            <b>{activeWeapon.name}</b>
            <small>{activeWeapon.ammoType || "MELEE"} • {activeWeapon.category?.toUpperCase()}</small>
          </div>

          {activeWeapon.id !== "fists" ? (
            <div className="ammo-display">
              <span className="ammo-current">{ammo}</span>
              <span className="ammo-sep">/</span>
              <span className="ammo-reserve">{reserve}</span>
            </div>
          ) : (
            <div className="ammo-display melee">READY</div>
          )}
        </div>

        {/* Reload Indicator */}
        {reloading && (
          <div className="reload-progress-bar">
            <div className="reload-fill" />
            <span>RELOADING...</span>
          </div>
        )}
      </div>

      {/* CONTROLS GUIDE STRIP */}
      <div className="controls-footer-strip">
        <span><b>WASD</b> MOVE</span>
        <span><b>SHIFT</b> SPRINT</span>
        <span><b>SPACE</b> JUMP</span>
        <span><b>C</b> CROUCH</span>
        <span><b>R-CLICK</b> ADS / ZOOM</span>
        <span><b>R</b> RELOAD</span>
        <span><b>F</b> INTERACT / LOOT</span>
        <span><b>M</b> TACTICAL MAP</span>
      </div>
    </div>
  );
}
