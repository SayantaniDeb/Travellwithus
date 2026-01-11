// Mobile viewport and input focus utilities
export const preventMobileZoom = () => {
  // Prevent zoom on input focus for iOS
  const handleFocus = (e) => {
    if (window.innerWidth < 768) {
      // Store current viewport scale
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no');
      }
    }
  };

  const handleBlur = (e) => {
    // Restore normal viewport after blur
    setTimeout(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5.0');
      }
    }, 300);
  };

  // Add event listeners to all input elements
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
  });

  // Prevent double-tap zoom on buttons and interactive elements
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Handle orientation changes
  window.addEventListener('orientationchange', () => {
    // Small delay to ensure viewport has updated
    setTimeout(() => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, 100);
  });

  // Set initial viewport height variable for mobile browsers
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVH();
  window.addEventListener('resize', setVH);
};

// Initialize mobile optimizations
export const initMobileOptimizations = () => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preventMobileZoom);
  } else {
    preventMobileZoom();
  }

  // Handle visual viewport API for better mobile experience
  if (window.visualViewport) {
    const updateViewportHeight = () => {
      // Update the --vh custom property when viewport changes
      const vh = window.visualViewport.height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Update on viewport resize (keyboard show/hide)
    window.visualViewport.addEventListener('resize', updateViewportHeight);

    // Initial update
    updateViewportHeight();
  } else {
    // Fallback for browsers without visualViewport API
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateViewportHeight, 100);
    });

    // Initial update
    updateViewportHeight();
  }

  // Prevent scroll when keyboard is open on iOS
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      // Small delay to ensure keyboard has appeared
      setTimeout(() => {
        if (window.visualViewport && window.visualViewport.height < window.innerHeight) {
          // Keyboard is visible, prevent body scroll
          document.body.style.position = 'fixed';
          document.body.style.width = '100%';
          document.body.style.top = '0';
        }
      }, 300);
    });

    input.addEventListener('blur', () => {
      // Restore normal scrolling
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    });
  });
};