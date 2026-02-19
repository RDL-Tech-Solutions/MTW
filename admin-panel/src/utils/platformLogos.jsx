/**
 * Platform logos — inline SVGs for reliability & professional look
 * No external CDN dependencies
 */
import React from 'react';

// ── SVG icon components ────────────────────────────────────
const MercadoLivreSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z" fill="#FFE600" />
        <path d="M16 7c2.5 2 5 5.5 5 9s-2.5 7-5 9c-2.5-2-5-5.5-5-9s2.5-7 5-9z" fill="#2D3277" opacity="0.85" />
        <path d="M11.5 14.5c1.2-1.5 2.8-2.5 4.5-2.5s3.3 1 4.5 2.5c-1.2 1.5-2.8 2.5-4.5 2.5s-3.3-1-4.5-2.5z" fill="#FFE600" />
        <circle cx="16" cy="14.5" r="1.5" fill="#2D3277" />
    </svg>
);

const ShopeeSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z" fill="#EE4D2D" />
        <path d="M16 7.5c-1.8 0-3.2 1.3-3.2 2.8 0 .5.2 1 .4 1.3.1.1.1.2 0 .3-.3.3-.5.6-.5 1 0 .8.8 1.4 1.8 1.4h3c1 0 1.8-.6 1.8-1.4 0-.4-.2-.7-.5-1-.1-.1-.1-.2 0-.3.2-.3.4-.8.4-1.3C19.2 8.8 17.8 7.5 16 7.5z" fill="white" />
        <path d="M10 16.5c0-1 .4-1.9 1.2-2.5h9.6c.8.6 1.2 1.5 1.2 2.5v4c0 2.8-2.7 5-6 5s-6-2.2-6-5v-4z" fill="white" />
        <path d="M13.5 18.5v2.5" stroke="#EE4D2D" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M16 18.5v2.5" stroke="#EE4D2D" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M18.5 18.5v2.5" stroke="#EE4D2D" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
);

const AmazonSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#232F3E" />
        <path d="M9 18c2.5 2 5.5 3 8 2.5 2-.4 3.5-1.5 4.5-2.5" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M21 16.5l1.5 2 1.5-1" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M10 15c0-2.5 2-4.5 4.5-4.5 2 0 3.5 1.2 4 3-.2 1.5-1 2.5-2.2 3-1 .3-2 .2-2.8-.2" stroke="#FF9900" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
);

const AliexpressSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#E43225" />
        <text x="16" y="20.5" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold">Ali</text>
    </svg>
);

const KabumSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#FF6500" />
        <path d="M12 10v12M12 16l5-5M12 16l5 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.5 21h1.5c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2h-1.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const MagazineLuizaSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#0086FF" />
        <text x="16" y="20.5" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900">M</text>
    </svg>
);

const PichauSvg = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="6" fill="#FF6600" />
        <text x="16" y="20.5" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900">P</text>
    </svg>
);

// ── Platform config ────────────────────────────────────────
export const PLATFORM_LOGOS = {
    mercadolivre: {
        name: 'Mercado Livre',
        color: '#FFE600',
        bgColor: '#FFF9C4',
        textColor: '#333',
        Icon: MercadoLivreSvg,
    },
    shopee: {
        name: 'Shopee',
        color: '#EE4D2D',
        bgColor: '#FFEBEE',
        textColor: '#fff',
        Icon: ShopeeSvg,
    },
    amazon: {
        name: 'Amazon',
        color: '#FF9900',
        bgColor: '#FFF3E0',
        textColor: '#fff',
        Icon: AmazonSvg,
    },
    aliexpress: {
        name: 'AliExpress',
        color: '#E43225',
        bgColor: '#FFEBEE',
        textColor: '#fff',
        Icon: AliexpressSvg,
    },
    kabum: {
        name: 'Kabum',
        color: '#FF6500',
        bgColor: '#FFF3E0',
        textColor: '#fff',
        Icon: KabumSvg,
    },
    magazineluiza: {
        name: 'Magazine Luiza',
        color: '#0086FF',
        bgColor: '#E3F2FD',
        textColor: '#fff',
        Icon: MagazineLuizaSvg,
    },
    pichau: {
        name: 'Pichau',
        color: '#FF6600',
        bgColor: '#FFF3E0',
        textColor: '#fff',
        Icon: PichauSvg,
    },
};

/**
 * Get platform display name
 */
export const getPlatformName = (platform) => {
    return PLATFORM_LOGOS[platform]?.name || platform || 'Desconhecido';
};

/**
 * Get platform brand color
 */
export const getPlatformColor = (platform) => {
    return PLATFORM_LOGOS[platform]?.color || '#6B7280';
};

/**
 * React component: Platform badge with SVG icon + name
 */
export function PlatformLogo({ platform, size = 20, showName = true, className = '' }) {
    const config = PLATFORM_LOGOS[platform];

    if (!config) {
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium ${className}`}>
                {platform || 'Desconhecido'}
            </span>
        );
    }

    const IconComp = config.Icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 hover:opacity-90 ${className}`}
            style={{
                backgroundColor: config.bgColor,
                color: config.color,
                border: `1px solid ${config.color}22`,
            }}
        >
            <span
                className="inline-flex items-center justify-center rounded-md overflow-hidden flex-shrink-0"
                style={{
                    width: size + 4,
                    height: size + 4,
                    backgroundColor: config.color,
                    borderRadius: 6,
                }}
            >
                <IconComp size={size} />
            </span>
            {showName && <span style={{ color: '#333', fontWeight: 600 }}>{config.name}</span>}
        </span>
    );
}

/**
 * Small icon-only (no text) — for tables, compact views
 */
export function PlatformIcon({ platform, size = 18, className = '' }) {
    const config = PLATFORM_LOGOS[platform];

    if (!config) return null;

    const IconComp = config.Icon;

    return (
        <span
            className={`inline-flex items-center justify-center rounded-md overflow-hidden flex-shrink-0 ${className}`}
            style={{
                width: size + 4,
                height: size + 4,
                backgroundColor: config.color,
                borderRadius: 5,
            }}
        >
            <IconComp size={size} />
        </span>
    );
}
