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

  // Robust surface finder using level objects / ground/ceiling tiles
  function findSurfaceY(scene, orb, facingUp) {
    try {
      const orbWorldX = orb._eeWorldX ?? orb._worldX ?? orb.x ?? 0;
      const orbBaseY = orb._eeBaseY ?? orb._baseY ?? orb.y ?? 0;
      const level = scene._level || scene.level || null;
      const candidates = [];
      if (level && Array.isArray(level.objects)) {
        for (const lo of level.objects) {
          if (!lo || typeof lo.x !== 'number' || typeof lo.y !== 'number') continue;
          const worldX = lo.x * 2;
          const worldY = lo.y * 2;
          const baseY = (typeof window.b === 'function') ? window.b(worldY) : ((typeof window.T === 'number') ? window.T - worldY : worldY);
          const halfW = (typeof lo.w === 'number' && lo.w > 0) ? lo.w / 2 : ((typeof lo.gridW === 'number' && window.a) ? (lo.gridW * window.a) / 2 : 32);
          candidates.push({ baseY, worldX, worldY, halfW, raw: lo });
        }
      }
      if (level) {
        for (const t of (level._groundTiles || [])) {
          if (!t) continue;
          const wx = t._worldX ?? t.x ?? 0;
          const by = t.y ?? ((typeof window.b === 'function') ? window.b(0) : 0);
          candidates.push({ baseY: by, worldX: wx, halfW: (t.width||64)/2, source: 'ground' });
        }
        for (const t of (level._ceilingTiles || [])) {
          if (!t) continue;
          const wx = t._worldX ?? t.x ?? 0;
          const by = t.y ?? ((typeof window.b === 'function') ? window.b(0) : 0);
          candidates.push({ baseY: by, worldX: wx, halfW: (t.width||64)/2, source: 'ceiling' });
        }
      }
      if (!candidates.length) return orbBaseY + (facingUp ? -160 : 160);
      const horizTol = 48;
      const overlap = candidates.filter(c => Math.abs((c.worldX||0) - orbWorldX) <= Math.max(horizTol, c.halfW || horizTol));
      const pool = overlap.length ? overlap : candidates;
      let chosen = null;
      if (facingUp) {
        const ups = pool.filter(c => (c.baseY || 0) < orbBaseY - 2);
        chosen = ups.length ? ups.reduce((a,b) => a.baseY > b.baseY ? a : b) : pool.reduce((a,b) => a.baseY < b.baseY ? a : b);
      } else {
        const downs = pool.filter(c => (c.baseY || 0) > orbBaseY + 2);
        chosen = downs.length ? downs.reduce((a,b) => a.baseY < b.baseY ? a : b) : pool.reduce((a,b) => a.baseY > b.baseY ? a : b);
      }
      return chosen ? chosen.baseY : (orbBaseY + (facingUp ? -160 : 160));
    } catch (e) {
      return orb._eeBaseY ?? orb.y ?? (orb.y + (facingUp ? -160 : 160));
    }
  }

  // Activation: expose so console or other code can call it
  function activateOrb(scene, orb) {
    try {
      if (!orb || !scene) return;
      if (orb.__wd_spider_used) return;
      orb.__wd_spider_used = true;
      let ang = 0;
      try { ang = typeof orb.angle === 'number' ? orb.angle : (typeof orb.rotation === 'number' ? orb.rotation * 180 / Math.PI : 0); } catch(e){}
      ang = ((ang % 360) + 540) % 360 - 180;
      const facingUp = (ang > 90 || ang < -90);
      const targetY = findSurfaceY(scene, orb, facingUp);
      const targetX = orb._eeWorldX ?? orb._worldX ?? orb.x ?? 0;
      const playerSprite = (scene.player && (scene.player.sprite || scene.player._sprite)) || scene._playerSprite || (window.player && window.player.sprite);
      if (playerSprite) {
        playerSprite.x = targetX;
        playerSprite.y = targetY;
        if (playerSprite.body) {
          try { if (typeof playerSprite.body.setVelocity === 'function') playerSprite.body.setVelocity(0,0); if (playerSprite.body.velocity){playerSprite.body.velocity.x=0;playerSprite.body.velocity.y=0;} } catch(e){}
        }
        try {
          if (scene.player && typeof scene.player.setGravityFlip === 'function') scene.player.setGravityFlip(facingUp);
          else if (scene.player && typeof scene.player.setFlipGravity === 'function') scene.player.setFlipGravity(facingUp);
          else if (scene.player && typeof scene.player.enterSpiderMode === 'function') scene.player.enterSpiderMode({ upsideDown: !!facingUp });
          else { if (scene.player) scene.player.flipGravity = !!facingUp; if (window.player) window.player.flipGravity = !!facingUp; }
        } catch(e){}
      } else {
        if (scene.player) scene.player.flipGravity = !!facingUp;
        if (window.player) window.player.flipGravity = !!facingUp;
      }
      try { const cam = scene.cameras && scene.cameras.main; if (cam && typeof cam.pan === 'function' && playerSprite) cam.pan(playerSprite.x, playerSprite.y, 200); } catch(e){}
      try { if (scene.tweens) scene.tweens.add({ targets: orb, alpha: 0, scale: 0.3, duration: 220, onComplete: ()=>{ try{ orb.destroy(); }catch{} } }); else orb.destroy(); } catch(e){ try{ orb.destroy(); }catch{} }
      console.log('spider orb activated', { facingUp, targetX, targetY });
    } catch (e) { console.error('activateOrb error', e); }
  }

  // Install a robust global pointer handler that works even if sprites aren't interactive or overlays exist
  function installGlobalHandler() {
    try {
      if (window.__wd_spider_global_installed) return;
      window.__wd_spider_global_installed = true;

      const handler = (ev) => {
        try {
          const scenes = window.game && window.game.scene && window.game.scene.scenes;
          if (!scenes || !scenes.length) return;
          // try to detect which scene contains orbs; prefer the first with orbs
          let chosen = null;
          for (const s of scenes) {
            if (!s || !s.children) continue;
            const list = s.children.list || [];
            if (list.some(n => n && (String(n.texture?.key) === 'spider_orb' || String(n.frame?.name) === 'spider_orb.png'))) { chosen = s; break; }
          }
          if (!chosen) chosen = scenes[0];
          const scene = chosen;

          // translate client coords to world coords using canvas and camera
          const el = document.elementFromPoint(ev.clientX, ev.clientY) || document.querySelector('canvas');
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const canvasX = ev.clientX - rect.left;
          const canvasY = ev.clientY - rect.top;
          const cam = scene.cameras && scene.cameras.main;
          let worldPoint = { x: canvasX, y: canvasY };
          if (cam && typeof cam.getWorldPoint === 'function') {
            try { worldPoint = cam.getWorldPoint(canvasX, canvasY); } catch(e) {}
          } else {
            const scrollX = cam && cam.scrollX ? cam.scrollX : 0;
            const scrollY = cam && cam.scrollY ? cam.scrollY : 0;
            worldPoint = { x: canvasX + scrollX, y: canvasY + scrollY };
          }

          // find orb at worldPoint
          const children = scene.children && scene.children.list ? scene.children.list : [];
          for (const c of children) {
            if (!c) continue;
            const key = String(c.texture?.key || '');
            const frame = String(c.frame?.name || '');
            if (key !== 'spider_orb' && frame !== 'spider_orb.png') continue;
            let hit = false;
            if (typeof c.getBounds === 'function') {
              const b = c.getBounds();
              if (b && typeof b.contains === 'function' && b.contains(worldPoint.x, worldPoint.y)) hit = true;
            } else {
              const dx = Math.abs((c.x || 0) - worldPoint.x);
              const dy = Math.abs((c.y || 0) - worldPoint.y);
              if (dx <= (c.displayWidth || 32)/2 && dy <= (c.displayHeight || 32)/2) hit = true;
            }
            if (hit) {
              ev.stopPropagation?.(); ev.preventDefault?.();
              activateOrb(scene, c);
              break;
            }
          }
        } catch (e) { /* swallow */ }
      };

      // Install on Phaser input if available (preferred) otherwise on document
      try {
        const scenes = window.game && window.game.scene && window.game.scene.scenes;
        if (scenes && scenes.length) {
          for (const s of scenes) {
            try {
              if (s && s.input && typeof s.input.on === 'function') s.input.on('pointerdown', handler, { capture: true });
            } catch (e) {}
          }
        }
        // Always attach to document as a fallback
        document.addEventListener('pointerdown', handler, { capture: true });
      } catch (e) {
        document.addEventListener('pointerdown', handler, { capture: true });
      }

      // expose activation to global for debugging
      window.__wd_spider_activate = activateOrb;
    } catch (e) {}
  }

  // Run on next tick
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => { patchAllObjects(); installGlobalHandler(); }, 0);
  } else {
    window.addEventListener('DOMContentLoaded', () => { patchAllObjects(); installGlobalHandler(); });
    setTimeout(() => { patchAllObjects(); installGlobalHandler(); }, 500);
  }

  // Also ensure image is preloaded via spiderOrb helper if present
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
