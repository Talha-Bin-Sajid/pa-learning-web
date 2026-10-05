import { createTheme } from '@mui/material';

/** MUI themed to the prototype so its components don't look like stock Material. */
export const theme = createTheme({
  palette: {
    primary: { main: '#2d8dfe', dark: '#2c609c', contrastText: '#fff' },
    secondary: { main: '#000000' },
    error: { main: '#ec4f3c' },
    success: { main: '#15b85f' },
    text: { primary: '#262719', secondary: 'rgba(38,39,25,.55)' },
    background: { default: '#f4f7fb', paper: '#fff' },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: "'Poppins', ui-sans-serif, system-ui, sans-serif",
    button: { textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1.2px', fontSize: 11 },
  },
  components: {
    MuiSkeleton: { defaultProps: { animation: 'wave' }, styleOverrides: { root: { borderRadius: 0 } } },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 0, background: '#000', fontSize: 11, fontFamily: 'inherit' } },
    },
    MuiDialog: { defaultProps: { transitionDuration: { enter: 220, exit: 160 } } },
  },
});
