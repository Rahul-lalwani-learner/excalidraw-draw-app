/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../apps/*/app/**/*.{js,ts,jsx,tsx}",
    "../../apps/*/components/**/*.{js,ts,jsx,tsx}",
    "../../apps/*/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
};
