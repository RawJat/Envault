import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./content/**/*.mdx",
        "./node_modules/fumadocs-ui/dist/**/*.js",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['"Google Sans"', "sans-serif"],
                serif: ['"Instrument Serif"', "serif"],
                mono: ['"JetBrains Mono"', "monospace"],
            },
            colors: {
                bone: "#F2F2F0",
                void: "#050505",
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                none: "0px",
                sm: "0.5rem",
                md: "0.625rem",
                lg: "0.75rem",
                xl: "1rem",
                "2xl": "1.5rem",
                "3xl": "2rem",
                full: "9999px",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                shake: {
                    "0%, 100%": { transform: "translateX(0)" },
                    "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
                    "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
                },
                "shake-dialog": {
                    "0%, 100%": { transform: "translate(-50%, -50%)" },
                    "10%, 30%, 50%, 70%, 90%": { transform: "translate(calc(-50% - 4px), -50%)" },
                    "20%, 40%, 60%, 80%": { transform: "translate(calc(-50% + 4px), -50%)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.4s cubic-bezier(0.16,1,0.3,1)",
                "accordion-up": "accordion-up 0.4s cubic-bezier(0.16,1,0.3,1)",
                shake: "shake 0.4s ease-in-out",
                "shake-dialog": "shake-dialog 0.4s ease-in-out",
            },
        },
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [animate],
};

export default config;