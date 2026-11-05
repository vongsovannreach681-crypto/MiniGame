import React from "react";

export default function ScopeOverlay({ active, weaponId }) {
  if (!active || weaponId !== "awm") return null;

  return (
    <div className="scope-overlay">
      <div className="scope-housing">
        <svg className="scope-reticle" viewBox="0 0 1000 1000">
          {/* Outer Scope Ring */}
          <circle cx="500" cy="500" r="460" stroke="#101416" strokeWidth="8" fill="none" />
          <circle cx="500" cy="500" r="440" stroke="#222b30" strokeWidth="2" fill="none" opacity="0.4" />

          {/* Thick Stadia Lines */}
          <line x1="40" y1="500" x2="320" y2="500" stroke="#111" strokeWidth="5" />
          <line x1="680" y1="500" x2="960" y2="500" stroke="#111" strokeWidth="5" />
          <line x1="500" y1="680" x2="500" y2="960" stroke="#111" strokeWidth="5" />

          {/* Thin Center Crosshair */}
          <line x1="320" y1="500" x2="680" y2="500" stroke="#1a1e20" strokeWidth="1.5" />
          <line x1="500" y1="80" x2="500" y2="680" stroke="#1a1e20" strokeWidth="1.5" />

          {/* Range Elevation Markings */}
          {[550, 600, 650, 700].map((y, idx) => (
            <g key={y}>
              <line x1="480" y1={y} x2="520" y2={y} stroke="#222" strokeWidth="1.2" />
              <text x="532" y={y + 4} fill="#555" fontSize="12" fontFamily="monospace">
                {(idx + 1) * 100}m
              </text>
            </g>
          ))}

          {/* Windage Mil-Dots */}
          {[420, 460, 540, 580].map(x => (
            <circle key={x} cx={x} cy="500" r="2.5" fill="#222" />
          ))}

          {/* Center Illuminated Aiming Dot */}
          <circle cx="500" cy="500" r="3" fill="#ff2a2a" />
          <circle cx="500" cy="500" r="1.2" fill="#fff" />
        </svg>

        <div className="scope-lens-glare"></div>
      </div>
      <div className="scope-info">
        <span>8X TACTICAL SCOPE</span>
        <span>RANGE: 300M</span>
      </div>
    </div>
  );
}
