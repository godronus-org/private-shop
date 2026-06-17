export const siteConfig = {
  name: "Maison Réservé",
  tagline: "Exceptional goods. Members only.",
  logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 36" width="200" height="30" aria-label="Maison Réservé">
  <text x="0" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20" font-weight="700" letter-spacing="1" fill="currentColor">MAISON RÉSERVÉ</text>
</svg>`,
  faviconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#1f2937"/>
  <text x="16" y="23" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#fff" letter-spacing="1">MR</text>
</svg>`,
  colors: {
    primary: "#007bff",
    primaryHover: "#0056b3",
    primaryText: "#ffffff",
    cta: "#28a745",
    ctaHover: "#218838",
    background: "#f8f9fa",
    surface: "#ffffff",
    text: "#333333",
    muted: "#666666",
    subtle: "#999999",
    border: "#dee2e6",
    danger: "#dc3545",
  },
  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  currency: { code: "GBP", symbol: "£" },
  cornerRadius: "6px",
  ctaLabel: "Add to basket",
} as const;
