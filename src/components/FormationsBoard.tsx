import React, { useId, useRef, useState } from 'react';
import { getProfileOverallRating } from '../lib/playerRatings';
import { MatchLineup, Profile } from '../types/database';
import { PlayerCard } from './PlayerCard';

export interface FormationNode {
  id: string;
  playerId: string;
  name: string;
  position: string;
  rating: number;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  avatarUrl?: string;
  club?: string;
  team: 'A' | 'B';
}

interface FormationsBoardProps {
  lineups: MatchLineup[];
  availablePlayers?: Profile[];
  editable?: boolean;
  onUpdateLineup?: (updated: MatchLineup[]) => void;
  onSelectPlayer?: (playerId: string) => void;
  activeTeam?: 'A' | 'B' | 'both';
  format?: '5s' | '6s' | '7s' | '11s';
}

export const FormationsBoard: React.FC<FormationsBoardProps> = ({
  lineups,
  editable = false,
  onUpdateLineup,
  onSelectPlayer,
  activeTeam = 'A',
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Unique SVG IDs prevent collisions if multiple formation boards are rendered.
  const svgId = useId().replace(/:/g, '');
  const pitchLineGradientId = `pitchLineGradient-${svgId}`;
  const pitchGlowId = `pitchGlow-${svgId}`;

  // Filter lineups for the current active team display.
  const displayedLineups = lineups.filter((l) =>
    activeTeam === 'both' ? true : l.team === activeTeam
  );

  const handlePointerDown = (e: React.PointerEvent, lineupId: string) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNodeId(lineupId);
    setSelectedNodeId(lineupId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !draggedNodeId || !editable || !pitchRef.current) return;

    const rect = pitchRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(10, Math.min(90, Number(rawX.toFixed(1))));
    const clampedY = Math.max(8, Math.min(92, Number(rawY.toFixed(1))));

    if (onUpdateLineup) {
      const updated = lineups.map((node) =>
        node.id === draggedNodeId
          ? { ...node, x_coord: clampedX, y_coord: clampedY }
          : node
      );
      onUpdateLineup(updated);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Pitch Outer Shell */}
      <div
        ref={pitchRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative w-full aspect-9/13 max-w-125 rounded-2xl overflow-hidden bg-[#090b14] border border-[rgba(162,202,249,0.25)] shadow-[0_24px_50px_rgba(0,0,0,0.85)] select-none transition-all ${
          editable
            ? 'touch-none ring-2 ring-[#7042f8]/60 cursor-crosshair'
            : 'touch-pan-y'
        }`}
      >
        {/* Tactical Pitch Markings */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
          viewBox="0 0 360 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Cyan-to-electric-blue gradient inspired by the reference image. */}
            <linearGradient
              id={pitchLineGradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#08D9F5" />
              <stop offset="45%" stopColor="#05B9F5" />
              <stop offset="75%" stopColor="#087BFF" />
              <stop offset="100%" stopColor="#1746FF" />
            </linearGradient>

            <radialGradient id={pitchGlowId} cx="50%" cy="20%" r="80%">
              <stop offset="0%" stopColor="#132B85" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#101B50" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#05060f" stopOpacity="0.85" />
            </radialGradient>
          </defs>

          <rect width="360" height="520" fill={`url(#${pitchGlowId})`} />

          {/* Outer Boundary */}
          <rect
            x="24"
            y="24"
            width="312"
            height="472"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="2.2"
            opacity="0.95"
          />

          {/* Halfway Line */}
          <line
            x1="24"
            y1="260"
            x2="336"
            y2="260"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Center Circle */}
          <circle
            cx="180"
            cy="260"
            r="44"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.8"
            opacity="0.8"
          />
          <circle cx="180" cy="260" r="2.5" fill="#08D9F5" opacity="0.85" />

          {/* Top Penalty Box (Opponent) */}
          <rect
            x="96"
            y="24"
            width="168"
            height="76"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.8"
            opacity="0.8"
          />
          <path
            d="M 140 100 A 40 40 0 0 0 220 100"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.8"
            opacity="0.8"
          />

          {/* Bottom Penalty Box (Own) */}
          <rect
            x="96"
            y="420"
            width="168"
            height="76"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.8"
            opacity="0.8"
          />
          <path
            d="M 140 420 A 40 40 0 0 1 220 420"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.8"
            opacity="0.8"
          />

          {/* Penalty Spots */}
          <circle cx="180" cy="456" r="2.5" fill="#087BFF" opacity="0.85" />
          <circle cx="180" cy="64" r="2.5" fill="#05B9F5" opacity="0.85" />

          {/* Corner Arcs */}
          <path
            d="M 24 38 A 14 14 0 0 0 38 24"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.5"
            opacity="0.7"
          />
          <path
            d="M 322 24 A 14 14 0 0 0 336 38"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.5"
            opacity="0.7"
          />
          <path
            d="M 24 482 A 14 14 0 0 1 38 496"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.5"
            opacity="0.7"
          />
          <path
            d="M 322 496 A 14 14 0 0 1 336 482"
            stroke={`url(#${pitchLineGradientId})`}
            strokeWidth="1.5"
            opacity="0.7"
          />
        </svg>

        {/* Player Nodes */}
        {displayedLineups.map((lineup) => {
          const player = lineup.player;
          const playerRating = player ? getProfileOverallRating(player) : undefined;
          const isSelected = selectedNodeId === lineup.id;

          return (
            <div
              key={lineup.id}
              onPointerDown={(e) => handlePointerDown(e, lineup.id)}
              onClick={() => {
                setSelectedNodeId(lineup.id);
                if (onSelectPlayer) onSelectPlayer(lineup.player_id);
              }}
              style={{
                left: `${lineup.x_coord}%`,
                top: `${lineup.y_coord}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute z-20 flex flex-col items-center cursor-pointer transition-transform duration-100 ${
                isDragging && draggedNodeId === lineup.id
                  ? 'scale-115 z-30'
                  : 'active:scale-95'
              }`}
            >
              <PlayerCard
                player={player}
                positionTag={lineup.position_tag}
                rating={playerRating}
                isSelected={isSelected}
                isSub={lineup.is_substitute}
                team={lineup.team}
                className="w-14 sm:w-16"
              />
            </div>
          );
        })}

        {/* Empty State / Hint Overlay */}
        {displayedLineups.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 p-6 text-center backdrop-blur-sm">
            <span className="text-secondary text-sm font-medium">
              No Players Placed On Pitch
            </span>
            <p className="text-xs text-tertiary mt-1">
              Assign players in Match Setup or Balancer
            </p>
          </div>
        )}
      </div>

      {displayedLineups.some((lineup) => lineup.is_substitute) && (
        <ul
          aria-label="Substitutes"
          className="mt-3 flex w-full flex-wrap justify-center gap-2 text-[10px]"
        >
          {displayedLineups
            .filter((lineup) => lineup.is_substitute)
            .map((lineup) => (
              <li
                key={lineup.id}
                className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-100"
              >
                <b className="mr-1 text-emerald-300">SUB</b>
                {lineup.player?.name || lineup.position_tag}
                {lineup.replaces_name && (
                  <span className="text-slate-400"> for {lineup.replaces_name}</span>
                )}
              </li>
            ))}
        </ul>
      )}

      {editable && (
        <div className="mt-3 flex items-center gap-2 rounded-full border border-secondary/20 bg-[#181924]/80 px-3.5 py-1.5 text-xs text-secondary">
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
          <span>
            Tactical Drag Mode: Tap &amp; drag any player node to reposition on pitch
          </span>
        </div>
      )}
    </div>
  );
};
