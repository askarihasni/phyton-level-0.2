/**
 * catalog.js
 * ---------------------------------------------------------------------------
 * The demo catalogue. Every call to `createCatalog()` returns BRAND NEW
 * product objects, so the simulation can play with the products without
 * touching the ones that are live in the web page.
 *
 * The products required by the assignment:
 *   1. Laptop      — Rs. 100,000, stock 5
 *   2. Mouse       — Rs. 2,000,   stock 10
 *   3. Headphones  — Rs. 5,000,   stock 8, 20% discount
 */

import { Product } from './Product.js';
import { DiscountedProduct } from './DiscountedProduct.js';

export const LAPTOP_ID = 'SKU-001';
export const MOUSE_ID = 'SKU-002';
export const HEADPHONES_ID = 'SKU-003';

/**
 * Extra information used ONLY by the user interface (descriptions, colours).
 * The model classes stay exactly as the assignment describes them.
 */
export const PRODUCT_DETAILS = {
  [LAPTOP_ID]: {
    tagline: '14" ultrabook · 16 GB RAM · 512 GB SSD',
    description:
      'A lightweight aluminium laptop with a vivid 14-inch display, all-day battery life and a quiet backlit keyboard. Built for work, study and everything in between.',
    accent: 'blue',
    category: 'Computing',
    highlights: ['16 GB RAM', '512 GB SSD', '14" display'],
  },
  [MOUSE_ID]: {
    tagline: 'Silent wireless mouse · USB-C charging',
    description:
      'An ergonomic wireless mouse with silent switches, precise tracking and a rechargeable battery that lasts up to 70 days on a single charge.',
    accent: 'violet',
    category: 'Accessories',
    highlights: ['Silent clicks', 'USB-C charging', '1600 DPI'],
  },
  [HEADPHONES_ID]: {
    tagline: 'Over-ear studio headphones · Active noise cancelling',
    description:
      'Immersive over-ear headphones with active noise cancelling, balanced studio sound and soft memory-foam ear cushions for long listening sessions.',
    accent: 'teal',
    category: 'Audio',
    highlights: ['ANC', '40 h battery', 'Memory foam'],
  },
};

/**
 * Build a fresh set of product objects.
 *
 * @returns {Product[]}
 */
export function createCatalog() {
  return [
    new Product({
      id: LAPTOP_ID,
      name: 'Laptop',
      price: 100000,
      stockQuantity: 5,
    }),
    new Product({
      id: MOUSE_ID,
      name: 'Mouse',
      price: 2000,
      stockQuantity: 10,
    }),
    new DiscountedProduct({
      id: HEADPHONES_ID,
      name: 'Headphones',
      price: 5000,
      stockQuantity: 8,
      discountPercentage: 20,
    }),
  ];
}
