/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14201C",
        paper: "#F5F6F1",
        gold: "#B8862E",
        teal: "#1F6E5C",
        danger: "#A23B33",
        line: "#DEDCD1",
        sage: "#E2ECE1",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
      },
    },
  },
  plugins: [],
};
