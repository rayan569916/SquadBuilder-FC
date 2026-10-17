import React, { useRef, useState } from 'react';
import { getProfileOverallRating } from '../lib/playerRatings';
import { MatchLineup, Profile } from '../types/database';

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

  // Filter lineups for the current active team display
  const displayedLineups = lineups.filter((l) => (activeTeam === 'both' ? true : l.team === activeTeam));

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
    const clientX = e.clientX;
    const clientY = e.clientY;

    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(10, Math.min(90, Number(rawX.toFixed(1))));
    const clampedY = Math.max(8, Math.min(92, Number(rawY.toFixed(1))));

    if (onUpdateLineup) {
      const updated = lineups.map((node) => {
        if (node.id === draggedNodeId) {
          return { ...node, x_coord: clampedX, y_coord: clampedY };
        }
        return node;
      });
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
          editable ? 'touch-none ring-2 ring-[#7042f8]/60 cursor-crosshair' : 'touch-pan-y'
        }`}
      >
        {/* Tactical Pitch Markings SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
          viewBox="0 0 360 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="pitchGlow" cx="50%" cy="20%" r="80%">
              <stop offset="0%" stopColor="#7042f8" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#1c4972" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#05060f" stopOpacity="0.85" />
            </radialGradient>
          </defs>
          <rect width="360" height="520" fill="url(#pitchGlow)" />

          {/* Outer Boundary Hairline */}
          <rect
            x="24"
            y="24"
            width="312"
            height="472"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.4"
          />

          {/* Halfway Line */}
          <line
            x1="24"
            y1="260"
            x2="336"
            y2="260"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.3"
          />

          {/* Center Circle */}
          <circle
            cx="180"
            cy="260"
            r="44"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <circle cx="180" cy="260" r="2.5" fill="#a2caf9" opacity="0.6" />

          {/* Top Penalty Box (Opponent) */}
          <rect
            x="96"
            y="24"
            width="168"
            height="76"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <path
            d="M 140 100 A 40 40 0 0 0 220 100"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.25"
          />

          {/* Bottom Penalty Box (Own) */}
          <rect
            x="96"
            y="420"
            width="168"
            height="76"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <path
            d="M 140 420 A 40 40 0 0 1 220 420"
            stroke="#a2caf9"
            strokeWidth="1.2"
            opacity="0.25"
          />

          {/* Penalty Spot */}
          <circle cx="180" cy="456" r="2.5" fill="#a2caf9" opacity="0.5" />
          <circle cx="180" cy="64" r="2.5" fill="#a2caf9" opacity="0.5" />

          {/* Corner Arcs */}
          <path d="M 24 38 A 14 14 0 0 0 38 24" stroke="#a2caf9" strokeWidth="1" opacity="0.3" />
          <path d="M 322 24 A 14 14 0 0 0 336 38" stroke="#a2caf9" strokeWidth="1" opacity="0.3" />
          <path d="M 24 482 A 14 14 0 0 1 38 496" stroke="#a2caf9" strokeWidth="1" opacity="0.3" />
          <path d="M 322 496 A 14 14 0 0 1 336 482" stroke="#a2caf9" strokeWidth="1" opacity="0.3" />
        </svg>

        {/* Player Nodes */}
        {displayedLineups.map((lineup) => {
          const player = lineup.player;
          const playerRating = player ? getProfileOverallRating(player) : undefined;
          const isSelected = selectedNodeId === lineup.id;
          const isGK = lineup.position_tag === 'GK';
          const isTeamA = lineup.team === 'A';

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
                isDragging && draggedNodeId === lineup.id ? 'scale-110 z-30' : 'active:scale-95'
              }`}
            >
              {/* Player Card Shell */}
              <div
                className={`relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden backdrop-blur-md transition-all ${
                  isTeamA
                    ? 'bg-[#181924]/90 border border-[rgba(162,202,249,0.3)] shadow-[0_8px_20px_rgba(0,0,0,0.65)]'
                    : 'bg-[#181924]/90 border border-[#7042f8]/50 shadow-[0_8px_20px_rgba(112,66,248,0.35)]'
                } ${
                  isSelected
                    ? 'ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.7)]'
                    : 'hover:border-white/50'
                }`}
              >
                {/* Rating Badge */}
                <span
                  className={`absolute top-0.5 left-0.5 z-20 font-mono text-[9px] font-bold px-1 py-0.2 rounded border ${
                    isGK
                      ? 'text-amber-300 bg-[#080a14]/90 border-amber-400/40'
                      : 'text-secondary bg-[#080a14]/90 border-[rgba(186,215,247,0.3)]'
                  }`}
                >
                  {playerRating ?? '—'}
                </span>

                {/* Avatar Image or Initial Fallback */}
                {player?.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-on-surface font-bold text-xs">
                    {lineup.player?.name ? lineup.player.name.slice(0, 2).toUpperCase() : lineup.position_tag}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-[#080a14] to-transparent"></div>
              </div>

              {/* Player Name Pill */}
              <div
                className={`w-19 sm:w-24 -mt-1.5 z-20 rounded-md py-0.5 px-1 text-center backdrop-blur-md shadow-md border ${
                  isTeamA
                    ? 'bg-[#1c4972]/95 border-[rgba(162,202,249,0.3)]'
                    : 'bg-[#7042f8]/95 border-[rgba(204,190,255,0.3)]'
                }`}
              >
                <p className="min-h-6 whitespace-normal wrap-break-word text-[9px] sm:text-[10px] font-bold text-white leading-3">
                  {player?.name || lineup.position_tag}
                </p>
                <p className="text-[7px] text-[#d8ecf8] uppercase truncate leading-tight">
                  {lineup.position_tag} • {player?.club?.split(' ')[0] || 'FC'}
                </p>
              </div>
            </div>
          );
        })}

        {/* Empty State / Hint Overlay */}
        {displayedLineups.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-sm z-10">
            <span className="text-secondary text-sm font-medium">No Players Placed On Pitch</span>
            <p className="text-xs text-tertiary mt-1">Assign players in Match Setup or Balancer</p>
          </div>
        )}
      </div>

      {editable && (
        <div className="mt-3 flex items-center gap-2 text-xs text-secondary bg-[#181924]/80 px-3.5 py-1.5 rounded-full border border-secondary/20">
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
          <span>Tactical Drag Mode: Tap &amp; drag any player node to reposition on pitch</span>
        </div>
      )}
    </div>
  );
};
