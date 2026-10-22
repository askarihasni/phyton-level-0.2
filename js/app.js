/**
 * app.js
 * ---------------------------------------------------------------------------
 * The VIEW / CONTROLLER layer. This file is the ONLY file that is allowed to
 * touch the DOM.
 *
 * The rule of the project:
 *   - the business rules live inside the classes (Product, DiscountedProduct,
 *     ShoppingCart) and inside the Store,
 *   - this file only *reads* the data, *renders* it and *forwards* the user's
 *     actions to the Store.
 *
 * Because of that, the screen can never disagree with the data: every change
 * goes through the Store, the Store notifies the UI, and the UI re-renders
 * itself from the model.
 */

import { Store } from './Store.js';
import { createCatalog, PRODUCT_DETAILS } from './catalog.js';
import { PRODUCT_ICONS } from './icons.js';
import { runSimulation } from './simulation.js';
import { escapeHtml, formatDateTime, formatPKR } from './utils.js';

class SmartCartApp {
  constructor() {
    /** The single source of truth: catalogue + cart + orders. */
    this.store = new Store(createCatalog);
    this.measureHeader();

    this.el = {
      productGrid: document.getElementById('product-grid'),
      searchInput: document.getElementById('product-search'),
      searchCategory: document.getElementById('search-category'),
      searchEmpty: document.getElementById('search-empty'),
      productsCount: document.getElementById('products-count'),
      cartItems: document.getElementById('cart-items'),
      cartSummary: document.getElementById('cart-summary'),
      cartSubtitle: document.getElementById('cart-subtitle'),
      orderSummary: document.getElementById('order-summary'),
      checkoutForm: document.getElementById('checkout-form'),
      formError: document.getElementById('form-error'),
      receipt: document.getElementById('receipt'),
      confirmationTitle: document.getElementById('confirmation-title'),
      confirmationSubtitle: document.getElementById('confirmation-subtitle'),
      toastStack: document.getElementById('toast-stack'),
      simulationLog: document.getElementById('simulation-log'),
      nav: document.getElementById('site-nav'),
      navToggle: document.getElementById('nav-toggle'),
      clearCartBtn: document.getElementById('clear-cart'),
      statProducts: document.getElementById('stat-products'),
      statStock: document.getElementById('stat-stock'),
      statCart: document.getElementById('stat-cart'),
    };

    this.currentSearch = '';
    this.currentCategory = 'all';

    /** Cached DOM nodes of every product card (built once, then updated). */
    this.productNodes = new Map();

    this.bindEvents();

    // The UI always redraws itself when the model changes.
    this.store.subscribe(() => this.renderAll());

    this.buildProductCards();
    this.renderAll();
    this.runSimulationDemo();
  }

  /* ================================================================== */
  /* EVENTS                                                              */
  /* ================================================================== */

  bindEvents() {
    // --- search functionality ----------------------------------------------
    if (this.el.searchInput) {
      this.el.searchInput.addEventListener('input', (event) => {
        this.currentSearch = event.target.value.toLowerCase().trim();
        this.filterAndRenderProducts();
      });
    }

    if (this.el.searchCategory) {
      this.el.searchCategory.addEventListener('change', (event) => {
        this.currentCategory = event.target.value;
        this.syncCategoryLinks();
        this.filterAndRenderProducts();
      });
    }

    const searchSubmit = document.getElementById('search-submit');
    if (searchSubmit) {
      searchSubmit.addEventListener('click', () => {
        this.currentSearch = (this.el.searchInput?.value ?? '').toLowerCase().trim();
        this.showView('products');
        this.filterAndRenderProducts();
        this.el.searchInput?.focus();
      });
    }

    // "All" button clears every filter
    const navAll = document.getElementById('nav-all');
    if (navAll) {
      navAll.addEventListener('click', () => {
        this.currentCategory = 'all';
        this.currentSearch = '';
        if (this.el.searchInput) this.el.searchInput.value = '';
        if (this.el.searchCategory) this.el.searchCategory.value = 'all';
        this.syncCategoryLinks();
        this.filterAndRenderProducts();
      });
    }

    // --- category nav links -----------------------------------------------
    document.querySelectorAll('.category-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (link.dataset.category) {
          this.currentCategory = link.dataset.category;
          if (this.el.searchCategory) {
            this.el.searchCategory.value = this.currentCategory;
          }
          this.syncCategoryLinks();
          this.filterAndRenderProducts();
        }
      });
    });

    // --- product cards: quantity stepper + "Add to cart" -----------------
    this.el.productGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const card = button.closest('[data-product-id]');
      if (!card) return;

      const productId = card.dataset.productId;
      const action = button.dataset.action;
      const input = card.querySelector('[data-role="qty-input"]');

      if (action === 'qty-inc' || action === 'qty-dec') {
        const step = action === 'qty-inc' ? 1 : -1;
        const current = Number(input.value) || 1;
        const next = Math.max(1, current + step);
        input.value = String(next);
        return;
      }

      if (action === 'add') {
        this.handleAddToCart(productId, input);
      }
    });

    // --- typing a quantity directly --------------------------------------
    this.el.productGrid.addEventListener('change', (event) => {
      const input = event.target.closest('[data-role="qty-input"]');
      if (!input) return;
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 1) {
        input.value = '1';
        this.toast('Invalid quantity! Please choose a whole number of 1 or more.', 'error');
      }
    });

    // --- cart rows: + / - / remove ----------------------------------------
    this.el.cartItems.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const row = button.closest('[data-cart-id]');
      if (!row) return;

      const productId = row.dataset.cartId;
      const action = button.dataset.action;
      const item = this.store.cart.cartItems.find((entry) => entry.product.id === productId);
      if (!item) return;

      if (action === 'cart-inc') {
        this.runAction(this.store.updateQuantity(productId, item.quantity + 1));
      } else if (action === 'cart-dec') {
        this.runAction(this.store.updateQuantity(productId, item.quantity - 1));
      } else if (action === 'cart-remove') {
        this.runAction(this.store.removeFromCart(productId));
      }
    });

    // --- summary buttons (checkout / clear cart) -------------------------
    this.el.cartSummary.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'clear-cart') {
        this.runAction(this.store.clearCart());
      }
    });

    this.el.clearCartBtn.addEventListener('click', () => {
      this.runAction(this.store.clearCart());
    });

    // --- checkout ---------------------------------------------------------
    this.el.checkoutForm.addEventListener('submit', (event) => this.handleCheckout(event));

    // --- print receipt ----------------------------------------------------
    this.el.receipt.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="print"]');
      if (button) window.print();
    });

    // --- simulation --------------------------------------------------------
    document.getElementById('run-simulation').addEventListener('click', () => this.runSimulationDemo());

    // --- reset demo data ---------------------------------------------------
    document.getElementById('reset-demo').addEventListener('click', () => {
      this.store.reset();
      this.buildProductCards(); // new product objects => rebuild the cards
      this.el.checkoutForm.reset();
      this.toast('Demo data has been reset.', 'success');
    });

    // --- navigation --------------------------------------------------------
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-nav]');
      if (!trigger) return;
      event.preventDefault();
      this.showView(trigger.dataset.nav);
      this.closeMobileNav();
    });

    this.el.navToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = this.el.nav.classList.toggle('is-open');
      this.el.navToggle.setAttribute('aria-expanded', String(open));
    });

    // Close the mobile menu when clicking outside it or pressing Escape.
    document.addEventListener('click', (event) => {
      if (!this.el.nav.classList.contains('is-open')) return;
      if (event.target.closest('#site-nav') || event.target.closest('#nav-toggle')) return;
      this.closeMobileNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeMobileNav();
    });
  }

  /** Keep the sticky summary below the actual header height. */
  measureHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const update = () => {
      document.documentElement.style.setProperty('--header-offset', `${Math.round(header.getBoundingClientRect().height)}px`);
    };
    update();
    window.addEventListener('resize', update, { passive: true });
  }

  /** Keep the category pills in sync with the active filter. */
  syncCategoryLinks() {
    document.querySelectorAll('.category-link').forEach((link) => {
      if (link.dataset.category) {
        link.classList.toggle('is-active', link.dataset.category === this.currentCategory);
      }
    });
  }

  /* ================================================================== */
  /* ACTIONS (thin wrappers - all logic lives in the classes)            */
  /* ================================================================== */

  handleAddToCart(productId, input) {
    const rawValue = input.value;
    const quantity = Number(rawValue);

    if (!Number.isInteger(quantity) || quantity < 1) {
      input.value = '1';
      this.toast('Invalid quantity! Please choose a whole number of 1 or more.', 'error');
      return;
    }

    const result = this.store.addToCart(productId, quantity);
    this.runAction(result);
  }

  /**
   * Show the result of an action as a toast message.
   * The exact wording for a stock problem is "Out of stock!".
   */
  runAction(result) {
    if (result.success) {
      this.toast(result.message, 'success');
    } else {
      this.toast(result.message, 'error');
    }
    return result;
  }

  handleCheckout(event) {
    event.preventDefault();
    this.clearFieldErrors();

    const form = new FormData(this.el.checkoutForm);
    const customer = {
      name: (form.get('name') ?? '').toString(),
      email: (form.get('email') ?? '').toString(),
      phone: (form.get('phone') ?? '').toString(),
      address: (form.get('address') ?? '').toString(),
      city: (form.get('city') ?? '').toString(),
      paymentMethod: (form.get('payment') ?? 'cod').toString(),
    };

    const result = this.store.checkout(customer);

    if (!result.success) {
      if (result.code === 'EMPTY_CART') {
        this.toast(result.message, 'error');
        this.showView('cart');
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        this.setFieldError(field, message);
      }
      this.el.formError.textContent = result.message;
      this.toast(result.message, 'error');
      return;
    }

    this.el.checkoutForm.reset();
    this.el.formError.textContent = '';
    this.renderReceipt(result.order);
    this.showView('confirmation');
    this.toast(result.message, 'success');
  }

  /* ================================================================== */
  /* RENDERING                                                            */
  /* ================================================================== */

  /** Build the product cards once (the nodes are then only updated). */
  buildProductCards() {
    this.productNodes.clear();
    this.el.productGrid.innerHTML = '';

    for (const product of this.store.products) {
      const details = PRODUCT_DETAILS[product.id] ?? {};
      const card = document.createElement('article');
      card.className = `product-card media--${details.accent ?? 'blue'}`;
      card.dataset.productId = product.id;
      card.dataset.category = details.category ?? 'Product';

      card.innerHTML = `
        <div class="product-media">
          <div class="product-media-top">
            <span class="product-badge product-badge--discount" data-role="discount-badge" hidden></span>
            <span class="product-badge product-badge--out" data-role="out-badge" hidden>Out of Stock</span>
          </div>
          <div class="product-image">${PRODUCT_ICONS[product.id] ?? ''}</div>
          <ul class="product-highlights">
            ${(details.highlights ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="product-info">
          <div class="product-meta-row">
            <span class="product-category">${escapeHtml(details.category ?? 'Product')}</span>
            <span class="product-sku">${escapeHtml(product.id)}</span>
          </div>
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
          <p class="product-description">${escapeHtml(details.description ?? '')}</p>
          <div class="product-pricing">
            <span class="price-current" data-role="price"></span>
            <span class="price-original" data-role="original-price" hidden></span>
            <span class="price-discount" data-role="discount-label" hidden></span>
          </div>
          <div class="product-stock" data-role="stock"></div>
          <div class="product-actions">
            <div class="qty-selector">
              <button type="button" class="qty-btn" data-action="qty-dec" aria-label="Decrease quantity of ${escapeHtml(product.name)}">&minus;</button>
              <input class="qty-input" type="number" min="1" step="1" value="1" data-role="qty-input"
                     aria-label="Quantity for ${escapeHtml(product.name)}" />
              <button type="button" class="qty-btn" data-action="qty-inc" aria-label="Increase quantity of ${escapeHtml(product.name)}">+</button>
            </div>
            <button class="btn btn-primary btn-block add-to-cart-btn" type="button" data-action="add" data-role="add-btn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
                <path d="M2 3h2.2l2.3 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H5.4" />
              </svg>
              <span data-role="add-label">Add to Cart</span>
            </button>
          </div>
        </div>`;

      this.el.productGrid.appendChild(card);

      this.productNodes.set(product.id, {
        card,
        price: card.querySelector('[data-role="price"]'),
        originalPrice: card.querySelector('[data-role="original-price"]'),
        discountLabel: card.querySelector('[data-role="discount-label"]'),
        discountBadge: card.querySelector('[data-role="discount-badge"]'),
        outBadge: card.querySelector('[data-role="out-badge"]'),
        stock: card.querySelector('[data-role="stock"]'),
        qtyInput: card.querySelector('[data-role="qty-input"]'),
        addBtn: card.querySelector('[data-role="add-btn"]'),
        addLabel: card.querySelector('[data-role="add-label"]'),
      });
    }
  }

  /** Update the live numbers of the product cards (prices + stock). */
  updateProductCards() {
    for (const product of this.store.products) {
      const nodes = this.productNodes.get(product.id);
      if (!nodes) continue;

      const discountPercentage = product.getDiscountPercentage();
      const stock = product.stockQuantity;

      nodes.price.textContent = formatPKR(product.getFinalPrice());

      if (discountPercentage > 0) {
        nodes.originalPrice.hidden = false;
        nodes.originalPrice.textContent = formatPKR(product.price);
        nodes.discountBadge.hidden = false;
        nodes.discountBadge.textContent = `Save ${discountPercentage}%`;
        nodes.discountLabel.hidden = false;
        nodes.discountLabel.textContent = `${discountPercentage}% off`;
      } else {
        nodes.originalPrice.hidden = true;
        nodes.discountBadge.hidden = true;
        nodes.discountLabel.hidden = true;
      }

      nodes.stock.innerHTML = stock
        ? `<span class="stock-indicator is-in-stock" aria-hidden="true"></span>
           <span class="stock-text is-in-stock">In stock <span class="stock-count">(${stock} unit${stock === 1 ? '' : 's'})</span></span>`
        : `<span class="stock-indicator is-out-of-stock" aria-hidden="true"></span>
           <span class="stock-text is-out-of-stock">Currently out of stock</span>`;

      nodes.outBadge.hidden = stock > 0;
      nodes.addBtn.disabled = stock === 0;
      nodes.addLabel.textContent = stock === 0 ? 'Out of Stock' : 'Add to Cart';
      nodes.qtyInput.max = String(Math.max(stock, 1));
      nodes.qtyInput.disabled = stock === 0;
      nodes.card.classList.toggle('is-out-of-stock', stock === 0);
    }

    this.filterAndRenderProducts();
  }

  /** Filter the product cards by the search box and the selected category. */
  filterAndRenderProducts() {
    const query = this.currentSearch;
    const category = this.currentCategory;
    let visible = 0;

    for (const product of this.store.products) {
      const nodes = this.productNodes.get(product.id);
      if (!nodes) continue;

      const details = PRODUCT_DETAILS[product.id] ?? {};
      const haystack = [product.name, details.category, details.description, details.tagline, product.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = query === '' || haystack.includes(query);
      const matchesCategory = category === 'all' || details.category === category;
      const show = matchesSearch && matchesCategory;

      nodes.card.hidden = !show;
      if (show) visible += 1;
    }

    if (this.el.productsCount) {
      const total = this.store.products.length;
      this.el.productsCount.textContent =
        visible === total
          ? `Showing all ${total} products`
          : `Showing ${visible} of ${total} products`;
    }

    if (this.el.searchEmpty) {
      this.el.searchEmpty.style.display = visible === 0 ? '' : 'none';
    }
  }

  /** Render the whole shopping cart view. */
  renderCart() {
    const cart = this.store.cart;
    const section = this.el.cartItems.closest('.cart-items-section');
    if (section) section.classList.toggle('is-empty', cart.isEmpty);

    if (cart.isEmpty) {
      this.el.cartSubtitle.textContent = 'Your cart is empty. Add products to get started.';
      this.el.clearCartBtn.hidden = true;
      this.el.cartItems.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-illustration" aria-hidden="true">
            <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="46" cy="96" r="6" />
              <circle cx="88" cy="96" r="6" />
              <path d="M14 18h12l12 58h56l12-40H38" />
              <path d="M60 46v20M50 56h20" opacity="0.5" />
            </svg>
          </div>
          <h2 class="cart-empty-title">Your cart is empty</h2>
          <p class="cart-empty-text">
            Looks like you haven't added anything yet. Explore our collection and find something you love.
          </p>
          <button class="btn btn-primary btn-lg" type="button" data-nav="products">Start Shopping</button>
        </div>`;
      this.el.cartSummary.innerHTML = `
        <h2 class="summary-title">Order Summary</h2>
        <div class="summary-rows">
          <div class="summary-row"><span>Subtotal</span><strong>${formatPKR(0)}</strong></div>
          <div class="summary-row summary-row--discount"><span>Discounts</span><strong>&minus; ${formatPKR(0)}</strong></div>
          <div class="summary-row"><span>Shipping</span><strong>Free</strong></div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-total">
          <span>Total</span>
          <strong>${formatPKR(0)}</strong>
        </div>
        <button class="btn btn-primary btn-lg btn-block" type="button" data-nav="checkout" disabled>Proceed to Checkout</button>
        <p class="summary-note">Add items to your cart to continue.</p>`;
      return;
    }

    const data = cart.getReceiptData();
    this.el.cartSubtitle.textContent = `${data.itemCount} item${data.itemCount === 1 ? '' : 's'} in your cart`;
    this.el.clearCartBtn.hidden = false;

    this.el.cartItems.innerHTML = data.items
      .map((item) => {
        const details = PRODUCT_DETAILS[item.id] ?? {};
        return `
        <div class="cart-item" data-cart-id="${escapeHtml(item.id)}">
          <div class="cart-item-media media--${details.accent ?? 'blue'}">
            ${PRODUCT_ICONS[item.id] ?? ''}
          </div>
          <div class="cart-item-details">
            <span class="cart-item-category">${escapeHtml(details.category ?? 'Product')}</span>
            <h3 class="cart-item-name">${escapeHtml(item.name)}</h3>
            <p class="cart-item-sku">${escapeHtml(item.id)}</p>
            <div class="cart-item-price">
              <span class="cart-item-unit">${formatPKR(item.finalUnitPrice)}</span>
              ${
                item.discountPercentage > 0
                  ? `<span class="cart-item-original">${formatPKR(item.unitPrice)}</span>
                     <span class="cart-item-discount">${item.discountPercentage}% off</span>`
                  : ''
              }
            </div>
            ${
              item.discountPercentage > 0
                ? `<p class="cart-item-saving">You save ${formatPKR(item.discountAmount)} per unit</p>`
                : ''
            }
          </div>
          <div class="cart-item-controls">
            <div class="qty-selector qty-selector--cart">
              <button type="button" class="qty-btn" data-action="cart-dec" aria-label="Decrease quantity of ${escapeHtml(item.name)}">&minus;</button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" class="qty-btn" data-action="cart-inc" aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
            </div>
            <button class="cart-item-remove" type="button" data-action="cart-remove" aria-label="Remove ${escapeHtml(item.name)} from the cart">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Remove
            </button>
          </div>
          <div class="cart-item-total">
            <span class="cart-item-total-label">Total</span>
            <span class="cart-item-total-value">${formatPKR(item.lineTotal)}</span>
          </div>
        </div>`;
      })
      .join('');

    this.el.cartSummary.innerHTML = `
      <h2 class="summary-title">Order Summary</h2>
      <div class="summary-rows">
        <div class="summary-row"><span>Subtotal (${data.itemCount} item${data.itemCount === 1 ? '' : 's'})</span><strong>${formatPKR(data.subtotal)}</strong></div>
        <div class="summary-row summary-row--discount"><span>Discounts</span><strong>&minus; ${formatPKR(data.discounts)}</strong></div>
        <div class="summary-row"><span>Shipping</span><strong>Free</strong></div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-total">
        <span>Total</span>
        <strong>${formatPKR(data.total)}</strong>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="button" data-nav="checkout">Proceed to Checkout</button>
      <button class="btn btn-ghost btn-block" type="button" data-nav="products">Continue Shopping</button>
      <button class="btn btn-text btn-block" type="button" data-action="clear-cart">Clear Cart</button>
      <p class="summary-note">Clearing the cart returns every item to the stock.</p>`;
  }

  /** Render the read-only summary shown next to the checkout form. */
  renderCheckoutSummary() {
    const cart = this.store.cart;

    if (cart.isEmpty) {
      this.el.orderSummary.innerHTML = `
        <h2 class="summary-title">Order Summary</h2>
        <div class="order-summary-empty">
          <p>Your cart is empty, so there is nothing to check out yet.</p>
          <button class="btn btn-ghost btn-sm" type="button" data-nav="products">Browse Products</button>
        </div>`;
      return;
    }

    const data = cart.getReceiptData();
    this.el.orderSummary.innerHTML = `
      <h2 class="summary-title">Order Summary</h2>
      <ul class="order-summary-items">
        ${data.items
          .map(
            (item) => `
          <li>
            <div class="order-summary-thumb media--${PRODUCT_DETAILS[item.id]?.accent ?? 'blue'}">
              ${PRODUCT_ICONS[item.id] ?? ''}
            </div>
            <div class="order-summary-item-info">
              <span class="order-summary-item-name">${escapeHtml(item.name)}</span>
              <span class="order-summary-item-qty">Qty ${item.quantity} &middot; ${formatPKR(item.finalUnitPrice)} each</span>
            </div>
            <span class="order-summary-item-total">${formatPKR(item.lineTotal)}</span>
          </li>`,
          )
          .join('')}
      </ul>
      <div class="summary-rows">
        <div class="summary-row"><span>Subtotal</span><strong>${formatPKR(data.subtotal)}</strong></div>
        <div class="summary-row summary-row--discount"><span>Discounts</span><strong>&minus; ${formatPKR(data.discounts)}</strong></div>
        <div class="summary-row"><span>Shipping</span><strong>Free</strong></div>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-total"><span>Total</span><strong>${formatPKR(data.total)}</strong></div>
      <p class="summary-note">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Stock is reserved while these items are in your cart.
      </p>`;
  }

  /** Build the printable receipt of a finished order. */
  renderReceipt(order) {
    const rows = order.items
      .map(
        (item) => `
        <tr>
          <td>
            <div class="receipt-item-name">${escapeHtml(item.name)}</div>
            <div class="receipt-item-meta">${escapeHtml(item.id)}${
              item.discountPercentage > 0
                ? ` &middot; ${item.discountPercentage}% discount (&minus;${formatPKR(item.discountAmount)} each)`
                : ''
            }</div>
          </td>
          <td class="num">${formatPKR(item.unitPrice)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${formatPKR(item.lineTotal)}</td>
        </tr>`,
      )
      .join('');

    if (this.el.confirmationTitle) {
      this.el.confirmationTitle.textContent = `Thank You, ${order.customer.name}!`;
    }
    if (this.el.confirmationSubtitle) {
      this.el.confirmationSubtitle.textContent =
        'Your demo order has been confirmed. A printable receipt is shown below.';
    }

    this.el.receipt.innerHTML = `
      <div class="receipt-paper">
        <div class="receipt-brand">
          <div class="receipt-brand-left">
            <span class="receipt-logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 9h3l3 11h9l3-8H12" /><circle cx="14" cy="25" r="1.6" /><circle cx="21" cy="25" r="1.6" />
              </svg>
            </span>
            <div>
              <span class="receipt-logo">SmartCart</span>
              <span class="receipt-tag">Smart Shopping Cart &amp; Checkout System</span>
            </div>
          </div>
          <div class="receipt-doc-label">
            <span>RECEIPT</span>
            <strong>${escapeHtml(order.orderNumber)}</strong>
          </div>
        </div>

        <div class="receipt-meta">
          <div><span>Order / Receipt No.</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
          <div><span>Date &amp; Time</span><strong>${escapeHtml(formatDateTime(order.placedAt))}</strong></div>
          <div><span>Customer</span><strong>${escapeHtml(order.customer.name)}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(order.customer.email)}</strong></div>
          ${order.customer.phone ? `<div><span>Phone</span><strong>${escapeHtml(order.customer.phone)}</strong></div>` : ''}
          ${
            order.customer.address
              ? `<div><span>Ship To</span><strong>${escapeHtml(
                  [order.customer.address, order.customer.city].filter(Boolean).join(', '),
                )}</strong></div>`
              : ''
          }
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Item</th>
              <th class="num">Unit Price</th>
              <th class="num">Qty</th>
              <th class="num">Line Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="receipt-totals">
          <div class="summary-row"><span>Subtotal</span><strong>${formatPKR(order.subtotal)}</strong></div>
          <div class="summary-row summary-row--discount"><span>Discounts</span><strong>&minus; ${formatPKR(
            order.discounts,
          )}</strong></div>
          <div class="summary-row"><span>Shipping</span><strong>Free</strong></div>
          <div class="summary-total"><span>Grand Total</span><strong>${formatPKR(order.total)}</strong></div>
        </div>

        <div class="receipt-foot">
          <p>
            Payment method: <strong>${escapeHtml(
              order.customer.paymentMethod === 'card' ? 'Card (Demo)' : 'Cash on Delivery',
            )}</strong>
          </p>
          <p class="receipt-disclaimer">
            Front-end demonstration only &mdash; no real payment was processed and no personal data left your browser.
          </p>
        </div>
      </div>

      <div class="receipt-actions no-print">
        <button class="btn btn-primary" type="button" data-action="print">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Receipt
        </button>
        <button class="btn btn-ghost" type="button" data-nav="products">Continue Shopping</button>
      </div>`;
  }

  /** Redraw every part of the page from the current model state. */
  renderAll() {
    this.updateProductCards();
    this.renderCart();
    this.renderCheckoutSummary();
    this.updateBadges();
  }

  updateBadges() {
    const count = this.store.cart.itemCount;
    const previous = this.lastBadgeCount ?? 0;

    for (const badge of document.querySelectorAll('[data-cart-count]')) {
      badge.textContent = String(count);
      badge.classList.toggle('is-active', count > 0);
      if (count !== previous) {
        badge.classList.remove('bump');
        // Force a reflow so the animation can restart on every change.
        void badge.offsetWidth;
        badge.classList.add('bump');
      }
    }

    this.lastBadgeCount = count;

    if (this.el.statCart) this.el.statCart.textContent = String(count);
    if (this.el.statProducts) this.el.statProducts.textContent = String(this.store.products.length);
    if (this.el.statStock) {
      this.el.statStock.textContent = String(
        this.store.products.reduce((total, product) => total + product.stockQuantity, 0),
      );
    }
  }

  /* ================================================================== */
  /* SMALL HELPERS                                                        */
  /* ================================================================== */

  showView(name) {
    for (const view of document.querySelectorAll('.view')) {
      view.hidden = view.dataset.view !== name;
    }

    // Highlight the matching category pill: on the products view the active
    // filter wins, on the cart view the "My Cart" link is highlighted.
    for (const link of document.querySelectorAll('.category-link')) {
      if (name === 'products') {
        link.classList.toggle(
          'is-active',
          Boolean(link.dataset.category) && link.dataset.category === this.currentCategory,
        );
      } else if (name === 'cart') {
        link.classList.toggle('is-active', link.dataset.nav === 'cart');
      } else {
        link.classList.remove('is-active');
      }
    }

    document.title =
      name === 'cart'
        ? 'Shopping Cart · SmartCart'
        : name === 'checkout'
          ? 'Checkout · SmartCart'
          : name === 'confirmation'
            ? 'Order Confirmation · SmartCart'
            : 'SmartCart · Premium Shopping Experience';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeMobileNav() {
    this.el.nav.classList.remove('is-open');
    this.el.navToggle.setAttribute('aria-expanded', 'false');
  }

  setFieldError(field, message) {
    const target = this.el.checkoutForm.querySelector(`[data-error-for="${field}"]`);
    if (target) {
      target.textContent = message;
      target.classList.add('is-visible');
    }
    const input = this.el.checkoutForm.querySelector(`[name="${field}"]`);
    if (input) input.classList.add('is-invalid');
  }

  clearFieldErrors() {
    for (const target of this.el.checkoutForm.querySelectorAll('[data-error-for]')) {
      target.textContent = '';
      target.classList.remove('is-visible');
    }
    for (const input of this.el.checkoutForm.querySelectorAll('.is-invalid')) {
      input.classList.remove('is-invalid');
    }
    this.el.formError.textContent = '';
  }

  toast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icon = type === 'success' ? '&#10003;' : type === 'error' ? '&#33;' : '&#9679;';
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-text">${escapeHtml(
      message,
    )}</span>`;
    this.el.toastStack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  /** Execute the required assignment simulation and show it on the page. */
  runSimulationDemo() {
    const log = this.el.simulationLog;
    log.textContent = '';
    const { receipt } = runSimulation((line) => {
      log.textContent += `${line}\n`;
    });
    console.log(receipt);
  }
}

/* -------------------------------------------------------------------- */
/* Boot                                                                  */
/* -------------------------------------------------------------------- */
function start() {
  window.smartCartApp = new SmartCartApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
