import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if app is already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile (Android/Chrome)
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt (only for non-iOS devices)
      if (!iOS && !standalone) {
        setShowInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      // Hide the install prompt
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    // Only add beforeinstallprompt listener for non-iOS devices
    if (!iOS) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    } else if (!standalone && !localStorage.getItem('iosInstallPromptShown')) {
      // For iOS, show the prompt after some user interaction
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 10000); // Show after 10 seconds of being on the page

      return () => clearTimeout(timer);
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (!iOS) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Reset the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);

    if (outcome === 'accepted') {
      // User accepted the install prompt
    } else {
      // User dismissed the install prompt
    }
  };

  const handleIOSInstallClick = () => {
    // Mark that we've shown the iOS prompt
    localStorage.setItem('iosInstallPromptShown', 'true');
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    if (isIOS) {
      localStorage.setItem('iosInstallPromptShown', 'true');
    }
  };

  // Don't show prompt if already installed
  if (isStandalone || !showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {isIOS ? 'Add to Home Screen' : 'Install Travel With Us'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {isIOS
              ? 'Tap the share button below and select "Add to Home Screen" for the full app experience.'
              : 'Get the full experience with offline access and native app features.'
            }
          </p>
        </div>
        <div className="flex-shrink-0 flex space-x-2">
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            Not now
          </button>
          <button
            onClick={isIOS ? handleIOSInstallClick : handleInstallClick}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-md transition-colors"
          >
            {isIOS ? 'Got it' : 'Install'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;