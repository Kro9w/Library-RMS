// apps/web/src/components/ui/LoadingAnimation.tsx
import React from "react";
import "./LoadingAnimation.css";

export const LoadingAnimation: React.FC = () => {
  return (
    <div className="loading-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className="plume-svg"
      >
        {/* Subtle ink drop at the start point for realism */}
        <circle cx="40" cy="220" r="3.5" className="ink-dot" />

        <path
          className="writing-line"
          d="M 40,220 C 70,240 100,200 130,220 C 160,240 200,200 230,220"
          pathLength="100" /* Normalizes the path to exactly 100 units */
        />

        <g className="plume-group">
          <polygon points="140,40 220,40 220,100 190,130 190,70 110,70" />
          <polygon points="100,80 180,80 180,140 150,170 150,110 70,110" />
          <polygon points="60,120 140,120 140,180 40,220 110,150 30,150" />
        </g>
      </svg>
    </div>
  );
};
