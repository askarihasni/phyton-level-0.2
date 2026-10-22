/**
 * simulation.js
 * ---------------------------------------------------------------------------
 * The demonstration required by the assignment.
 *
 * It runs the exact test sequence on its OWN product objects (created by
 * `createCatalog()`), so the live web page keeps a clean catalogue while the
 * simulation is being demonstrated.
 *
 * The result is returned as plain text lines. app.js prints them on the page
 * and in the browser console.
 */

import { ShoppingCart } from './ShoppingCart.js';
import { createCatalog, LAPTOP_ID, MOUSE_ID, HEADPHONES_ID } from './catalog.js';
import { formatPKR } from './utils.js';

const OK = '✔';
const NO = '✖';

/**
 * Run the full simulation.
 * @param {(line: string) => void} [write] receives every output line
 * @returns {{lines: string[], receipt: string, cart: ShoppingCart, products: Product[]}}
 */
export function runSimulation(write = () => {}) {
  const lines = [];
  const say = (line = '') => {
    lines.push(line);
    write(line);
  };

  /* ------------------------------------------------------------------ */
  say('==================================================================');
  say('   SmartCart  -  Shopping Cart & Checkout Simulation');
  say('==================================================================');
  say('  Step 0  Creating the sample products');
  say('------------------------------------------------------------------');

  // A fresh catalogue for the simulation (the live page is untouched).
  const [laptop, mouse, headphones] = createCatalog();
  const cart = new ShoppingCart();

  say(`  Laptop      (${LAPTOP_ID})    price ${formatPKR(laptop.price)}   stock ${laptop.stockQuantity}`);
  say(`  Mouse       (${MOUSE_ID})    price ${formatPKR(mouse.price)}   stock ${mouse.stockQuantity}`);
  say(
    `  Headphones  (${HEADPHONES_ID})  price ${formatPKR(headphones.price)}   stock ${headphones.stockQuantity}   ` +
      `${headphones.discountPercentage}% discount -> ${formatPKR(headphones.getFinalPrice())} each`,
  );
  say('');
  say('  (Regular products and a DiscountedProduct are both added to the same');
  say('   cart - the cart only calls getFinalPrice(), so it does not need to');
  say('   know which kind of product it is holding.)');
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 1  Add 3 Laptops');
  say('------------------------------------------------------------------');

  const step1 = cart.addItem(laptop, 3);
  say(`  ${step1.success ? OK : NO} ${step1.message}`);
  say(`      Cart now holds ${cart.itemCount} unit(s). Laptop stock: ${laptop.stockQuantity}`);
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 2  Try to add 6 more Laptops (only 2 are left!)');
  say('------------------------------------------------------------------');

  const stockBefore = laptop.stockQuantity;
  const step2 = cart.addItem(laptop, 6);
  say(`  ${step2.success ? OK : NO} ${step2.message}`);
  say(
    `      Stock before the attempt: ${stockBefore} | Stock after the attempt: ${laptop.stockQuantity} ` +
      `(${stockBefore === laptop.stockQuantity ? 'unchanged - a failed add never changes anything' : 'CHANGED!'})`,
  );
  say(`      The cart still holds ${cart.itemCount} unit(s).`);
  say('');
  // Remember the stock right after the failed attempt so we can prove later
  // that the failed operation changed nothing.
  const stockAfterFailedAdd = laptop.stockQuantity;

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 3  Add 1 Headphones (discounted product)');
  say('------------------------------------------------------------------');

  const step3 = cart.addItem(headphones, 1);
  say(`  ${step3.success ? OK : NO} ${step3.message}`);
  say(
    `      List price ${formatPKR(headphones.price)} - ${headphones.discountPercentage}% = ` +
      `${formatPKR(headphones.getFinalPrice())} each`,
  );
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 4  Add 1 Mouse (regular product)');
  say('------------------------------------------------------------------');

  const step4 = cart.addItem(mouse, 1);
  say(`  ${step4.success ? OK : NO} ${step4.message}`);
  say(`      A regular product simply returns its normal price: ${formatPKR(mouse.getFinalPrice())}`);
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 5  Total + receipt');
  say('------------------------------------------------------------------');

  const total = cart.calculateTotal();
  say(`  ${OK} Grand total: ${formatPKR(total)}`);
  say(`      (3 x ${formatPKR(laptop.getFinalPrice())} + 1 x ${formatPKR(headphones.getFinalPrice())} + 1 x ${formatPKR(mouse.getFinalPrice())})`);
  say('');

  const receipt = cart.printReceipt({ receiptNumber: 'SIM-DEMO-001' });
  say('  ' + receipt.split('\n').join('\n  '));
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 6  Remaining stock');
  say('------------------------------------------------------------------');

  say(`  Laptop      : ${laptop.stockQuantity} left (was 5, 3 sold to the cart)`);
  say(`  Mouse       : ${mouse.stockQuantity} left (was 10, 1 sold to the cart)`);
  say(`  Headphones  : ${headphones.stockQuantity} left (was 8, 1 sold to the cart)`);
  say('');

  /* ------------------------------------------------------------------ */
  say('------------------------------------------------------------------');
  say('  Step 7  BONUS - remove the Laptops and give the stock back');
  say('------------------------------------------------------------------');

  const stockBeforeRemove = laptop.stockQuantity;
  const step7 = cart.removeItem(LAPTOP_ID);
  say(`  ${step7.success ? OK : NO} ${step7.message}`);
  say(
    `      Laptop stock: ${stockBeforeRemove} -> ${laptop.stockQuantity} ` +
      `(${laptop.stockQuantity === 5 ? 'restored exactly' : 'NOT RESTORED!'})`,
  );
  say(`  ${OK} New cart total: ${formatPKR(cart.calculateTotal())}`);
  say(`      The cart now holds: ${cart.cartItems.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}`);
  say('');

  /* ------------------------------------------------------------------ */
  say('==================================================================');
  say('  Integrity checks');
  say('------------------------------------------------------------------');

  const checks = [
    ['Stock never became negative', [laptop, mouse, headphones].every((p) => p.stockQuantity >= 0)],
    ['The failed add did not change the stock', stockBefore === stockAfterFailedAdd && stockAfterFailedAdd === 2],
    ['Removing an item restored the stock exactly once', laptop.stockQuantity === 5],
    ['A regular product returns its normal price', mouse.getFinalPrice() === 2000],
    ['A discounted product returns the discounted price', headphones.getFinalPrice() === 4000],
    ['The total used the discounted price', cart.calculateTotal() === 6000],
  ];

  for (const [label, passed] of checks) {
    say(`  ${passed ? OK : NO} ${label}`);
  }

  say('==================================================================');
  say('  Simulation finished.');
  say('==================================================================');

  return { lines, receipt, cart, products: [laptop, mouse, headphones] };
}
