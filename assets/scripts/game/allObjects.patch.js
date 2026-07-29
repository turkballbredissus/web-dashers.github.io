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
      "description": "Spider Orb (visual). Click to teleport up/down and toggle gravity."
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

  // Helper: find the nearest blocking surface above or below an orb
  function findSurfaceY(scene, orb, facingUp) {
    try {
      // orb world positions (many objects store _eeWorldX/_eeBaseY in this codebase)
      const orbWorldX = orb._eeWorldX !== undefined ? orb._eeWorldX : (orb._worldX !== undefined ? orb._worldX : orb.x || 0);
      const orbBaseY = orb._eeBaseY !== undefined ? orb._eeBaseY : (orb._eeBaseY !== undefined ? orb._eeBaseY : (orb._baseY !== undefined ? orb._baseY : orb.y || 0));

      const candidates = [];
      // include level ground/ceiling tiles if present
      try {
        const level = scene._level || (scene.level || null);
        if (level) {
          // ground tiles
          for (const t of (level._groundTiles || [])) {
            if (!t) continue;
            const wx = t._worldX !== undefined ? t._worldX : (t.x || 0);
            const wy = t.y || (typeof window.b === 'function' ? window.b(0) : 0);
            candidates.push({x: wx, y: wy, w: (t.width || 32), source: 'ground'});
          }
          for (const t of (level._ceilingTiles || [])) {
            if (!t) continue;
            const wx = t._worldX !== undefined ? t._worldX : (t.x || 0);
            const wy = t.y || (typeof window.b === 'function' ? window.b(0) : 0);
            candidates.push({x: wx, y: wy, w: (t.width || 32), source: 'ceiling'});
          }
        }
      } catch (e) {}

      // include visible sprites/objects that have world coordinates
      const children = (scene.children && scene.children.list) ? scene.children.list.slice() : [];
      for (const c of children) {
        if (!c) continue;
        // skip the orb itself
        if (c === orb) continue;
        // prefer precomputed world coordinates
        const wx = c._eeWorldX !== undefined ? c._eeWorldX : (c._worldX !== undefined ? c._worldX : (c.x !== undefined ? c.x : null));
        const by = c._eeBaseY !== undefined ? c._eeBaseY : (c._eeBaseY !== undefined ? c._eeBaseY : (c._baseY !== undefined ? c._baseY : (c.y !== undefined ? c.y : null)));
        if (wx === null || by === null) continue;
        // skip UI and very small helper sprites
        const tex = c.texture && c.texture.key ? String(c.texture.key) : '';
        if (!tex) continue;
        // compute approximate width for horizontal overlap check
        const w = (c.displayWidth || c.width || 32) / 2;
        candidates.push({x: wx, y: by, w, source: 'object', ref: c});
      }

      // filter candidates by horizontal overlap with orb
      const horizThreshold = 40; // allow some leeway
      const filtered = candidates.filter(c => Math.abs((c.x || 0) - orbWorldX) <= Math.max(horizThreshold, c.w || 32));
      if (filtered.length === 0) {
        // no candidate found; fallback to a world-edge: use ground or ceiling Y
        try {
          const level = scene._level || (scene.level || null);
          if (level) {
            // find lowest ground tile y and highest ceiling tile y
            const groundYs = (level._groundTiles || []).map(t => t.y || (typeof window.b === 'function' ? window.b(0) : 0)).filter(Boolean);
            const ceilingYs = (level._ceilingTiles || []).map(t => t.y || (typeof window.b === 'function' ? window.b(0) : 0)).filter(Boolean);
            if (facingUp) {
              // teleport to topmost ceiling if exists
              if (ceilingYs.length) return Math.min(...ceilingYs);
            } else {
              if (groundYs.length) return Math.max(...groundYs);
            }
          }
        } catch (e) {}
        // final fallback: use orbBaseY +/- offset
        return orbBaseY + (facingUp ? -160 : 160);
      }

      // choose nearest candidate vertically in the facing direction
      let chosen = null;
      if (facingUp) {
        // want candidate.y < orbBaseY, choose max
        const ups = filtered.filter(c => (c.y || 0) < orbBaseY - 2);
        if (ups.length) chosen = ups.reduce((a,b) => (a.y > b.y ? a : b));
        else chosen = filtered.reduce((a,b) => (a.y < b.y ? a : b)); // no above: pick top-most
      } else {
        const downs = filtered.filter(c => (c.y || 0) > orbBaseY + 2);
        if (downs.length) chosen = downs.reduce((a,b) => (a.y < b.y ? a : b));
        else chosen = filtered.reduce((a,b) => (a.y > b.y ? a : b)); // pick bottom-most
      }

      if (chosen) return chosen.y;
    } catch (e) {}
    // fallback
    try {
      const orbBaseY = orb._eeBaseY !== undefined ? orb._eeBaseY : orb.y || 0;
      return orbBaseY + (facingUp ? -160 : 160);
    } catch (e) { return 0; }
  }

  // Scene watcher: finds spider_orb sprites in scenes and wires click/overlap behavior
  function watchScenes() {
    try {
      if (!window.game || !window.game.scene) return;
      const scenes = window.game.scene.scenes || (window.game.scene._scenes ? window.game.scene._scenes : []);
      for (const scene of scenes) {
        if (!scene || scene.__wd_spider_patched) continue;
        scene.__wd_spider_patched = true;

        const scan = () => {
          try {
            if (!scene.children) return;
            const children = scene.children.list || [];
            for (const c of children) {
              if (!c || !c.texture) continue;
              const tex = (c.texture.key || (c.frame && c.frame.texture && c.frame.texture.key));
              if (!tex) continue;
              if (String(tex) === 'spider_orb' || String(c.frame && c.frame.name) === 'spider_orb.png') {
                if (c.__wd_spider_wired) continue;
                c.__wd_spider_wired = true;

                // Make interactive for click
                try {
                  if (c.setInteractive) {
                    c.setInteractive({ useHandCursor: true });
                    c.on('pointerdown', (pointer) => {
                      try {
                        handleOrbActivate(scene, c);
                      } catch (e) {}
                    });
                  }
                } catch (e) {}

                // Ensure physics body exists so overlap code (if wanted) can run
                try {
                  if (scene.physics && scene.physics.add && !c.body) {
                    scene.physics.add.existing(c);
                    if (c.body && c.body.setImmovable) c.body.setImmovable(true);
                    if (c.body && c.body.setAllowGravity) c.body.setAllowGravity(false);
                  }
                } catch (e) {}

                // Optional overlap-trigger (touch devices / auto-trigger)
                try {
                  const playerSprite = (scene.player && (scene.player.sprite || scene.player._sprite)) || scene._playerSprite || (scene.children && scene.children.getByName && scene.children.getByName('player')) || (window.player && window.player.sprite);
                  if (playerSprite && scene.physics && scene.physics.add) {
                    scene.physics.add.overlap(playerSprite, c, function(playerS, orbS) {
                      if (orbS.__wd_spider_used) return;
                      orbS.__wd_spider_used = true;
                      try { handleOrbActivate(scene, orbS, playerS); } catch (e) {}
                    });
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        };

        // Orb activation logic
        function handleOrbActivate(scene, orbSprite, explicitPlayerSprite) {
          try {
            // Prevent double-activation
            if (orbSprite.__wd_spider_used) return;
            orbSprite.__wd_spider_used = true;

            // Determine facing (up or down). We'll try angle first; if not present, default to down.
            let ang = 0;
            try {
              if (typeof orbSprite.angle === 'number') ang = orbSprite.angle;
              else if (typeof orbSprite.rotation === 'number') ang = orbSprite.rotation * 180 / Math.PI;
            } catch (e) { ang = 0; }
            // normalize to (-180,180]
            ang = ((ang % 360) + 540) % 360 - 180;
            const facingUp = (ang > 90 || ang < -90);

            // Find the surface Y to teleport to (block above/below, including ground/roof)
            const targetY = findSurfaceY(scene, orbSprite, facingUp);
            const targetX = orbSprite._eeWorldX !== undefined ? orbSprite._eeWorldX : (orbSprite._worldX !== undefined ? orbSprite._worldX : orbSprite.x || 0);

            // Resolve player sprite reference (explicit param or common names)
            const playerSprite = explicitPlayerSprite || (scene.player && (scene.player.sprite || scene.player._sprite)) || scene._playerSprite || (window.player && window.player.sprite);

            // Teleport the player and set gravity/flip
            if (playerSprite) {
              try {
                // Move to world coordinates; many parts of this engine use world coords doubled (level uses x*2), but player sprites are in screen coords — we set screen coords directly
                playerSprite.x = targetX;
                playerSprite.y = targetY;

                // Reset velocities if Arcade body
                if (playerSprite.body) {
                  try {
                    if (typeof playerSprite.body.setVelocity === 'function') playerSprite.body.setVelocity(0, 0);
                    if (playerSprite.body.velocity) { playerSprite.body.velocity.x = 0; playerSprite.body.velocity.y = 0; }
                  } catch (e) {}
                }

                // Try engine APIs to flip gravity / set mode
                try {
                  if (scene.player && typeof scene.player.setGravityFlip === 'function') {
                    scene.player.setGravityFlip(facingUp);
                  } else if (scene.player && typeof scene.player.setFlipGravity === 'function') {
                    scene.player.setFlipGravity(facingUp);
                  } else if (scene.player && typeof scene.player.setGravity === 'function') {
                    scene.player.setGravity(facingUp ? -1 : 1);
                  } else if (scene.player && typeof scene.player.enterSpiderMode === 'function') {
                    scene.player.enterSpiderMode({ upsideDown: !!facingUp });
                  } else if (window.player && typeof window.player.setGravityFlip === 'function') {
                    window.player.setGravityFlip(facingUp);
                  } else {
                    // Fallback: set flags and adjust physics body gravity if possible
                    if (scene.player) scene.player.flipGravity = !!facingUp;
                    if (window.player) window.player.flipGravity = !!facingUp;
                    if (playerSprite.body) {
                      try {
                        const curG = (playerSprite.body.gravity && typeof playerSprite.body.gravity.y === 'number') ? Math.abs(playerSprite.body.gravity.y) : 600;
                        if (typeof playerSprite.body.setGravityY === 'function') {
                          playerSprite.body.setGravityY(facingUp ? -Math.abs(curG) : Math.abs(curG));
                        } else if (playerSprite.body.gravity) {
                          playerSprite.body.gravity.y = facingUp ? -Math.abs(curG) : Math.abs(curG);
                        }
                      } catch (e) {}
                    }
                  }
                } catch (e) {}

              } catch (e) {}
            } else {
              // No player sprite found; still attempt engine-level API to set global gravity flip
              try {
                if (scene.player && typeof scene.player.setGravityFlip === 'function') {
                  scene.player.setGravityFlip(facingUp);
                } else if (window.player && typeof window.player.setGravityFlip === 'function') {
                  window.player.setGravityFlip(facingUp);
                } else {
                  if (scene.player) scene.player.flipGravity = !!facingUp;
                  if (window.player) window.player.flipGravity = !!facingUp;
                }
              } catch (e) {}
            }

            // Optional: adjust camera to center on new player position if camera API is available
            try {
              const cam = scene.cameras && scene.cameras.main;
              if (cam && typeof cam.pan === 'function' && playerSprite) {
                cam.pan(playerSprite.x, playerSprite.y, 200);
              } else if (cam && typeof cam.centerOn === 'function' && playerSprite) {
                cam.centerOn(playerSprite.x, playerSprite.y);
              }
            } catch (e) {}

            // Visual feedback & destroy orb
            try {
              if (scene.tweens) {
                scene.tweens.add({ targets: orbSprite, alpha: 0, scale: 0.3, duration: 220, onComplete: () => { try { orbSprite.destroy(); } catch (e) {} } });
              } else {
                orbSprite.destroy();
              }
            } catch (e) { try { orbSprite.destroy(); } catch (e) {} }
          } catch (e) {}
        }

        // Run initial scan and hook update/poll
        try { scan(); } catch (e) {}
        try {
          if (scene.events && typeof scene.events.on === 'function') {
            scene.events.on('update', scan);
          } else {
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
