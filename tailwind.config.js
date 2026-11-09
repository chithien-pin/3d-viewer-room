/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f4efe6",
        walnut: "#5b3a29",
        ink: "#2c2824",
      },
    },
  },
  plugins: [],
};
