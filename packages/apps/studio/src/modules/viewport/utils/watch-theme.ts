const DARK_QUERY = '(prefers-color-scheme: dark)';

export const watchTheme = (onChange: () => void): (() => void) => {
    const media = window.matchMedia(DARK_QUERY);
    const observer = new MutationObserver(onChange);

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    media.addEventListener('change', onChange);

    return () => {
        observer.disconnect();
        media.removeEventListener('change', onChange);
    };
};
