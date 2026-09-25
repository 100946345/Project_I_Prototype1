```javascript
/* ============================================================
   PROJECT I
   Cinematic Scroll Map Camera

   Journey:

   AFRICA
      ↓
   ATLANTIC
      ↓
   CAPE VERDE
      ↓
   SANTIAGO
      ↓
   DEEP ZOOM
   ============================================================ */

(function () {

  "use strict";


  /* ============================================================
     ELEMENTS
     ============================================================ */

  const journey =
    document.getElementById("mapJourney");

  const viewport =
    document.getElementById("mapViewport");

  const baseMap =
    document.getElementById("baseMap");

  const cvOverlay =
    document.getElementById("cvOverlay");

  const santiagoOverlay =
    document.getElementById("santiagoOverlay");

  const atmosphere =
    document.querySelector(".map-atmosphere");

  const captionLocation =
    document.getElementById("captionLocation");

  const mapTitle =
    document.getElementById("mapTitle");

  const mapSubtitle =
    document.getElementById("mapSubtitle");

  const scrollProgress =
    document.getElementById("scrollProgress");


  if (
    !journey ||
    !viewport ||
    !baseMap ||
    !cvOverlay ||
    !santiagoOverlay
  ) {

    console.warn(
      "Project I: map elements are missing."
    );

    return;

  }


  /* ============================================================
     SETTINGS
     ============================================================ */

  const SETTINGS = {

    /*
      Overall zoom.

      Change these if the final Santiago zoom
      needs to be stronger or weaker.
    */

    startScale: 1.0,

    atlanticScale: 1.18,

    capeVerdeScale: 2.05,

    santiagoScale: 4.0,


    /*
      Camera movement.

      These values are percentages relative
      to the center of the image.
    */

    startX: 0,
    startY: 0,

    atlanticX: -4,
    atlanticY: -1,

    capeVerdeX: -18,
    capeVerdeY: -5,

    santiagoX: -28,
    santiagoY: -13,


    /*
      How much of the scroll journey is allocated
      to each section.
    */

    africaEnd: 0.18,

    atlanticEnd: 0.42,

    capeVerdeEnd: 0.68,

    santiagoEnd: 1.0

  };


  /* ============================================================
     STATE
     ============================================================ */

  let targetProgress = 0;

  let currentProgress = 0;

  let raf = null;

  let lastScrollY = window.scrollY;

  let initialized = false;


  /* ============================================================
     MATH
     ============================================================ */

  function clamp(value, min, max) {

    return Math.min(
      Math.max(value, min),
      max
    );

  }


  function lerp(a, b, t) {

    return a + (b - a) * t;

  }


  /*
    Smooth easing.

    This gives the camera a cinematic acceleration
    and deceleration rather than a robotic linear movement.
  */

  function easeInOut(t) {

    t = clamp(t, 0, 1);

    return t < 0.5

      ? 4 * t * t * t

      : 1 - Math.pow(-2 * t + 2, 3) / 2;

  }


  /*
    Smoother interpolation for the actual camera.

    This is intentionally slower than the scroll position.
  */

  function damp(current, target, lambda, deltaTime) {

    return lerp(
      current,
      target,
      1 - Math.exp(-lambda * deltaTime)
    );

  }


  /*
    Convert global progress into a 0-1 value
    for an individual camera section.
  */

  function segmentProgress(
    progress,
    start,
    end
  ) {

    if (progress <= start) return 0;

    if (progress >= end) return 1;

    return (
      (progress - start) /
      (end - start)
    );

  }


  /* ============================================================
     SCROLL PROGRESS
     ============================================================ */

  function calculateScrollProgress() {

    const rect =
      journey.getBoundingClientRect();

    const totalScrollable =
      rect.height - window.innerHeight;

    if (totalScrollable <= 0) {

      return 0;

    }


    /*
      rect.top is negative once the user
      begins scrolling through the journey.
    */

    const traveled =
      clamp(
        -rect.top,
        0,
        totalScrollable
      );


    return clamp(
      traveled / totalScrollable,
      0,
      1
    );

  }


  /* ============================================================
     CAMERA PATH
     ============================================================ */

  function calculateCamera(progress) {

    let scale;
    let x;
    let y;


    /* ----------------------------------------------------------
       1. AFRICA
       ---------------------------------------------------------- */

    if (
      progress <=
      SETTINGS.africaEnd
    ) {

      const p =
        easeInOut(
          segmentProgress(
            progress,
            0,
            SETTINGS.africaEnd
          )
        );


      scale =
        lerp(
          SETTINGS.startScale,
          SETTINGS.atlanticScale,
          p
        );


      x =
        lerp(
          SETTINGS.startX,
          SETTINGS.atlanticX,
          p
        );


      y =
        lerp(
          SETTINGS.startY,
          SETTINGS.atlanticY,
          p
        );

    }


    /* ----------------------------------------------------------
       2. ATLANTIC → CAPE VERDE
       ---------------------------------------------------------- */

    else if (
      progress <=
      SETTINGS.atlanticEnd
    ) {

      const p =
        easeInOut(
          segmentProgress(
            progress,
            SETTINGS.africaEnd,
            SETTINGS.atlanticEnd
          )
        );


      scale =
        lerp(
          SETTINGS.atlanticScale,
          SETTINGS.capeVerdeScale,
          p
        );


      x =
        lerp(
          SETTINGS.atlanticX,
          SETTINGS.capeVerdeX,
          p
        );


      y =
        lerp(
          SETTINGS.atlanticY,
          SETTINGS.capeVerdeY,
          p
        );

    }


    /* ----------------------------------------------------------
       3. CAPE VERDE → SANTIAGO
       ---------------------------------------------------------- */

    else if (
      progress <=
      SETTINGS.capeVerdeEnd
    ) {

      const p =
        easeInOut(
          segmentProgress(
            progress,
            SETTINGS.atlanticEnd,
            SETTINGS.capeVerdeEnd
          )
        );


      scale =
        lerp(
          SETTINGS.capeVerdeScale,
          SETTINGS.santiagoScale,
          p
        );


      x =
        lerp(
          SETTINGS.capeVerdeX,
          SETTINGS.santiagoX,
          p
        );


      y =
        lerp(
          SETTINGS.capeVerdeY,
          SETTINGS.santiagoY,
          p
        );

    }


    /* ----------------------------------------------------------
       4. FINAL SANTIAGO ZOOM
       ---------------------------------------------------------- */

    else {

      const p =
        easeInOut(
          segmentProgress(
            progress,
            SETTINGS.capeVerdeEnd,
            SETTINGS.santiagoEnd
          )
        );


      /*
        Continue moving slightly deeper into Santiago.

        This is what makes the final part feel like
        the camera is entering the island rather than
        simply stopping at a fixed zoom level.
      */

      scale =
        lerp(
          SETTINGS.santiagoScale,
          SETTINGS.santiagoScale * 1.18,
          p
        );


      x =
        lerp(
          SETTINGS.santiagoX,
          SETTINGS.santiagoX - 2,
          p
        );


      y =
        lerp(
          SETTINGS.santiagoY,
          SETTINGS.santiagoY - 1.5,
          p
        );

    }


    return {
      scale,
      x,
      y
    };

  }


  /* ============================================================
     LAYER OPACITY
     ============================================================ */

  function calculateLayers(progress) {

    /*
      Cape Verde gradually appears during the Atlantic approach.
    */

    const cvStart = 0.12;
    const cvEnd = 0.52;


    let cvOpacity =
      segmentProgress(
        progress,
        cvStart,
        cvEnd
      );


    /*
      Start Santiago very subtly before the actual
      deep zoom so the transition feels continuous.
    */

    const santiagoStart = 0.46;
    const santiagoEnd = 0.78;


    let santiagoOpacity =
      segmentProgress(
        progress,
        santiagoStart,
        santiagoEnd
      );


    /*
      Smooth the opacity curves.
    */

    cvOpacity =
      easeInOut(cvOpacity);


    santiagoOpacity =
      easeInOut(santiagoOpacity);


    return {

      cvOpacity:
        clamp(cvOpacity, 0, 1),

      santiagoOpacity:
        clamp(santiagoOpacity, 0, 1)

    };

  }


  /* ============================================================
     APPLY CAMERA
     ============================================================ */

  function applyCamera(
    camera,
    layers
  ) {

    /*
      Main camera transform.

      translate3d is used instead of top/left
      so the browser can keep this mostly
      on the compositor.
    */

    const transform =

      "translate3d(" +
      "-50%, -50%, 0) " +

      "scale(" +
      camera.scale +
      ") " +

      "translate3d(" +
      camera.x +
      "%, " +
      camera.y +
      "%, 0)";


    baseMap.style.transform =
      transform;


    cvOverlay.style.transform =
      transform;


    /*
      Santiago gets a tiny additional scale
      during the final approach.
    */

    const santiagoScale =
      camera.scale *
      (
        1 +
        layers.santiagoOpacity * 0.08
      );


    santiagoOverlay.style.transform =

      "translate3d(-50%, -50%, 0) " +

      "scale(" +
      santiagoScale +
      ") " +

      "translate3d(" +
      camera.x +
      "%, " +
      camera.y +
      "%, 0)";


    /*
      Layer opacity.
    */

    cvOverlay.style.opacity =
      layers.cvOpacity;


    santiagoOverlay.style.opacity =
      layers.santiagoOpacity;


    /*
      During the deepest zoom,
      increase the atmosphere slightly.
    */

    if (atmosphere) {

      const atmosphereOpacity =
        clamp(
          (targetProgress - 0.62) * 1.5,
          0,
          0.32
        );

      atmosphere.style.opacity =
        atmosphereOpacity;

    }

  }


  /* ============================================================
     CAPTION
     ============================================================ */

  function updateCaption(progress) {

    if (
      progress < 0.20
    ) {

      captionLocation.textContent =
        "AFRICA";

      mapTitle.textContent =
        "Cape Verde";

      mapSubtitle.textContent =
        "A journey begins across the Atlantic";

    }


    else if (
      progress < 0.48
    ) {

      captionLocation.textContent =
        "ATLANTIC OCEAN";

      mapTitle.textContent =
        "Approaching Cape Verde";

      mapSubtitle.textContent =
        "The islands emerge from the Atlantic";

    }


    else if (
      progress < 0.75
    ) {

      captionLocation.textContent =
        "CABO VERDE";

      mapTitle.textContent =
        "Cape Verde";

      mapSubtitle.textContent =
        "The archipelago comes into view";

    }


    else {

      captionLocation.textContent =
        "SANTIAGO";

      mapTitle.textContent =
        "Santiago Island";

      mapSubtitle.textContent =
        "The journey arrives at the island";

    }

  }


  /* ============================================================
     ANIMATION LOOP
     ============================================================ */

  let previousTime = performance.now();


  function animate(time) {

    const delta =
      Math.min(
        (time - previousTime) / 1000,
        0.05
      );


    previousTime = time;


    /*
      Damp the camera progress.

      This creates inertia:
      the camera follows the user's scroll
      instead of snapping directly to it.
    */

    currentProgress =
      damp(
        currentProgress,
        targetProgress,
        7.5,
        delta
      );


    const camera =
      calculateCamera(
        currentProgress
      );


    const layers =
      calculateLayers(
        currentProgress
      );


    applyCamera(
      camera,
      layers
    );


    updateCaption(
      currentProgress
    );


    /*
      Progress bar follows the actual
      scroll position.
    */

    if (scrollProgress) {

      scrollProgress.style.width =
        (
          currentProgress * 100
        ) + "%";

    }


    raf =
      requestAnimationFrame(
        animate
      );

  }


  /* ============================================================
     SCROLL HANDLER
     ============================================================ */

  function onScroll() {

    targetProgress =
      calculateScrollProgress();


    /*
      Keep track of direction.
      This can be useful later for entering
      and leaving content sections.
    */

    const currentY =
      window.scrollY;


    const direction =
      currentY > lastScrollY
        ? 1
        : -1;


    document.documentElement
      .style
      .setProperty(
        "--scroll-direction",
        direction
      );


    lastScrollY =
      currentY;

  }


  /* ============================================================
     RESIZE
     ============================================================ */

  function onResize() {

    targetProgress =
      calculateScrollProgress();

  }


  /* ============================================================
     IMAGE LOADING
     ============================================================ */

  function waitForImages() {

    const images = [

      baseMap,
      cvOverlay,
      santiagoOverlay

    ];


    return Promise.all(

      images.map(
        image => {

          if (
            image.complete
          ) {

            return Promise.resolve();

          }


          return new Promise(
            resolve => {

              image.addEventListener(
                "load",
                resolve,
                { once: true }
              );


              image.addEventListener(
                "error",
                resolve,
                { once: true }
              );

            }
          );

        }
      )

    );

  }


  /* ============================================================
     RESIZE OBSERVER
     ============================================================ */

  function setupResizeObserver() {

    if (
      !("ResizeObserver" in window)
    ) {

      return;

    }


    const observer =
      new ResizeObserver(
        () => {

          onResize();

        }
      );


    observer.observe(
      viewport
    );


    observer.observe(
      journey
    );

  }


  /* ============================================================
     INITIALIZATION
     ============================================================ */

  async function init() {

    await waitForImages();


    /*
      Set initial state.
    */

    targetProgress =
      calculateScrollProgress();


    currentProgress =
      targetProgress;


    onScroll();


    /*
      Scroll listener.

      Passive = better browser scrolling performance.
    */

    window.addEventListener(
      "scroll",
      onScroll,
      {
        passive: true
      }
    );


    window.addEventListener(
      "resize",
      onResize,
      {
        passive: true
      }
    );


    setupResizeObserver();


    /*
      Start render loop.
    */

    if (!raf) {

      raf =
        requestAnimationFrame(
          animate
        );

    }


    initialized = true;


    console.log(
      "Project I — cinematic map initialized."
    );

  }


  /* ============================================================
     DEBUG HELPERS
     ============================================================ */

  window.mapCameraDebug = {

    getProgress() {

      return {

        target:
          targetProgress,

        current:
          currentProgress,

        camera:
          calculateCamera(
            currentProgress
          ),

        layers:
          calculateLayers(
            currentProgress
          )

      };

    },


    goTo(progress) {

      targetProgress =
        clamp(
          progress,
          0,
          1
        );

    }

  };


  /* ============================================================
     START
     ============================================================ */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );

  }

  else {

    init();

  }


})();
```
