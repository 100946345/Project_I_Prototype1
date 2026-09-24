// map-zoom.js
// Scroll-driven zoom: Africa -> Cape Verde -> Santiago
// Uses scroll position and section offsets to interpolate transforms.

(function () {
  const baseMap = document.getElementById('baseMap');
  const cvOverlay = document.getElementById('cvOverlay');
  const santiagoOverlay = document.getElementById('santiagoOverlay');
  const mapTitle = document.getElementById('mapTitle');

  // Sections that trigger stages
  const intro = document.getElementById('intro');
  const cvInfo = document.getElementById('cv-info');
  const santiagoInfo = document.getElementById('santiago-info');

  // Utility: linear interpolation
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Get normalized progress between two vertical positions
  function progressBetween(start, end, y) {
    if (y <= start) return 0;
    if (y >= end) return 1;
    return (y - start) / (end - start);
  }

  // Compute key offsets once (recompute on resize)
  let offsets = {};
  function computeOffsets() {
    const vh = window.innerHeight;
    const stageRect = document.getElementById('mapStage').getBoundingClientRect();
    const stageTop = window.scrollY + stageRect.top;
    offsets = {
      stageTop,
      introTop: intro.getBoundingClientRect().top + window.scrollY,
      cvTop: cvInfo.getBoundingClientRect().top + window.scrollY,
      santiagoTop: santiagoInfo.getBoundingClientRect().top + window.scrollY,
      stageHeight: stageRect.height
    };
  }

  // Apply transforms based on scroll
  function onScroll() {
    const y = window.scrollY + window.innerHeight * 0.5; // center reference
    // Stage 1: Africa -> Cape Verde (intro -> cvInfo)
    const p1 = progressBetween(offsets.introTop, offsets.cvTop, y);
    // Stage 2: Cape Verde -> Santiago (cvInfo -> santiagoInfo)
    const p2 = progressBetween(offsets.cvTop, offsets.santiagoTop, y);

    // Base map scale: from 1 -> 1.9 during p1, then 1.9 -> 3.2 during p2
    let baseScale = 1;
    if (p1 > 0 && p1 <= 1) {
      baseScale = lerp(1, 1.9, p1);
    } else if (p2 > 0) {
      baseScale = lerp(1.9, 3.2, p2);
    }

    // Translate to focus on Cape Verde during p1
    // These translate values are tuned for a typical Africa map image.
    // You may need to tweak translateX/Y to match your actual images.
    let tx = 0, ty = 0;
    if (p1 > 0) {
      tx = lerp(0, -22, p1); // percent of viewport
      ty = lerp(0, -6, p1);
    }
    if (p2 > 0) {
      // further nudge to Santiago
      tx = lerp(-22, -28, p2);
      ty = lerp(-6, -12, p2);
    }

    // Apply transform to base map
    baseMap.style.transform = `translate(-50%,-50%) scale(${baseScale}) translate(${tx}%, ${ty}%)`;

    // Overlay opacities and scales
    // CV overlay fades in during p1
    cvOverlay.style.opacity = Math.min(1, Math.max(0, p1 * 1.1));
    cvOverlay.style.transform = `translate(-50%,-50%) scale(${baseScale}) translate(${tx}%, ${ty}%)`;

    // Santiago overlay fades in during p2 and scales slightly more
    const sOp = Math.max(0, p2);
    santiagoOverlay.style.opacity = Math.min(1, sOp * 1.05);
    const sScale = baseScale * (1 + sOp * 0.12);
    santiagoOverlay.style.transform = `translate(-50%,-50%) scale(${sScale}) translate(${tx}%, ${ty}%)`;

    // Update caption text depending on progress
    if (p2 > 0.6) {
      mapTitle.textContent = 'Santiago Island';
    } else if (p1 > 0.4) {
      mapTitle.textContent = 'Cape Verde';
    } else {
      mapTitle.textContent = 'Africa — Cape Verde';
    }
  }

  // Throttle using requestAnimationFrame
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

  // Initialize
  function init() {
    computeOffsets();
    onScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => {
      computeOffsets();
      onScroll();
    });
  }

  // Wait for images to load to compute accurate sizes
  const imgs = document.querySelectorAll('.map-layer');
  let loaded = 0;
  imgs.forEach(img => {
    if (img.complete) {
      loaded++;
    } else {
      img.addEventListener('load', () => {
        loaded++;
        if (loaded === imgs.length) init();
      });
      img.addEventListener('error', () => {
        loaded++;
        if (loaded === imgs.length) init();
      });
    }
  });
  if (loaded === imgs.length) init();
})();
