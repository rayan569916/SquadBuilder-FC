import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  glowColor?: 'purple' | 'blue' | 'emerald' | 'none';
  variant?: 'subtle' | 'standard' | 'elevated';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  glowColor = 'none',
  variant = 'standard',
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'purple':
        return 'shadow-[0_0_30px_rgba(112,66,248,0.22)] border-[rgba(112,66,248,0.35)]';
      case 'blue':
        return 'shadow-[0_0_30px_rgba(162,202,249,0.18)] border-[rgba(162,202,249,0.3)]';
      case 'emerald':
        return 'shadow-[0_0_30px_rgba(16,185,129,0.2)] border-[rgba(16,185,129,0.3)]';
      default:
        return 'border-[rgba(186,215,247,0.12)]';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'subtle':
        return 'bg-[rgba(186,214,247,0.02)] backdrop-blur-md shadow-md';
      case 'elevated':
        return 'bg-[#0a0c16]/90 backdrop-blur-2xl shadow-[0_24px_48px_rgba(0,0,0,0.85)]';
      case 'standard':
      default:
        return 'bg-[rgba(26,27,37,0.72)] backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.55)]';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        boxShadow:
          variant === 'standard'
            ? 'inset 0 1px 1px 0 rgba(216,236,248,0.20), inset 0 20px 40px 0 rgba(162,202,249,0.04), 0 16px 32px rgba(0,0,0,0.45)'
            : undefined,
      }}
      className={`relative rounded-2xl border transition-all duration-300 ${getVariantStyles()} ${getGlowStyles()} ${
        hoverEffect ? 'hover:border-[rgba(162,202,249,0.25)] hover:bg-[rgba(32,35,48,0.8)] cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
