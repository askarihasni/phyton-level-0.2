/**
 * tests/product.test.js
 * ---------------------------------------------------------------------------
 * Unit tests for the Product base class and the DiscountedProduct subclass.
 * Run with:  npm test        (or: node --test tests/)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { Product } from '../js/Product.js';
import { DiscountedProduct } from '../js/DiscountedProduct.js';

test('Product stores its details and exposes them read-only', () => {
  const laptop = new Product({ id: 'SKU-001', name: 'Laptop', price: 100000, stockQuantity: 5 });

  assert.equal(laptop.id, 'SKU-001');
  assert.equal(laptop.name, 'Laptop');
  assert.equal(laptop.price, 100000);
  assert.equal(laptop.stockQuantity, 5);
});

test('Product has no public data properties (encapsulation)', () => {
  const laptop = new Product({ id: 'SKU-001', name: 'Laptop', price: 100000, stockQuantity: 5 });

  assert.deepEqual(Object.keys(laptop), []);
  assert.equal(JSON.stringify(laptop), '{}');
  assert.throws(() => {
    laptop.stockQuantity = 999;
  }, TypeError);
});

test('Product rejects invalid constructor arguments', () => {
  assert.throws(() => new Product({ id: '', name: 'X', price: 1, stockQuantity: 1 }), TypeError);
  assert.throws(() => new Product({ id: 'A', name: '  ', price: 1, stockQuantity: 1 }), TypeError);
  assert.throws(() => new Product({ id: 'A', name: 'X', price: -1, stockQuantity: 1 }), TypeError);
  assert.throws(() => new Product({ id: 'A', name: 'X', price: 1, stockQuantity: -1 }), TypeError);
  assert.throws(() => new Product({ id: 'A', name: 'X', price: 1, stockQuantity: 1.5 }), TypeError);
});

test('checkStock accepts whole numbers that fit in stock', () => {
  const mouse = new Product({ id: 'SKU-002', name: 'Mouse', price: 2000, stockQuantity: 10 });

  assert.equal(mouse.checkStock(0), true);
  assert.equal(mouse.checkStock(1), true);
  assert.equal(mouse.checkStock(10), true);
  assert.equal(mouse.checkStock(11), false);
  assert.equal(mouse.checkStock(-1), false);
  assert.equal(mouse.checkStock(1.5), false);
});

test('reduceStock never lets the stock go negative and changes nothing on failure', () => {
  const mouse = new Product({ id: 'SKU-002', name: 'Mouse', price: 2000, stockQuantity: 10 });

  assert.equal(mouse.reduceStock(4), true);
  assert.equal(mouse.stockQuantity, 6);

  assert.equal(mouse.reduceStock(7), false);
  assert.equal(mouse.stockQuantity, 6, 'a failed reduction must leave the stock untouched');

  assert.throws(() => mouse.reduceStock(0), TypeError);
  assert.throws(() => mouse.reduceStock(-2), TypeError);
  assert.equal(mouse.stockQuantity, 6);
});

test('restoreStock gives units back', () => {
  const mouse = new Product({ id: 'SKU-002', name: 'Mouse', price: 2000, stockQuantity: 10 });

  mouse.reduceStock(10);
  assert.equal(mouse.stockQuantity, 0);
  mouse.restoreStock(10);
  assert.equal(mouse.stockQuantity, 10);
  assert.throws(() => mouse.restoreStock(0), TypeError);
});

test('a regular Product sells at its normal price', () => {
  const laptop = new Product({ id: 'SKU-001', name: 'Laptop', price: 100000, stockQuantity: 5 });

  assert.equal(laptop.getFinalPrice(), 100000);
  assert.equal(laptop.getDiscountPercentage(), 0);
  assert.equal(laptop.getUnitDiscount(), 0);
});

test('DiscountedProduct extends Product (inheritance)', () => {
  const headphones = new DiscountedProduct({
    id: 'SKU-003',
    name: 'Headphones',
    price: 5000,
    stockQuantity: 8,
    discountPercentage: 20,
  });

  assert.ok(headphones instanceof DiscountedProduct);
  assert.ok(headphones instanceof Product);
  assert.deepEqual(Object.keys(headphones), []);
});

test('DiscountedProduct overrides getFinalPrice but keeps the original price', () => {
  const headphones = new DiscountedProduct({
    id: 'SKU-003',
    name: 'Headphones',
    price: 5000,
    stockQuantity: 8,
    discountPercentage: 20,
  });

  assert.equal(headphones.getFinalPrice(), 4000);
  assert.equal(headphones.price, 5000, 'the original price must never change');
  assert.equal(headphones.getDiscountPercentage(), 20);
  assert.equal(headphones.getUnitDiscount(), 1000);
});

test('DiscountedProduct validates the discount range 0-100', () => {
  const base = { id: 'A', name: 'Item', price: 100, stockQuantity: 1 };

  assert.throws(() => new DiscountedProduct({ ...base, discountPercentage: -1 }), RangeError);
  assert.throws(() => new DiscountedProduct({ ...base, discountPercentage: 101 }), RangeError);
  assert.throws(() => new DiscountedProduct({ ...base, discountPercentage: '20' }), TypeError);
  assert.throws(() => new DiscountedProduct({ ...base, discountPercentage: NaN }), TypeError);

  assert.equal(new DiscountedProduct({ ...base, discountPercentage: 0 }).getFinalPrice(), 100);
  assert.equal(new DiscountedProduct({ ...base, discountPercentage: 100 }).getFinalPrice(), 0);
});

test('polymorphism: getFinalPrice() gives the right answer for every product type', () => {
  const products = [
    new Product({ id: 'A', name: 'Regular', price: 1000, stockQuantity: 1 }),
    new DiscountedProduct({ id: 'B', name: 'Half price', price: 1000, stockQuantity: 1, discountPercentage: 50 }),
  ];

  assert.deepEqual(
    products.map((product) => product.getFinalPrice()),
    [1000, 500],
  );
});

test('DiscountedProduct stock management is inherited', () => {
  const headphones = new DiscountedProduct({
    id: 'SKU-003',
    name: 'Headphones',
    price: 5000,
    stockQuantity: 8,
    discountPercentage: 20,
  });

  assert.equal(headphones.reduceStock(3), true);
  assert.equal(headphones.stockQuantity, 5);
  assert.equal(headphones.reduceStock(6), false);
  assert.equal(headphones.stockQuantity, 5);
});
