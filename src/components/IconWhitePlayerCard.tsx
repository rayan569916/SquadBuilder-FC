import React, { useId } from 'react';
import { ICON_WHITE_CARD_BG } from '../assets/iconWhiteCardBg';
import { Profile } from '../types/database';

interface PlayerCardProps {
  player?: Profile | null;
  positionTag?: string;
  rating?: number;
  isSelected?: boolean;
  isSub?: boolean;
  className?: string;
  avatarOnly?: boolean;
  replacesName?: string;
  team?: 'A' | 'B';
}

export const IconWhitePlayerCard: React.FC<PlayerCardProps> = ({
  player,
  positionTag,
  rating = 99,
  isSelected = false,
  isSub = false,
  className = '',
  team = 'A',
}) => {
  const maskId = useId();
  const fadeGradId = `fade-w-${maskId.replace(/:/g, '')}`;
  const phmMaskId = `phm-w-${maskId.replace(/:/g, '')}`;

  const playerName = (player?.name || positionTag || 'PLAYER').toUpperCase();
  const pos = positionTag || player?.position || 'ST';
  const isGK = pos === 'GK' || player?.position === 'GK';

  // Determine the 6 stats
  const statLabels = isGK
    ? ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']
    : ['IMP', 'SHO', 'PAS', 'DEF', 'PHY', 'WIN'];

  let statValues: number[] = [99, 99, 99, 99, 99, 99];
  if (player?.attributes) {
    if (isGK && player.attributes.goalkeeping) {
      const gk = player.attributes.goalkeeping;
      statValues = [
        gk.diving ?? 99,
        gk.handling ?? 99,
        gk.kicking ?? 99,
        gk.reflexes ?? 99,
        gk.speed ?? 99,
        gk.positioning ?? 99,
      ];
    } else {
      const attr = player.attributes;
      const winRate = player.win_percentage ? Math.round(player.win_percentage) : 99;
      statValues = [
        attr.impact ?? 99,
        attr.shooting ?? 99,
        attr.passing ?? 99,
        attr.defense ?? 99,
        attr.physical ?? 99,
        winRate,
      ];
    }
  }

  // Name scaling logic:
  // Base font size 62.41 at viewBox 644x900 with translate(322.5, 521), max width 340
  const nameLength = playerName.length;
  const scaleX = nameLength > 10 ? Math.max(0.6, Number(((10 / nameLength) * 1.05).toFixed(3))) : 1.05;

  // Icon White theme color
  const ink = '#63553a';

  return (
    <div
      className={`relative select-none transition-all duration-200 ${className} ${
        isSelected ? 'scale-105 z-30 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]' : ''
      }`}
    >
      <svg
        viewBox="0 0 644 900"
        role="img"
        aria-label={`${playerName} card`}
        className={`w-full h-auto block drop-shadow-[0_12px_20px_rgba(0,0,0,0.65)] ${
          isSelected
            ? 'filter drop-shadow-[0_0_8px_#ffffff]'
            : team === 'B'
            ? 'filter drop-shadow-[0_8px_16px_rgba(112,66,248,0.4)]'
            : ''
        }`}
        style={{
          fontFamily: '"Saira Extra Condensed", "Arial Narrow", system-ui, sans-serif',
        }}
      >
        <defs>
          <radialGradient id={fadeGradId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.6" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={phmMaskId}>
            <rect x="240" y="95" width="360" height="400" fill={`url(#${fadeGradId})`} />
          </mask>
        </defs>

        {/* Card Background Graphic */}
        <image href={ICON_WHITE_CARD_BG} x="0" y="0" width="644" height="900" />

        {/* Player Photo with Fade Mask */}
        {player?.avatar_url ? (
          <image
            href={player.avatar_url}
            x="180"
            y="95"
            width="360"
            height="400"
    preserveAspectRatio="xMidYMax meet"
  />
) : (
  /* Placeholder Initials */
  <g>
    <text
      x="470"
      y="370"
      textAnchor="middle"
      fill="#f2dda0"
      fontSize="120"
      fontWeight="700"
      opacity="0.4"
    >
      {playerName.slice(0, 2)}
    </text>
  </g>
)}

        {/* Graphic Accents Group */}
        <g fill={ink}>
          {/* Flag / Badge Accent Box */}
          <rect
            x="136"
            y="286"
            width="104"
            height="67"
            rx="2"
            fill="#dccb9f"
            stroke="#b89d5a"
            strokeWidth="2"
          />

          {/* Club Emblem Circle */}
          <circle
            cx="188"
            cy="424"
            r="41"
            fill="#dccb9f"
            stroke="#b89d5a"
            strokeWidth="2"
          />

          {/* Club initials inside the emblem circle */}
          <text
            x="188"
            y="432"
            textAnchor="middle"
            fill="#63553a"
            fontSize="22"
            fontWeight="700"
          >
            {player?.club ? player.club.slice(0, 3).toUpperCase() : 'FC'}
          </text>

          {/* Top Crest Brand */}
          <text x="322" y="109" textAnchor="middle" fontSize="34" fill="#7a5f26" fontWeight="700">
            SB
          </text>

          {/* Rating */}
          <text
            id="rating"
            textAnchor="middle"
            fontSize="98.59"
            fontWeight="700"
            transform="translate(187.5 210) scale(0.844 1)"
          >
            {rating ?? 99}
          </text>

          {/* Position */}
          <text
            id="pos"
            textAnchor="middle"
            fontSize="62.41"
            fontWeight="700"
            transform="translate(188 259) scale(0.965 1)"
          >
            {pos}
          </text>

          {/* Player Name */}
          <text
            id="name"
                      x="0"
          y="0"
            textAnchor="middle"
            fontSize="62.41"
            fontWeight="700"
            transform={`translate(322.5 545) scale(${scaleX} 1)`}
          >
            {playerName}
          </text>

          {/* 6 Stats (Column 1) */}
          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(182.0 602) scale(0.905 1)"
          >
            {statValues[0]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(197.0 602) scale(0.947 1)"
          >
            {statLabels[0]}
          </text>

          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(182.0 656) scale(0.905 1)"
          >
            {statValues[1]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(197.0 656) scale(0.947 1)"
          >
            {statLabels[1]}
          </text>

          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(182.0 710) scale(0.905 1)"
          >
            {statValues[2]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(197.0 710) scale(0.947 1)"
          >
            {statLabels[2]}
          </text>

          {/* 6 Stats (Column 2) */}
          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(420.0 602) scale(0.905 1)"
          >
            {statValues[3]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(435.0 602) scale(0.947 1)"
          >
            {statLabels[3]}
          </text>

          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(420.0 656) scale(0.905 1)"
          >
            {statValues[4]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(435.0 656) scale(0.947 1)"
          >
            {statLabels[4]}
          </text>

          <text
            textAnchor="end"
            fontSize="53.9"
            fontWeight="500"
            transform="translate(420.0 710) scale(0.905 1)"
          >
            {statValues[5]}
          </text>
          <text
            textAnchor="start"
            fontSize="52.48"
            fontWeight="500"
            transform="translate(435.0 710) scale(0.947 1)"
          >
            {statLabels[5]}
          </text>
        </g>
      </svg>

      {/* Substitute Badge Overlay */}
      {isSub && (
        <span
          className="absolute -top-1.5 -right-1.5 z-30 rounded border border-emerald-300/60 bg-emerald-500/90 px-1 py-0.2 text-[8px] font-bold text-white shadow-md"
        >
          SUB
        </span>
      )}
    </div>
  );
};
