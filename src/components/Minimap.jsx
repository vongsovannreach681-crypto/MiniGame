import React, { useEffect, useRef } from "react";

export default function Minimap({
  playerPos,
  playerYaw,
  zone,
  vehicles = [],
  airdropDrops = [],
  gunfirePings = [],
  onOpenMap
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const half = size / 2;
    const scale = size / 260; // 260m map diameter into canvas size

    ctx.clearRect(0, 0, size, size);

    // Save for radar rotation relative to player orientation or north-up
    ctx.save();

    // Background radar circle
    ctx.beginPath();
    ctx.arc(half, half, half - 3, 0, Math.PI * 2);
    ctx.fillStyle = "#152225e6";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#385157";
    ctx.stroke();
    ctx.clip(); // clip contents inside radar circle

    // Draw Island Coastline Representation
    const toMapX = x => half + x * scale;
    const toMapY = z => half + z * scale;

    ctx.beginPath();
    ctx.arc(half, half, 120 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "#3d5c41";
    ctx.fill();

    // Harbor & Town markings
    ctx.fillStyle = "#697268";
    ctx.fillRect(toMapX(-30), toMapY(-30), 22 * scale, 18 * scale);
    ctx.fillRect(toMapX(50), toMapY(-45), 20 * scale, 24 * scale);

    // Blue Electric Storm Circle
    if (zone) {
      ctx.beginPath();
      ctx.arc(toMapX(zone.x), toMapY(zone.z), zone.radius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#33b5e5";
      ctx.stroke();

      // White Next Safe Zone Circle
      ctx.beginPath();
      ctx.arc(toMapX(zone.nextX), toMapY(zone.nextZ), zone.nextRadius * scale, 0, Math.PI * 2);
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vehicle Markers
    vehicles.forEach(v => {
      ctx.fillStyle = "#f39c12";
      ctx.beginPath();
      ctx.arc(toMapX(v.x), toMapY(v.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Airdrop Markers
    airdropDrops.forEach(d => {
      ctx.fillStyle = "#e74c3c";
      ctx.fillRect(toMapX(d.x) - 4, toMapY(d.z) - 4, 8, 8);
    });

    // Gunfire Sound Pings (ROS radar gunfire markers)
    gunfirePings.forEach(p => {
      const alpha = Math.max(0, 1 - (Date.now() - p.time) / 2500);
      ctx.beginPath();
      ctx.arc(toMapX(p.x), toMapY(p.z), 5 + (1 - alpha) * 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha * 0.8})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // Player Marker (Arrow pointing in player heading)
    const px = toMapX(playerPos.x);
    const py = toMapY(playerPos.z);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-playerYaw);

    // Vision cone
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -Math.PI / 4 - Math.PI / 2, Math.PI / 4 - Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(241, 196, 15, 0.25)";
    ctx.fill();

    // Player arrow
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = "#f1c40f";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }, [playerPos, playerYaw, zone, vehicles, airdropDrops, gunfirePings]);

  // Compass Heading calculation
  const deg = (Math.round((playerYaw * (180 / Math.PI)) % 360) + 360) % 360;
  const cardinal =
    deg > 337 || deg <= 22 ? "N" :
    deg > 22 && deg <= 67 ? "NE" :
    deg > 67 && deg <= 112 ? "E" :
    deg > 112 && deg <= 157 ? "SE" :
    deg > 157 && deg <= 202 ? "S" :
    deg > 202 && deg <= 247 ? "SW" :
    deg > 247 && deg <= 292 ? "W" : "NW";

  return (
    <div className="minimap-container" onClick={onOpenMap} title="Click or Press [M] for Full Map">
      <div className="compass-bar">
        <span className="compass-degree">{deg}°</span>
        <span className="compass-cardinal">{cardinal}</span>
      </div>
      <canvas ref={canvasRef} width={180} height={180} className="minimap-canvas" />
      <div className="minimap-hint">[M] EXPAND MAP</div>
    </div>
  );
}
