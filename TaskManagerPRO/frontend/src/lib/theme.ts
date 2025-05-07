import { extendTheme } from '@chakra-ui/react';

// Professional color scheme with bright accents and dark background
// Extracted from login and register pages
export const appColors = {
  background: {
    primary: '#0F172A',     // Deep blue-black
    card: '#1E293B',        // Dark blue-gray
    input: '#0F172A',       // Darker blue for inputs
  },
  accent: {
    primary: '#3B82F6',     // Bright blue
    secondary: '#60A5FA',   // Lighter blue
    success: '#10B981',     // Emerald green
    highlight: '#8B5CF6',   // Vibrant purple
    gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', // Blue to purple gradient
  },
  text: {
    primary: '#F1F5F9',     // Almost white
    secondary: '#CBD5E1',   // Light gray
    muted: '#64748B',       // Muted blue-gray
  },
  border: {
    light: '#334155',       // Medium blue-gray
    focus: '#60A5FA',       // Light blue for focus
  }
};

// Create a custom Chakra UI theme with our colors
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: appColors.background.primary,
        color: appColors.text.primary,
      },
    },
  },
  colors: {
    blue: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    purple: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
    },
    gray: {
      50: '#F9FAFB',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
      },
      variants: {
        primary: {
          bgGradient: appColors.accent.gradient,
          color: 'white',
          _hover: { 
            bgGradient: 'linear(135deg, #2563EB, #7C3AED)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
          },
          _active: {
            transform: 'translateY(0)',
            boxShadow: 'none'
          },
        },
        secondary: {
          bg: 'transparent',
          border: '1px solid',
          borderColor: appColors.accent.primary,
          color: appColors.accent.primary,
          _hover: {
            bg: 'rgba(59, 130, 246, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: appColors.background.input,
            borderColor: appColors.border.light,
            color: appColors.text.primary,
            _hover: { borderColor: appColors.border.focus },
            _focus: { 
              borderColor: appColors.accent.primary, 
              boxShadow: `0 0 0 1px ${appColors.accent.primary}`,
              bg: 'rgba(15, 23, 42, 0.8)'
            },
          }
        }
      },
      defaultProps: {
        variant: 'filled',
      }
    },
    Card: {
      baseStyle: {
        container: {
          bg: appColors.background.card,
          borderRadius: 'xl',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }
      }
    },
    Heading: {
      baseStyle: {
        color: appColors.text.primary,
        fontWeight: 'bold',
      }
    },
    Text: {
      baseStyle: {
        color: appColors.text.secondary,
      }
    },
  },
});

export default theme; 