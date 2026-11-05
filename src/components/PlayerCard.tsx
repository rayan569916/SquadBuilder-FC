import React from 'react';
import { Profile } from '../types/database';
import { getProfileOverallRating } from '../lib/playerRatings';
import { RoyalBluePlayerCard } from './RoyalBluePlayerCard';
import { IconWhitePlayerCard } from './IconWhitePlayerCard';

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

/**
 * Unified player card that selects the card design based on overall rating:
 * - Rating >= 80  → Icon White card (premium)
 * - Rating < 80   → Royal Blue card (standard)
 */
export const PlayerCard: React.FC<PlayerCardProps> = (props) => {
  const effectiveRating =
    props.rating ??
    (props.player
      ? (getProfileOverallRating(props.player) ?? props.player.overall_rating ?? 99)
      : 99);

  if (effectiveRating >= 80) {
    return <IconWhitePlayerCard {...props} rating={effectiveRating} />;
  }

  return <RoyalBluePlayerCard {...props} rating={effectiveRating} />;
};


