import React from "react";

export default function KillFeed({ events }) {
  return (
    <div className="kill-feed">
      {events.map(e => (
        <div key={e.id} className={`kill-item ${e.isPlayer ? "player-event" : ""}`}>
          <span className="killer-name">{e.killer}</span>
          <span className="weapon-tag">
            {e.isHeadshot && <span className="headshot-badge" title="Headshot">💀</span>}
            [{e.weapon}]
          </span>
          <span className="victim-name">{e.victim}</span>
        </div>
      ))}
    </div>
  );
}
