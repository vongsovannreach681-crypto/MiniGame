import React, { useEffect, useRef, useState } from "react";

export default function TouchControls({
  onMove,
  onLook,
  onFireStart,
  onFireEnd,
  onJump,
  onCrouch,
  onReload,
  onInteract,
  onToggleAds,
  isAiming,
  isCrouching,
  interactionPrompt,
  drivingVehicle,
  dropState,
  onEject,
  onDeployParachute
}) {
  const [isPortrait, setIsPortrait] = useState(false);
  const joystickContainerRef = useRef(null);
  const lookAreaRef = useRef(null);

  // Joystick state
  const joystickTouchId = useRef(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState(false);

  // Look touch state
  const lookTouchId = useRef(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Orientation Check
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // --- JOYSTICK TOUCH HANDLERS ---
  const handleJoystickStart = e => {
    e.preventDefault();
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;

    const rect = joystickContainerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    joystickCenter.current = { x: cx, y: cy };

    setJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = e => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setStickPos({ x: 0, y: 0 });
        setJoystickActive(false);
        onMove({ x: 0, y: 0, sprint: false });
        break;
      }
    }
  };

  const updateJoystick = (clientX, clientY) => {
    const maxRadius = 45;
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setStickPos({ x: normX, y: normY });

    const moveX = normX / maxRadius;
    const moveY = normY / maxRadius;
    const sprint = moveY < -0.75; // pushed far forward
    onMove({ x: moveX, y: moveY, sprint });
  };

  // --- CAMERA LOOK TOUCH HANDLERS (RIGHT HALF OF SCREEN) ---
  const handleLookStart = e => {
    // Only capture if not clicking a button
    if (e.target.closest("button") || e.target.closest(".touch-action-btn")) return;
    if (lookTouchId.current !== null) return;

    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };

        onLook({ dx, dy });
        break;
      }
    }
  };

  const handleLookEnd = e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  return (
    <div className="touch-controls-root">
      {/* Portrait Warning Overlay */}
      {isPortrait && (
        <div className="rotate-device-modal">
          <div className="rotate-icon">📱 ➔ 🔄</div>
          <h3>ROTATE TO LANDSCAPE</h3>
          <p>Please rotate your phone horizontally for full tactical controls and wide FOV.</p>
        </div>
      )}

      {/* VIRTUAL ANALOG JOYSTICK (BOTTOM LEFT) */}
      <div
        ref={joystickContainerRef}
        className={`touch-joystick-zone ${joystickActive ? "active" : ""}`}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onTouchCancel={handleJoystickEnd}
      >
        <div className="joystick-base">
          <div
            className="joystick-knob"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`
            }}
          />
          <div className="joystick-sprint-hint">▲ SPRINT</div>
        </div>
      </div>

      {/* CAMERA SWIPE LOOK ZONE (RIGHT HALF) */}
      <div
        ref={lookAreaRef}
        className="touch-look-zone"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
      />

      {/* SECONDARY LEFT-HAND FIRE BUTTON (FOR CLAW PLAYERS) */}
      <button
        className="touch-action-btn secondary-fire-btn"
        onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onFireStart(); }}
        onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); onFireEnd(); }}
        title="Fire Weapon"
      >
        🎯
      </button>

      {/* RIGHT-HAND ACTION BUTTONS CLUSTER */}
      <div className="touch-actions-cluster">
        {/* PARACHUTE / EJECT PROMPT FOR MOBILE */}
        {dropState === "IN_PLANE" && (
          <button
            className="touch-action-btn mobile-eject-btn"
            onTouchStart={e => { e.preventDefault(); onEject(); }}
          >
            🪂 EJECT
          </button>
        )}

        {dropState === "FREEFALL" && (
          <button
            className="touch-action-btn mobile-parachute-btn"
            onTouchStart={e => { e.preventDefault(); onDeployParachute(); }}
          >
            🪂 OPEN
          </button>
        )}

        {/* INTERACT / VEHICLE / LOOT BUTTON */}
        {(interactionPrompt || drivingVehicle) && (
          <button
            className="touch-action-btn touch-interact-btn pulse-anim"
            onTouchStart={e => { e.preventDefault(); onInteract(); }}
          >
            ✋ {drivingVehicle ? "EXIT" : "LOOT"}
          </button>
        )}

        {/* ADS / SCOPE ZOOM BUTTON */}
        <button
          className={`touch-action-btn touch-ads-btn ${isAiming ? "btn-active" : ""}`}
          onTouchStart={e => { e.preventDefault(); onToggleAds(); }}
        >
          🔍
        </button>

        {/* RELOAD BUTTON */}
        <button
          className="touch-action-btn touch-reload-btn"
          onTouchStart={e => { e.preventDefault(); onReload(); }}
        >
          🔄
        </button>

        {/* CROUCH BUTTON */}
        <button
          className={`touch-action-btn touch-crouch-btn ${isCrouching ? "btn-active" : ""}`}
          onTouchStart={e => { e.preventDefault(); onCrouch(); }}
        >
          🧎
        </button>

        {/* JUMP BUTTON */}
        <button
          className="touch-action-btn touch-jump-btn"
          onTouchStart={e => { e.preventDefault(); onJump(); }}
        >
          ⬆️
        </button>

        {/* PRIMARY RIGHT-HAND FIRE BUTTON (LARGE) */}
        <button
          className="touch-action-btn primary-fire-btn"
          onTouchStart={e => { e.preventDefault(); e.stopPropagation(); onFireStart(); }}
          onTouchEnd={e => { e.preventDefault(); e.stopPropagation(); onFireEnd(); }}
        >
          💥
        </button>
      </div>
    </div>
  );
}
