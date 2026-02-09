/**
 * Matcha Grade Accordion
 *
 * Click-to-expand accordion with image crossfade and transition video support.
 * When switching between grades, checks the current product's metafield-defined
 * transition videos. If a video exists for the target product, plays it before
 * crossfading to the target image.
 */

class MatchaScrollAccordion extends HTMLElement {
  #controller = new AbortController();

  /** @type {number} */
  #activeIndex = 0;

  /** @type {boolean} */
  #isTransitioning = false;

  /** @type {number} */
  #pendingTargetIndex = -1;

  /** @type {HTMLElement[]} */
  get rows() {
    return [...this.querySelectorAll('.scroll-accordion__row')];
  }

  /** @type {HTMLElement[]} */
  get mediaItems() {
    return [...this.querySelectorAll('.scroll-accordion__media-item')];
  }

  /** @type {HTMLVideoElement | null} */
  get video() {
    return this.querySelector('.scroll-accordion__video');
  }

  connectedCallback() {
    const { signal } = this.#controller;

    for (const row of this.rows) {
      const header = row.querySelector('.scroll-accordion__row-header');
      if (header) {
        header.addEventListener('click', this.#handleClick, { signal });
      }
    }

    this.#preloadVideos();

    const video = this.video;
    if (video) {
      video.addEventListener('ended', this.#handleVideoEnded, { signal });
      video.addEventListener('error', this.#handleVideoError, { signal });
    }

    this.#setActiveRow(0);
  }

  disconnectedCallback() {
    this.#controller.abort();
  }

  /**
   * Preloads all unique transition video URLs by fetching them into the
   * browser's HTTP cache. When the video element later requests the same
   * URL, it hits the cache and starts instantly.
   */
  #preloadVideos() {
    const urls = new Set();

    for (const row of this.rows) {
      const transitionsAttr = row.dataset.transitions;
      if (!transitionsAttr) continue;

      try {
        const transitions = JSON.parse(transitionsAttr);
        for (const url of Object.values(transitions)) {
          if (url) urls.add(url);
        }
      } catch {
        // skip malformed JSON
      }
    }

    for (const url of urls) {
      fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => {});
    }
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

    const targetIndex = parseInt(row.dataset.index || '0', 10);

    // Clicking the already-active row on mobile collapses it
    if (targetIndex === this.#activeIndex && window.innerWidth < 768) {
      this.#cancelTransition();
      this.#collapseAll();
      this.#activeIndex = -1;
      return;
    }

    // If already transitioning, cancel and jump immediately
    if (this.#isTransitioning) {
      this.#cancelTransition();
    }

    // Same row, nothing to do
    if (targetIndex === this.#activeIndex) return;

    const fromIndex = this.#activeIndex;
    const videoUrl = this.#getTransitionVideo(fromIndex, targetIndex);

    if (videoUrl) {
      this.#playTransition(fromIndex, targetIndex, videoUrl);
    } else {
      this.#setActiveRow(targetIndex);
    }
  };

  /**
   * Looks up whether a transition video exists from one row to another.
   *
   * @param {number} fromIndex
   * @param {number} toIndex
   * @returns {string | null} Video URL or null
   */
  #getTransitionVideo(fromIndex, toIndex) {
    const fromRow = this.rows[fromIndex];
    const toRow = this.rows[toIndex];
    if (!fromRow || !toRow) return null;

    const transitionsAttr = fromRow.dataset.transitions;
    const targetProductId = toRow.dataset.productId;
    if (!transitionsAttr || !targetProductId) return null;

    try {
      const transitions = JSON.parse(transitionsAttr);
      return transitions[targetProductId] || null;
    } catch {
      return null;
    }
  }

  /**
   * Plays a transition video, then completes the switch to the target row.
   * The FROM image stays visible underneath as a backdrop while the video
   * layers on top, ensuring no blank frames at any point.
   *
   * @param {number} fromIndex
   * @param {number} toIndex
   * @param {string} videoUrl
   */
  #playTransition(fromIndex, toIndex, videoUrl) {
    const video = this.video;
    if (!video) {
      this.#setActiveRow(toIndex);
      return;
    }

    this.#isTransitioning = true;
    this.#pendingTargetIndex = toIndex;

    // Expand the target accordion row immediately so text is visible
    this.#setActiveRowContent(toIndex);

    // FROM image stays visible as a backdrop (never removed during playback).
    // Video layers on top at z-index 2.
    video.src = videoUrl;
    video.currentTime = 0;
    video.classList.add('scroll-accordion__video--playing');

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        this.#cancelTransition();
        this.#setActiveRow(toIndex);
      });
    }
  }

  /** Called when the transition video finishes playing. */
  #handleVideoEnded = () => {
    this.#finishTransition(this.#pendingTargetIndex);
  };

  /** Called if the video fails to load. */
  #handleVideoError = () => {
    if (!this.#isTransitioning) return;

    const targetIndex = this.#pendingTargetIndex;
    this.#cancelTransition();
    this.#setActiveRow(targetIndex);
  };

  /**
   * Completes a video transition. Makes the TO image fully visible instantly
   * (bypassing CSS transitions) before hiding the video, so there is never
   * a blank frame between the video ending and the image appearing.
   *
   * @param {number} targetIndex
   */
  #finishTransition(targetIndex) {
    const items = this.mediaItems;

    // Make TO image visible instantly (bypass CSS transition)
    for (const [i, item] of items.entries()) {
      item.style.transition = 'none';
      item.classList.toggle('scroll-accordion__media-item--active', i === targetIndex);
    }

    // Force repaint so the instant opacity change is committed
    // eslint-disable-next-line no-unused-expressions
    items[0]?.offsetHeight;

    // Hide the video — TO image is already at full opacity underneath
    const video = this.video;
    if (video) {
      video.classList.remove('scroll-accordion__video--playing');
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    // Restore CSS transitions for future non-video crossfades
    requestAnimationFrame(() => {
      for (const item of items) {
        item.style.transition = '';
      }
    });

    this.#isTransitioning = false;
    this.#pendingTargetIndex = -1;
    this.#activeIndex = targetIndex;
  }

  /** Cancels any in-progress video transition. */
  #cancelTransition() {
    const video = this.video;
    if (video) {
      video.classList.remove('scroll-accordion__video--playing');
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    this.#isTransitioning = false;
    this.#pendingTargetIndex = -1;
  }

  /**
   * Updates only the accordion row content (expand/collapse + ARIA),
   * without changing the media images. Used during video transitions.
   *
   * @param {number} index
   */
  #setActiveRowContent(index) {
    this.#activeIndex = index;

    for (const [i, row] of this.rows.entries()) {
      const isActive = i === index;
      const header = row.querySelector('.scroll-accordion__row-header');

      row.classList.toggle('scroll-accordion__row--active', isActive);

      if (header) {
        header.setAttribute('aria-expanded', String(isActive));
      }
    }
  }

  /**
   * Sets the active row, updates ARIA, and crossfades the image.
   * Used for non-video transitions (direct crossfade).
   *
   * @param {number} index
   */
  #setActiveRow(index) {
    this.#setActiveRowContent(index);

    for (const [i, item] of this.mediaItems.entries()) {
      item.classList.toggle('scroll-accordion__media-item--active', i === index);
    }
  }

  /** Collapses all rows (mobile). */
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
