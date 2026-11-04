import { useEffect } from 'react';

export function useTheme(theme: 'dark' | 'light' | 'oled' | 'system') {
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let isDark = true;
      let themeAttr = 'dark';

      if (theme === 'light') {
        isDark = false;
        themeAttr = 'light';
      } else if (theme === 'oled') {
        isDark = true;
        themeAttr = 'oled';
      } else if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeAttr = isDark ? 'dark' : 'light';
      }

      root.setAttribute('data-theme', themeAttr);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);
}
