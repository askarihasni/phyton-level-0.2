/**
 * ShoppingCart.js
 * ---------------------------------------------------------------------------
 * Holds the products a customer wants to buy.
 *
 * OOP CONCEPTS DEMONSTRATED HERE
 * -----------------------------
 * 1. COMPOSITION ("has-a")
 *    A cart item is made of a PRODUCT OBJECT and a quantity. The cart does
 *    NOT copy the product — it keeps a REFERENCE to the very same object that
 *    is displayed in the catalogue. That is why the "live stock" numbers on
 *    the product cards change the moment something is added to the cart.
 *
 * 2. OBJECT INTERACTION / MESSAGE PASSING
 *    The cart never touches the private stock of a product. It asks the
 *    product to do the work: product.checkStock(...), product.reduceStock(...),
 *    product.restoreStock(...), product.getFinalPrice().
 *
 * 3. POLYMORPHISM
 *    `calculateTotal()` calls `getFinalPrice()` on every item. Regular
 *    products return their normal price, discounted products return the
 *    reduced price. The cart does not need to know which is which.
 *
 * 4. ENCAPSULATION
 *    The internal list of cart items is private. The public `cartItems`
 *    getter hands out a COPY, so nobody can corrupt the cart from outside.
 */

import { Product } from './Product.js';
import { formatPKR, roundTo2 } from './utils.js';

export class ShoppingCart {
  /** @type {Array<{product: Product, quantity: number}>} */
  #cartItems = [];

  /**
   * A safe copy of the cart contents.
   * The array and the small `{product, quantity}` wrappers are copies, but
   * the `product` values are the ORIGINAL product objects.
   *
   * @returns {Array<{product: Product, quantity: number}>}
   */
  get cartItems() {
    return this.#cartItems.map((item) => ({ product: item.product, quantity: item.quantity }));
  }

  /** @returns {boolean} true when there is nothing in the cart. */
  get isEmpty() {
    return this.#cartItems.length === 0;
  }

  /** @returns {number} How many different products are in the cart. */
  get lineCount() {
    return this.#cartItems.length;
  }

  /** @returns {number} How many individual units are in the cart. */
  get itemCount() {
    return this.#cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Find the cart row of a product (by its id).
   * @param {string} productId
   * @returns {{product: Product, quantity: number} | null}
   */
  #findItem(productId) {
    return this.#cartItems.find((item) => item.product.id === productId) ?? null;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Add a product to the cart.
   *
   * Rules:
   *  - the quantity must be a positive whole number,
   *  - the product must have enough stock,
   *  - adding a product that is already in the cart UPDATES that row
   *    instead of creating a duplicate,
   *  - a rejected operation changes NOTHING (no stock, no cart).
   *
   * @param {Product} product
   * @param {number} quantity
   * @returns {{success: boolean, code: string, message: string}}
   */
  addItem(product, quantity) {
    if (!(product instanceof Product)) {
      return {
        success: false,
        code: 'INVALID_PRODUCT',
        message: 'Invalid product! Only Product objects can be added to the cart.',
      };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        success: false,
        code: 'INVALID_QUANTITY',
        message: 'Invalid quantity! Please choose a whole number of 1 or more.',
      };
    }

    // 1) Ask the product whether it has enough stock.
    if (!product.checkStock(quantity)) {
      return { success: false, code: 'OUT_OF_STOCK', message: 'Out of stock!' };
    }

    // 2) Take the items out of the stock (the product protects itself).
    if (!product.reduceStock(quantity)) {
      return { success: false, code: 'OUT_OF_STOCK', message: 'Out of stock!' };
    }

    // 3) Store the product OBJECT (composition) with its quantity.
    const existing = this.#findItem(product.id);
    if (existing) {
      existing.quantity += quantity; // update the existing row, no duplicates
    } else {
      this.#cartItems.push({ product, quantity });
    }

    return {
      success: true,
      code: 'OK',
      message: `${product.name} added to cart.`,
    };
  }

  /**
   * The grand total of the cart.
   * Works for regular AND discounted products because of polymorphism.
   *
   * @returns {number}
   */
  calculateTotal() {
    const total = this.#cartItems.reduce(
      (sum, item) => sum + item.product.getFinalPrice() * item.quantity,
      0,
    );
    return roundTo2(total);
  }

  /**
   * Total of the cart if every product was sold at its ORIGINAL price.
   * Used to show the customer how much they save.
   *
   * @returns {number}
   */
  getSubtotal() {
    const subtotal = this.#cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    return roundTo2(subtotal);
  }

  /**
   * How much the customer saves in total (subtotal - grand total).
   *
   * @returns {number}
   */
  getTotalSavings() {
    return roundTo2(this.getSubtotal() - this.calculateTotal());
  }

  /**
   * A plain-data snapshot of the cart, used to draw the receipt.
   *
   * @returns {{
   *   items: Array<{id: string, name: string, unitPrice: number, finalUnitPrice: number,
   *                  discountPercentage: number, discountAmount: number,
   *                  quantity: number, lineTotal: number}>,
   *   subtotal: number, discounts: number, total: number,
   *   itemCount: number, lineCount: number
   * }}
   */
  getReceiptData() {
    const items = this.#cartItems.map(({ product, quantity }) => {
      const unitPrice = product.price;
      const finalUnitPrice = product.getFinalPrice();
      return {
        id: product.id,
        name: product.name,
        unitPrice,
        finalUnitPrice,
        discountPercentage: product.getDiscountPercentage(),
        discountAmount: roundTo2(unitPrice - finalUnitPrice),
        quantity,
        lineTotal: roundTo2(finalUnitPrice * quantity),
      };
    });

    const subtotal = roundTo2(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0));
    const total = roundTo2(items.reduce((sum, i) => sum + i.lineTotal, 0));

    return {
      items,
      subtotal,
      discounts: roundTo2(subtotal - total),
      total,
      itemCount: this.itemCount,
      lineCount: this.lineCount,
    };
  }

  /**
   * Build a printable receipt (plain text) for the current cart.
   *
   * @param {{receiptNumber?: string, date?: Date, customer?: object}} [meta]
   * @returns {string}
   */
  printReceipt(meta = {}) {
    const data = this.getReceiptData();
    const receiptNumber = meta.receiptNumber ?? 'SIMULATION';
    const date = meta.date ?? new Date();
    const customer = meta.customer ?? null;

    const line = '-'.repeat(66);
    const rows = [];

    rows.push(line);
    rows.push('                        SmartCart  -  RECEIPT');
    rows.push(line);
    rows.push(`Receipt No. : ${receiptNumber}`);
    rows.push(`Date        : ${date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`);
    if (customer?.name) rows.push(`Customer    : ${customer.name}`);
    if (customer?.email) rows.push(`Email       : ${customer.email}`);
    rows.push(line);
    rows.push(
      pad('ITEM', 26) + padStart('UNIT PRICE', 14) + padStart('QTY', 6) + padStart('LINE TOTAL', 14),
    );
    rows.push(line);

    if (data.items.length === 0) {
      rows.push('(the cart is empty)');
    }

    for (const item of data.items) {
      rows.push(
        pad(`${item.name}`, 20) +
          pad(`[${item.id}]`, 8) +
          padStart(formatPKR(item.finalUnitPrice), 14) +
          padStart(String(item.quantity), 6) +
          padStart(formatPKR(item.lineTotal), 14),
      );
      if (item.discountPercentage > 0) {
        rows.push(
          pad(`   ${item.discountPercentage}% discount applied (${formatPKR(item.discountAmount)} off each)`, 62),
        );
      }
    }

    rows.push(line);
    rows.push(pad('Subtotal', 40) + padStart(formatPKR(data.subtotal), 14));
    rows.push(pad('Discounts saved', 40) + padStart(`- ${formatPKR(data.discounts)}`, 14));
    rows.push(line);
    rows.push(pad('GRAND TOTAL', 40) + padStart(formatPKR(data.total), 14));
    rows.push(line);
    rows.push('            Thank you for shopping with SmartCart!');
    rows.push(line);

    return rows.join('\n');
  }

  /**
   * BONUS: remove a product from the cart and give the stock back.
   *
   * @param {string} productId
   * @returns {{success: boolean, code: string, message: string}}
   */
  removeItem(productId) {
    const index = this.#cartItems.findIndex((item) => item.product.id === productId);
    if (index === -1) {
      return { success: false, code: 'NOT_FOUND', message: 'Item not found in the cart.' };
    }

    const [removed] = this.#cartItems.splice(index, 1);
    removed.product.restoreStock(removed.quantity); // the stock comes back

    return {
      success: true,
      code: 'OK',
      message: `${removed.product.name} removed from the cart.`,
    };
  }

  /**
   * BONUS: change the quantity of a product that is already in the cart.
   * Increasing takes more stock, decreasing gives stock back, and a quantity
   * of 0 removes the row completely.
   *
   * @param {string} productId
   * @param {number} newQuantity
   * @returns {{success: boolean, code: string, message: string}}
   */
  updateQuantity(productId, newQuantity) {
    const item = this.#findItem(productId);
    if (!item) {
      return { success: false, code: 'NOT_FOUND', message: 'Item not found in the cart.' };
    }

    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      return {
        success: false,
        code: 'INVALID_QUANTITY',
        message: 'Invalid quantity! Please use 0 or a positive whole number.',
      };
    }

    const current = item.quantity;
    if (newQuantity === current) {
      return { success: true, code: 'OK', message: 'Quantity unchanged.' };
    }

    if (newQuantity > current) {
      // More items than before -> we need extra stock.
      const extra = newQuantity - current;
      if (!item.product.checkStock(extra)) {
        return { success: false, code: 'OUT_OF_STOCK', message: 'Out of stock!' };
      }
      if (!item.product.reduceStock(extra)) {
        return { success: false, code: 'OUT_OF_STOCK', message: 'Out of stock!' };
      }
      item.quantity = newQuantity;
      return { success: true, code: 'OK', message: `Quantity updated to ${newQuantity}.` };
    }

    // Fewer items than before -> the difference goes back to the stock.
    const returned = current - newQuantity;
    item.product.restoreStock(returned);

    if (newQuantity === 0) {
      this.#cartItems.splice(this.#cartItems.indexOf(item), 1);
      return {
        success: true,
        code: 'OK',
        message: `${item.product.name} removed from the cart.`,
      };
    }

    item.quantity = newQuantity;
    return { success: true, code: 'OK', message: `Quantity updated to ${newQuantity}.` };
  }

  /**
   * BONUS: empty the cart and return every item to the stock.
   *
   * @returns {{success: boolean, code: string, message: string}}
   */
  clearCart() {
    for (const item of this.#cartItems) {
      item.product.restoreStock(item.quantity);
    }
    this.#cartItems = [];
    return {
      success: true,
      code: 'OK',
      message: 'Cart cleared. Every item was returned to the stock.',
    };
  }

  /**
   * Empty the cart WITHOUT returning the stock.
   *
   * This is what happens after a successful checkout: the items were really
   * sold, so the stock must stay reduced. `clearCart()` (the "I changed my
   * mind" button) does the opposite — it puts the items back on the shelf.
   *
   * @returns {ReturnType<ShoppingCart['getReceiptData']>}
   */
  finalizeOrder() {
    const receipt = this.getReceiptData();
    this.#cartItems = []; // stock is deliberately NOT restored here
    return receipt;
  }
}

/* --- tiny text helpers for the printed receipt --- */
function pad(text, length) {
  return String(text).padEnd(length, ' ');
}
function padStart(text, length) {
  return String(text).padStart(length, ' ');
}

export default ShoppingCart;
