import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Globe,
  LoaderCircle,
  Medal,
  Play,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap
} from 'lucide-react';
import { api } from '../lib/api';
import { getProfileOverallRating } from '../lib/playerRatings';
import { Profile, PlayerPosition, UserRole } from '../types/database';
import { PlayerCard } from '../components/PlayerCard';
import { GoalkeeperRadarChart, RadarChart } from '../components/RadarChart';

interface PlayersScreenProps {
  initialPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
  onNavigateToTactics?: () => void;
}

type TabCategory = 'ALL' | 'GK' | 'DF' | 'MF' | 'FW';

export const PlayersScreen: React.FC<PlayersScreenProps> = ({
  initialPlayerId,
  onSelectPlayer,
  onNavigateToTactics,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<'PLAYERS' | 'MANAGEMENT'>('PLAYERS');
  const [positionTab, setPositionTab] = useState<TabCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected player for detail modal/view
  const [selectedPlayer, setSelectedPlayer] = useState<Profile | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Active highlighted player index in the carousel
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getProfiles()
      .then((data) => {
        if (!active) return;
        setProfiles(data);
        if (initialPlayerId) {
          const found = data.find((p) => p.id === initialPlayerId);
          if (found) {
            setSelectedPlayer(found);
            setDetailModalOpen(true);
          }
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load players.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [initialPlayerId]);

  // Filtered list based on role, position, search
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Role filter
      if (roleFilter === 'PLAYERS') {
        if (p.role === 'manager' && p.position === 'DF' && p.matches_played === 0) {
          // If strictly management
          // But allow everyone with role 'player' or 'admin' or has played
        }
      } else if (roleFilter === 'MANAGEMENT') {
        if (p.role !== 'manager' && p.role !== 'admin') return false;
      }

      // Position tab filter
      if (positionTab !== 'ALL') {
        if (p.position !== positionTab) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesClub = p.club?.toLowerCase().includes(query);
        const matchesNumber = p.jersey_number?.toString() === query;
        if (!matchesName && !matchesClub && !matchesNumber) return false;
      }

      return true;
    });
  }, [profiles, roleFilter, positionTab, searchQuery]);

  // Ensure activeIndex is in bounds
  const safeActiveIndex = Math.min(Math.max(0, activeIndex), Math.max(0, filteredProfiles.length - 1));
  const activePlayer = filteredProfiles[safeActiveIndex] || null;

  const handleOpenDetail = (player: Profile) => {
    setSelectedPlayer(player);
    setDetailModalOpen(true);
    if (onSelectPlayer) onSelectPlayer(player.id);
  };

  const handlePrev = () => {
    if (filteredProfiles.length <= 1) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredProfiles.length - 1));
  };

  const handleNext = () => {
    if (filteredProfiles.length <= 1) return;
    setActiveIndex((prev) => (prev < filteredProfiles.length - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (detailModalOpen) {
        if (e.key === 'Escape') setDetailModalOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredProfiles.length, detailModalOpen]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-sky-200">
        <LoaderCircle size={32} className="animate-spin text-primary" />
        <p className="text-xs uppercase tracking-widest text-slate-400">Loading squad roster…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-2xl glass-card border border-rose-500/30 text-center space-y-3">
        <p className="text-rose-300 text-sm font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-xs font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen text-slate-100 overflow-hidden bg-radial from-[#13226a] via-[#0b1442] to-[#050716] pb-24">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-blue-600/25 via-indigo-600/10 to-transparent blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 left-10 w-96 h-96 bg-blue-700/10 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 right-10 w-96 h-96 bg-purple-700/10 blur-[120px] rounded-full" />

      {/* TOP SUB-HEADER CONTROLS */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 space-y-4">
        {/* Row 1: Role Toggles & Position Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* PLAYERS / MANAGEMENT pill group */}
          <div className="inline-flex items-center p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-inner">
            <button
              onClick={() => { setRoleFilter('PLAYERS'); setActiveIndex(0); }}
              className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                roleFilter === 'PLAYERS'
                  ? 'bg-white text-[#0a1238] shadow-[0_2px_12px_rgba(255,255,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Players
            </button>
            <button
              onClick={() => { setRoleFilter('MANAGEMENT'); setActiveIndex(0); }}
              className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
                roleFilter === 'MANAGEMENT'
                  ? 'bg-white text-[#0a1238] shadow-[0_2px_12px_rgba(255,255,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Management
            </button>
          </div>

          {/* Position Filters (All, Goalkeepers, Defenders, Midfielders, Forwards) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'GK', label: 'Goalkeepers' },
                { id: 'DF', label: 'Defenders' },
                { id: 'MF', label: 'Midfielders' },
                { id: 'FW', label: 'Forwards' },
              ] as const
            ).map((tab) => {
              const isActive = positionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setPositionTab(tab.id); setActiveIndex(0); }}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-white text-[#070d2b] border-white shadow-[0_0_14px_rgba(255,255,255,0.45)] font-bold'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Search input + Squad count indicator */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, jersey, club..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(0); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{filteredProfiles.length} Roster members</span>
          </div>
        </div>
      </div>

      {/* 3D CAROUSEL STAGE (Inspired by Giroud / Hazard Chelsea Roster Showcase) */}
      {filteredProfiles.length > 0 ? (
        <div className="relative w-full max-w-6xl mx-auto px-4 mt-6 sm:mt-10 mb-8 select-none">
          {/* Vertical position indicator label along the side */}
          {activePlayer && (
            <div className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-slate-400 text-xs tracking-[0.3em] font-bold uppercase pointer-events-none">
              {activePlayer.position === 'GK'
                ? 'Goalkeepers'
                : activePlayer.position === 'DF'
                ? 'Defenders'
                : activePlayer.position === 'MF'
                ? 'Midfielders'
                : 'Forwards'}
            </div>
          )}

          {/* Carousel Viewport */}
          <div className="relative flex items-center justify-center min-h-[440px] sm:min-h-[500px]">
            {filteredProfiles.map((player, index) => {
              // Calculate relative offset from active index
              const offset = index - safeActiveIndex;
              const absOffset = Math.abs(offset);

              // Only render cards within distance of 2
              if (absOffset > 2) return null;

              // Positioning style calculations
              const isCenter = offset === 0;
              const isLeft = offset < 0;
              const translateX = offset * 210; // spacing between cards in px
              const scale = isCenter ? 1.08 : absOffset === 1 ? 0.82 : 0.65;
              const zIndex = 30 - absOffset * 10;
              const opacity = isCenter ? 1 : absOffset === 1 ? 0.55 : 0.25;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (isCenter) {
                      handleOpenDetail(player);
                    } else {
                      setActiveIndex(index);
                    }
                  }}
                  style={{
                    transform: `translateX(${translateX}px) scale(${scale})`,
                    zIndex,
                    opacity,
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 cursor-pointer transition-all duration-400 ease-out flex flex-col items-center ${
                    isCenter ? 'filter drop-shadow-[0_24px_36px_rgba(0,0,0,0.85)]' : 'filter brightness-75 hover:opacity-80'
                  }`}
                >
                  {/* Card Container */}
                  <div className="relative w-64 sm:w-72">
                    {/* Jersey number circular pill bubble (Chelsea style) */}
                    <div className="absolute top-6 right-2 sm:right-3 z-30 flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#1b3cb5] border-2 border-[#5479ff] text-white font-extrabold text-lg sm:text-xl shadow-[0_6px_16px_rgba(0,0,0,0.6)]">
                      {player.jersey_number || (index + 1)}
                    </div>

                    {/* Conditional Player Card SVG (Icon White for 80+, Royal Blue for <80) */}
                    <PlayerCard
                      player={player}
                      positionTag={player.position}
                      rating={getProfileOverallRating(player) || player.overall_rating}
                      className="w-full"
                    />

                    {/* Center Card Interactive Action Pill */}
                    {isCenter && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(player);
                          }}
                          className="flex items-center gap-2 px-5 py-2 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_6px_20px_rgba(37,99,235,0.45)] transition active:scale-95"
                        >
                          <Eye size={14} /> View Detailed Stats
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Arrows */}
          {filteredProfiles.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Previous player"
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white backdrop-blur-md shadow-lg transition active:scale-90"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next player"
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white backdrop-blur-md shadow-lg transition active:scale-90"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Dot Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-8">
            {filteredProfiles.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === safeActiveIndex ? 'w-6 bg-white shadow-[0_0_8px_white]' : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty Filter State */
        <div className="max-w-md mx-auto my-16 p-8 rounded-2xl glass-card border border-white/10 text-center space-y-3">
          <p className="text-white font-bold text-base">No players found</p>
          <p className="text-slate-400 text-xs">
            Try adjusting your search query or position tab filter.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setPositionTab('ALL'); setRoleFilter('PLAYERS'); }}
            className="px-4 py-1.5 text-xs font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* QUICK ROSTER GRID (Below Carousel for easy instant access to all players) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-12">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
          <h2 className="font-display text-sm uppercase tracking-wider font-bold text-white flex items-center gap-2">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            Full Roster Grid ({filteredProfiles.length})
          </h2>
          <span className="text-xs text-slate-400">Click any card for full dossier</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredProfiles.map((p, idx) => {
            const isCurrentActive = idx === safeActiveIndex;
            return (
              <div
                key={p.id}
                onClick={() => handleOpenDetail(p)}
                className={`group relative rounded-xl p-2.5 transition-all duration-200 cursor-pointer border ${
                  isCurrentActive
                    ? 'bg-blue-600/20 border-blue-400/80 shadow-[0_0_18px_rgba(59,130,246,0.35)]'
                    : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* Mini Player Avatar Header */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900 border border-white/10 mb-2">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-400">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Jersey badge */}
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-600/90 text-[10px] font-bold text-white border border-blue-400/40">
                    #{p.jersey_number || (idx + 1)}
                  </span>

                  {/* Rating badge */}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                    {getProfileOverallRating(p) || p.overall_rating}
                  </span>
                </div>

                {/* Info Text */}
                <p className="truncate text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  {p.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span className="font-semibold text-sky-300">{p.position}</span>
                  <span>{p.club?.split(' ')[0] || 'FC'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RESPONSIVE PLAYER DETAIL MODAL */}
      {detailModalOpen && selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
          onClick={() => setDetailModalOpen(false)}
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-dossier-title"
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden border-0 border-blue-400/30 bg-radial from-[#13226a] via-[#091038] to-[#04061a] text-white shadow-[0_24px_60px_rgba(0,0,0,0.9)] sm:h-auto sm:max-h-[94dvh] sm:max-w-4xl sm:rounded-2xl sm:border"
          >
            {/* Sticky modal header */}
            <header className="z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#091038]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
              <div className="min-w-0 pr-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300 sm:text-[10px]">
                  Player Dossier
                </p>
                <h2 id="player-dossier-title" className="truncate text-sm font-bold text-white sm:text-base">
                  {selectedPlayer.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </header>

            {/* Independently scrollable modal content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6 md:p-8 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
              <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-12">
                {/* LEFT COLUMN: Player information and performance */}
                <div className="space-y-5 sm:space-y-6 md:col-span-7">
                  {/* Season & Tags */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="rounded bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                      {selectedPlayer.position === 'GK'
                        ? 'Goalkeeper'
                        : selectedPlayer.position === 'DF'
                        ? 'Defender'
                        : selectedPlayer.position === 'MF'
                        ? 'Midfielder'
                        : 'Forward'}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-300 sm:text-xs">
                      <Flag size={12} className="shrink-0 text-red-400" />
                      <span className="truncate">{selectedPlayer.club || 'SquadBuilder FC'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 sm:text-xs">
                      2025/2026 Season
                    </span>
                  </div>

                  {/* Player headline */}
                  <div className="min-w-0">
                    <h1 className="break-words font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                      {selectedPlayer.name}
                    </h1>
                    <p className="mt-1 break-words text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs sm:tracking-widest">
                      {selectedPlayer.role} · Rating: {getProfileOverallRating(selectedPlayer) || selectedPlayer.overall_rating} OVR · ELO: {selectedPlayer.elo_rating}
                    </p>
                  </div>

                  {/* Titles & Trophies */}
                  <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Titles &amp; Honors
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 sm:h-9 sm:w-9">
                          <Medal size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-base font-extrabold sm:text-lg">×{selectedPlayer.motm_count || 0}</span>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400 sm:text-[9px]">MOTM Awards</p>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-400/40 bg-purple-500/20 text-purple-300 sm:h-9 sm:w-9">
                          <Star size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-base font-extrabold sm:text-lg">×{selectedPlayer.total_wins || 0}</span>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400 sm:text-[9px]">Match Wins</p>
                        </div>
                      </div>
                      <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/20 text-amber-300 sm:h-9 sm:w-9">
                          <Trophy size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-base font-extrabold sm:text-lg">×{selectedPlayer.win_percentage || 0}</span>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400 sm:text-[9px]">Win Percentage</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key performance metrics */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.matches_played || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Matches Played</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.matches_played || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Appearances</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.goals || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Goals</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.tackles || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Tackles</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.assists || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Assists</p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center sm:p-3">
                      <span className="font-display text-xl font-black text-white sm:text-2xl">{selectedPlayer.saves || 0}</span>
                      <p className="mt-0.5 text-[9px] font-semibold uppercase leading-tight text-slate-400 sm:text-[10px]">Saves / Clearances</p>
                    </div>
                  </div>

                  {/* Headlines & milestones */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Sparkles size={12} className="text-amber-400" />
                      Headlines &amp; Career Milestones
                    </p>
                    <ul className="space-y-2 text-[11px] leading-relaxed text-slate-300 sm:text-xs">
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>Win Percentage: <strong className="text-white">{selectedPlayer.win_percentage || 0}%</strong> across competitive fixtures</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>Man of the Match votes received: <strong className="text-white">{selectedPlayer.total_motm_votes || 0}</strong> votes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>Squad fitness index: <strong className="text-emerald-300">{selectedPlayer.injuries_count === 0 ? 'Peak 100% Fit' : `${selectedPlayer.injuries_count} past injuries`}</strong></span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* RIGHT COLUMN: Player card and radar chart */}
                <div className="flex flex-col items-center gap-4 sm:gap-5 md:col-span-5 md:justify-between">
                  <div className="mx-auto w-full max-w-[240px] sm:max-w-[280px]">
                    <PlayerCard
                      player={selectedPlayer}
                      positionTag={selectedPlayer.position}
                      rating={getProfileOverallRating(selectedPlayer) || selectedPlayer.overall_rating}
                      className="w-full"
                    />
                  </div>

                  {/* Attribute Radar Chart */}
                  <div className="w-full overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] p-2 text-center sm:p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Attributes Profile
                    </p>
                    {selectedPlayer.position === 'GK' ? (
                      selectedPlayer.attributes?.goalkeeping ? (
                        <GoalkeeperRadarChart
                          attributes={selectedPlayer.attributes.goalkeeping}
                          size={typeof window !== 'undefined' && window.innerWidth < 400 ? 170 : 210}
                          color="#3b82f6"
                          className="mx-auto max-w-full"
                        />
                      ) : (
                        <p className="py-6 text-xs text-slate-500">Ratings not recorded</p>
                      )
                    ) : selectedPlayer.attributes ? (
                      <RadarChart
                        attributes={selectedPlayer.attributes}
                        size={typeof window !== 'undefined' && window.innerWidth < 400 ? 170 : 210}
                        color="#3b82f6"
                        className="mx-auto max-w-full"
                      />
                    ) : (
                      <p className="py-6 text-xs text-slate-500">Ratings not recorded</p>
                    )}
                  </div>

                  {/* Tactics action */}
                  {onNavigateToTactics && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailModalOpen(false);
                        onNavigateToTactics();
                      }}
                      className="w-full rounded-full border border-white/20 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-white/10 active:scale-[0.99] sm:py-2.5 sm:text-xs"
                    >
                      View in Tactics Board
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

