import React, { useId } from 'react';
import { ROYAL_BLUE_CARD_BG } from '../assets/royalBlueCardBg';
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

export const RoyalBluePlayerCard: React.FC<PlayerCardProps> = ({
  player,
  positionTag,
  rating = 99,
  isSelected = false,
  isSub = false,
  className = '',
  team = 'A',
}) => {
  const maskId = useId();
  const fadeGradId = `fade-${maskId.replace(/:/g, '')}`;
  const phmMaskId = `phm-${maskId.replace(/:/g, '')}`;

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
  // Base font size 89.36 at viewBox 736x1118 with translate(367.5, 687)
  const nameLength = playerName.length;
  const scaleX = nameLength > 10 ? Math.max(0.65, Number((10 / nameLength * 1.043).toFixed(3))) : 1.043;

  return (
    <div
      className={`relative select-none transition-all duration-200 ${className} ${
        isSelected ? 'scale-105 z-30 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]' : ''
      }`}
    >
      <svg
        viewBox="0 0 736 1118"
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
            <rect x="250" y="90" width="440" height="520" fill={`url(#${fadeGradId})`} />
          </mask>
        </defs>

        {/* Card Background Graphic */}
        <image href={ROYAL_BLUE_CARD_BG} x="0" y="0" width="736" height="1118" />

        {/* Player Photo */}
{/* Player Photo - Transparent Background */}
{player?.avatar_url ? (
  <image
    href={player.avatar_url}
    x="220"
    y="90"
    width="440"
    height="520"
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

        {/* Golden Layout Accents */}
        <g fill="#f2dda0">
          <rect x="153" y="355.2" width="69.5" height="2.4" />
          <rect x="153" y="457" width="69.5" height="2.4" />
          <rect x="139" y="377" width="97" height="62" />

          {/* Golden Stars */}
          <polygon points="156.7,478.2 158.5,483.1 163.7,483.3 159.6,486.6 161.0,491.6 156.7,488.7 152.4,491.6 153.8,486.6 149.7,483.3 154.9,483.1" />
          <polygon points="187.2,471.0 189.0,475.9 194.2,476.1 190.1,479.4 191.5,484.4 187.2,481.5 182.9,484.4 184.3,479.4 180.2,476.1 185.4,475.9" />
          <polygon points="218.8,478.6 220.6,483.5 225.8,483.7 221.7,487.0 223.1,492.0 218.8,489.1 214.5,492.0 215.9,487.0 211.8,483.7 217.0,483.5" />

          {/* Club badge / placeholder emblem ring */}
          <ellipse cx="188" cy="531" rx="38" ry="39" />
          <rect x="368" y="744" width="2" height="199" />
          <rect x="139" y="712" width="458" height="2.6" />
          <rect x="322" y="976.5" width="92" height="2" />
        </g>

        {/* Club initials inside the golden emblem circle */}
        <text
          x="188"
          y="539"
          textAnchor="middle"
          fill="#0b1763"
          fontSize="22"
          fontWeight="700"
        >
          {player?.club ? player.club.slice(0, 3).toUpperCase() : 'FC'}
        </text>

        {/* Top Crest Banner */}
        <path d="M346 97h44v34q0 17-22 27q-22-10-22-27z" fill="#0b1763" stroke="#f2dda0" strokeWidth="3" />
        <text x="368" y="136" textAnchor="middle" fill="#f2dda0" fontSize="26" fontWeight="700">
          SB
        </text>

        {/* Rating and Position */}
        <text
          fill="#f2dda0"
          fontSize="146.48"
          fontWeight="700"
          transform="translate(142.0 270) scale(0.791 1)"
        >
          {rating ?? 99}
        </text>
        <text
          fill="#f2dda0"
          fontSize="70.92"
          fontWeight="700"
          transform="translate(141.0 336) scale(0.979 1)"
        >
          {pos}
        </text>

        {/* Player Name */}
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fill="#f2dda0"
          fontSize="89.36"
          fontWeight="700"
          transform={`translate(367.5 687) scale(${scaleX} 1)`}
        >
          {playerName}
        </text>

        {/* 6 Stats (Column 1) */}
        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(189.9 790) scale(0.962 1)">
          {statValues[0]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(221.0 790) scale(1.068 1)">
          {statLabels[0]}
        </text>

        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(189.9 866) scale(0.962 1)">
          {statValues[1]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(221.0 866) scale(1.068 1)">
          {statLabels[1]}
        </text>

        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(189.9 942) scale(0.962 1)">
          {statValues[2]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(221.0 942) scale(1.068 1)">
          {statLabels[2]}
        </text>

        {/* 6 Stats (Column 2) */}
        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(489.9 790) scale(0.962 1)">
          {statValues[3]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(523.0 790) scale(1.068 1)">
          {statLabels[3]}
        </text>

        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(489.9 866) scale(0.962 1)">
          {statValues[4]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(523.0 866) scale(1.068 1)">
          {statLabels[4]}
        </text>

        <text fill="#f2dda0" textAnchor="end" fontSize="66.2" fontWeight="700" transform="translate(489.9 942) scale(0.962 1)">
          {statValues[5]}
        </text>
        <text fill="#f2dda0" fontSize="66.67" fontWeight="700" transform="translate(523.0 942) scale(1.068 1)">
          {statLabels[5]}
        </text>

        {/* Footer Brand */}
        <text x="368" y="1012" textAnchor="middle" fill="#f2dda0" fontSize="26" fontWeight="700" letterSpacing="1.5">
          SQUADBUILDER
        </text>
        <text x="368" y="1042" textAnchor="middle" fill="#f2dda0" fontSize="26" fontWeight="700" letterSpacing="1.5">
          FC
        </text>
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

