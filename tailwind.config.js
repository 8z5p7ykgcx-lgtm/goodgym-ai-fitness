/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(0 0% 14%)',
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(0 0% 14%)',
        primary: 'hsl(0 0% 20%)',
        'primary-foreground': 'hsl(0 0% 98%)',
        secondary: 'hsl(0 0% 96%)',
        'secondary-foreground': 'hsl(0 0% 20%)',
        muted: 'hsl(0 0% 96%)',
        'muted-foreground': 'hsl(0 0% 56%)',
        accent: 'hsl(0 0% 96%)',
        'accent-foreground': 'hsl(0 0% 20%)',
        destructive: 'hsl(0 72% 51%)',
        border: 'hsl(0 0% 90%)',
        input: 'hsl(0 0% 90%)',
        ring: 'hsl(0 0% 70%)',
      },
    },
  },
  plugins: [],
};
