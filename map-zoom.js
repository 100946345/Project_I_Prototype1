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


  /* ============================================================
     CHECK ELEMENTS
     ============================================================ */

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
     CAMERA SETTINGS
     ============================================================ */

  const SETTINGS = {

    /*
     ------------------------------------------------------------
     AFRICA
     ------------------------------------------------------------
    */

    africa: {
      startScale: 1.0,
      endScale: 1.18,

      startX: 0,
      startY: 0,

      endX: -3,
      endY: -1
    },


    /*
     ------------------------------------------------------------
     CAPE VERDE
     ------------------------------------------------------------
    */

    capeVerde: {

      startScale: 1.0,
      endScale: 1.45,

      startX: 0,
      startY: 0,

      endX: -3,
      endY: -2

    },


    /*
     ------------------------------------------------------------
     SANTIAGO
     ------------------------------------------------------------
    */

    santiago: {

      startScale: 1.0,
      endScale: 2.8,

      startX: 0,
      startY: 0,

      endX: -4,
      endY: -3

    },


    /*
     ------------------------------------------------------------
     SCROLL SECTIONS
     ------------------------------------------------------------
    */

    africaEnd: 0.25,

    capeVerdeStart: 0.25,
    capeVerdeEnd: 0.62,

    santiagoStart: 0.62,
    santiagoEnd: 1.0

  };


  /* ============================================================
     STATE
     ============================================================ */

  let targetProgress = 0;

  let currentProgress = 0;

  let raf = null;

  let lastTime = performance.now();


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


  function easeInOut(t) {

    t = clamp(t, 0, 1);

    return t < 0.5

      ? 4 * t * t * t

      : 1 - Math.pow(-2 * t + 2, 3) / 2;

  }


  /*
   * Smooth camera following.
   */

  function damp(
    current,
    target,
    lambda,
    deltaTime
  ) {

    return lerp(
      current,
      target,
      1 - Math.exp(
        -lambda * deltaTime
      )
    );

  }


  /*
   * Convert global scroll progress
   * into progress for a section.
   */

  function sectionProgress(
    progress,
    start,
    end
  ) {

    if (progress <= start) {
      return 0;
    }

    if (progress >= end) {
      return 1;
    }

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
      journey.offsetHeight -
      window.innerHeight;

    if (totalScrollable <= 0) {

      return 0;

    }


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
     CAMERA CREATION
     ============================================================ */

  function createCamera(
    scale,
    x,
    y
  ) {

    return {
      scale,
      x,
      y
    };

  }


  function interpolateCamera(
    start,
    end,
    progress
  ) {

    const t =
      easeInOut(
        clamp(progress, 0, 1)
      );


    return createCamera(

      lerp(
        start.scale,
        end.scale,
        t
      ),

      lerp(
        start.x,
        end.x,
        t
      ),

      lerp(
        start.y,
        end.y,
        t
      )

    );

  }


  /* ============================================================
     AFRICA CAMERA
     ============================================================ */

  function getAfricaCamera(progress) {

    const p =
      sectionProgress(
        progress,
        0,
        SETTINGS.africaEnd
      );


    return interpolateCamera(

      createCamera(
        SETTINGS.africa.startScale,
        SETTINGS.africa.startX,
        SETTINGS.africa.startY
      ),

      createCamera(
        SETTINGS.africa.endScale,
        SETTINGS.africa.endX,
        SETTINGS.africa.endY
      ),

      p

    );

  }


  /* ============================================================
     CAPE VERDE CAMERA
     ============================================================ */

  function getCapeVerdeCamera(progress) {

    const p =
      sectionProgress(
        progress,
        SETTINGS.capeVerdeStart,
        SETTINGS.capeVerdeEnd
      );


    return interpolateCamera(

      createCamera(
        SETTINGS.capeVerde.startScale,
        SETTINGS.capeVerde.startX,
        SETTINGS.capeVerde.startY
      ),

      createCamera(
        SETTINGS.capeVerde.endScale,
        SETTINGS.capeVerde.endX,
        SETTINGS.capeVerde.endY
      ),

      p

    );

  }


  /* ============================================================
     SANTIAGO CAMERA
     ============================================================ */

  function getSantiagoCamera(progress) {

    const p =
      sectionProgress(
        progress,
        SETTINGS.santiagoStart,
        SETTINGS.santiagoEnd
      );


    return interpolateCamera(

      createCamera(
        SETTINGS.santiago.startScale,
        SETTINGS.santiago.startX,
        SETTINGS.santiago.startY
      ),

      createCamera(
        SETTINGS.santiago.endScale,
        SETTINGS.santiago.endX,
        SETTINGS.santiago.endY
      ),

      p

    );

  }


  /* ============================================================
     APPLY TRANSFORM
     ============================================================ */

  function applyTransform(
    element,
    camera
  ) {

    if (!element) {
      return;
    }


    element.style.transform =

      "translate3d(-50%, -50%, 0) " +

      "translate3d(" +
      camera.x +
      "%, " +
      camera.y +
      "%, 0) " +

      "scale(" +
      camera.scale +
      ")";

  }


  /* ============================================================
     LAYER OPACITY
     ============================================================ */

  function updateLayers(progress) {

    let africaOpacity = 1;

    let capeVerdeOpacity = 0;

    let santiagoOpacity = 0;


    /*
     ------------------------------------------------------------
     AFRICA → CAPE VERDE
     ------------------------------------------------------------
    */

    if (
      progress >= 0.18 &&
      progress < 0.40
    ) {

      const p =
        sectionProgress(
          progress,
          0.18,
          0.40
        );


      capeVerdeOpacity =
        easeInOut(p);


      africaOpacity =
        1 - capeVerdeOpacity;

    }


    /*
     ------------------------------------------------------------
     CAPE VERDE HOLD
     ------------------------------------------------------------
    */

    else if (
      progress >= 0.40 &&
      progress < 0.56
    ) {

      africaOpacity = 0;

      capeVerdeOpacity = 1;

    }


    /*
     ------------------------------------------------------------
     CAPE VERDE → SANTIAGO
     ------------------------------------------------------------
    */

    else if (
      progress >= 0.56 &&
      progress < 0.78
    ) {

      const p =
        sectionProgress(
          progress,
          0.56,
          0.78
        );


      capeVerdeOpacity =
        1 - easeInOut(p);


      santiagoOpacity =
        easeInOut(p);


      africaOpacity = 0;

    }


    /*
     ------------------------------------------------------------
     SANTIAGO
     ------------------------------------------------------------
    */

    else if (progress >= 0.78) {

      africaOpacity = 0;

      capeVerdeOpacity = 0;

      santiagoOpacity = 1;

    }


    baseMap.style.opacity =
      africaOpacity;

    cvOverlay.style.opacity =
      capeVerdeOpacity;

    santiagoOverlay.style.opacity =
      santiagoOpacity;

  }


  /* ============================================================
     CAMERA RENDER
     ============================================================ */

  function render(progress) {

    /*
     ------------------------------------------------------------
     AFRICA
     ------------------------------------------------------------
    */

    const africaCamera =
      getAfricaCamera(progress);


    applyTransform(
      baseMap,
      africaCamera
    );


    /*
     ------------------------------------------------------------
     CAPE VERDE
     ------------------------------------------------------------
    */

    const capeVerdeCamera =
      getCapeVerdeCamera(progress);


    applyTransform(
      cvOverlay,
      capeVerdeCamera
    );


    /*
     ------------------------------------------------------------
     SANTIAGO
     ------------------------------------------------------------
    */

    const santiagoCamera =
      getSantiagoCamera(progress);


    applyTransform(
      santiagoOverlay,
      santiagoCamera
    );


    /*
     ------------------------------------------------------------
     LAYERS
     ------------------------------------------------------------
    */

    updateLayers(progress);


    /*
     ------------------------------------------------------------
     ATMOSPHERE
     ------------------------------------------------------------
    */

    if (atmosphere) {

      const atmosphereOpacity =
        clamp(
          (progress - 0.65) * 1.4,
          0,
          0.28
        );


      atmosphere.style.opacity =
        atmosphereOpacity;

    }


    /*
     ------------------------------------------------------------
     CAPTION
     ------------------------------------------------------------
    */

    updateCaption(progress);


    /*
     ------------------------------------------------------------
     PROGRESS BAR
     ------------------------------------------------------------
    */

    if (scrollProgress) {

      scrollProgress.style.width =
        (
          progress * 100
        ) + "%";

    }

  }


  /* ============================================================
     CAPTION
     ============================================================ */

  function updateCaption(progress) {

    if (progress < 0.20) {

      if (captionLocation) {
        captionLocation.textContent =
          "AFRICA";
      }

      if (mapTitle) {
        mapTitle.textContent =
          "Cape Verde";
      }

      if (mapSubtitle) {
        mapSubtitle.textContent =
          "A journey begins across the Atlantic";
      }

    }


    else if (progress < 0.45) {

      if (captionLocation) {
        captionLocation.textContent =
          "ATLANTIC OCEAN";
      }

      if (mapTitle) {
        mapTitle.textContent =
          "Approaching Cape Verde";
      }

      if (mapSubtitle) {
        mapSubtitle.textContent =
          "The islands emerge from the Atlantic";
      }

    }


    else if (progress < 0.70) {

      if (captionLocation) {
        captionLocation.textContent =
          "CABO VERDE";
      }

      if (mapTitle) {
        mapTitle.textContent =
          "Cape Verde";
      }

      if (mapSubtitle) {
        mapSubtitle.textContent =
          "The archipelago comes into view";
      }

    }


    else {

      if (captionLocation) {
        captionLocation.textContent =
          "SANTIAGO";
      }

      if (mapTitle) {
        mapTitle.textContent =
          "Santiago Island";
      }

      if (mapSubtitle) {
        mapSubtitle.textContent =
          "The journey arrives at the island";
      }

    }

  }


  /* ============================================================
     ANIMATION LOOP
     ============================================================ */

  function animate(time) {

    const deltaTime =
      Math.min(
        (time - lastTime) / 1000,
        0.05
      );


    lastTime = time;


    /*
     * Smoothly follow the user's scroll.
     */

    currentProgress =
      damp(
        currentProgress,
        targetProgress,
        8,
        deltaTime
      );


    render(
      currentProgress
    );


    raf =
      requestAnimationFrame(
        animate
      );

  }


  /* ============================================================
     SCROLL
     ============================================================ */

  function onScroll() {

    targetProgress =
      calculateScrollProgress();

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

          if (image.complete) {

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
     DEBUG
     ============================================================ */

  window.mapCameraDebug = {

    getProgress() {

      return {

        target:
          targetProgress,

        current:
          currentProgress

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
     INITIALIZE
     ============================================================ */

  async function init() {

    await waitForImages();


    /*
     * Initial scroll position.
     */

    targetProgress =
      calculateScrollProgress();


    currentProgress =
      targetProgress;


    render(
      currentProgress
    );


    /*
     * Scroll listener.
     */

    window.addEventListener(
      "scroll",
      onScroll,
      {
        passive: true
      }
    );


    /*
     * Resize listener.
     */

    window.addEventListener(
      "resize",
      onResize,
      {
        passive: true
      }
    );


    setupResizeObserver();


    /*
     * Start animation.
     */

    if (!raf) {

      raf =
        requestAnimationFrame(
          animate
        );

    }


    console.log(
      "Project I — cinematic map initialized."
    );

  }


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
      {
        once: true
      }
    );

  }

  else {

    init();

  }


}
)();
