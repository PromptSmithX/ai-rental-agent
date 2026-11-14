import React from 'react';

interface SimulationBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const SimulationBadge: React.FC<SimulationBadgeProps> = () => {
  // Completely hidden in client presentation mode
  return null;
};
