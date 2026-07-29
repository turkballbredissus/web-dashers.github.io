(function () {
  // Key used in the Phaser cache
  const KEY = 'spider_orb';
  const PATH = 'assets/sprites/spider_orb.png';

  // Helper: attempt to hook into game's preload/load phase
  function tryHookLoader() {
    // Common pattern: the game may expose a global `game` or `GWDGame` or provide a loader event.
    try {
      // If there's a global phaser game instance already, and it has a load that hasn't run yet
      if (window.game && window.game.load && window.game.load.image) {
        // If load queue already completed we still add to cache on demand below
        window.game.load.image(KEY, PATH);
      }
    } catch (e) {
      // swallow — we'll rely on other strategies
    }
  }

  // Exposed register function: registers the image to be loaded when a loader function is called.
  function registerPreload(registerFn) {
    // registerFn is expected to be a function that accepts a callback to run during preload
    if (typeof registerFn === 'function') {
      try {
        registerFn(function preloadKey(loader) {
          // loader is typically Phaser's loader or `this.load` context
          if (loader && loader.image) {
            loader.image(KEY, PATH);
          }
        });
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Fallback: if no loader hook found, try to inject into a common loader collection
  if (!window.__wd_custom_preloads) {
    window.__wd_custom_preloads = [];
  }
  // push a function that, when the game's loader runs, will run our image add
  window.__wd_custom_preloads.push(function (loader) {
    try {
      if (loader && loader.image) {
        loader.image(KEY, PATH);
      } else if (window.game && window.game.load && window.game.load.image) {
        window.game.load.image(KEY, PATH);
      }
    } catch (e) {
      // no-op
    }
  });

  // Create function used to instantiate a spider orb in a Phaser scene
  // Options: {x, y, scene, scale, interactive}
  function createSpiderOrb(scene, x, y, opts) {
    opts = opts || {};
    if (!scene) throw new Error('createSpiderOrb requires a Phaser scene as first argument.');
    const key = KEY;
    // If the texture is not loaded, attempt to add it to cache directly from path (Phaser-level)
    if (!scene.textures.exists(key)) {
      try {
        scene.load.image(key, PATH);
        // start the loader and wait for completion if possible (non-blocking best-effort)
        scene.load.once('complete', function () {
          // create after loaded
        });
        scene.load.start();
      } catch (e) {
        // final fallback: create an empty placeholder graphic
      }
    }

    // Create sprite
    const sprite = scene.add.sprite(x || 0, y || 0, key);
    // Default scale
    sprite.setScale(typeof opts.scale === 'number' ? opts.scale : 0.5);
    // Enable Arcade physics if available
    if (scene.physics && scene.physics.add) {
      scene.physics.add.existing(sprite);
      // If physics body exists, set default properties
      if (sprite.body) {
        sprite.body.setAllowGravity(false);
        sprite.body.setImmovable(true);
      }
    }
    // Optionally make interactive for editor
    if (opts.interactive) {
      if (sprite.setInteractive) sprite.setInteractive();
    }
    // Tag for debugging
    sprite.__type = 'spider_orb';
    // Add a small bobbing tween so it looks alive (non-invasive)
    try {
      if (scene.tweens) {
        scene.tweens.add({
          targets: sprite,
          y: (y || 0) - 6,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } catch (e) { /* ignore */ }

    return sprite;
  }

  // Expose to the global namespace so the rest of the code can register/instantiate it.
  window.__wd_spider_orb = {
    key: KEY,
    path: PATH,
    registerPreload: registerPreload,
    create: createSpiderOrb
  };

  // Try opportunistic hook (best-effort)
  tryHookLoader();
})();
