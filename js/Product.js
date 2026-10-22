/**
 * Product.js
 * ---------------------------------------------------------------------------
 * The BASE class of the store. Every item that can be sold is a Product.
 *
 * OOP CONCEPTS DEMONSTRATED HERE
 * -----------------------------
 * 1. ENCAPSULATION
 *    The stock number lives in a real private field (`#stockQuantity`) that
 *    lives inside the object. Outside code can *read* it through the
 *    `stockQuantity` getter, but it cannot *write* it directly, and it
 *    cannot bypass the safety rules of `reduceStock()` / `restoreStock()`.
 *    That is why the stock can never become negative.
 *
 * 2. INFORMATION HIDING
 *    The same is true for `id`, `name` and `price`: they are read-only.
 *
 * 3. MESSAGE PASSING (object interaction)
 *    Other objects (for example the ShoppingCart) do not poke at the
 *    internals of a product. They ASK the product to do the work through
 *    its public methods: checkStock(), reduceStock(), restoreStock(),
 *    getFinalPrice().
 */

/** @typedef {import('./utils.js')} Utils */

export class Product {
  /** @type {string} */ #id;
  /** @type {string} */ #name;
  /** @type {number} */ #price;
  /** @type {number} */ #stockQuantity;

  /**
   * @param {{id: string, name: string, price: number, stockQuantity: number}} details
   */
  constructor({ id, name, price, stockQuantity }) {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new TypeError('Product: "id" must be a non-empty string.');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Product: "name" must be a non-empty string.');
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      throw new TypeError('Product: "price" must be a finite number greater than or equal to 0.');
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new TypeError('Product: "stockQuantity" must be a whole number greater than or equal to 0.');
    }

    this.#id = id.trim();
    this.#name = name.trim();
    this.#price = price;
    this.#stockQuantity = stockQuantity;
  }

  /* ------------------------------------------------------------------ */
  /* Read-only accessors (encapsulation)                                */
  /* ------------------------------------------------------------------ */

  /** @returns {string} */
  get id() {
    return this.#id;
  }

  /** @returns {string} */
  get name() {
    return this.#name;
  }

  /** The regular (list) price of the product. */
  /** @returns {number} */
  get price() {
    return this.#price;
  }

  /** How many units are still available. Read-only on purpose. */
  /** @returns {number} */
  get stockQuantity() {
    return this.#stockQuantity;
  }

  /* ------------------------------------------------------------------ */
  /* Behaviour                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Is the requested amount currently available?
   * Returns true only for a whole, non-negative number that fits in stock.
   *
   * @param {number} amount
   * @returns {boolean}
   */
  checkStock(amount) {
    if (!Number.isInteger(amount) || amount < 0) return false;
    return amount <= this.#stockQuantity;
  }

  /**
   * Remove `amount` units from the stock.
   * - Invalid amounts (not a positive whole number) are rejected with a TypeError.
   * - The stock can NEVER become negative: if there is not enough stock the
   *   method returns false and leaves the stock untouched.
   *
   * @param {number} amount
   * @returns {boolean} true when the stock was reduced.
   */
  reduceStock(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new TypeError('reduceStock(amount): amount must be a positive whole number.');
    }
    if (amount > this.#stockQuantity) {
      return false; // Not enough stock -> nothing changes, no negative values.
    }
    this.#stockQuantity -= amount;
    return true;
  }

  /**
   * Give `amount` units back to the stock.
   * Used by the cart when an item is removed or the cart is cleared.
   *
   * @param {number} amount
   * @returns {boolean}
   */
  restoreStock(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new TypeError('restoreStock(amount): amount must be a positive whole number.');
    }
    this.#stockQuantity += amount;
    return true;
  }

  /**
   * The price a single unit is sold for.
   * A regular product sells at its normal price. A DiscountedProduct
   * OVERRIDES this method to return the discounted price (polymorphism).
   *
   * @returns {number}
   */
  getFinalPrice() {
    return this.#price;
  }

  /**
   * Discount percentage of this product (0 for a regular product).
   * The base class provides the default so that the UI can treat every
   * product in the same way.
   *
   * @returns {number}
   */
  getDiscountPercentage() {
    return 0;
  }

  /**
   * How much is saved on ONE unit compared to the list price.
   *
   * @returns {number}
   */
  getUnitDiscount() {
    return 0;
  }

  /** @returns {string} */
  toString() {
    return `${this.#name} (${this.#id})`;
  }
}

export default Product;
