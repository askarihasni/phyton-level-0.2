/**
 * utils.js
 * ---------------------------------------------------------------------------
 * Small, dependency-free helper functions that are shared by the "model"
 * layer (Product / DiscountedProduct / ShoppingCart) and the "view" layer
 * (app.js). Keeping them in one place means money is always rounded and
 * formatted in exactly the same way, no matter where it is displayed.
 *
 * These functions are pure: they take data and return data. No state, no DOM.
 */

/**
 * Round a number to at most 2 decimal places.
 * Money is never stored with floating point noise such as 7999.999999.
 *
 * @param {number} value
 * @returns {number}
 */
export function roundTo2(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

/**
 * Format an amount as Pakistani Rupees.
 * Example: formatPKR(8000) === 'Rs. 8,000'
 *
 * @param {number} amount
 * @returns {string}
 */
export function formatPKR(amount) {
  return `Rs. ${numberFormatter.format(roundTo2(amount))}`;
}

/**
 * Format a date as '21 Oct 2026, 14:33'
 *
 * @param {Date} [date]
 * @returns {string}
 */
export function formatDateTime(date = new Date()) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Create a human friendly order / receipt number.
 * Example: 'SC-20261021-4821'
 *
 * @param {Date} [date]
 * @returns {string}
 */
export function generateOrderNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9000) + 1000);
  return `SC-${year}${month}${day}-${random}`;
}

/**
 * Escape a string so it can safely be injected into HTML.
 * Protects the page from broken markup and from injected script tags.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate the customer details collected by the checkout form.
 * Returns an object of { fieldName: message } — an empty object means valid.
 *
 * @param {{name?: string, email?: string, phone?: string, address?: string, city?: string}} customer
 * @returns {Record<string, string>}
 */
export function validateCustomer(customer = {}) {
  const errors = {};

  const name = String(customer.name ?? '').trim();
  if (!name) {
    errors.name = 'Customer name is required.';
  } else if (name.length < 3) {
    errors.name = 'Please enter your full name (at least 3 characters).';
  }

  const email = String(customer.email ?? '').trim();
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  const phone = String(customer.phone ?? '').trim();
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    errors.phone = 'Please enter a valid phone number (digits only, 7-20 characters).';
  }

  return errors;
}
