import React, { useEffect, useRef } from "react";

export default function TacticalMap({
  playerPos,
  playerYaw,
  zone,
  vehicles = [],
  airdropDrops = [],
  onClose
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const scale = width / 300; // 300m world into tactical map canvas

    const toMapX = x => center + x * scale;
    const toMapY = z => center + z * scale;

    // Ocean background
    ctx.fillStyle = "#162e3b";
    ctx.fillRect(0, 0, width, height);

    // Island landmass
    ctx.beginPath();
    ctx.arc(center, center, 125 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#3e5c3e";
    ctx.fill();

    // Beach Sand Rim
    ctx.lineWidth = 10 * scale;
    ctx.strokeStyle = "#c2b280";
    ctx.stroke();

    // Tactical Coordinate Grid (100m lines)
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    const letters = ["A", "B", "C", "D", "E", "F"];
    const numbers = ["1", "2", "3", "4", "5", "6"];
    const step = width / 6;

    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(width, i * step);
      ctx.stroke();

      if (i < 6) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "bold 13px monospace";
        ctx.fillText(letters[i], i * step + 8, 20);
        ctx.fillText(numbers[i], 8, i * step + 22);
      }
    }

    // Roads
    ctx.lineWidth = 5 * scale;
    ctx.strokeStyle = "#4a4f4d";
    ctx.beginPath();
    ctx.moveTo(toMapX(-15), toMapY(-80));
    ctx.lineTo(toMapX(-15), toMapY(80));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toMapX(-15), toMapY(-25));
    ctx.lineTo(toMapX(65), toMapY(-35));
    ctx.stroke();

    // Sector Name Labels
    const sectors = [
      { name: "CENTRAL TOWN", x: -20, z: -25, color: "#f1c40f" },
      { name: "NAVAL HARBOR", x: 55, z: -35, color: "#3498db" },
      { name: "RADAR BASE", x: -45, z: 45, color: "#e74c3c" },
      { name: "WIND FARMS", x: 35, z: 50, color: "#2ecc71" },
      { name: "LUMBER DEPOT", x: -65, z: -10, color: "#e67e22" }
    ];

    sectors.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.font = "bold 14px 'Barlow Condensed', Arial";
      ctx.textAlign = "center";
      ctx.fillText(s.name, toMapX(s.x), toMapY(s.z));
      ctx.beginPath();
      ctx.arc(toMapX(s.x), toMapY(s.z) + 6, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Zone Rings
    if (zone) {
      // Current blue storm
      ctx.beginPath();
      ctx.arc(toMapX(zone.x), toMapY(zone.z), zone.radius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#33b5e5";
      ctx.stroke();

      // Next safe zone (white dash)
      ctx.beginPath();
      ctx.arc(toMapX(zone.nextX), toMapY(zone.nextZ), zone.nextRadius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vehicles
    vehicles.forEach(v => {
      ctx.fillStyle = "#f39c12";
      ctx.beginPath();
      ctx.arc(toMapX(v.x), toMapY(v.z), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Airdrops
    airdropDrops.forEach(d => {
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(toMapX(d.x) - 7, toMapY(d.z) - 7, 14, 14);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(toMapX(d.x) - 7, toMapY(d.z) - 7, 14, 14);
    });

    // Player Marker
    const px = toMapX(playerPos.x);
    const py = toMapY(playerPos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-playerYaw);

    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fillStyle = "#f1c40f";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, [playerPos, playerYaw, zone, vehicles, airdropDrops]);

  return (
    <div className="tactical-map-modal" onClick={onClose}>
      <div className="tactical-map-box" onClick={e => e.stopPropagation()}>
        <div className="tactical-header">
          <div>
            <h3>ISLAND OPS — SATELLITE TACTICAL MAP</h3>
            <span className="tactical-sub">COORDINATES: {Math.round(playerPos.x)}, {Math.round(playerPos.z)}</span>
          </div>
          <button className="close-btn" onClick={onClose}>CLOSE [M / ESC]</button>
        </div>
        <canvas ref={canvasRef} width={680} height={680} className="tactical-canvas" />
        <div className="tactical-legend">
          <span><i className="legend-blue"></i> Blue Storm</span>
          <span><i className="legend-white"></i> Next Safe Circle</span>
          <span><i className="legend-car"></i> Buggy Vehicle</span>
          <span><i className="legend-airdrop"></i> Supply Drop</span>
        </div>
      </div>
    </div>
  );
}
