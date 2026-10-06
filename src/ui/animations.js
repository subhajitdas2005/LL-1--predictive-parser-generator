/**
 * GSAP Animation Controller for LL(1) Parser Generator.
 * Built following /gsap-core guidelines with prefers-reduced-motion support.
 */

// Access global gsap or window.gsap
const getGSAP = () => window.gsap;

let mm = null;
let reduceMotion = false;

/**
 * Initializes GSAP matchMedia to respect user motion preferences.
 */
export function initAnimations() {
  const gsap = getGSAP();
  if (!gsap) return;

  if (gsap.matchMedia) {
    mm = gsap.matchMedia();
    mm.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)'
      },
      (context) => {
        reduceMotion = context.conditions.reduceMotion;
      }
    );
  }

  // Set default easing
  gsap.defaults({
    duration: 0.4,
    ease: 'power2.out'
  });
}

/**
 * Animate metric dashboard chips on analysis completion.
 */
export function animateMetrics(elements) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) return;

  gsap.from(elements, {
    y: 10,
    autoAlpha: 0,
    duration: 0.35,
    stagger: 0.04,
    ease: 'power2.out'
  });
}

/**
 * Smooth transition between navigation tabs.
 */
export function animateTabSwitch(prevPane, nextPane) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) {
    if (prevPane) prevPane.style.display = 'none';
    if (nextPane) nextPane.style.display = 'flex';
    return;
  }

  const tl = gsap.timeline();

  if (prevPane) {
    tl.to(prevPane, {
      autoAlpha: 0,
      y: -8,
      duration: 0.15,
      ease: 'power1.in',
      onComplete: () => {
        prevPane.style.display = 'none';
        prevPane.classList.remove('active');
      }
    });
  }

  if (nextPane) {
    tl.set(nextPane, {
      display: 'flex',
      y: 12,
      autoAlpha: 0
    });
    tl.to(nextPane, {
      autoAlpha: 1,
      y: 0,
      duration: 0.25,
      ease: 'power2.out',
      onStart: () => {
        nextPane.classList.add('active');
      }
    });
  }
}

/**
 * Animate set cards reveal with stagger.
 */
export function animateSetCards(cards) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) return;

  gsap.from(cards, {
    y: 20,
    autoAlpha: 0,
    scale: 0.98,
    duration: 0.4,
    stagger: 0.06,
    ease: 'back.out(1.2)'
  });
}

/**
 * Animate stack item when pushed.
 */
export function animateStackPush(element) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) return;

  gsap.fromTo(
    element,
    { y: -20, scale: 0.8, autoAlpha: 0 },
    { y: 0, scale: 1, autoAlpha: 1, duration: 0.25, ease: 'back.out(1.5)' }
  );
}

/**
 * Animate stack item when popped.
 */
export function animateStackPop(element, onComplete) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) {
    if (onComplete) onComplete();
    return;
  }

  gsap.to(element, {
    y: -15,
    autoAlpha: 0,
    scale: 0.8,
    duration: 0.2,
    ease: 'power2.in',
    onComplete
  });
}

/**
 * Pulse highlight on parsing table cell.
 */
export function animateTableCell(cellElement) {
  const gsap = getGSAP();
  if (!gsap || !cellElement) return;

  gsap.fromTo(
    cellElement,
    { scale: 1.15, backgroundColor: 'rgba(56, 189, 248, 0.4)' },
    { scale: 1, backgroundColor: 'rgba(56, 189, 248, 0.2)', duration: 0.35, ease: 'power2.out' }
  );
}

/**
 * Smooth accordion toggle animation.
 */
export function animateAccordion(contentElement, isExpanding) {
  const gsap = getGSAP();
  if (!gsap || reduceMotion) {
    contentElement.style.display = isExpanding ? 'flex' : 'none';
    return;
  }

  if (isExpanding) {
    contentElement.style.display = 'flex';
    gsap.fromTo(
      contentElement,
      { height: 0, autoAlpha: 0 },
      { height: 'auto', autoAlpha: 1, duration: 0.3, ease: 'power2.out' }
    );
  } else {
    gsap.to(contentElement, {
      height: 0,
      autoAlpha: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        contentElement.style.display = 'none';
      }
    });
  }
}
