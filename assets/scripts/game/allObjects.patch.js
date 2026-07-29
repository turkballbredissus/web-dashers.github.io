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

                      // Determine facing (up or down) from sprite angle/rotation
                      let ang = 0;
                      try {
                        if (typeof orbS.angle === 'number') ang = orbS.angle;
                        else if (typeof orbS.rotation === 'number') ang = orbS.rotation * 180 / Math.PI;
                      } catch (e) { ang = 0; }
                      // normalize to (-180,180]
                      ang = ((ang % 360) + 540) % 360 - 180;
                      const facingUp = (ang > 90 || ang < -90);

                      // Teleport player to the area orb is facing (up or down)
                      try {
                        const targetX = orbS.x || orbS._eeWorldX || (orbS.body && orbS.body.x) || 0;
                        const offset = 160; // pixels to teleport; tune this if you want different distance
                        const targetY = (orbS.y || orbS._eeBaseY || (orbS.body && orbS.body.y) || 0) + (facingUp ? -offset : offset);

                        // Move the player sprite
                        try {
                          playerS.x = targetX;
                          playerS.y = targetY;
                          // reset velocities if arcade body
                          if (playerS.body) {
                            try {
                              if (playerS.body.setVelocity) playerS.body.setVelocity(0, 0);
                              if (playerS.body.velocity) { playerS.body.velocity.x = 0; playerS.body.velocity.y = 0; }
                              // try to set gravity sign if possible
                              if (typeof playerS.body.setGravityY === 'function') {
                                const cur = (playerS.body.gravity && typeof playerS.body.gravity.y === 'number') ? Math.abs(playerS.body.gravity.y) : 600;
                                playerS.body.setGravityY(facingUp ? -Math.abs(cur) : Math.abs(cur));
                              }
                            } catch (e) {}
                          }
                        } catch (e) {}

                        // Attempt engine-specific API to set gravity/flip
                        try {
                          if (scene.player && typeof scene.player.setGravityFlip === 'function') {
                            scene.player.setGravityFlip(facingUp);
                          } else if (scene.player && typeof scene.player.setFlipGravity === 'function') {
                            scene.player.setFlipGravity(facingUp);
                          } else if (scene.player && typeof scene.player.setGravity === 'function') {
                            scene.player.setGravity(facingUp ? -1 : 1);
                          } else if (window.player && typeof window.player.setGravityFlip === 'function') {
                            window.player.setGravityFlip(facingUp);
                          } else {
                            if (scene.player) scene.player.flipGravity = !!facingUp;
                            if (window.player) window.player.flipGravity = !!facingUp;
                          }
                        } catch (e) {}

                      } catch (e) {}

                      // visual feedback & remove orb
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
