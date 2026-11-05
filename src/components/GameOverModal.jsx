import React from "react";

export default function GameOverModal({
  won,
  rank,
  kills,
  headshots,
  damageDealt,
  survivalTime,
  onPlayAgain,
  onSpectate,
  onReturnMenu
}) {
  const formatTime = sec => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="game-over-overlay">
      <div className={`game-over-card ${won ? "victory-card" : "defeat-card"}`}>
        <div className="badge-eyebrow">
          {won ? "CHICKEN DINNER!" : "OPERATOR ELIMINATED"}
        </div>

        <h2 className="result-headline">
          {won ? "VICTORY ROYALE" : `#${rank} RANK`}
        </h2>

        <p className="result-sub">
          {won
            ? "You are the sole survivor of Island Ops! Outstanding operational execution."
            : "Better luck next drop. Review your combat performance below."}
        </p>

        {/* COMBAT STATS GRID */}
        <div className="stats-breakdown-grid">
          <div className="stat-box">
            <span className="stat-label">ELIMINATIONS</span>
            <b className="stat-num">{kills}</b>
          </div>
          <div className="stat-box">
            <span className="stat-label">HEADSHOTS</span>
            <b className="stat-num">{headshots}</b>
          </div>
          <div className="stat-box">
            <span className="stat-label">DAMAGE DEALT</span>
            <b className="stat-num">{Math.round(damageDealt)}</b>
          </div>
          <div className="stat-box">
            <span className="stat-label">SURVIVAL TIME</span>
            <b className="stat-num">{formatTime(survivalTime)}</b>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="modal-actions-col">
          <button className="primary-action-btn" onClick={onPlayAgain}>
            PLAY AGAIN <b>→</b>
          </button>
          {!won && onSpectate && (
            <button className="secondary-action-btn" onClick={onSpectate}>
              SPECTATE REMAINING BOTS
            </button>
          )}
          <button className="tertiary-action-btn" onClick={onReturnMenu}>
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
}
