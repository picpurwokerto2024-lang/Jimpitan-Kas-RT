import React from 'react';

interface RtLogoProps {
  className?: string;
  size?: number;
  showBadge?: boolean;
}

export const RtLogo: React.FC<RtLogoProps> = ({ 
  className = "w-7 h-7", 
  size,
  showBadge = false 
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      role="img"
      aria-label="Logo Jimpitan RT Digital"
    >
      <defs>
        {/* Background Gradient */}
        <linearGradient id="rtModernBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="50%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#311042" />
        </linearGradient>

        {/* Neon Glow Gradient */}
        <linearGradient id="rtNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Gold Radiant Gradient */}
        <linearGradient id="rtGoldModern" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Laser Beam Gradient */}
        <linearGradient id="rtLaser" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Optional Outer Circle Shield */}
      {showBadge && (
        <>
          <rect width="100" height="100" rx="24" fill="url(#rtModernBg)" stroke="url(#rtGoldModern)" strokeWidth="2" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#6366F1" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
        </>
      )}

      {/* QR Target Corner Frame */}
      <path d="M 22 34 L 22 24 C 22 22 24 20 26 20 L 36 20" fill="none" stroke="url(#rtNeonGlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 64 20 L 74 20 C 76 20 78 22 78 24 L 78 34" fill="none" stroke="url(#rtNeonGlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 22 66 L 22 76 C 22 78 24 80 26 80 L 36 80" fill="none" stroke="url(#rtNeonGlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 64 80 L 74 80 C 76 80 78 78 78 76 L 78 66" fill="none" stroke="url(#rtNeonGlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Atap Rumah Warga / Guyub Rukun */}
      <path
        d="M 50 22 L 72 38 C 73 39 73 41 72 42 L 68 45 C 67 46 66 45 65 45 L 50 34 L 35 45 C 34 45 33 46 32 45 L 28 42 C 27 41 27 39 28 38 Z"
        fill="url(#rtGoldModern)"
      />

      {/* Koin Emas & Pusat Scanner */}
      <circle cx="50" cy="56" r="18" fill="#1E293B" stroke="url(#rtGoldModern)" strokeWidth="2" />
      <circle cx="50" cy="56" r="15.5" fill="none" stroke="#FEF08A" strokeWidth="0.6" strokeDasharray="1.5 1.5" opacity="0.7" />

      {/* QR Code Dots Matrix */}
      <rect x="39" y="46" width="6" height="6" rx="1.5" fill="url(#rtGoldModern)" />
      <rect x="40.5" y="47.5" width="3" height="3" rx="0.5" fill="#0F172A" />

      <rect x="55" y="46" width="6" height="6" rx="1.5" fill="url(#rtGoldModern)" />
      <rect x="56.5" y="47.5" width="3" height="3" rx="0.5" fill="#0F172A" />

      <rect x="39" y="60" width="6" height="6" rx="1.5" fill="url(#rtGoldModern)" />
      <rect x="40.5" y="61.5" width="3" height="3" rx="0.5" fill="#0F172A" />

      {/* Rp Center Typography */}
      <text
        x="56"
        y="65"
        fill="url(#rtGoldModern)"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      >
        Rp
      </text>

      {/* Laser Line */}
      <line x1="20" y1="56" x2="80" y2="56" stroke="url(#rtLaser)" strokeWidth="1.2" strokeLinecap="round" />

      {/* Bottom Badge */}
      <rect x="32" y="82" width="36" height="9" rx="4.5" fill="#0F172A" stroke="url(#rtGoldModern)" strokeWidth="0.8" />
      <text
        x="50"
        y="88.5"
        fill="#FEF08A"
        fontSize="4"
        fontWeight="900"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="1"
      >
        JIMPITAN RT
      </text>
    </svg>
  );
};
