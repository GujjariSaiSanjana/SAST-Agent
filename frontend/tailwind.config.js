/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: { "2xl": "1400px" },
        },
        extend: {
            fontFamily: {
                sans:  ["var(--font-sans)"],
                serif: ["var(--font-serif)"],
                mono:  ["var(--font-mono)"],
            },
            colors: {
                /* ── Tailwind semantic (via CSS remap vars) ── */
                border:     "var(--border)",
                input:      "var(--input)",
                ring:       "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT:    "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT:    "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT:    "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT:    "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT:    "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT:    "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT:    "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                link: "var(--link)",

                /* ── Design token direct utilities ── */
                ivory:  "var(--ivory)",
                paper:  "var(--paper)",
                slate:  "var(--slate)",
                clay: {
                    DEFAULT: "var(--clay)",
                    d:       "var(--clay-d)",
                },
                oat:   "var(--oat)",
                olive: "var(--olive)",
                rust:  "var(--rust)",
                sky:   "var(--sky)",
                g100:  "var(--g100)",
                g200:  "var(--g200)",
                g300:  "var(--g300)",
                g500:  "var(--g500)",
                g700:  "var(--g700)",
            },
            borderRadius: {
                sm:    "var(--radius-row)",
                md:    "var(--radius-row)",
                lg:    "var(--radius-panel)",
                xl:    "var(--radius-panel)",
                "2xl": "var(--radius-panel)",
                "3xl": "20px",
                pill:  "var(--radius-pill)",
            },
            boxShadow: {
                whisper:  "var(--shadow-sm)",
                elevated: "var(--shadow-card)",
                lg:       "var(--shadow-lg)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to:   { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to:   { height: "0" },
                },
                "slide-up": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to:   { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up":   "accordion-up 0.2s ease-out",
                "slide-up":       "slide-up 0.4s ease-out both",
            },
        },
    },
    plugins: [import("tailwindcss-animate")],
}
