/**
 * icons.js
 * ---------------------------------------------------------------------------
 * Simple inline SVG illustrations for the product cards.
 * They are drawn with CSS (`currentColor`) so no image files and no external
 * icon libraries are needed — the page works completely offline.
 */

export const PRODUCT_ICONS = {
  'SKU-001': `
    <svg class="product-svg" viewBox="0 0 120 120" role="img" aria-label="Laptop illustration">
      <rect x="26" y="26" width="68" height="46" rx="6" fill="currentColor" opacity="0.92"/>
      <rect x="32" y="32" width="56" height="34" rx="3" fill="#ffffff" opacity="0.55"/>
      <path d="M18 82c0-2.2 1.8-4 4-4h76c2.2 0 4 1.8 4 4v6H18z" fill="currentColor" opacity="0.6"/>
      <rect x="50" y="84" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.5"/>
    </svg>`,
  'SKU-002': `
    <svg class="product-svg" viewBox="0 0 120 120" role="img" aria-label="Mouse illustration">
      <rect x="40" y="20" width="40" height="72" rx="20" fill="currentColor" opacity="0.92"/>
      <rect x="56" y="28" width="8" height="18" rx="4" fill="#ffffff" opacity="0.6"/>
      <path d="M40 52h40" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  'SKU-003': `
    <svg class="product-svg" viewBox="0 0 120 120" role="img" aria-label="Headphones illustration">
      <path d="M26 66a34 34 0 0 1 68 0" fill="none" stroke="currentColor" stroke-width="9"
            stroke-linecap="round" opacity="0.92"/>
      <rect x="16" y="60" width="22" height="38" rx="10" fill="currentColor"/>
      <rect x="82" y="60" width="22" height="38" rx="10" fill="currentColor"/>
      <rect x="22" y="68" width="6" height="22" rx="3" fill="#ffffff" opacity="0.4"/>
      <rect x="92" y="68" width="6" height="22" rx="3" fill="#ffffff" opacity="0.4"/>
    </svg>`,
};

export const CART_ICON = `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="9" cy="20" r="1.4"/>
    <circle cx="18" cy="20" r="1.4"/>
    <path d="M2 3h2.2l2.3 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H5.4"/>
  </svg>`;

export const MENU_ICON = `
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16"/>
  </svg>`;

export const CHECK_ICON = `
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5"/>
  </svg>`;
