"use client";
import * as React from 'react';
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material';

export const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

export default function MUIThemeProvider({ children }: { children: React.ReactNode }) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = React.useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');

  const colorMode = React.useMemo(
    () => ({ toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')) }),
    []
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
