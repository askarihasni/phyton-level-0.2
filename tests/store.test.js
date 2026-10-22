/**
 * tests/store.test.js
 * ---------------------------------------------------------------------------
 * Unit tests for the Store (application state) layer and for the checkout
 * validation rules. The Store contains no DOM code, so it runs in Node.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Store } from '../js/Store.js';
import { createCatalog, LAPTOP_ID, MOUSE_ID } from '../js/catalog.js';
import { validateCustomer, formatPKR, roundTo2, escapeHtml } from '../js/utils.js';

function setup() {
  const store = new Store(createCatalog);
  return { store };
}

const VALID_CUSTOMER = {
  name: 'Ayesha Khan',
  email: 'ayesha@example.com',
  phone: '0300 1234567',
  address: 'House 12, Street 4',
  city: 'Lahore',
  paymentMethod: 'cod',
};

test('Store starts with the three demo products and an empty cart', () => {
  const { store } = setup();

  assert.equal(store.products.length, 3);
  assert.equal(store.cart.isEmpty, true);
  assert.equal(store.lastOrder, null);
});

test('the products getter returns a copy of the catalogue list', () => {
  const { store } = setup();
  const products = store.products;

  products.push(products[0]);

  assert.equal(store.products.length, 3);
});

test('addToCart / updateQuantity / removeFromCart update the state and notify listeners', () => {
  const { store } = setup();
  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  const added = store.addToCart(LAPTOP_ID, 2);
  assert.equal(added.success, true);
  assert.equal(store.cart.itemCount, 2);
  assert.equal(store.getProduct(LAPTOP_ID).stockQuantity, 3);
  assert.equal(notifications, 1);

  store.updateQuantity(LAPTOP_ID, 3);
  assert.equal(store.cart.itemCount, 3);
  assert.equal(store.getProduct(LAPTOP_ID).stockQuantity, 2);
  assert.equal(notifications, 2);

  store.removeFromCart(LAPTOP_ID);
  assert.equal(store.cart.isEmpty, true);
  assert.equal(store.getProduct(LAPTOP_ID).stockQuantity, 5);
  assert.equal(notifications, 3);
});

test('a failed action does not notify the listeners', () => {
  const { store } = setup();
  store.addToCart(LAPTOP_ID, 3);

  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  const result = store.addToCart(LAPTOP_ID, 6);

  assert.equal(result.success, false);
  assert.equal(result.message, 'Out of stock!');
  assert.equal(notifications, 0);
  assert.equal(store.cart.itemCount, 3);
});

test('addToCart rejects an unknown product id', () => {
  const { store } = setup();
  const result = store.addToCart('DOES-NOT-EXIST', 1);

  assert.equal(result.success, false);
  assert.equal(result.code, 'NOT_FOUND');
});

test('checkout rejects an empty cart', () => {
  const { store } = setup();

  const result = store.checkout(VALID_CUSTOMER);

  assert.equal(result.success, false);
  assert.equal(result.code, 'EMPTY_CART');
  assert.equal(store.cart.isEmpty, true);
});

test('checkout rejects missing required fields', () => {
  const { store } = setup();
  store.addToCart(MOUSE_ID, 1);

  const result = store.checkout({ name: '', email: '' });

  assert.equal(result.success, false);
  assert.equal(result.code, 'INVALID_CUSTOMER');
  assert.ok(result.fieldErrors.name);
  assert.ok(result.fieldErrors.email);
  assert.equal(store.cart.itemCount, 1, 'the cart must survive a failed checkout');
});

test('checkout rejects an invalid email address', () => {
  const { store } = setup();
  store.addToCart(MOUSE_ID, 1);

  const result = store.checkout({ ...VALID_CUSTOMER, email: 'not-an-email' });

  assert.equal(result.success, false);
  assert.equal(result.code, 'INVALID_CUSTOMER');
  assert.match(result.fieldErrors.email, /valid email/i);
});

test('a successful checkout produces a correct order and keeps stock reduced', () => {
  const { store } = setup();
  store.addToCart(LAPTOP_ID, 3);
  store.addToCart(MOUSE_ID, 1);
  store.addToCart('SKU-003', 1);

  const result = store.checkout(VALID_CUSTOMER);

  assert.equal(result.success, true);
  assert.equal(result.code, 'OK');

  const { order } = result;
  assert.match(order.orderNumber, /^SC-\d{8}-\d{4}$/);
  assert.ok(order.placedAt instanceof Date);
  assert.equal(order.customer.name, 'Ayesha Khan');
  assert.equal(order.itemCount, 5);
  assert.equal(order.lineCount, 3);
  assert.equal(order.subtotal, 307000);
  assert.equal(order.discounts, 1000);
  assert.equal(order.total, 306000);

  assert.equal(store.cart.isEmpty, true, 'the cart is emptied after checkout');
  assert.equal(store.getProduct(LAPTOP_ID).stockQuantity, 2, 'sold stock stays sold');
  assert.equal(store.getProduct(MOUSE_ID).stockQuantity, 9);
  assert.equal(store.getProduct('SKU-003').stockQuantity, 7);
  assert.equal(store.lastOrder, order);
});

test('a successful checkout notifies listeners exactly once', () => {
  const { store } = setup();
  store.addToCart(MOUSE_ID, 1);

  let notifications = 0;
  store.subscribe(() => {
    notifications += 1;
  });

  store.checkout(VALID_CUSTOMER);

  assert.equal(notifications, 1);
});

test('reset restores the catalogue, empties the cart and forgets the last order', () => {
  const { store } = setup();
  store.addToCart(LAPTOP_ID, 3);
  store.checkout(VALID_CUSTOMER);

  store.reset();

  assert.equal(store.cart.isEmpty, true);
  assert.equal(store.lastOrder, null);
  assert.equal(store.getProduct(LAPTOP_ID).stockQuantity, 5);
  assert.equal(store.products.length, 3);
});

test('validateCustomer accepts a complete customer and rejects bad phones', () => {
  assert.deepEqual(validateCustomer(VALID_CUSTOMER), {});
  assert.equal(validateCustomer({ ...VALID_CUSTOMER, phone: 'abc' }).phone !== undefined, true);
  assert.equal(validateCustomer({ name: 'Jo', email: 'jo@example.com' }).name !== undefined, true);
});

test('money helpers round and format consistently', () => {
  assert.equal(roundTo2(0.1 + 0.2), 0.3);
  assert.equal(formatPKR(306000), 'Rs. 306,000');
  assert.equal(formatPKR(4500.5), 'Rs. 4,500.5');
  assert.equal(formatPKR(0), 'Rs. 0');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(escapeHtml('"quoted" & \'single\''), '&quot;quoted&quot; &amp; &#39;single&#39;');
});
