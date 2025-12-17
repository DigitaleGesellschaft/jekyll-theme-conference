/**
 * Dark Mode Module
 * Automatically switches dark mode based on browser/system preference
 */
export function createDarkModeModule() {
  /**
   * Apply dark mode based on system preference
   */
  const applyDarkMode = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const htmlElement = document.documentElement;

    if (prefersDark) {
      htmlElement.setAttribute('data-bs-theme', 'dark');
    } else {
      htmlElement.setAttribute('data-bs-theme', 'light');
    }
  };

  /**
   * Initialize dark mode detection
   */
  const init = () => {
    // Apply immediately to avoid flash of wrong theme
    applyDarkMode();

    // Listen for changes to system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers support addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', applyDarkMode);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(applyDarkMode);
    }
  };

  return {
    init: init
  };
}
