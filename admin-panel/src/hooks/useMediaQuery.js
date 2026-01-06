import { useState, useEffect } from 'react';

/**
 * Hook para detectar breakpoints de mídia
 * @param {string} query - Media query CSS (ex: '(max-width: 768px)')
 * @returns {boolean} - Se a query corresponde
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        const handler = (event) => setMatches(event.matches);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Add listener
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * Hook simplificado para detectar mobile
 * @returns {boolean} - Se é mobile (< 768px)
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 767px)');
}

/**
 * Hook para detectar tablet
 * @returns {boolean} - Se é tablet (768px - 1023px)
 */
export function useIsTablet() {
    return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Hook para detectar desktop
 * @returns {boolean} - Se é desktop (>= 1024px)
 */
export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}

export default useMediaQuery;
