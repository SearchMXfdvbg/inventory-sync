import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Option to extend color palette if desired, but we can stick to Tailwind defaults like blue, green, amber, red, slate.
      }
    },
  },
  plugins: [],
};
export default config;
