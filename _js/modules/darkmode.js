/**
 * Dark Mode Module - Follows changes of the system preference
 *
 * The initial theme is set by an inline script in the header (no flash).
 */
export function createDarkModeModule() {
  const query = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = () => {
    document.documentElement.setAttribute('data-bs-theme', query.matches ? 'dark' : 'light');
  };

  const init = () => {
    query.addEventListener('change', apply);
  };

  return { init };
}
