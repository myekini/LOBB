import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── LOBB color tokens ──────────────────────────────────────────────────
      // Wraps CSS custom properties so components can write `text-lobb-clay`
      // instead of `text-[var(--lobb-clay)]`. Values and dark-mode overrides
      // live in globals.css / tokens.css.
      colors: {
        // shadcn pass-through (keep for any shadcn components)
        background:          "var(--background)",
        foreground:          "var(--foreground)",
        card:                "var(--card)",
        "card-foreground":   "var(--card-foreground)",
        popover:             "var(--popover)",
        "popover-foreground":"var(--popover-foreground)",
        primary:             "var(--primary)",
        "primary-foreground":"var(--primary-foreground)",
        secondary:           "var(--secondary)",
        "secondary-foreground":"var(--secondary-foreground)",
        muted:               "var(--muted)",
        "muted-foreground":  "var(--muted-foreground)",
        accent:              "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive:         "var(--destructive)",
        border:              "var(--border)",
        input:               "var(--input)",
        ring:                "var(--ring)",

        // LOBB brand tokens
        "lobb-black":   "var(--lobb-black)",
        "lobb-clay":    "var(--lobb-clay)",
        "lobb-clay-lt": "var(--lobb-clay-light)",
        "lobb-clay-dk": "var(--lobb-clay-dark)",
        "lobb-bg":      "var(--lobb-bg)",
        "lobb-surface": "var(--lobb-surface)",
        "lobb-border":  "var(--lobb-border)",
        "lobb-muted":   "var(--lobb-muted)",
        "lobb-success": "var(--lobb-success)",
        "lobb-error":   "var(--lobb-error)",
        "lobb-warning": "var(--lobb-warning)",

        // LOBB semantic text tokens
        "lobb-text":     "var(--lobb-text-primary)",
        "lobb-text-2":   "var(--lobb-text-secondary)",
        "lobb-text-3":   "var(--lobb-text-tertiary)",
        "lobb-inverse":  "var(--lobb-text-inverse)",
      },

      // ── LOBB typography scale ──────────────────────────────────────────────
      // Maps token names to the custom properties defined in tokens.css.
      fontSize: {
        "lobb-display": ["var(--lobb-size-display)", { lineHeight: "var(--lobb-leading-display)", fontWeight: "var(--lobb-weight-display)" }],
        "lobb-h1":      ["var(--lobb-size-h1)",      { lineHeight: "var(--lobb-leading-h1)",      fontWeight: "var(--lobb-weight-h1)" }],
        "lobb-h2":      ["var(--lobb-size-h2)",      { lineHeight: "var(--lobb-leading-h2)",      fontWeight: "var(--lobb-weight-h2)" }],
        "lobb-body":    ["var(--lobb-size-body)",    { lineHeight: "var(--lobb-leading-body)",    fontWeight: "var(--lobb-weight-body)" }],
        "lobb-label":   ["var(--lobb-size-label)",   { lineHeight: "var(--lobb-leading-label)",   fontWeight: "var(--lobb-weight-label)" }],
        "lobb-caption": ["var(--lobb-size-caption)", { lineHeight: "var(--lobb-leading-caption)", fontWeight: "var(--lobb-weight-caption)" }],
        "lobb-mono":    ["var(--lobb-size-mono)",    { lineHeight: "var(--lobb-leading-mono)",    fontWeight: "var(--lobb-weight-mono)" }],
      },

      // ── LOBB spacing scale ─────────────────────────────────────────────────
      spacing: {
        "lobb-1":  "var(--lobb-sp-1)",
        "lobb-2":  "var(--lobb-sp-2)",
        "lobb-3":  "var(--lobb-sp-3)",
        "lobb-4":  "var(--lobb-sp-4)",
        "lobb-5":  "var(--lobb-sp-5)",
        "lobb-6":  "var(--lobb-sp-6)",
        "lobb-8":  "var(--lobb-sp-8)",
        "lobb-10": "var(--lobb-sp-10)",
        "lobb-12": "var(--lobb-sp-12)",
        "lobb-16": "var(--lobb-sp-16)",
      },
    },
  },
  plugins: [],
};
export default config;
