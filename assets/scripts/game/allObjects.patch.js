(function(){
  // Register spider orb entries under both 9901 (alias) and the real GD ID 1331
  const id1 = "9901";
  const idReal = "1331";
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
    "internalName": "spider_orb",
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
          if (!obj[id1]) obj[id1] = entry;
          if (!obj[idReal]) obj[idReal] = entry;
          return obj;
        };
      } else if (window.allobjects && typeof window.allobjects === 'object') {
        if (!window.allobjects[id1]) window.allobjects[id1] = entry;
        if (!window.allobjects[idReal]) window.allobjects[idReal] = entry;
      } else {
        window.__all_objects_custom = window.__all_objects_custom || [];
        window.__all_objects_custom.push(entry);
        window.__all_objects_custom.push(Object.assign({id: idReal}, entry));
      }
    } catch (e) {
      // ignore
    }
  }

  // Scene watcher: finds spider_orb sprites in scenes and wires overlap to give the player spider mode
  function watchScenes() {
    try {
      if (!window.game || !window.game.scene) return;
      const scenes = window.game.scene.scenes || (window.game.scene._scenes ? window.game.scene._scenes : []);
      for (const scene of scenes) {
        if (!scene || scene.__wd_spider_patched) continue;
        scene.__wd_spider_patched = true;

        // Periodically scan for spider_orb sprites and attach overlap handlers
        const scan = () => {
          try {
            if (!scene.children || !scene.physics) return;
            const children = scene.children.list || [];
            for (const c of children) {
              if (!c || !c.texture) continue;
              const tex = (c.texture.key || (c.frame && c.frame.texture && c.frame.texture.key));
              if (!tex) continue;
              if (String(tex) === 'spider_orb' || String(c.frame && c.frame.name) === 'spider_orb.png') {
                if (c.__wd_spider_wired) continue;
                c.__wd_spider_wired = true;

                // Ensure physics body exists
                try {
                  if (scene.physics && scene.physics.add && !c.body) {
                    scene.physics.add.existing(c);
                    if (c.body && c.body.setImmovable) c.body.setImmovable(true);
                    if (c.body && c.body.setAllowGravity) c.body.setAllowGravity(false);
                  }
                } catch (e) {}

                // wire overlap with player sprite if present
                try {
                  // try common player reference names
                  const playerSprite = (scene.player && (scene.player.sprite || scene.player._sprite)) || scene._playerSprite || (scene.children && scene.children.getByName && scene.children.getByName('player')) || (window.player && window.player.sprite);
                  if (playerSprite && scene.physics && scene.physics.add) {
                    scene.physics.add.overlap(playerSprite, c, function(playerS, orbS) {
                      if (orbS.__wd_spider_used) return;
                      orbS.__wd_spider_used = true;

                      // Attempt to call an engine-specific hook to set spider mode
                      try {
                        if (scene.player && typeof scene.player.enterSpiderMode === 'function') {
                          scene.player.enterSpiderMode();
                        } else if (scene.player && typeof scene.player.setForm === 'function') {
                          scene.player.setForm('spider');
                        } else if (window.player && typeof window.player.enterSpiderMode === 'function') {
                          window.player.enterSpiderMode();
                        } else {
                          // Fallback: set a flag and apply a small bounce
                          if (playerS.body && playerS.body.setVelocityY) {
                            playerS.body.setVelocityY(-420);
                          }
                          if (scene.player) scene.player.isSpider = true;
                        }
                      } catch (e) {}

                      // visual feedback
                      try {
                        scene.tweens.add({ targets: orbS, alpha: 0, scale: 0.3, duration: 220, onComplete: () => { try { orbS.destroy(); } catch (e) {} } });
                      } catch (e) { try { orbS.destroy(); } catch (e) {} }
                    });
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        };

        // Run an initial scan and then set up an update hook
        try { scan(); } catch (e) {}
        try {
          if (scene.events && typeof scene.events.on === 'function') {
            scene.events.on('update', scan);
          } else {
            // fallback: poll
            scene.__wd_spider_interval = setInterval(scan, 500);
          }
        } catch (e) {
          scene.__wd_spider_interval = setInterval(scan, 500);
        }
      }
    } catch (e) {}
  }

  // Run on next tick in case allObjects hasn't been defined yet
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(patchAllObjects, 0);
    setTimeout(function(){ setInterval(watchScenes, 600); }, 200);
  } else {
    window.addEventListener('DOMContentLoaded', function(){ patchAllObjects(); setTimeout(function(){ setInterval(watchScenes, 600); }, 200); });
    setTimeout(patchAllObjects, 500);
    setTimeout(function(){ setInterval(watchScenes, 600); }, 2000);
  }

  // Also ensure the image is preloaded via the game's common preload hooks
  try {
    if (window.__wd_spider_orb && typeof window.__wd_spider_orb.registerPreload === 'function') {
      window.__wd_spider_orb.registerPreload(function(loaderCb) {
        try {
          const loader = (window.game && window.game.load) ? window.game.load : (window && window.load ? window.load : null);
          if (typeof loaderCb === 'function') loaderCb(loader);
        } catch (e) {}
      });
    }
  } catch (e) {}
})();
