/**
 * tests/cart.test.js
 * ---------------------------------------------------------------------------
 * Unit tests for the ShoppingCart: add / update / remove / totals / receipt.
 * These are the exact behaviours the assignment asks for.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ShoppingCart } from '../js/ShoppingCart.js';
import { Product } from '../js/Product.js';
import { DiscountedProduct } from '../js/DiscountedProduct.js';
import { createCatalog, LAPTOP_ID, MOUSE_ID, HEADPHONES_ID } from '../js/catalog.js';

/** Fresh products for every test so the tests cannot affect each other. */
function setup() {
  const [laptop, mouse, headphones] = createCatalog();
  return { laptop, mouse, headphones, cart: new ShoppingCart() };
}

test('addItem reduces the stock and creates one cart line', () => {
  const { laptop, cart } = setup();

  const result = cart.addItem(laptop, 3);

  assert.equal(result.success, true);
  assert.equal(result.code, 'OK');
  assert.equal(laptop.stockQuantity, 2);
  assert.equal(cart.lineCount, 1);
  assert.equal(cart.itemCount, 3);
});

test('addItem rejects an insufficient quantity with the exact message "Out of stock!"', () => {
  const { laptop, cart } = setup();
  cart.addItem(laptop, 3);

  const result = cart.addItem(laptop, 6);

  assert.equal(result.success, false);
  assert.equal(result.code, 'OUT_OF_STOCK');
  assert.equal(result.message, 'Out of stock!');
  assert.equal(laptop.stockQuantity, 2, 'stock must not change after a failed add');
  assert.equal(cart.itemCount, 3, 'cart must not change after a failed add');
  assert.equal(cart.lineCount, 1);
});

test('adding the same product twice updates the existing row (no duplicates)', () => {
  const { mouse, cart } = setup();

  cart.addItem(mouse, 1);
  const second = cart.addItem(mouse, 2);

  assert.equal(second.success, true);
  assert.equal(cart.lineCount, 1);
  assert.equal(cart.itemCount, 3);
  assert.equal(cart.cartItems[0].quantity, 3);
  assert.equal(mouse.stockQuantity, 7);
});

test('addItem rejects invalid quantities without changing anything', () => {
  const { mouse, cart } = setup();

  for (const quantity of [0, -1, 1.5, '2', NaN]) {
    const result = cart.addItem(mouse, quantity);
    assert.equal(result.success, false);
    assert.equal(result.code, 'INVALID_QUANTITY');
  }

  assert.equal(mouse.stockQuantity, 10);
  assert.equal(cart.isEmpty, true);
});

test('addItem rejects objects that are not Product instances', () => {
  const { cart } = setup();

  const result = cart.addItem({ id: 'X', name: 'Fake', price: 1, stockQuantity: 1 }, 1);

  assert.equal(result.success, false);
  assert.equal(result.code, 'INVALID_PRODUCT');
  assert.equal(cart.isEmpty, true);
});

test('a zero-stock product cannot be added', () => {
  const empty = new Product({ id: 'SKU-999', name: 'Sold out', price: 100, stockQuantity: 0 });
  const cart = new ShoppingCart();

  const result = cart.addItem(empty, 1);

  assert.equal(result.success, false);
  assert.equal(result.message, 'Out of stock!');
  assert.equal(empty.stockQuantity, 0);
});

test('the required simulation totals: Rs. 306,000', () => {
  const { laptop, mouse, headphones, cart } = setup();

  assert.equal(cart.addItem(laptop, 3).success, true);
  assert.equal(cart.addItem(laptop, 6).success, false);
  assert.equal(cart.addItem(headphones, 1).success, true);
  assert.equal(cart.addItem(mouse, 1).success, true);

  assert.equal(cart.calculateTotal(), 306000);
  assert.equal(cart.getSubtotal(), 307000);
  assert.equal(cart.getTotalSavings(), 1000);
  assert.equal(cart.itemCount, 5);
  assert.equal(cart.lineCount, 3);

  assert.equal(laptop.stockQuantity, 2);
  assert.equal(mouse.stockQuantity, 9);
  assert.equal(headphones.stockQuantity, 7);
});

test('calculateTotal uses getFinalPrice() for discounted products (polymorphism)', () => {
  const headphones = new DiscountedProduct({
    id: 'SKU-003',
    name: 'Headphones',
    price: 5000,
    stockQuantity: 8,
    discountPercentage: 20,
  });
  const cart = new ShoppingCart();

  cart.addItem(headphones, 3);

  assert.equal(cart.calculateTotal(), 12000); // 3 x Rs. 4,000
  assert.equal(cart.getSubtotal(), 15000); // 3 x Rs. 5,000
  assert.equal(cart.getTotalSavings(), 3000);
});

test('removeItem restores the stock exactly once', () => {
  const { laptop, cart } = setup();
  cart.addItem(laptop, 3);

  const first = cart.removeItem(LAPTOP_ID);
  assert.equal(first.success, true);
  assert.equal(laptop.stockQuantity, 5);
  assert.equal(cart.isEmpty, true);

  const second = cart.removeItem(LAPTOP_ID);
  assert.equal(second.success, false);
  assert.equal(second.code, 'NOT_FOUND');
  assert.equal(laptop.stockQuantity, 5, 'a failed remove must not restore stock again');
});

test('removeItem from an empty cart is rejected', () => {
  const { cart } = setup();
  const result = cart.removeItem(LAPTOP_ID);

  assert.equal(result.success, false);
  assert.equal(result.code, 'NOT_FOUND');
});

test('updateQuantity increases the quantity and takes more stock', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 1);

  const result = cart.updateQuantity(MOUSE_ID, 4);

  assert.equal(result.success, true);
  assert.equal(cart.cartItems[0].quantity, 4);
  assert.equal(mouse.stockQuantity, 6);
});

test('updateQuantity cannot exceed the available stock', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 2);

  const result = cart.updateQuantity(MOUSE_ID, 11);

  assert.equal(result.success, false);
  assert.equal(result.code, 'OUT_OF_STOCK');
  assert.equal(result.message, 'Out of stock!');
  assert.equal(cart.cartItems[0].quantity, 2);
  assert.equal(mouse.stockQuantity, 8);
});

test('updateQuantity decreases the quantity and gives stock back', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 5);

  const result = cart.updateQuantity(MOUSE_ID, 2);

  assert.equal(result.success, true);
  assert.equal(cart.cartItems[0].quantity, 2);
  assert.equal(mouse.stockQuantity, 8);
});

test('updateQuantity(0) removes the row and restores all of its stock', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 5);

  const result = cart.updateQuantity(MOUSE_ID, 0);

  assert.equal(result.success, true);
  assert.equal(cart.isEmpty, true);
  assert.equal(mouse.stockQuantity, 10);
});

test('updateQuantity rejects invalid values and unknown products', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 2);

  assert.equal(cart.updateQuantity(MOUSE_ID, 1.5).code, 'INVALID_QUANTITY');
  assert.equal(cart.updateQuantity(MOUSE_ID, -1).code, 'INVALID_QUANTITY');
  assert.equal(cart.updateQuantity('NOPE', 2).code, 'NOT_FOUND');
  assert.equal(cart.cartItems[0].quantity, 2);
  assert.equal(mouse.stockQuantity, 8);
});

test('clearCart empties the cart and returns every item to stock', () => {
  const { laptop, mouse, headphones, cart } = setup();
  cart.addItem(laptop, 2);
  cart.addItem(mouse, 3);
  cart.addItem(headphones, 1);

  const result = cart.clearCart();

  assert.equal(result.success, true);
  assert.equal(cart.isEmpty, true);
  assert.equal(laptop.stockQuantity, 5);
  assert.equal(mouse.stockQuantity, 10);
  assert.equal(headphones.stockQuantity, 8);
});

test('finalizeOrder empties the cart but keeps the stock reduced (sold items)', () => {
  const { laptop, cart } = setup();
  cart.addItem(laptop, 3);

  const receipt = cart.finalizeOrder();

  assert.equal(cart.isEmpty, true);
  assert.equal(receipt.total, 300000);
  assert.equal(receipt.items[0].quantity, 3);
  assert.equal(laptop.stockQuantity, 2, 'sold stock must not be returned to the shelf');
});

test('getReceiptData reports unit prices, discounts and line totals', () => {
  const { laptop, mouse, headphones, cart } = setup();
  cart.addItem(laptop, 3);
  cart.addItem(headphones, 1);
  cart.addItem(mouse, 1);

  const data = cart.getReceiptData();
  const headphoneLine = data.items.find((item) => item.id === HEADPHONES_ID);

  assert.equal(headphoneLine.unitPrice, 5000);
  assert.equal(headphoneLine.finalUnitPrice, 4000);
  assert.equal(headphoneLine.discountPercentage, 20);
  assert.equal(headphoneLine.discountAmount, 1000);
  assert.equal(headphoneLine.lineTotal, 4000);

  assert.equal(data.subtotal, 307000);
  assert.equal(data.discounts, 1000);
  assert.equal(data.total, 306000);
  assert.equal(data.itemCount, 5);
  assert.equal(data.lineCount, 3);
});

test('printReceipt produces a readable text receipt', () => {
  const { laptop, mouse, headphones, cart } = setup();
  cart.addItem(laptop, 3);
  cart.addItem(headphones, 1);
  cart.addItem(mouse, 1);

  const text = cart.printReceipt({ receiptNumber: 'TEST-001', date: new Date('2026-10-21T10:30:00') });

  assert.match(text, /SmartCart/);
  assert.match(text, /TEST-001/);
  assert.match(text, /Laptop/);
  assert.match(text, /20% discount applied/);
  assert.match(text, /Rs\. 306,000/);
  assert.match(text, /GRAND TOTAL/);
});

test('the cartItems getter hands out copies, not the internal array', () => {
  const { mouse, cart } = setup();
  cart.addItem(mouse, 2);

  const snapshot = cart.cartItems;
  snapshot.push({ product: mouse, quantity: 99 });
  snapshot[0].quantity = 50;

  assert.equal(cart.lineCount, 1);
  assert.equal(cart.itemCount, 2);
});
