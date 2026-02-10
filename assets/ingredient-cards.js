import { Component } from '@theme/component';

class IngredientCards extends Component {
  /** @type {IntersectionObserver|null} */
  #observer = null;

  /** @type {HTMLElement|null} */
  #track = null;

  /** @type {boolean} */
  #isDragging = false;

  /** @type {number} */
  #startX = 0;

  /** @type {number} */
  #scrollStart = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#track = this.querySelector('.ingredient-cards__track');
    this.#initObserver();
    this.#initDrag();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#removeDrag();
  }

  #initObserver() {
    const cards = this.querySelectorAll('.ingredient-card');
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      for (const card of cards) {
        card.classList.add('ingredient-card--visible');
      }
      return;
    }

    /* Enable animation state, then observe the section entering the viewport.
       When visible, reveal all cards at once to avoid distracting per-card
       animations during horizontal scroll. */
    this.classList.add('ingredient-cards--animate');

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            for (const card of cards) {
              card.classList.add('ingredient-card--visible');
            }
            this.#observer?.disconnect();
            this.#observer = null;
          }
        }
      },
      { threshold: 0.1 }
    );

    /* Observe the section itself, not individual cards */
    this.#observer.observe(this);
  }

  /* Drag-to-scroll for mouse and touch */

  #initDrag() {
    if (!this.#track) return;

    this.#track.addEventListener('pointerdown', this.#onPointerDown);
    this.#track.addEventListener('pointermove', this.#onPointerMove);
    this.#track.addEventListener('pointerup', this.#onPointerUp);
    this.#track.addEventListener('pointercancel', this.#onPointerUp);
  }

  #removeDrag() {
    if (!this.#track) return;

    this.#track.removeEventListener('pointerdown', this.#onPointerDown);
    this.#track.removeEventListener('pointermove', this.#onPointerMove);
    this.#track.removeEventListener('pointerup', this.#onPointerUp);
    this.#track.removeEventListener('pointercancel', this.#onPointerUp);
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    /* Only respond to primary pointer (left mouse button / single touch) */
    if (event.button !== 0) return;

    this.#isDragging = true;
    this.#startX = event.clientX;
    this.#scrollStart = this.#track.scrollLeft;
    this.#track.setPointerCapture(event.pointerId);
    this.#track.style.cursor = 'grabbing';
    this.#track.style.scrollSnapType = 'none';
  };

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    if (!this.#isDragging) return;

    const dx = event.clientX - this.#startX;
    this.#track.scrollLeft = this.#scrollStart - dx;
  };

  /** @param {PointerEvent} event */
  #onPointerUp = (event) => {
    if (!this.#isDragging) return;

    this.#isDragging = false;
    this.#track.releasePointerCapture(event.pointerId);
    this.#track.style.cursor = '';
    this.#track.style.scrollSnapType = '';
  };

  /* Arrow navigation */

  scrollPrev() {
    if (!this.#track) return;
    const cardWidth = this.#getCardScrollDistance();
    this.#track.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }

  scrollNext() {
    if (!this.#track) return;
    const cardWidth = this.#getCardScrollDistance();
    this.#track.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }

  /** @returns {number} */
  #getCardScrollDistance() {
    const card = this.#track.querySelector('.ingredient-card');
    if (!card) return 300;

    const style = getComputedStyle(this.#track);
    const gap = parseFloat(style.columnGap) || 0;
    return card.offsetWidth + gap;
  }
}

if (!customElements.get('ingredient-cards')) {
  customElements.define('ingredient-cards', IngredientCards);
}
