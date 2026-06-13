function checkForAutoLoad() {
  const assetsLoaded = localStorage.getItem('webdash_assets_loaded') === 'true';
  const lastLoadTime = parseInt(localStorage.getItem('webdash_last_load_time') || '0');
  const now = Date.now();
  const hoursSinceLoad = (now - lastLoadTime) / (1000 * 60 * 60);
<<<<<<< HEAD
  if (assetsLoaded && hoursSinceLoad < 24 && window.gameCache && window.gameCache.shouldUseCachedFiles()) {
=======
  if (assetsLoaded && hoursSinceLoad < 24 && window.gameCache.isCacheValid()) {
>>>>>>> aa956f1977b0a896e7ab682fa357558c4dd2e42c
    const stats = window.gameCache.getCacheStats();
    if (stats.validEntries > 50) {
      console.log('auto loading from cache');
      return true;
    }
  }
  return false;
}
if (window.gameCache) {
  window.gameCache.init();
  const canAutoLoad = checkForAutoLoad();
  if (canAutoLoad) {
    const autoLoadIndicator = document.createElement('div');
    autoLoadIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #00ff00;
      color: #000;
      padding: 5px 10px;
      border-radius: 5px;
      font-family: Arial;
      font-size: 12px;
      z-index: 9999;
    `;
    autoLoadIndicator.textContent = 'turbo loading';
    document.body.appendChild(autoLoadIndicator);
    setTimeout(() => {
      if (autoLoadIndicator.parentNode) {
        autoLoadIndicator.parentNode.removeChild(autoLoadIndicator);
      }
    }, 3000);
  }
}
<<<<<<< HEAD
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
=======
>>>>>>> aa956f1977b0a896e7ab682fa357558c4dd2e42c
const phaserConfig = {
  type: Phaser.AUTO,
  width: screenWidth,
  height: screenHeight,
  resolution: 1,
  fps: {
    smoothStep: true
  },
  backgroundColor: "#000000",
  parent: document.body,
  input: {
    windowEvents: false
  },
  render: {
<<<<<<< HEAD
    powerPreference: "default",
    roundPixels: false,
    antialias: true,
    antialiasGL: true,
    pixelArt: false
=======
    powerPreference: "default"
>>>>>>> aa956f1977b0a896e7ab682fa357558c4dd2e42c
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, GameScene]
};
new Phaser.Game(phaserConfig);

window.clearGameCache = () => {
  if (window.gameCache) {
    window.gameCache.clearCache();
<<<<<<< HEAD
  }
  if (window.caches) {
    caches.keys()
      .then(names => Promise.all(names
        .filter(name => name.startsWith('webdash-runtime-cache'))
        .map(name => caches.delete(name))))
      .catch(() => {});
  }
  localStorage.removeItem('webdash_assets_loaded');
  localStorage.removeItem('webdash_last_load_time');
  localStorage.removeItem('webdash_first_localstorage_save');
  localStorage.removeItem('webdash_cache_ready');
  console.log('Game cache cleared');
  location.reload();
=======
    localStorage.removeItem('webdash_assets_loaded');
    localStorage.removeItem('webdash_last_load_time');
    console.log('Game cache cleared');
    location.reload();
  }
>>>>>>> aa956f1977b0a896e7ab682fa357558c4dd2e42c
};

window.getCacheInfo = () => {
  if (window.gameCache) {
    return window.gameCache.getCacheStats();
  }
  return null;
};
