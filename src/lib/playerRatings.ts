import { PlayerAttributes } from '../types/database';

export const playerAttributeFields: { key: keyof PlayerAttributes; label: string }[] = [
  { key: 'impact', label: 'Attacking' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'passing', label: 'Passing' },
  { key: 'defense', label: 'Defending' },
  { key: 'physical', label: 'Physical' },
];

export const calculateOverallRating = (attributes: PlayerAttributes) => Math.round(
  playerAttributeFields.reduce((total, { key }) => total + attributes[key], 0) / playerAttributeFields.length,
);