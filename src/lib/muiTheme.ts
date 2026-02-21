/**
 * muiTheme.ts
 *
 * A MUI theme that mirrors the Quantinuum design-system tokens defined in
 * @quantinuum/quantinuum-ui/dist/tokens.css.
 *
 * The tokens use the shadcn/ui HSL-triplet convention, e.g.:
 *   --primary: 240 5.9% 10%
 * which maps to hsl(240, 5.9%, 10%).
 *
 * Where MUI's theme palette needs concrete values (for hover calculations,
 * box-shadows, etc.) we provide hex equivalents.  For component `sx` overrides
 * we reference the CSS variables directly so light/dark mode stays consistent
 * automatically without a React context switch.
 */

import { createTheme } from "@mui/material/styles";

// HSL triplet → hex conversions of the key Quantinuum tokens:
//   --primary:          240 5.9% 10%   → #18181b
//   --background:       0 0% 100%      → #ffffff
//   --foreground:       240 10% 3.9%   → #09090b
//   --muted:            240 4.8% 95.9% → #f4f4f5
//   --muted-foreground: 240 3.8% 44%   → #70707a
//   --border:           240 5.9% 88%   → #e0e0e2
//   --ring:             240 10% 3.9%   → #09090b  (focus ring)
const tokens = {
  primary: "#18181b",
  background: "#ffffff",
  foreground: "#09090b",
  muted: "#f4f4f5",
  mutedForeground: "#70707a",
  border: "#e0e0e2",
  radius: "0.5rem",
};

export const quantinuumTheme = createTheme({
  cssVariables: false,

  palette: {
    mode: "light",
    primary: {
      main: tokens.primary,
      contrastText: "#fafafa",
    },
    background: {
      default: tokens.background,
      paper: tokens.background,
    },
    text: {
      primary: tokens.foreground,
      secondary: tokens.mutedForeground,
    },
    divider: tokens.border,
  },

  shape: {
    borderRadius: 8, // matches --radius: 0.5rem at 16px base font
  },

  typography: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: 14,
  },

  components: {
    // -----------------------------------------------------------------------
    // Paper – used for the dropdown surface
    // -----------------------------------------------------------------------
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${tokens.border}`,
        },
      },
    },

    // -----------------------------------------------------------------------
    // List / ListItem – result rows
    // -----------------------------------------------------------------------
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          "&.Mui-selected": {
            backgroundColor: "hsl(213 100% 96%)",
            "&:hover": {
              backgroundColor: "hsl(213 100% 93%)",
            },
          },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Chip – project badge and section heading chips
    // -----------------------------------------------------------------------
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          letterSpacing: "0.04em",
        },
        sizeSmall: {
          height: 18,
          fontSize: "0.625rem",
        },
      },
    },

    // -----------------------------------------------------------------------
    // InputBase – the main search text field
    // -----------------------------------------------------------------------
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
      },
    },
  },
});
