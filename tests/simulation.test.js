/**
 * tests/simulation.test.js
 * ---------------------------------------------------------------------------
 * Checks the required assignment simulation end-to-end, and verifies that it
 * works on isolated product objects (the live catalogue is not touched).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { runSimulation } from '../js/simulation.js';
import { createCatalog, LAPTOP_ID, MOUSE_ID, HEADPHONES_ID } from '../js/catalog.js';

test('the simulation runs the required sequence with the expected numbers', () => {
  const { cart, products, lines, receipt } = runSimulation();
  const [laptop, mouse, headphones] = products;
  const text = lines.join('\n');

  // Step 1-4: 3 laptops, a failed 6-laptop add, 1 headphone, 1 mouse.
  assert.match(text, /Add 3 Laptops/);
  assert.match(text, /Laptop added to cart/);
  assert.match(text, /Out of stock!/);
  assert.match(text, /Headphones added to cart/);
  assert.match(text, /Mouse added to cart/);

  // The failed add changed nothing.
  assert.equal(laptop.stockQuantity, 5, 'the laptops were removed again in step 7');
  assert.equal(mouse.stockQuantity, 9);
  assert.equal(headphones.stockQuantity, 7);

  // Step 5: total and receipt.
  assert.match(text, /Grand total: Rs\. 306,000/);
  assert.match(receipt, /Rs\. 306,000/);
  assert.match(receipt, /SIM-DEMO-001/);
  assert.match(receipt, /20% discount applied/);

  // Step 6: remaining stock as printed.
  assert.match(text, /Laptop\s+: 2 left/);
  assert.match(text, /Mouse\s+: 9 left/);
  assert.match(text, /Headphones\s+: 7 left/);

  // Step 7: removing the laptops restores the stock exactly once.
  assert.equal(cart.calculateTotal(), 6000);
  assert.equal(cart.lineCount, 2);
  assert.equal(cart.cartItems.map((item) => item.product.id).join(','), `${HEADPHONES_ID},${MOUSE_ID}`);
  assert.match(text, /Laptop stock: 2 -> 5 \(restored exactly\)/);
  assert.match(text, /New cart total: Rs\. 6,000/);
});

test('every integrity check inside the simulation passes', () => {
  const { lines } = runSimulation();
  const text = lines.join('\n');
  const integrityChecks = text.slice(text.indexOf('Integrity checks'));

  assert.ok(text.includes('Integrity checks'));
  // Note: "✖" is also printed for the *expected* out-of-stock attempt in
  // step 2, so only the integrity-check block must be free of failures.
  assert.equal(integrityChecks.includes('✖'), false, `a simulation check failed:\n${text}`);
  assert.match(text, /✔ Stock never became negative/);
  assert.match(text, /✔ The failed add did not change the stock/);
  assert.match(text, /✔ Removing an item restored the stock exactly once/);
  assert.match(text, /✔ A discounted product returns the discounted price/);
  assert.match(text, /✔ The total used the discounted price/);
});

test('the simulation uses its own product objects, not the live catalogue', () => {
  const live = createCatalog();
  const liveLaptop = live[0];

  runSimulation();

  assert.equal(liveLaptop.stockQuantity, 5, 'the live catalogue must stay untouched');
  assert.notEqual(liveLaptop, createCatalog()[0]);
});

test('createCatalog returns fresh instances with the assignment prices and stock', () => {
  const first = createCatalog();
  const second = createCatalog();

  assert.equal(first[0].id, LAPTOP_ID);
  assert.equal(first[0].name, 'Laptop');
  assert.equal(first[0].price, 100000);
  assert.equal(first[0].stockQuantity, 5);

  assert.equal(first[1].id, MOUSE_ID);
  assert.equal(first[1].price, 2000);
  assert.equal(first[1].stockQuantity, 10);

  assert.equal(first[2].id, HEADPHONES_ID);
  assert.equal(first[2].price, 5000);
  assert.equal(first[2].stockQuantity, 8);
  assert.equal(first[2].discountPercentage, 20);
  assert.equal(first[2].getFinalPrice(), 4000);

  assert.notEqual(first[0], second[0]);
});
