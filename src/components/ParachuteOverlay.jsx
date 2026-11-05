import React from "react";

export default function ParachuteOverlay({ state, altitude, speed, onEject, onDeployParachute }) {
  if (state === "GROUND") return null;

  const altPercent = Math.min(100, Math.max(0, (altitude / 220) * 100));

  return (
    <div className="parachute-overlay">
      {/* Altitude & Airspeed HUD Gauges on Right */}
      <div className="flight-telemetry">
        <div className="telemetry-item">
          <span className="tele-label">ALTITUDE</span>
          <div className="alt-bar-track">
            <div className="alt-bar-fill" style={{ height: `${altPercent}%` }} />
            <div className="alt-danger-mark" style={{ bottom: "20%" }} title="Auto-Deploy Line" />
          </div>
          <span className="tele-val">{Math.round(altitude)}m</span>
        </div>

        <div className="telemetry-item">
          <span className="tele-label">AIRSPEED</span>
          <span className="tele-val speed">{Math.round(speed * 3.6)} <small>km/h</small></span>
        </div>
      </div>

      {/* Center Action Prompts */}
      <div className="drop-prompt-center">
        {state === "IN_PLANE" && (
          <div className="prompt-card pulse">
            <h2>AIRSPACE INGRESS</h2>
            <p>Select your drop zone over the island</p>
            <button className="eject-btn" onClick={onEject}>
              [F] EJECT FROM PLANE
            </button>
          </div>
        )}

        {state === "FREEFALL" && (
          <div className="prompt-card">
            <h3>FREEFALL DIVE</h3>
            <p>Aim mouse to steer descent angle</p>
            <button className="deploy-btn" onClick={onDeployParachute}>
              [SPACE] OPEN PARACHUTE
            </button>
            <span className="subtext">Auto-deploys at 45m</span>
          </div>
        )}

        {state === "GLIDING" && (
          <div className="prompt-card mini">
            <h3>PARACHUTE OPEN</h3>
            <p>Use [W A S D] to glide toward target</p>
          </div>
        )}
      </div>
    </div>
  );
}
