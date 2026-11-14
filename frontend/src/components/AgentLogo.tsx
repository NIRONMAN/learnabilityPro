'use client';

import React from 'react';

export interface AgentLogoProps {
  /** Size preset or explicit pixel dimension */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Visual theme variant */
  variant?: 'cyan' | 'gradient' | 'emerald' | 'monochrome' | 'aurora';
  /** Whether the logo displays a subtle cognitive pulse or breathing state */
  animated?: boolean;
  /** Additional custom CSS class names */
  className?: string;
  /** Optional title or accessibility label */
  label?: string;
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 36,
  xl: 48,
};

/**
 * AgentLogo
 *
 * A sleek, modern custom SVG emblem representing the Socratic Scholar intelligence.
 * Replaces generic robot icons with an interlocking geometric prism of four cognitive
 * pillars (Analysis, Grounding, Synthesis, Pedagogy) encircling an epistemic core nucleus.
 */
export function AgentLogo({
  size = 'md',
  variant = 'gradient',
  animated = false,
  className = '',
  label = 'Learnability AI Scholar',
}: AgentLogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 28;

  // Unique ID prefix to avoid SVG gradient collisions when multiple logos render
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      className={`shrink-0 select-none ${animated ? 'group' : ''} ${className}`}
    >
      <defs>
        {/* Primary gradient: Cyber Cyan to Deep Indigo */}
        <linearGradient
          id={`${id}-grad-cyan`}
          x1="6"
          y1="6"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Aurora gradient: Sky Cyan to Violet to Fuchsia */}
        <linearGradient
          id={`${id}-grad-aurora`}
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Grounding Emerald gradient */}
        <linearGradient
          id={`${id}-grad-emerald`}
          x1="8"
          y1="8"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Core Nucleus Glow Filter */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer subtle alignment aura */}
      <circle
        cx="24"
        cy="24"
        r="21.5"
        stroke={
          variant === 'monochrome'
            ? 'currentColor'
            : variant === 'emerald'
            ? '#34D399'
            : variant === 'aurora'
            ? '#A855F7'
            : '#38BDF8'
        }
        strokeOpacity={animated ? '0.22' : '0.12'}
        strokeWidth="1"
        strokeDasharray="2 3"
        className={animated ? 'animate-[spin_40s_linear_infinite]' : ''}
        style={{ transformOrigin: '24px 24px' }}
      />

      {/* Orbital Ellipse A (Ascending diagonal) */}
      <ellipse
        cx="24"
        cy="24"
        rx="18"
        ry="8.5"
        transform="rotate(-30 24 24)"
        stroke={
          variant === 'monochrome'
            ? 'currentColor'
            : variant === 'emerald'
            ? `url(#${id}-grad-emerald)`
            : variant === 'aurora'
            ? `url(#${id}-grad-aurora)`
            : `url(#${id}-grad-cyan)`
        }
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity={variant === 'monochrome' ? '0.7' : '0.85'}
        className={animated ? 'animate-[pulse_4s_ease-in-out_infinite]' : ''}
      />

      {/* Orbital Ellipse B (Descending diagonal) */}
      <ellipse
        cx="24"
        cy="24"
        rx="18"
        ry="8.5"
        transform="rotate(30 24 24)"
        stroke={
          variant === 'monochrome'
            ? 'currentColor'
            : variant === 'emerald'
            ? `url(#${id}-grad-emerald)`
            : variant === 'aurora'
            ? `url(#${id}-grad-aurora)`
            : `url(#${id}-grad-cyan)`
        }
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity={variant === 'monochrome' ? '0.7' : '0.85'}
        className={animated ? 'animate-[pulse_4s_ease-in-out_infinite_2s]' : ''}
      />

      {/* Vertical Axis Balance Ring */}
      <ellipse
        cx="24"
        cy="24"
        rx="9.5"
        ry="17"
        stroke={
          variant === 'monochrome'
            ? 'currentColor'
            : variant === 'emerald'
            ? '#10B981'
            : variant === 'aurora'
            ? '#C084FC'
            : '#818CF8'
        }
        strokeWidth="1.25"
        strokeOpacity="0.45"
        strokeDasharray="4 2"
      />

      {/* Central Geometric Prismatic Octahedron / Crystalline Core */}
      <g
        className={animated ? 'animate-[spin_16s_linear_infinite]' : ''}
        style={{ transformOrigin: '24px 24px' }}
      >
        {/* Inner Diamond facet */}
        <polygon
          points="24,14 32,24 24,34 16,24"
          fill={
            variant === 'monochrome'
              ? 'currentColor'
              : variant === 'emerald'
              ? 'rgba(52, 211, 153, 0.18)'
              : variant === 'aurora'
              ? 'rgba(168, 85, 247, 0.22)'
              : 'rgba(56, 189, 248, 0.2)'
          }
          stroke={
            variant === 'monochrome'
              ? 'currentColor'
              : variant === 'emerald'
              ? '#34D399'
              : variant === 'aurora'
              ? '#F472B6'
              : '#38BDF8'
          }
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Transverse Cross facet */}
        <polygon
          points="24,18 28,24 24,30 20,24"
          fill={
            variant === 'monochrome'
              ? 'currentColor'
              : variant === 'emerald'
              ? '#34D399'
              : variant === 'aurora'
              ? '#A855F7'
              : '#818CF8'
          }
          fillOpacity={variant === 'monochrome' ? '0.4' : '0.6'}
        />
      </g>

      {/* Epistemic Core Spark (Luminous Center Nucleus) */}
      <circle
        cx="24"
        cy="24"
        r="2.5"
        fill={
          variant === 'monochrome'
            ? 'currentColor'
            : variant === 'emerald'
            ? '#ECFDF5'
            : '#FFFFFF'
        }
        filter={`url(#${id}-glow)`}
      />

      {/* Cardinal Precision Anchors: Analysis, Grounding, Synthesis, Pedagogy */}
      <circle
        cx="24"
        cy="4.5"
        r="1.25"
        fill={variant === 'monochrome' ? 'currentColor' : '#38BDF8'}
      />
      <circle
        cx="43.5"
        cy="24"
        r="1.25"
        fill={variant === 'monochrome' ? 'currentColor' : '#34D399'}
      />
      <circle
        cx="24"
        cy="43.5"
        r="1.25"
        fill={variant === 'monochrome' ? 'currentColor' : '#A78BFA'}
      />
      <circle
        cx="4.5"
        cy="24"
        r="1.25"
        fill={variant === 'monochrome' ? 'currentColor' : '#FBBF24'}
      />
    </svg>
  );
}

export default AgentLogo;
