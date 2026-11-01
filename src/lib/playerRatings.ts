import { GoalkeeperAttributes, PlayerAttributes, PlayerPosition, Profile } from '../types/database';

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

export const getProfileOverallRating = (profile: Pick<Profile, 'position' | 'attributes' | 'overall_rating'>): number | undefined => {
  if (profile.position === 'GK') {
    const ratings = goalkeeperAttributeFields.map(({ key }) => profile.attributes?.goalkeeping?.[key]);
    return ratings.every((rating) => typeof rating === 'number' && Number.isFinite(rating))
      ? calculateOverallRating(profile.attributes as PlayerAttributes, profile.position)
      : undefined;
  }

  const ratings = playerAttributeFields.map(({ key }) => profile.attributes?.[key]);
  return ratings.every((rating) => typeof rating === 'number' && Number.isFinite(rating))
    ? calculateOverallRating(profile.attributes as PlayerAttributes, profile.position)
    : profile.overall_rating;
};