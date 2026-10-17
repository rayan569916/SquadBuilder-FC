import { GoalkeeperAttributes, PlayerAttributes, PlayerPosition } from '../types/database';

export type PlayerAttributeKey = 'impact' | 'shooting' | 'passing' | 'defense' | 'physical';
export type GoalkeeperAttributeKey = keyof GoalkeeperAttributes;

export const playerAttributeFields: { key: PlayerAttributeKey; label: string }[] = [
  { key: 'impact', label: 'Attacking' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'passing', label: 'Passing' },
  { key: 'defense', label: 'Defending' },
  { key: 'physical', label: 'Physical' },
];

export const goalkeeperAttributeFields: { key: GoalkeeperAttributeKey; label: string }[] = [
  { key: 'diving', label: 'Diving' },
  { key: 'handling', label: 'Handling' },
  { key: 'kicking', label: 'Kicking' },
  { key: 'reflexes', label: 'Reflexes' },
  { key: 'speed', label: 'Keeper Speed' },
  { key: 'positioning', label: 'Positioning' },
];

export const calculateOverallRating = (attributes: PlayerAttributes, position: PlayerPosition) => {
  const ratings = position === 'GK'
    ? goalkeeperAttributeFields.map(({ key }) => attributes.goalkeeping?.[key] || 0)
    : playerAttributeFields.map(({ key }) => attributes[key]);
  return Math.round(ratings.reduce((total, rating) => total + rating, 0) / ratings.length);
};