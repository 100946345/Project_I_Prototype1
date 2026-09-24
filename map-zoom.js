// map-zoom.js
// Scroll-driven zoom: Africa -> Cape Verde -> Santiago
(function () {
  // Query elements (will warn if missing)
  const mapStage = document.getElementById('mapStage');
  const baseMap = document.getElementById('baseMap');
  const cvOverlay = document.getElementById('cvOverlay');
  const santiagoOverlay = document.getElementById('santiagoOverlay');
  const mapTitle = document.getElementById('mapTitle');

  const intro = document.getElementById('intro');
  const cvInfo = document.getElementById('cv-info');
  const santiagoInfo = document.getElementById('santiago-info');

  if (!mapStage || !baseMap || !cvOverlay || !santiagoOverlay || !mapTitle) {
    console.warn('map-zoom.js: missing one or more required map elements. Check IDs in HTML.');
    return;
  }
  if (!intro || !cvInfo || !santiagoInfo) {
    console.warn('map-zoom.js: missing one or more content sections (intro, cv-info, santiago-info).');
    // continue — offsets will be guarded below
  }

  // Utility: linear interpolation
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Get normalized progress between two vertical positions
  function progressBetween(start, end, y) {
    if (typeof start !== 'number' || typeof end !== 'number') return 0;
    if (y <= start) return 0;
    if (y >= end) return 1;
    return (y - start) / (end - start);
  }

  // Offsets used as triggers
  let offsets = {
    stageTop: 0,
    introTop: 0,
    cvTop: 0,
    santiagoTop: 0,
    stageHeight: 0
  };

  function computeOffsets() {
    const vh = window.innerHeight;
    const stageRect = mapStage.getBoundingClientRect();
    const stageTop = window.scrollY + stageRect.top;

    // If any section is missing, use fallback positions spaced below the stage
    const fallbackGap = vh * 0.9;

    const introTopRaw = intro ? (intro.getBoundingClientRect().top + window.scrollY) : stageTop + fallbackGap;
    const cvTopRaw = cvInfo ? (cvInfo.getBoundingClientRect().top + window.scrollY) : introTopRaw + fallbackGap;
    const santiagoTopRaw = santiagoInfo ? (santiagoInfo.getBoundingClientRect().top + window.scrollY) : cvTopRaw + fallbackGap;

    // Expand the trigger window so transitions are slower and easier to see
    offsets = {
      stageTop,
      introTop: introTopRaw - vh * 0.45,       // start earlier
      cvTop: cvTopRaw + vh * 0.35,             // end later
      santiagoTop: santiagoTopRaw + vh * 0.55, // extend further
      stageHeight: stageRect.height
    };
  }

  // Apply transforms based on scroll
  function onScroll() {
    // Use a center reference slightly below center to make transitions start earlier visually
    const y = window.scrollY + window.innerHeight * 0.5;

    const p1 = progressBetween(offsets.introTop, offsets.cvTop, y);       // Africa -> Cape Verde
    const p2 = progressBetween(offsets.cvTop, offsets.santiagoTop, y);    // Cape Verde -> Santiago

    // Base map scale: 1 -> 1.9 during p1, then 1.9 -> 3.2 during p2
    let baseScale = 1;
    if (p1 > 0 && p1 <= 1) {
      baseScale = lerp(1, 1.9, p1);
    } else if (p2 > 0) {
      baseScale = lerp(1.9, 3.2, p2);
    }

    // Translate to focus on Cape Verde / Santiago
    // These are percent offsets relative to the image; tweak if your images need different centering
    let tx = 0, ty = 0;
    if (p1 > 0) {
      tx = lerp(0, -22, p1); // move left
      ty = lerp(0, -6, p1);  // move up slightly
    }
    if (p2 > 0) {
      tx = lerp(-22, -28, p2);
      ty = lerp(-6, -12, p2);
    }

    // Use translate3d for smoother GPU-accelerated transforms
    const baseTransform = `translate3d(-50%,-50%,0) scale(${baseScale}) translate3d(${tx}%, ${ty}%, 0)`;
    baseMap.style.transform = baseTransform;

    // CV overlay fades in during p1
    const cvOpacity = Math.min(1, Math.max(0, p1 * 1.05));
    cvOverlay.style.opacity = cvOpacity.toString();
    cvOverlay.style.transform = baseTransform;

    // Santiago overlay fades in during p2 and scales slightly more
    const sOp = Math.max(0, p2);
    santiagoOverlay.style.opacity = Math.min(1, sOp * 1.05).toString();
    const sScale = baseScale * (1 + sOp * 0.12);
    const sTransform = `translate3d(-50%,-50%,0) scale(${sScale}) translate3d(${tx}%, ${ty}%, 0)`;
    santiagoOverlay.style.transform = sTransform;

    // Update caption text depending on progress
    if (p2 > 0.6) {
      mapTitle.textContent = 'Santiago Island';
    } else if (p1 > 0.4) {
      mapTitle.textContent = 'Cape Verde';
    } else {
      mapTitle.textContent = 'Africa — Cape Verde';
    }
  }

  // rAF throttle
  let ticking = false;
  function handleScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  // Initialize after images and DOM are ready
  async function waitForImages(selector) {
    const imgs = Array.from(document.querySelectorAll(selector));
    const promises = imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });
    return Promise.all(promises);
  }

  async function init() {
    // Wait for map-layer images to load so sizes are accurate
    await waitForImages('.map-layer');

    // Compute offsets and render initial state
    computeOffsets();
    onScroll();

    // Events
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      computeOffsets();
      onScroll();
    });

    // If content changes dynamically, observe size changes on the stage and recompute
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => {
        computeOffsets();
        onScroll();
      });
      ro.observe(mapStage);
    }
  }

  // Start when DOM is ready (script tag uses defer in HTML)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init().catch(err => console.error('map-zoom init error:', err));
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      init().catch(err => console.error('map-zoom init error:', err));
    });
  }
})();
