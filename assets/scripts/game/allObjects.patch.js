(function(){
  // Adds a spider orb entry into the existing allobjects registry without modifying the huge source file.
  const id = "9901";
  const entry = {
    "type": "deco",
    "frame": "spider_orb.png",
    "gridW": 0,
    "gridH": 0,
    "can_color": false,
    "spriteW": 64,
    "spriteH": 64,
    "default_detail_color_channel": -1,
    "default_z_layer": 3,
    "default_z_order": 9,
    "editor": {
      "width": 32,
      "height": 32,
      "description": "Spider Orb (visual). Instantiate with window.__wd_spider_orb.create(scene,x,y,{scale:0.6})"
    }
  };

  function patchAllObjects() {
    try {
      if (typeof window.allobjects === 'function') {
        const orig = window.allobjects;
        window.allobjects = function() {
          const obj = orig();
          if (!obj[id]) obj[id] = entry;
          return obj;
        };
      } else if (window.allobjects && typeof window.allobjects === 'object') {
        if (!window.allobjects[id]) window.allobjects[id] = entry;
      } else {
        window.__all_objects_custom = window.__all_objects_custom || [];
        window.__all_objects_custom.push(entry);
      }
    } catch (e) {
      // ignore
    }
  }

  // Run on next tick in case allObjects hasn't been defined yet
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(patchAllObjects, 0);
  } else {
    window.addEventListener('DOMContentLoaded', patchAllObjects);
    setTimeout(patchAllObjects, 500);
  }

  // Also ensure the image is preloaded via the game's common preload hooks
  try {
    if (window.__wd_spider_orb && typeof window.__wd_spider_orb.registerPreload === 'function') {
      // registerPreload expects a function that will be called during preload with loader
      window.__wd_spider_orb.registerPreload(function(loaderCb) {
        try {
          // loaderCb is the preload callback; execute it with the game's loader if present
          if (typeof loaderCb === 'function') {
            // If the engine uses `this.load` style, the loader will be provided by the caller.
            // We just call the callback with Phaser's global loader if available.
            const loader = (window.game && window.game.load) ? window.game.load : (window && window.load ? window.load : null);
            loaderCb(loader);
          }
        } catch (e) {}
      });
    }
  } catch (e) {}
})();
