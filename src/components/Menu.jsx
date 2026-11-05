import React, { useState } from "react";
import { sounds } from "../audio/SoundManager.js";

export default function Menu({
  onStartGame,
  sensitivity,
  setSensitivity,
  volume,
  setVolume
}) {
  const [tab, setTab] = useState("lobby"); // "lobby", "settings", "controls"

  const handleStart = () => {
    sounds.init();
    sounds.resume();
    onStartGame();
  };

  return (
    <div className="main-menu-container">
      {/* Background Graphic Panorama */}
      <div className="menu-backdrop">
        <div className="sun-glow" />
        <div className="mountain-silhouette back" />
        <div className="mountain-silhouette mid" />
        <div className="military-grid-pattern" />
      </div>

      <div className="menu-content-grid">
        {/* Left Branding & Mode Card */}
        <div className="menu-sidebar">
          <div className="menu-tagline">SURVIVAL BATTLE ROYALE • WEB 3D</div>
          <h1 className="game-title">
            ISLAND <span>OPS</span>
          </h1>
          <p className="game-lead">
            Drop into a 360-meter combat island against 29 intelligent bots.
            Scavenge weapons, drive 4x4 vehicles, contest airdrops, and survive the shrinking electric storm.
          </p>

          <div className="mode-card">
            <div className="mode-pill">MATCHMAKING ACTIVE</div>
            <h3>SOLO BATTLE ROYALE</h3>
            <div className="mode-features">
              <span>🪂 PARACHUTE DROP</span>
              <span>🚙 DRIVEABLE BUGGIES</span>
              <span>📦 AIRDROPS</span>
              <span>⚡ BLUE STORM</span>
            </div>
          </div>

          <div className="menu-nav-tabs">
            <button
              className={`nav-tab ${tab === "lobby" ? "active" : ""}`}
              onClick={() => setTab("lobby")}
            >
              DEPLOY LOBBY
            </button>
            <button
              className={`nav-tab ${tab === "settings" ? "active" : ""}`}
              onClick={() => setTab("settings")}
            >
              SETTINGS
            </button>
            <button
              className={`nav-tab ${tab === "controls" ? "active" : ""}`}
              onClick={() => setTab("controls")}
            >
              CONTROLS
            </button>
          </div>

          {tab === "lobby" && (
            <button className="primary-deploy-btn" onClick={handleStart}>
              DEPLOY TO ISLAND <b>→</b>
            </button>
          )}
        </div>

        {/* Right Interactive Panel */}
        <div className="menu-right-panel">
          {tab === "lobby" && (
            <div className="briefing-box">
              <div className="brief-header">OPERATIONAL BRIEFING</div>
              <div className="brief-sectors">
                <div className="sector-card">
                  <b>CENTRAL TOWN</b>
                  <p>Dense multi-room buildings with balanced assault rifles and medkits.</p>
                </div>
                <div className="sector-card">
                  <b>NAVAL HARBOR</b>
                  <p>Shipping container maze with high-tier CQB weapons and shotguns.</p>
                </div>
                <div className="sector-card">
                  <b>MILITARY RADAR BASE</b>
                  <p>High elevation bunker with guaranteed sniper rifles and Lv.3 armor.</p>
                </div>
                <div className="sector-card">
                  <b>4x4 BUGGIES</b>
                  <p>Parked along arterial roads for rapid redeployment across the zone.</p>
                </div>
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="settings-box">
              <h3>GAME SETTINGS</h3>

              <div className="setting-row">
                <label>
                  MOUSE SENSITIVITY: <b>{sensitivity.toFixed(1)}x</b>
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={sensitivity}
                  onChange={e => setSensitivity(parseFloat(e.target.value))}
                />
              </div>

              <div className="setting-row">
                <label>
                  MASTER AUDIO: <b>{Math.round(volume * 100)}%</b>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    sounds.setVolume(val, val);
                  }}
                />
              </div>

              <div className="setting-note">
                Audio is procedurally synthesized via Web Audio API. No external downloads required.
              </div>
            </div>
          )}

          {tab === "controls" && (
            <div className="controls-box">
              <h3>TACTICAL KEYBINDINGS</h3>
              <div className="controls-grid">
                <div><kbd>W A S D</kbd><span>Move & Drive</span></div>
                <div><kbd>Mouse</kbd><span>Aim Camera</span></div>
                <div><kbd>Left Click</kbd><span>Fire Weapon / Attack</span></div>
                <div><kbd>Right Click</kbd><span>Aim Down Sights (ADS)</span></div>
                <div><kbd>Shift</kbd><span>Sprint / Speed Boost</span></div>
                <div><kbd>Space</kbd><span>Jump / Open Parachute</span></div>
                <div><kbd>C</kbd><span>Crouch (Tighter Spread)</span></div>
                <div><kbd>R</kbd><span>Reload Magazine</span></div>
                <div><kbd>F</kbd><span>Interact / Loot / Drive</span></div>
                <div><kbd>1, 2, 3</kbd><span>Switch Weapon Slots</span></div>
                <div><kbd>H</kbd><span>Use Medkit / First Aid</span></div>
                <div><kbd>M</kbd><span>Toggle Tactical Map</span></div>
                <div><kbd>Esc</kbd><span>Pause / Release Mouse</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
