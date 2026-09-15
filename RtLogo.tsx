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
      aria-label="Logo Khas RT"
    >
      <defs>
        {/* Gold Accent Gradient */}
        <linearGradient id="rtGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Shield / Badge Background Gradient */}
        <linearGradient id="rtShieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Coin Glow */}
        <linearGradient id="rtCoinGrad" x1="20%" y1="20%" x2="80%" y2="80%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>

      {/* Optional Outer Circle Shield */}
      {showBadge && (
        <>
          <circle cx="50" cy="50" r="47" fill="url(#rtShieldGrad)" stroke="url(#rtGoldGrad)" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="43" fill="none" stroke="#FDE047" strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.6" />
        </>
      )}

      {/* 1. Atap Rumah / Gapura RT / Joglo Pos Kamling (Guyub Rukun) */}
      <path
        d="M50 14L80 34H20L50 14Z"
        fill="url(#rtGoldGrad)"
      />
      {/* Genteng / Tiang List */}
      <path
        d="M50 17L74 33H26L50 17Z"
        fill="#FEF08A"
        opacity="0.9"
      />
      {/* Tiang Gapura / Pos Ronda Kiri & Kanan */}
      <rect x="23" y="34" width="4" height="20" rx="1" fill="url(#rtGoldGrad)" />
      <rect x="73" y="34" width="4" height="20" rx="1" fill="url(#rtGoldGrad)" />

      {/* 2. Bintang Pengayom di Puncak Atap */}
      <polygon
        points="50,11 51.5,14.5 55,14.8 52.3,17.2 53.1,20.7 50,18.8 46.9,20.7 47.7,17.2 45,14.8 48.5,14.5"
        fill="#FFFFFF"
      />

      {/* 3. Pita / Lingkaran Monogram "RT" */}
      <rect x="26" y="37" width="48" height="28" rx="7" fill="#0F172A" stroke="url(#rtGoldGrad)" strokeWidth="1.8" />

      {/* Teks Monogram "RT" yang Gagah & Proporsional */}
      <text
        x="50"
        y="58"
        fill="url(#rtGoldGrad)"
        fontSize="21"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        RT
      </text>

      {/* 4. Koin Jimpitan Berkilau & Simbol Koin Gotong Royong di Bawah */}
      {/* Koin Jimpitan Utama */}
      <circle cx="50" cy="74" r="12" fill="url(#rtCoinGrad)" stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="50" cy="74" r="9.5" fill="none" stroke="#78350F" strokeWidth="0.8" strokeDasharray="1.5 1" />
      <text
        x="50"
        y="78"
        fill="#78350F"
        fontSize="11"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
      >
        Rp
      </text>

      {/* Ornamen Padi & Kapas Kiri (Kesejahteraan Warga) */}
      <path
        d="M20 74C20 63 24 55 31 49C29 55 29 65 34 70C28 72 23 74 20 74Z"
        fill="url(#rtGoldGrad)"
        opacity="0.9"
      />
      <circle cx="21" cy="62" r="2" fill="#FEF08A" />
      <circle cx="24" cy="55" r="2" fill="#FEF08A" />
      <circle cx="28" cy="50" r="2" fill="#FEF08A" />

      {/* Ornamen Padi & Kapas Kanan */}
      <path
        d="M80 74C80 63 76 55 69 49C71 55 71 65 66 70C72 72 77 74 80 74Z"
        fill="url(#rtGoldGrad)"
        opacity="0.9"
      />
      <circle cx="79" cy="62" r="2" fill="#FEF08A" />
      <circle cx="76" cy="55" r="2" fill="#FEF08A" />
      <circle cx="72" cy="50" r="2" fill="#FEF08A" />

      {/* Pita Bawah "JIMPITAN" */}
      <path
        d="M32 87H68L65 92H35L32 87Z"
        fill="url(#rtGoldGrad)"
      />
      <text
        x="50"
        y="91"
        fill="#451A03"
        fontSize="5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        letterSpacing="0.8"
      >
        JIMPITAN
      </text>
    </svg>
  );
};
