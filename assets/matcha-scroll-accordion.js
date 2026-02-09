/**
 * Matcha Grade Accordion
 *
 * Click-to-expand accordion with image crossfade. No scroll hijacking.
 * Clicking a row expands it (closing the previous one) and crossfades
 * the left image to match the selected grade.
 */

class MatchaScrollAccordion extends HTMLElement {
  #controller = new AbortController();

  /** @type {number} */
  #activeIndex = 0;

  /** @type {HTMLElement[]} */
  get rows() {
    return [...this.querySelectorAll('.scroll-accordion__row')];
  }

  /** @type {HTMLElement[]} */
  get mediaItems() {
    return [...this.querySelectorAll('.scroll-accordion__media-item')];
  }

  connectedCallback() {
    const { signal } = this.#controller;

    for (const row of this.rows) {
      const header = row.querySelector('.scroll-accordion__row-header');
      if (header) {
        header.addEventListener('click', this.#handleClick, { signal });
      }
    }

    // Initial state
    this.#setActiveRow(0);
  }

  disconnectedCallback() {
    this.#controller.abort();
  }

  /**
   * Handles click on a row header.
   *
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    const header = /** @type {HTMLElement} */ (event.currentTarget);
    const row = header.closest('.scroll-accordion__row');
    if (!row) return;

    const index = parseInt(row.dataset.index || '0', 10);

    // Clicking the already-active row on mobile collapses it
    if (index === this.#activeIndex && window.innerWidth < 768) {
      this.#collapseAll();
      this.#activeIndex = -1;
      return;
    }

    this.#setActiveRow(index);
  };

  /**
   * Sets the active row, updates ARIA, and crossfades the image.
   *
   * @param {number} index
   */
  #setActiveRow(index) {
    this.#activeIndex = index;

    for (const [i, row] of this.rows.entries()) {
      const isActive = i === index;
      const header = row.querySelector('.scroll-accordion__row-header');

      row.classList.toggle('scroll-accordion__row--active', isActive);

      if (header) {
        header.setAttribute('aria-expanded', String(isActive));
      }
    }

    // Crossfade images
    for (const [i, item] of this.mediaItems.entries()) {
      item.classList.toggle('scroll-accordion__media-item--active', i === index);
    }
  }

  /** Collapses all rows. */
  #collapseAll() {
    for (const row of this.rows) {
      row.classList.remove('scroll-accordion__row--active');
      const header = row.querySelector('.scroll-accordion__row-header');
      if (header) {
        header.setAttribute('aria-expanded', 'false');
      }
    }

    for (const item of this.mediaItems) {
      item.classList.remove('scroll-accordion__media-item--active');
    }
  }
}

if (!customElements.get('matcha-scroll-accordion')) {
  customElements.define('matcha-scroll-accordion', MatchaScrollAccordion);
}
