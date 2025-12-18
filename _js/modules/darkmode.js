/**
 * Dark Mode Module - Switches dark mode based on system preference
 */
export function createDarkModeModule() {
  const apply = () => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  };

  const init = () => {
    apply();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  };

  return { init };
}
