import React from 'react';
import { PlayerAttributes } from '../types/database';

interface RadarChartProps {
  attributes?: PlayerAttributes;
  size?: number;
  className?: string;
  color?: string; // default emerald green
}

export const RadarChart: React.FC<RadarChartProps> = ({
  attributes = {
    impact: 95,
    shooting: 92,
    passing: 90,
    defense: 85,
    physical: 88,
  },
  size = 300,
  className = '',
  color = '#10b981',
}) => {
  // Center is (160, 140) in a 320x280 viewBox
  const cx = 160;
  const cy = 140;
  const maxR = 90;

  // Angles for 5-axis polygon:
  // 1. Top (Impact): -90 deg (-pi/2)
  // 2. Right (Passing): -18 deg (-pi/10)
  // 3. Bottom-Right (Physical): 54 deg (3*pi/10)
  // 4. Bottom-Left (Defense): 126 deg (7*pi/10)
  // 5. Left (Shooting): 198 deg (11*pi/10)
  const getCoordinates = (value: number, angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = (Math.max(10, Math.min(100, value)) / 100) * maxR;
    const x = cx + r * Math.cos(angleRad);
    const y = cy + r * Math.sin(angleRad);
    return { x, y };
  };

  const pTop = getCoordinates(attributes.impact, -90);
  const pRight = getCoordinates(attributes.passing, -18);
  const pBottomRight = getCoordinates(attributes.physical, 54);
  const pBottomLeft = getCoordinates(attributes.defense, 126);
  const pLeft = getCoordinates(attributes.shooting, 198);

  const polygonPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottomRight.x},${pBottomRight.y} ${pBottomLeft.x},${pBottomLeft.y} ${pLeft.x},${pLeft.y}`;

  // Ring helper
  const getRingPoints = (percent: number) => {
    const r = (percent / 100) * maxR;
    const angles = [-90, -18, 54, 126, 198];
    return angles
      .map((a) => {
        const rad = (a * Math.PI) / 180;
        return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
      })
      .join(' ');
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 320 280"
        width={size}
        height={(size * 280) / 320}
        className="overflow-visible select-none max-w-full"
      >
        <defs>
          <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="65%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </radialGradient>
          <filter id="radarNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric Guide Web Rings */}
        <polygon points={getRingPoints(25)} fill="none" stroke="rgba(186,215,247,0.10)" strokeDasharray="3 3" strokeWidth="1" />
        <polygon points={getRingPoints(50)} fill="none" stroke="rgba(186,215,247,0.14)" strokeWidth="1" />
        <polygon points={getRingPoints(75)} fill="none" stroke="rgba(186,215,247,0.16)" strokeDasharray="3 3" strokeWidth="1" />
        <polygon points={getRingPoints(100)} fill="none" stroke="rgba(186,215,247,0.24)" strokeWidth="1.2" />

        {/* Spokes */}
        {[-90, -18, 54, 126, 198].map((angle, idx) => {
          const rad = (angle * Math.PI) / 180;
          const endX = cx + maxR * Math.cos(rad);
          const endY = cy + maxR * Math.sin(rad);
          return (
            <line
              key={idx}
              x1={cx}
              y1={cy}
              x2={endX}
              y2={endY}
              stroke="rgba(186,215,247,0.18)"
              strokeWidth="1"
            />
          );
        })}

        {/* Attribute Polygon Fill */}
        <polygon
          points={polygonPoints}
          fill="url(#radarFillGrad)"
          stroke={color}
          strokeWidth="2.5"
          filter="url(#radarNeonGlow)"
        />

        {/* Glowing Vertex Markers */}
        {[pTop, pRight, pBottomRight, pBottomLeft, pLeft].map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="4"
            fill="#d8ecf8"
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-300"
          />
        ))}

        {/* Axis Labels & Values */}
        {/* Top: Match Impact */}
        <text
          x={cx}
          y={cy - maxR - 16}
          textAnchor="middle"
          fill="#d8ecf8"
          fontSize="11"
          fontWeight="600"
          className="font-mono tracking-wider"
        >
          IMPACT <tspan fill={color}>{attributes.impact}</tspan>
        </text>

        {/* Right: Passing */}
        <text
          x={cx + maxR + 10}
          y={cy + 4}
          textAnchor="start"
          fill="#d8ecf8"
          fontSize="11"
          fontWeight="600"
          className="font-mono tracking-wider"
        >
          PASS <tspan fill={color}>{attributes.passing}</tspan>
        </text>

        {/* Bottom-Right: Physical */}
        <text
          x={cx + 65}
          y={cy + maxR + 24}
          textAnchor="middle"
          fill="#d8ecf8"
          fontSize="11"
          fontWeight="600"
          className="font-mono tracking-wider"
        >
          PHYSICAL <tspan fill={color}>{attributes.physical}</tspan>
        </text>

        {/* Bottom-Left: Defense */}
        <text
          x={cx - 65}
          y={cy + maxR + 24}
          textAnchor="middle"
          fill="#d8ecf8"
          fontSize="11"
          fontWeight="600"
          className="font-mono tracking-wider"
        >
          DEFENSE <tspan fill={color}>{attributes.defense}</tspan>
        </text>

        {/* Left: Shooting */}
        <text
          x={cx - maxR - 10}
          y={cy + 4}
          textAnchor="end"
          fill="#d8ecf8"
          fontSize="11"
          fontWeight="600"
          className="font-mono tracking-wider"
        >
          <tspan fill={color}>{attributes.shooting}</tspan> SHOOT
        </text>
      </svg>
    </div>
  );
};
