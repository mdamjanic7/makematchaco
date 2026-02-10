import { Component } from '@theme/component';

class IngredientCards extends Component {
  /** @type {IntersectionObserver|null} */
  #observer = null;

  /** @type {boolean} */
  #isDragging = false;

  /** @type {number} */
  #startX = 0;

  /** @type {number} */
  #scrollStart = 0;

  /** @type {boolean} */
  #arrowScrolling = false;

  connectedCallback() {
    super.connectedCallback();
    this.#initObserver();
    this.#initDrag();
    this.#initArrows();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#observer = null;

    const track = this.refs.track;
    if (!track) return;

    track.removeEventListener('pointerdown', this.#onPointerDown);
    track.removeEventListener('pointermove', this.#onPointerMove);
    track.removeEventListener('pointerup', this.#onPointerUp);
    track.removeEventListener('pointercancel', this.#onPointerUp);
    track.removeEventListener('scroll', this.#onScroll);
    track.removeEventListener('scrollend', this.#onScrollEnd);
  }

  /* Fade-in animation */

  #initObserver() {
    const cards = this.querySelectorAll('.ingredient-card');
    if (!cards.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const card of cards) {
        card.classList.add('ingredient-card--visible');
      }
      return;
    }

    this.classList.add('ingredient-cards--animate');

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          for (const card of cards) {
            card.classList.add('ingredient-card--visible');
          }
          this.#observer?.disconnect();
          this.#observer = null;
        }
      },
      { threshold: 0.1 }
    );

    this.#observer.observe(this);
  }

  /* Drag-to-scroll */

  #initDrag() {
    const track = this.refs.track;
    if (!track) return;

    track.addEventListener('pointerdown', this.#onPointerDown);
    track.addEventListener('pointermove', this.#onPointerMove);
    track.addEventListener('pointerup', this.#onPointerUp);
    track.addEventListener('pointercancel', this.#onPointerUp);
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (event.button !== 0) return;

    const track = this.refs.track;
    this.#isDragging = true;
    this.#startX = event.clientX;
    this.#scrollStart = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
    track.style.cursor = 'grabbing';
    track.style.scrollSnapType = 'none';
  };

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    if (!this.#isDragging) return;
    this.refs.track.scrollLeft = this.#scrollStart - (event.clientX - this.#startX);
  };

  /** @param {PointerEvent} event */
  #onPointerUp = (event) => {
    if (!this.#isDragging) return;

    const track = this.refs.track;
    this.#isDragging = false;
    track.releasePointerCapture(event.pointerId);
    track.style.cursor = '';
    track.style.scrollSnapType = '';
  };

  /* Arrow navigation */

  #initArrows() {
    const track = this.refs.track;
    if (!track) return;

    track.addEventListener('scroll', this.#onScroll, { passive: true });
    track.addEventListener('scrollend', this.#onScrollEnd);
    this.#setArrowsForPosition(track.scrollLeft);
  }

  #onScroll = () => {
    if (this.#arrowScrolling) return;
    this.#setArrowsForPosition(this.refs.track.scrollLeft);
  };

  #onScrollEnd = () => {
    this.#arrowScrolling = false;
    this.#setArrowsForPosition(this.refs.track.scrollLeft);
  };

  /** @param {number} scrollLeft */
  #setArrowsForPosition(scrollLeft) {
    const { prevBtn, nextBtn, track } = this.refs;
    if (!prevBtn || !nextBtn || !track) return;

    const { scrollWidth, clientWidth } = track;
    prevBtn.classList.toggle('ingredient-cards__arrow--hidden', scrollLeft <= 1);
    nextBtn.classList.toggle('ingredient-cards__arrow--hidden', scrollLeft + clientWidth >= scrollWidth - 1);
  }

  scrollPrev() {
    const track = this.refs.track;
    if (!track) return;

    this.#arrowScrolling = true;
    this.#setArrowsForPosition(Math.max(0, track.scrollLeft - track.clientWidth));
    track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
  }

  scrollNext() {
    const track = this.refs.track;
    if (!track) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    this.#arrowScrolling = true;
    this.#setArrowsForPosition(Math.min(maxScroll, track.scrollLeft + track.clientWidth));
    track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
  }
}

if (!customElements.get('ingredient-cards')) {
  customElements.define('ingredient-cards', IngredientCards);
}
