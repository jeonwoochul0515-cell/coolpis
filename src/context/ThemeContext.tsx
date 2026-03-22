import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('coolpis-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'light';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('coolpis-theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: '#FF6B8A', dark: '#E05577' },
          secondary: { main: '#FFB74D' },
          ...(themeMode === 'light'
            ? {
                background: { default: '#FFF5F7', paper: '#FFFFFF' },
              }
            : {
                background: { default: '#121212', paper: '#1E1E1E' },
              }),
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily: '"Noto Sans KR", "Roboto", sans-serif',
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { borderRadius: 25, textTransform: 'none', fontWeight: 600 },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow:
                  themeMode === 'light'
                    ? '0 2px 12px rgba(255,107,138,0.08)'
                    : '0 2px 12px rgba(0,0,0,0.3)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: { borderRadius: 16 },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#1E1E1E',
                color: '#FF6B8A',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': { borderColor: '#FF6B8A' },
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 20 },
            },
          },
        },
      }),
    [themeMode],
  );

  const contextValue = useMemo(() => ({ themeMode, toggleTheme }), [themeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
