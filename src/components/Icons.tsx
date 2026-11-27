import React from 'react';
import type { AccountEmblemKind } from '../lib/types';

interface IconProps {
  className?: string;
}

export function IconWallet({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M16 12h5.5" />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconReceiptAdd({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h14v18l-2.5-1.8L14 21l-2-1.8L10 21l-2.5-1.8L5 21V3z" />
      <path d="M12 8v6M9 11h6" />
    </svg>
  );
}

export function IconChart({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h16" />
      <rect x="6" y="10" width="3" height="7" rx="0.8" />
      <rect x="11" y="6" width="3" height="11" rx="0.8" />
      <rect x="16" y="12" width="3" height="5" rx="0.8" />
    </svg>
  );
}

export function IconTransfer({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h15l-3.5-3.5" />
      <path d="M20 16H5l3.5 3.5" />
    </svg>
  );
}

export function IconReport({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

export function IconSheet({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  );
}

export function IconCamera({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-2.5h6L17 8h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}

export function IconClose({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconSearch({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconEdit({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function IconLock({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconFilter({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  );
}

export function IconTarget({ className = 'w-4 h-4' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconMoreDots({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="18" cy="12" r="1.75" />
    </svg>
  );
}

export function IconPlus({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEye({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.8" fill="#D97706" stroke="currentColor" />
    </svg>
  );
}

export function IconEyeOff({ className = 'w-5 h-5' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12s3.5-5.5 9-5.5 9 5.5 9 5.5-3.5 5.5-9 5.5S3 12 3 12z" />
      <circle cx="12" cy="12" r="2.8" fill="#EAB308" stroke="none" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function IconCardWatermark({ className = 'w-7 h-7' }: IconProps): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="20" height="26" rx="3" />
      <rect x="8.5" y="8" width="5" height="4" rx="0.8" />
      <path d="M8.5 18h11M8.5 22.5h6" />
    </svg>
  );
}

export function AccountCardEmblem({
  kind,
  isDarkBg
}: {
  kind: AccountEmblemKind;
  isDarkBg?: boolean;
}): React.ReactElement {
  if (kind === 'ewallet') {
    return (
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-xs">
        <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M12.5 8.5c1.3 1.4 5.7 1.4 7 0l1.1-2.1c.4-.8-.3-1.6-1.1-1.3l-2.3.8-1.2-1.2-1.2 1.2-2.3-.8c-.8-.3-1.5.5-1.1 1.3l1.1 2.1z"
            fill="#0095BD"
          />
          <path
            d="M11 10.5c-3.5 2.5-5.5 6.8-5 11.1.4 3.2 2.8 5.4 6 5.4h8c3.2 0 5.6-2.2 6-5.4.5-4.3-1.5-8.6-5-11.1h-10z"
            fill="#00A7D1"
          />
          <path d="M12.5 11.2h7" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (kind === 'card') {
    return (
      <div className="inline-flex h-11 w-14 items-center justify-start">
        <svg className="h-10 w-14 drop-shadow-xs" viewBox="0 0 56 38" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="cardGoldGrad" x1="0" y1="0" x2="56" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F5EECC" />
              <stop offset="55%" stopColor="#E7D89E" />
              <stop offset="100%" stopColor="#D3BE78" />
            </linearGradient>
          </defs>
          <rect x="1" y="2" width="54" height="34" rx="4.5" fill="url(#cardGoldGrad)" stroke="#C7B26B" strokeWidth="1" />
          <rect x="1" y="7" width="54" height="5" fill="#1F242D" />
          <rect x="6" y="15" width="38" height="7" rx="1.5" fill="#F8FAFC" />
          <path d="M9 18.8c4-2.5 7 1.8 11-.6 3-1.8 6 1.4 9-.4" stroke="#334155" strokeWidth="1.1" strokeLinecap="round" />
          <rect x="38" y="16" width="5" height="5" rx="1" fill="#CBD5E1" />
          <path d="M6 27h24M6 30.5h16" stroke="#8C7A40" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="inline-flex h-12 w-11 items-center justify-start">
      <svg className="h-12 w-11 drop-shadow-xs" viewBox="0 0 44 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="pouchGold" x1="8" y1="14" x2="36" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F7DC79" />
            <stop offset="55%" stopColor="#E4B849" />
            <stop offset="100%" stopColor="#BC8C25" />
          </linearGradient>
        </defs>
        <path
          d="M15.5 13.5c2 2 11 2 13 0l3.2-5.4c.7-1.1-.3-2.5-1.5-2l-4.5 1.8L22 5.2l-3.7 2.7-4.5-1.8c-1.2-.5-2.2.9-1.5 2l3.2 5.4z"
          fill="#E2B647"
          stroke={isDarkBg ? '#8E6919' : '#9B731D'}
          strokeWidth="1"
        />
        <path
          d="M14.5 14.5c-5.5 4.2-8.5 10.6-7.5 18.2.8 5.8 5.2 10.3 11 10.3h8c5.8 0 10.2-4.5 11-10.3 1-7.6-2-14-7.5-18.2h-15z"
          fill="url(#pouchGold)"
          stroke={isDarkBg ? '#8E6919' : '#9B731D'}
          strokeWidth="1"
        />
        <rect x="14" y="13.5" width="16" height="3.2" rx="1.6" fill="#A67A1E" />
        <path
          d="M22 21v15.5M25.6 24.4c0-1.6-1.6-2.7-3.6-2.7-2 0-3.5 1.1-3.5 2.7 0 1.7 1.3 2.4 3.6 2.9 2.3.5 3.7 1.3 3.7 3.1 0 1.8-1.6 3-3.8 3-2.2 0-3.8-1.1-3.9-2.8"
          stroke="#2B2415"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
