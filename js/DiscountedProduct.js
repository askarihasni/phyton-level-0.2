/**
 * DiscountedProduct.js
 * ---------------------------------------------------------------------------
 * A product that is sold with a percentage discount.
 *
 * OOP CONCEPTS DEMONSTRATED HERE
 * -----------------------------
 * 1. INHERITANCE
 *    `DiscountedProduct extends Product`, so it automatically re-uses every
 *    bit of behaviour of a normal product (id, name, price, stock, the
 *    stock protection...). We do not copy/paste any of it.
 *
 * 2. METHOD OVERRIDING + POLYMORPHISM
 *    `getFinalPrice()` is OVERRIDDEN here. The cart can therefore treat a
 *    regular product and a discounted product in exactly the same way:
 *        cart line total = product.getFinalPrice() * quantity
 *    and get the right answer for both. That is polymorphism.
 *
 * 3. `super.getFinalPrice()` lets the subclass reuse the parent's logic
 *    (the original list price) before changing it.
 */

import { Product } from './Product.js';
import { roundTo2 } from './utils.js';

export class DiscountedProduct extends Product {
  /** @type {number} */ #discountPercentage;

  /**
   * @param {{id: string, name: string, price: number, stockQuantity: number, discountPercentage: number}} details
   */
  constructor({ id, name, price, stockQuantity, discountPercentage }) {
    // `super()` must be called first: it sets up the private fields of Product.
    super({ id, name, price, stockQuantity });

    // The discount is validated and then stored in a PRIVATE field of the
    // subclass, so it also cannot be changed from outside by accident.
    this.#discountPercentage = DiscountedProduct.#validateDiscount(discountPercentage);
  }

  /**
   * A discount must be a number between 0 and 100 (inclusive).
   *
   * @param {number} discountPercentage
   * @returns {number}
   */
  static #validateDiscount(discountPercentage) {
    if (typeof discountPercentage !== 'number' || !Number.isFinite(discountPercentage)) {
      throw new TypeError('DiscountedProduct: "discountPercentage" must be a finite number.');
    }
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new RangeError('DiscountedProduct: "discountPercentage" must be between 0 and 100.');
    }
    return discountPercentage;
  }

  /** @returns {number} */
  get discountPercentage() {
    return this.#discountPercentage;
  }

  /**
   * OVERRIDDEN METHOD.
   * The price of one unit after the discount is applied.
   * The ORIGINAL price stays exactly the same (`this.price` is untouched).
   *
   * Example: Rs. 10,000 with 20% off -> Rs. 8,000
   *
   * @returns {number}
   */
  getFinalPrice() {
    const originalPrice = super.getFinalPrice(); // the regular price
    const discounted = originalPrice * (1 - this.#discountPercentage / 100);
    return roundTo2(discounted);
  }

  /**
   * OVERRIDDEN METHOD — the discount of this product in percent.
   *
   * @returns {number}
   */
  getDiscountPercentage() {
    return this.#discountPercentage;
  }

  /**
   * OVERRIDDEN METHOD — how much one unit saves.
   *
   * @returns {number}
   */
  getUnitDiscount() {
    return roundTo2(this.price - this.getFinalPrice());
  }
}

export default DiscountedProduct;
