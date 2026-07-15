/* Illumitati OS — desktop engine
   Replaces webflow.js (IX2 interactions), jQuery UI draggable and the
   Webflow lightbox with dependency-free vanilla JS.

   Windows:  .menu ("my work" launcher) / .work / .contact / .browserui
   Icons:    .draggable2 / .draggable3 (store, my work, minecraft, trash)
   Upgrades: pointer-events dragging (mouse + touch), bring-to-front
             focus, keyboard lightbox, working browser bar, click-to-skip. */

(function () {
  'use strict';

  /* Optional: point this at a Formspree/Basin/worker endpoint to receive
     contact form submissions. Empty = falls back to the visitor's mail app. */
  var CONTACT_ENDPOINT = '';
  var CONTACT_EMAIL = 'helpillumitati@gmail.com';

  var zTop = 10;

  function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

  /* scope = the visible desktop tree (Webflow ships a separate mobile DOM) */
  function scopeRoot() {
    return document.querySelector(isMobile() ? '.home-content-mobile' : '.home-content')
        || document;
  }

  function bringToFront(el) {
    el.style.zIndex = ++zTop;
    /* classic focus chrome: only the front window gets colored lights */
    if (el.matches && el.matches('.menu, .work, .contact, .browserui, .wikiwin, .aboutwin, .img-window')) {
      document.querySelectorAll('.win-front').forEach(function (w) {
        if (w !== el) w.classList.remove('win-front');
      });
      el.classList.add('win-front');
    }
  }

  /* ---------- window open / close (IX2: scale 0→1 in 250ms) ---------- */
  function openWindow(el) {
    if (!el) return;
    /* reopened via icon while minimized: retire its stale dock chip */
    if (el.__chip) { el.__chip.remove(); el.__chip = null; }
    /* contact window: bring the form back if a submit had replaced it */
    if (el.classList.contains('contact')) {
      var f = el.querySelector('form');
      if (f) f.style.display = '';
      el.querySelectorAll('.w-form-done.on, .w-form-fail.on').forEach(function (d) {
        d.classList.remove('on');
      });
    }
    el.classList.remove('win-anim-close');
    el.style.display = 'block';
    bringToFront(el);
    el.classList.add('win-anim-open');
    setTimeout(function () { el.classList.remove('win-anim-open'); }, 300);
  }

  function closeWindow(el) {
    if (!el || el.style.display === 'none') return;
    el.classList.remove('win-anim-open');
    el.classList.add('win-anim-close');
    setTimeout(function () {
      el.classList.remove('win-anim-close');
      el.style.display = 'none';
    }, 240);
  }

  function openInScope(selector) {
    openWindow(scopeRoot().querySelector(selector));
  }

  /* ---------------------- dragging (pointer events) ---------------------- */
  /* Returns true while a click should be suppressed because the user dragged. */
  function makeDraggable(el, handle) {
    var grip = handle || el;
    var sx, sy, ox, oy, dragging = false, moved = false, lim = null, downT = 0;

    grip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      /* let real controls work untouched */
      if (e.target.closest('input, textarea, select, button, .lightbox-link, .navsection img, .cancel, .submit')) {
        bringToFront(el.closest('.menu, .work, .contact, .browserui, .wikiwin, .aboutwin') || el);
        return;
      }
      dragging = true; moved = false;
      downT = e.timeStamp;
      sx = e.clientX; sy = e.clientY;
      var t = (el.style.translate || '0px 0px').split(' ');
      ox = parseFloat(t[0]) || 0;
      oy = parseFloat(t[1]) || 0;
      /* windows (dragged by a handle) may never leave the visible screen:
         keep the title bar reachable inside the glass recess */
      if (handle) {
        var rec = screenRecess();
        var hr = grip.getBoundingClientRect();
        lim = {
          minDy: rec.t - hr.top,
          maxDy: rec.b - 60 - hr.top,
          minDx: rec.l + 90 - hr.right,
          maxDx: rec.r - 90 - hr.left
        };
      } else {
        lim = null;
      }
      bringToFront(el);
      grip.setPointerCapture(e.pointerId);
    });

    grip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      /* higher threshold on touch — a finger tap jitters a few px and must NOT
         be misread as a drag (that would swallow the click and the icon would
         seem dead). Mouse stays precise. */
      var slop = e.pointerType === 'touch' ? 10 : 4;
      if (!moved && Math.abs(dx) + Math.abs(dy) < slop) return;
      moved = true;
      if (lim) {
        dx = Math.min(Math.max(dx, lim.minDx), lim.maxDx);
        dy = Math.min(Math.max(dy, lim.minDy), lim.maxDy);
      }
      el.style.translate = (ox + dx) + 'px ' + (oy + dy) + 'px';
    });

    function stop(e) {
      if (!dragging) return;
      dragging = false;
      try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
      /* a quick interaction is a TAP, never a drag — don't swallow its click
         even if a fat-finger tap jittered past the move threshold */
      var quickTap = (e.timeStamp - downT) < 250;
      if (moved && !quickTap) {
        /* swallow the click that follows a drag (auto-disarm if none fires),
           but never swallow clicks on window controls (traffic lights, etc.)
           so a quick close right after a drag still registers */
        var h = function (ev) {
          if (ev.target.closest('.navsection img, input, button, .cancel, .submit, a')) {
            grip.removeEventListener('click', h, true);
            return;
          }
          ev.stopPropagation(); ev.preventDefault();
          grip.removeEventListener('click', h, true);
        };
        grip.addEventListener('click', h, true);
        setTimeout(function () { grip.removeEventListener('click', h, true); }, 250);
      }
    }
    grip.addEventListener('pointerup', stop);
    grip.addEventListener('pointercancel', stop);
  }

  /* desktop icons: drag the whole icon */
  document.querySelectorAll('.draggable2, .draggable3').forEach(function (icon) {
    makeDraggable(icon);
  });

  /* windows: drag by title bar, focus on press anywhere */
  var WIN_SELECTOR = '.menu, .work, .contact, .browserui, .wikiwin, .aboutwin';
  document.querySelectorAll(WIN_SELECTOR).forEach(function (win) {
    var bar = win.querySelector('.home-navbar');
    if (bar) makeDraggable(win, bar);
    win.addEventListener('pointerdown', function () { bringToFront(win); });
  });

  /* Icons wrapped in <a> (minecraft, trash) started a NATIVE link drag after
     a couple pixels, which stole our pointer capture — that's why they'd move
     ~2px then freeze. Kill native dragging on images and links, and block
     dragstart anywhere inside the desktop. */
  document.querySelectorAll('img, a').forEach(function (el) { el.setAttribute('draggable', 'false'); });
  document.addEventListener('dragstart', function (e) {
    if (e.target.closest('.draggable2, .draggable3, .home-navbar, .menu, .work, .contact, .browserui, .wikiwin, .aboutwin')) {
      e.preventDefault();
    }
  });

  /* ------------------------- icon → window wiring ------------------------ */
  /* store / firefox icon opens the browser window */
  document.querySelectorAll('.browser .draggable3, .browser-copy .draggable3').forEach(function (icon) {
    icon.addEventListener('click', function () { openInScope('.browserui'); });
  });
  /* "my work" folder opens the launcher menu */
  document.querySelectorAll('.folder .draggable2, .folder-copy .draggable2').forEach(function (icon) {
    icon.addEventListener('click', function () { openInScope('.menu'); });
  });

  /* minecraft icon launches Minecraft Classic INSIDE the firefox window */
  document.querySelectorAll('.mc-launcher').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var url = a.dataset.mc || 'https://classic.minecraft.net/';
      if (a.classList.contains('dock-item')) {
        a.classList.add('bounce');
        setTimeout(function () { a.classList.remove('bounce'); }, 720);
      }
      /* desktop: open in the tabbed firefox window. mobile (no tabs): open a
         dedicated draggable window with the Minecraft site in an iframe. */
      if (window.IllumitatiBrowser && !isMobile()) {
        openInScope('.browserui');
        window.IllumitatiBrowser.open(url);
      } else {
        openSiteWindow(url, 'Minecraft', 'assets/mc.png');
      }
    });
  });

  /* launcher: WORK / CONTACT tiles */
  document.querySelectorAll('.home-options-item').forEach(function (item) {
    var label = (item.textContent || '').trim().toUpperCase();
    item.addEventListener('click', function (e) {
      e.preventDefault();
      openInScope(label.indexOf('WORK') !== -1 ? '.work' : '.contact');
    });
  });

  /* ---------------- traffic lights + resize, per window ------------------ */
  function containerOf(win) {
    return win.querySelector('.home-container, .home-container-copy, .browser-container, .contact-contaner, .wiki-container, .about-container, .img-window-container') || win;
  }

  function winIcon(win) {
    var c = win.classList;
    if (c.contains('img-window')) return win.dataset.icon || 'assets/folder.png';
    if (c.contains('browserui')) return 'assets/firefox_png.webp';
    if (c.contains('contact'))   return 'assets/3dgifmaker83671.gif';
    if (c.contains('wikiwin'))   return 'assets/512-TrashIcon-macosx1.png';
    if (c.contains('aboutwin'))  return 'assets/Tati-Contact-Sports-webp.png';
    return 'assets/folder.png';
  }

  function winTitle(win) {
    var t = win.querySelector('.text-block-7');
    return t ? t.textContent.trim() : 'Window';
  }

  function getTranslate(el) {
    var t = (el.style.translate || '').split(' ');
    return { x: parseFloat(t[0]) || 0, y: parseFloat(t[1]) || 0 };
  }

  /* yellow: genie-style minimize — the window squeezes into a funnel,
     stretches, and flows down into the dock; the chip restores it */
  function genieFrames(dx, dy) {
    /* skew leans the stream toward the dock target */
    var lean = Math.max(-14, Math.min(14, dx / 28));
    return [
      { transform: 'translate(0px, 0px) scale(1, 1) skewX(0deg)',
        opacity: 1, filter: 'blur(0px)', offset: 0, easing: 'cubic-bezier(.55,.05,.7,.2)' },
      { transform: 'translate(' + dx * 0.12 + 'px, ' + dy * 0.22 + 'px) scale(0.5, 1.12) skewX(' + lean + 'deg)',
        opacity: 0.95, filter: 'blur(0.5px)', offset: 0.38, easing: 'cubic-bezier(.4,.2,.7,.5)' },
      { transform: 'translate(' + dx * 0.55 + 'px, ' + dy * 0.72 + 'px) scale(0.16, 0.66) skewX(' + (-lean * 0.6) + 'deg)',
        opacity: 0.85, filter: 'blur(1px)', offset: 0.72, easing: 'cubic-bezier(.3,.4,.6,.9)' },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.04, 0.05) skewX(0deg)',
        opacity: 0.3, filter: 'blur(1.5px)', offset: 1 }
    ];
  }

  function minimizeWindow(win) {
    var shelf = document.getElementById('dock-minimized');
    var dockVisible = shelf && document.getElementById('os-dock') &&
      getComputedStyle(document.getElementById('os-dock')).display !== 'none';
    var chip = null;
    if (dockVisible) {
      chip = document.createElement('button');
      chip.className = 'dock-item';
      chip.title = winTitle(win);
      chip.innerHTML = '<img src="' + winIcon(win) + '" alt=""/>';
      shelf.appendChild(chip);
    }
    var from = containerOf(win).getBoundingClientRect();
    var to = chip ? chip.getBoundingClientRect()
                  : { left: innerWidth / 2 - 20, top: innerHeight * 0.85, width: 40, height: 40 };
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);

    /* run fn exactly once — on animation finish, or on timeout as fallback */
    function afterAnim(anim, ms, fn) {
      var done = false;
      var run = function () { if (!done) { done = true; fn(); } };
      anim.onfinish = run;
      setTimeout(run, ms);
    }

    win.style.transformOrigin = '50% 85%';
    win.__chip = chip;                     /* so reopening via icon can clear it */
    var anim = win.animate(genieFrames(dx, dy), { duration: 520, fill: 'forwards' });
    afterAnim(anim, 600, function () {
      win.style.display = 'none';
      anim.cancel();                       /* drop the forwards fill once hidden */
      win.style.transformOrigin = '';      /* don't skew later open/close anims */
    });

    if (chip) chip.addEventListener('click', function () {
      chip.remove();
      win.__chip = null;
      win.style.display = 'block';
      bringToFront(win);
      /* reverse genie: pour back out of the dock into place */
      win.style.transformOrigin = '50% 85%';
      var back = win.animate(genieFrames(dx, dy), { duration: 480, direction: 'reverse', fill: 'backwards' });
      afterAnim(back, 560, function () {
        back.cancel();
        win.style.transformOrigin = '';
      });
    });
  }

  /* the bezel's glass recess (visible screen), in viewport px — constants
     measured from the border PNGs' alpha channels */
  function screenRecess() {
    var w = innerWidth, h = innerHeight;
    return isMobile()
      ? { l: w * 0.063, r: w * 0.937, t: h * 0.080, b: h * 0.913 }
      : { l: w * 0.062, r: w * 0.939, t: h * 0.082, b: h * 0.914 };
  }

  /* green: zoom to fill the visible screen (toggle back restores) */
  var zoomState = new WeakMap();
  function zoomWindow(win) {
    var box = containerOf(win);
    var prev = zoomState.get(win);
    if (prev) {
      box.style.cssText = prev.box;
      win.style.translate = prev.translate;
      zoomState.delete(win);
      return;
    }
    zoomState.set(win, { box: box.style.cssText, translate: win.style.translate || '' });

    var rec = screenRecess();
    var barH = 38;                              /* stay below the menu bar */
    var w = rec.r - rec.l - 16;
    var h = rec.b - rec.t - barH - 14;

    /* size instantly (no transition) so the rect we measure is final */
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.maxWidth = 'none';
    box.style.maxHeight = 'none';
    box.style.minWidth = '0';
    void box.offsetWidth;                       /* force reflow before measuring */

    var r = box.getBoundingClientRect();
    var t = getTranslate(win);
    win.style.translate = (t.x + rec.l + 8 - r.left) + 'px ' +
                          (t.y + rec.t + barH + 6 - r.top) + 'px';
  }

  /* corner grip: live resize */
  function makeResizable(win) {
    var box = containerOf(win);
    var grip = document.createElement('div');
    grip.className = 'win-resizer';
    box.appendChild(grip);
    var sx, sy, sw, sh, resizing = false;

    grip.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      resizing = true;
      sx = e.clientX; sy = e.clientY;
      var r = box.getBoundingClientRect();
      sw = r.width; sh = r.height;
      box.style.maxWidth = 'none';
      box.style.maxHeight = 'none';
      box.style.minWidth = '0';
      box.style.minHeight = '0';
      bringToFront(win);
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', function (e) {
      if (!resizing) return;
      box.style.width = Math.max(300, sw + e.clientX - sx) + 'px';
      box.style.height = Math.max(200, sh + e.clientY - sy) + 'px';
    });
    function stop(e) {
      if (!resizing) return;
      resizing = false;
      try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    grip.addEventListener('pointerup', stop);
    grip.addEventListener('pointercancel', stop);
  }

  document.querySelectorAll(WIN_SELECTOR).forEach(function (win) {
    var dots = win.querySelectorAll('.navsection img');
    if (dots[0]) dots[0].addEventListener('click', function (e) { e.stopPropagation(); closeWindow(win); });
    if (dots[1]) dots[1].addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(win); });
    if (dots[2]) dots[2].addEventListener('click', function (e) { e.stopPropagation(); zoomWindow(win); });
    makeResizable(win);
  });

  /* contact form: Cancel closes, Submit sends */
  document.querySelectorAll('.contact').forEach(function (win) {
    var cancel = win.querySelector('.cancel');
    if (cancel) cancel.addEventListener('click', function () { closeWindow(win); });

    var form = win.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inputs = form.querySelectorAll('input.text-field-2');
      var name = inputs[0] ? inputs[0].value : '';
      var email = inputs[1] ? inputs[1].value : '';
      var msg = inputs[2] ? inputs[2].value : '';
      var done = win.querySelector('.w-form-done');
      var fail = win.querySelector('.w-form-fail');

      function ok()  { form.style.display = 'none'; if (done) done.classList.add('on'); }
      function bad() { if (fail) fail.classList.add('on'); }

      if (CONTACT_ENDPOINT) {
        fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, message: msg })
        }).then(function (r) { r.ok ? ok() : bad(); }).catch(bad);
      } else {
        location.href = 'mailto:' + CONTACT_EMAIL +
          '?subject=' + encodeURIComponent('Website contact from ' + name) +
          '&body=' + encodeURIComponent(msg + '\n\n— ' + name + ' (' + email + ')');
        ok();
      }
    });
  });

  /* ------------- work images open as draggable Preview windows ----------- */
  /* wire drag / resize / traffic-lights on a dynamically created window,
     reusing the same helpers the built-in windows use */
  function wireWindow(win) {
    var bar = win.querySelector('.home-navbar');
    if (bar) makeDraggable(win, bar);
    win.addEventListener('pointerdown', function () { bringToFront(win); });
    var dots = win.querySelectorAll('.navsection img');
    if (dots[0]) dots[0].addEventListener('click', function (e) { e.stopPropagation(); closeWindow(win); });
    if (dots[1]) dots[1].addEventListener('click', function (e) { e.stopPropagation(); minimizeWindow(win); });
    if (dots[2]) dots[2].addEventListener('click', function (e) { e.stopPropagation(); zoomWindow(win); });
    makeResizable(win);
  }

  var imgWinCount = 0;
  function openImageWindow(src, title) {
    var win = document.createElement('div');
    win.className = 'img-window';
    win.dataset.icon = src;                 /* dock chip shows a thumbnail */
    win.innerHTML =
      '<div class="img-window-container">' +
        '<div class="home-navbar"><div class="navwrap"><div class="div-block-6">' +
          '<div class="navsection"><img class="x" src="assets/red.png" alt=""/>' +
          '<img class="image-6" src="assets/Clear.png" alt=""/>' +
          '<img class="image-6" src="assets/Clear.png" alt=""/></div>' +
          '<div class="navsection2"><div class="text-block-7"></div></div>' +
          '<div class="navsection3"></div>' +
        '</div></div></div>' +
        '<div class="img-window-body"><img alt="" draggable="false"/></div>' +
      '</div>';
    win.querySelector('.text-block-7').textContent = title;
    var container = win.querySelector('.img-window-container');
    var bodyImg = win.querySelector('.img-window-body img');

    scopeRoot().appendChild(win);
    wireWindow(win);

    /* red dot on an image window removes it from the DOM after closing */
    var redDot = win.querySelector('.navsection img');
    redDot.addEventListener('click', function () {
      setTimeout(function () { win.remove(); }, 260);
    });

    function place() {
      var natW = bodyImg.naturalWidth || 640, natH = bodyImg.naturalHeight || 460;
      var navH = 34;
      var maxW = innerWidth * 0.7, maxH = innerHeight * 0.66;
      var scale = Math.min(1, maxW / natW, maxH / natH);
      var w = Math.max(240, Math.round(natW * scale));
      var h = Math.round(natH * scale) + navH;
      container.style.width = w + 'px';
      container.style.height = h + 'px';
      /* cascade each new window down-right from a top-centered start */
      var off = (imgWinCount++ % 6) * 26;
      win.style.left = Math.round(Math.max(innerWidth * 0.06, (innerWidth - w) / 2) + off) + 'px';
      win.style.top = Math.round(innerHeight * 0.14 + off) + 'px';
    }
    if (bodyImg.complete && bodyImg.naturalWidth) place();
    else bodyImg.addEventListener('load', place, { once: true });
    bodyImg.src = src;

    bringToFront(win);
    win.classList.add('win-anim-open');
    setTimeout(function () { win.classList.remove('win-anim-open'); }, 300);
  }

  /* a draggable window hosting an iframe (used for Minecraft on mobile,
     where there's no tabbed browser) */
  var siteWinCount = 0;
  function openSiteWindow(url, title, icon) {
    var existing = document.querySelector('.site-window[data-url="' + url + '"]');
    if (existing) { existing.style.display = 'block'; bringToFront(existing); return; }

    var win = document.createElement('div');
    win.className = 'site-window img-window';   /* reuse img-window styling/wiring */
    win.dataset.url = url;
    win.dataset.icon = icon || 'assets/mc.png';
    win.innerHTML =
      '<div class="img-window-container">' +
        '<div class="home-navbar"><div class="navwrap"><div class="div-block-6">' +
          '<div class="navsection"><img class="x" src="assets/red.png" alt=""/>' +
          '<img class="image-6" src="assets/Clear.png" alt=""/>' +
          '<img class="image-6" src="assets/Clear.png" alt=""/></div>' +
          '<div class="navsection2"><div class="text-block-7"></div></div>' +
          '<div class="navsection3"></div>' +
        '</div></div></div>' +
        '<div class="site-window-body"><iframe title="" ' +
          'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"></iframe></div>' +
      '</div>';
    win.querySelector('.text-block-7').textContent = title;
    win.querySelector('iframe').src = url;
    scopeRoot().appendChild(win);
    wireWindow(win);

    win.querySelector('.navsection img').addEventListener('click', function () {
      setTimeout(function () { win.remove(); }, 260);
    });

    var container = win.querySelector('.img-window-container');
    var w = Math.min(innerWidth * 0.9, 900);
    var h = Math.min(innerHeight * 0.78, 640);
    container.style.width = w + 'px';
    container.style.height = h + 'px';
    var off = (siteWinCount++ % 5) * 22;
    win.style.left = Math.round(Math.max(innerWidth * 0.05, (innerWidth - w) / 2) + off) + 'px';
    win.style.top = Math.round(innerHeight * (isMobile() ? 0.13 : 0.12) + off) + 'px';

    bringToFront(win);
    win.classList.add('win-anim-open');
    setTimeout(function () { win.classList.remove('win-anim-open'); }, 300);
  }

  document.querySelectorAll('.work-grid .cmswrap').forEach(function (w) {
    w.addEventListener('click', function (e) {
      e.preventDefault();
      var img = w.querySelector('img');
      var cap = w.querySelector('.cms-text-highlight');
      openImageWindow(img ? img.src : '', cap ? cap.textContent.trim() : 'Image');
    });
  });

  /* ------------------------ store: product modal ------------------------- */
  document.querySelectorAll('.big-cats_card').forEach(function (card) {
    var modal = card.querySelector('.big-cats_modal');
    if (!modal) return;
    card.addEventListener('click', function (e) {
      if (e.target.closest('.big-cats_modal')) return;
      modal.style.display = 'flex';
      modal.style.opacity = '0';
      requestAnimationFrame(function () { modal.style.opacity = '1'; });
      initShopify(modal);
    });
    /* back arrow closes */
    modal.querySelectorAll('img[src*="arrow"]').forEach(function (arrow) {
      arrow.addEventListener('click', function (e) {
        e.stopPropagation();
        modal.style.opacity = '0';
        setTimeout(function () { modal.style.display = 'none'; }, 200);
      });
    });
  });

  /* Shopify buy button (the user's own storefront) */
  var shopifyLoaded = false;
  function initShopify(modal) {
    var mount = modal.querySelector('div[id^="product-component"]');
    if (!mount || mount.children.length) return;
    mount.style.display = 'block';

    function build() {
      var client = window.ShopifyBuy.buildClient({
        domain: 'ed04f5.myshopify.com',
        storefrontAccessToken: '0a091cfaa04dc890ee7e4d3b528b299b'
      });
      window.ShopifyBuy.UI.onReady(client).then(function (ui) {
        ui.createComponent('product', {
          id: '10018037006636',
          node: mount,
          moneyFormat: '%24%7B%7Bamount%7D%7D',
          options: {
            product: {
              contents: { img: false, title: false, price: false },
              text: { button: 'Buy now' },
              buttonDestination: 'checkout',
              styles: {
                button: {
                  'font-weight': 'bold',
                  'color': '#030303',
                  'background-color': '#ffffff',
                  ':hover': { 'color': '#030303', 'background-color': '#e6e6e6' },
                  ':focus': { 'background-color': '#e6e6e6' },
                  'border-radius': '0px',
                  'padding-left': '39px',
                  'padding-right': '39px'
                }
              }
            },
            cart: {
              text: { total: 'Subtotal', button: 'Checkout' },
              styles: {
                button: {
                  'font-weight': 'bold', 'color': '#030303',
                  'background-color': '#ffffff',
                  ':hover': { 'color': '#030303', 'background-color': '#e6e6e6' },
                  ':focus': { 'background-color': '#e6e6e6' },
                  'border-radius': '0px'
                }
              }
            }
          }
        });
      });
    }

    if (window.ShopifyBuy && window.ShopifyBuy.UI) { build(); return; }
    if (shopifyLoaded) { return; }
    shopifyLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
    s.onload = build;
    document.head.appendChild(s);
  }

  /* ---------------------- trash: wiki window ----------------------------- */
  function openWiki() {
    var win = document.querySelector('.wikiwin');
    if (!win) return;
    var frame = win.querySelector('iframe');
    if (frame && !frame.src) frame.src = frame.dataset.src;  /* lazy: load wiki on first open */
    openWindow(win);
  }
  document.querySelectorAll('.trash-launcher').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      openWiki();
    });
  });

  /* ---------------------- desktop icon selection ------------------------- */
  document.querySelectorAll('.draggable2, .draggable3').forEach(function (icon) {
    icon.addEventListener('pointerdown', function () {
      document.querySelectorAll('.draggable2.selected, .draggable3.selected')
        .forEach(function (o) { if (o !== icon) o.classList.remove('selected'); });
      icon.classList.add('selected');
    });
  });
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest('.draggable2, .draggable3')) {
      document.querySelectorAll('.draggable2.selected, .draggable3.selected')
        .forEach(function (o) { o.classList.remove('selected'); });
    }
  });

  /* ------------------------- menu bar + dock ----------------------------- */
  function openByName(name) {
    if (name === 'wikiwin') { openWiki(); return; }
    if (name === 'aboutwin') { openWindow(document.querySelector('.aboutwin')); return; }
    openInScope('.' + name);
  }

  /* menu items / dock tiles with data-open (dropdown items wire separately) */
  document.querySelectorAll('[data-open]').forEach(function (el) {
    if (el.closest('.os-dropdown')) return;
    el.addEventListener('click', function () {
      openByName(el.dataset.open);
      /* dock icons do the classic launch bounce */
      if (el.classList.contains('dock-item')) {
        el.classList.add('bounce');
        setTimeout(function () { el.classList.remove('bounce'); }, 720);
      }
    });
  });

  var apple = document.getElementById('os-apple-menu');
  var screenOff = document.getElementById('screen-off');

  function closeAllDropdowns() {
    document.querySelectorAll('.os-dropdown.open').forEach(function (d) { d.classList.remove('open'); });
    document.querySelectorAll('.os-menu-btn.open').forEach(function (b) { b.classList.remove('open'); });
    if (apple) apple.classList.remove('open');
  }

  /* run a dropdown command (shared by Finder / File menus) */
  function runMenuCommand(item) {
    if (item.dataset.open) { openByName(item.dataset.open); return; }
    if (item.dataset.act === 'about') { openByName('aboutwin'); return; }
    if (item.dataset.act === 'closefront') {
      var front = document.querySelector('.win-front');
      if (front && front.style.display !== 'none') closeWindow(front);
    }
  }

  /* wire a menu-bar item to its dropdown (Finder, File, …) */
  function wireMenu(triggerId, dropId) {
    var trigger = document.getElementById(triggerId);
    var drop = document.getElementById(dropId);
    if (!trigger || !drop) return;
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !drop.classList.contains('open');
      closeAllDropdowns();                 /* only one menu open at a time */
      if (willOpen) {
        var fr = trigger.getBoundingClientRect();
        drop.style.left = Math.round(fr.left) + 'px';
        drop.style.top = Math.round(fr.bottom + 4) + 'px';
        trigger.classList.add('open');
      }
      drop.classList.toggle('open', willOpen);
    });
    trigger.addEventListener('mouseenter', function () {
      /* classic behavior: once a menu is open, hovering siblings switches to it */
      if (!document.querySelector('.os-dropdown.open')) return;
      if (drop.classList.contains('open')) return;
      trigger.click();
    });
    drop.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('.os-drop-item');
      if (!item) return;
      closeAllDropdowns();
      runMenuCommand(item);
    });
  }
  wireMenu('os-finder-menu', 'os-finder-dropdown');
  wireMenu('os-file-menu', 'os-file-dropdown');

  /* apple menu dropdown (lives outside the clipped menubar) */
  var dropdown = document.getElementById('os-dropdown');

  if (apple && dropdown) {
    apple.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !dropdown.classList.contains('open');
      closeAllDropdowns();                 /* only one menu open at a time */
      if (willOpen) {
        /* anchor flush under the apple item (its rect includes the curve shift) */
        var a = apple.getBoundingClientRect();
        dropdown.style.left = Math.round(a.left) + 'px';
        dropdown.style.top = Math.round(a.bottom + 4) + 'px';
      }
      dropdown.classList.toggle('open', willOpen);
      apple.classList.toggle('open', willOpen);
    });
    dropdown.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('.os-drop-item');
      if (!item) return;
      dropdown.classList.remove('open');
      apple.classList.remove('open');
      switch (item.dataset.act) {
        case 'about':    openByName('aboutwin'); break;
        case 'restart':  location.href = 'index.html'; break;
        case 'sleep':
        case 'shutdown':
          document.getElementById('awge-content').classList.add('is-off');
          setTimeout(function () { screenOff.classList.add('on'); }, 520);
          break;
      }
    });
  }
  /* click anywhere else closes every open menu */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.os-dropdown, .os-menu-btn, .os-apple')) return;
    closeAllDropdowns();
  });
  if (screenOff) {
    screenOff.addEventListener('click', function () {
      screenOff.classList.remove('on');
      var c = document.getElementById('awge-content');
      c.classList.remove('is-off');
      /* replay the CRT turn-on animation on wake */
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = '';
    });
  }

  /* the chrome fades in over ~2.6s at boot — don't let invisible UI catch
     clicks before it appears */
  ['os-menubar', 'os-dock'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.pointerEvents = 'none';
    setTimeout(function () { el.style.pointerEvents = ''; }, 2700);
  });

  /* menu items follow the bar's barrel curve: each item is shifted down by
     the arc's depth at its own x position (same quadratic as the clip-path) */
  function layoutMenubarCurve() {
    var bar = document.getElementById('os-menubar');
    if (!bar) return;
    var dip = parseFloat(getComputedStyle(bar).getPropertyValue('--dip')) / 100 * innerHeight;
    if (!isFinite(dip)) dip = 0;
    var br = bar.getBoundingClientRect();
    var halfW = br.width / 2 || 1;
    bar.querySelectorAll('.os-menu-item').forEach(function (item) {
      item.style.transform = 'none';                 /* measure untransformed */
      var r = item.getBoundingClientRect();
      var t = ((r.left + r.right) / 2 - br.left) / br.width * 2 - 1;   /* -1..1 */
      /* follow the barrel: drop by dip*t², and tilt to the local tangent
         (slope of y = floor + dip*t² is 2·dip·t / halfW) */
      var shift = dip * t * t;
      var angle = Math.atan2(2 * dip * t, halfW) * 180 / Math.PI;
      item.style.transform = 'translateY(' + shift.toFixed(1) + 'px) rotate(' + angle.toFixed(2) + 'deg)';
    });
  }
  layoutMenubarCurve();
  addEventListener('resize', layoutMenubarCurve);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutMenubarCurve);

  /* live menu bar clock — classic "Tue 3:42 PM" */
  var clock = document.getElementById('os-clock');
  function tick() {
    if (!clock) return;
    var d = new Date();
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    clock.textContent = days[d.getDay()] + ' ' + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }
  tick();
  setInterval(tick, 15000);

  /* -------- firefox window (mobile only): simple address bar --------
     the desktop window has real tabs — js/browser.js drives its forms */
  document.querySelectorAll('.browserui').forEach(function (win) {
    if (win.querySelector('.bookmark-bar')) return;
    var forms = win.querySelectorAll('form');
    forms.forEach(function (f) {
      var input = f.querySelector('input.text-field-3');
      if (!input) return;
      var isSearch = !!f.querySelector('img[src*="magnifying"]');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (!q) return;
        var url = isSearch
          ? 'https://www.google.com/search?q=' + encodeURIComponent(q)
          : (/^https?:\/\//.test(q) ? q : 'https://' + q);
        window.open(url, '_blank', 'noopener');
      });
    });
  });
})();
