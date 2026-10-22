/**
 * Store.js
 * ---------------------------------------------------------------------------
 * The "application state" layer. It sits between the business classes
 * (Product / DiscountedProduct / ShoppingCart) and the user interface.
 *
 * WHY DOES IT EXIST?
 *  - It owns ONE ShoppingCart and ONE catalogue, so the whole page always
 *    reads from the same source of truth (no duplicated state that can drift).
 *  - It exposes plain actions (addToCart, checkout, ...) and tells the UI
 *    whenever something changed, so the screen can never go out of sync with
 *    the data.
 *  - It contains NO DOM code, which means it can be unit tested in Node.
 */

import { ShoppingCart } from './ShoppingCart.js';
import { generateOrderNumber, validateCustomer } from './utils.js';

export class Store {
  /** @type {Product[]} */
  #products = [];
  /** @type {() => Product[]} */
  #factory;
  /** @type {Set<Function>} */
  #listeners = new Set();

  /**
   * @param {() => Product[]} createProducts factory that returns fresh products
   */
  constructor(createProducts) {
    this.#factory = createProducts;
    this.#products = createProducts();
    this.cart = new ShoppingCart();
    this.lastOrder = null;
  }

  /* ------------------------------------------------------------------ */
  /* Change notification                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Register a listener that is called after every state change.
   * @param {(store: Store) => void} listener
   * @returns {() => void} unsubscribe function
   */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** @private */
  #notify() {
    for (const listener of this.#listeners) listener(this);
  }

  /* ------------------------------------------------------------------ */
  /* Reads                                                               */
  /* ------------------------------------------------------------------ */

  /** @returns {Product[]} a copy of the catalogue list */
  get products() {
    return [...this.#products];
  }

  /**
   * @param {string} productId
   * @returns {Product | null}
   */
  getProduct(productId) {
    return this.#products.find((product) => product.id === productId) ?? null;
  }

  /* ------------------------------------------------------------------ */
  /* Actions (the only way the UI may change the data)                  */
  /* ------------------------------------------------------------------ */

  /**
   * @param {string} productId
   * @param {number} quantity
   * @returns {{success: boolean, code: string, message: string}}
   */
  addToCart(productId, quantity) {
    const product = this.getProduct(productId);
    if (!product) {
      return { success: false, code: 'NOT_FOUND', message: 'Product not found.' };
    }
    const result = this.cart.addItem(product, quantity);
    if (result.success) this.#notify();
    return result;
  }

  /**
   * @param {string} productId
   * @param {number} newQuantity
   */
  updateQuantity(productId, newQuantity) {
    const result = this.cart.updateQuantity(productId, newQuantity);
    if (result.success) this.#notify();
    return result;
  }

  /**
   * @param {string} productId
   */
  removeFromCart(productId) {
    const result = this.cart.removeItem(productId);
    if (result.success) this.#notify();
    return result;
  }

  /** Empty the cart and return the items to the stock. */
  clearCart() {
    const result = this.cart.clearCart();
    if (result.success) this.#notify();
    return result;
  }

  /**
   * Place the order.
   * - an empty cart is rejected,
   * - invalid customer details are rejected field by field,
   * - a successful order empties the cart WITHOUT returning the stock
   *   (the items were really sold) and returns the receipt data.
   *
   * @param {{name?: string, email?: string, phone?: string, address?: string, city?: string, paymentMethod?: string}} customer
   */
  checkout(customer = {}) {
    if (this.cart.isEmpty) {
      return {
        success: false,
        code: 'EMPTY_CART',
        message: 'Your cart is empty. Add a product before checking out.',
        fieldErrors: {},
      };
    }

    const fieldErrors = validateCustomer(customer);
    if (Object.keys(fieldErrors).length > 0) {
      return {
        success: false,
        code: 'INVALID_CUSTOMER',
        message: 'Please correct the highlighted fields.',
        fieldErrors,
      };
    }

    const receipt = this.cart.finalizeOrder();
    const order = {
      orderNumber: generateOrderNumber(),
      placedAt: new Date(),
      customer: { ...customer },
      ...receipt,
    };

    this.lastOrder = order;
    this.#notify();
    return {
      success: true,
      code: 'OK',
      message: `Order ${order.orderNumber} placed successfully.`,
      order,
    };
  }

  /**
   * Put the demo back to its starting state (fresh products, empty cart).
   */
  reset() {
    this.#products = this.#factory();
    this.cart = new ShoppingCart();
    this.lastOrder = null;
    this.#notify();
  }
}

export default Store;
