/* Illumitati OS — firefox window: a real multi-tab browser.
   Tabs are iframes; the merch store is the permanent home tab.
   Search runs on FrogFind (retro search engine that allows framing).
   Sites that refuse to be embedded get a styled error page. */

(function () {
  'use strict';

  var root = document.querySelector('.browserui .bookmark-bar');
  if (!root) return;
  var win      = root.closest('.browserui');
  var tabbar   = document.getElementById('ff-tabbar');
  var newBtn   = document.getElementById('ff-newtab');
  var views    = document.getElementById('ff-views');
  var storeView = views.querySelector('[data-view="store"]');
  var titleEl  = win.querySelector('.text-block-7');

  var addressForm = win.querySelector('form.form-3-copy');
  var addressInput = addressForm && addressForm.querySelector('input');
  var searchForm = win.querySelector('form.form-3');
  var searchInput = searchForm && searchForm.querySelector('input');

  /* Marginalia is a reliable indie search engine that allows framing and
     suits the retro aesthetic (FrogFind proved flaky — SSL/timeout errors). */
  var SEARCH = 'https://old-search.marginalia.nu/search?query=';
  /* domains known to refuse framing (X-Frame-Options / frame-ancestors) */
  var BLOCKED = ['apple.com', 'google.com', 'youtube.com', 'facebook.com',
    'instagram.com', 'twitter.com', 'x.com', 'drinkarizona.com',
    'duckduckgo.com', 'minecraft.net', 'reddit.com', 'tiktok.com'];
  function isBlocked(url) {
    try {
      var host = new URL(url).hostname.replace(/^www\./, '');
      return BLOCKED.some(function (d) {
        return host === d || host.endsWith('.' + d) &&
          host !== 'classic.minecraft.net';
      });
    } catch (_) { return false; }
  }

  var QUICK_LINKS = [
    { label: 'Illumitati Merch', url: 'illumitati://merch', icon: 'assets/Tati-Contact-Sports-webp.png' },
    { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
    { label: 'Marginalia Search', url: 'https://old-search.marginalia.nu/' },
    { label: 'Wiby (old web)', url: 'https://wiby.me/' },
    { label: 'Minecraft Classic', url: 'https://classic.minecraft.net/' },
    { label: 'The Old Net', url: 'https://theoldnet.com/' }
  ];

  function favicon(url) {
    try { return 'https://icons.duckduckgo.com/ip3/' + new URL(url).hostname + '.ico'; }
    catch (_) { return ''; }
  }
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return url; }
  }

  /* ------------------------------ tab state ------------------------------ */
  var tabs = [];
  var active = null;
  var nextId = 1;

  var storeTab = {
    id: 0, kind: 'store', url: 'illumitati://merch', title: 'Illumitati Merch',
    icon: 'assets/Tati-Contact-Sports-webp.png', view: storeView,
    history: ['illumitati://merch'], hi: 0, closable: false
  };
  tabs.push(storeTab);

  function makeView() {
    var v = document.createElement('div');
    v.className = 'ff-view';
    views.appendChild(v);
    return v;
  }

  function newTab(url, background) {
    var tab = {
      id: nextId++, kind: 'start', url: 'illumitati://newtab', title: 'New Tab',
      icon: '', view: makeView(), history: ['illumitati://newtab'], hi: 0, closable: true
    };
    tabs.push(tab);
    renderStartPage(tab);
    if (!background) activate(tab);
    if (url) navigate(tab, url);
    else if (!background && addressInput) { addressInput.focus(); addressInput.select(); }
    renderTabs();
    return tab;
  }

  function closeTab(tab) {
    var i = tabs.indexOf(tab);
    if (i < 0 || !tab.closable) return;
    tabs.splice(i, 1);
    tab.view.remove();
    if (active === tab) activate(tabs[Math.min(i, tabs.length - 1)]);
    renderTabs();
  }

  function activate(tab) {
    active = tab;
    tabs.forEach(function (t) { t.view.classList.toggle('ff-active', t === tab); });
    if (addressInput) addressInput.value = tab.url.indexOf('illumitati://') === 0 ? tab.url : tab.url;
    if (titleEl) titleEl.textContent = 'firefox — ' + tab.title;
    renderTabs();
  }

  function renderTabs() {
    tabbar.innerHTML = '';
    tabs.forEach(function (tab) {
      var el = document.createElement('div');
      el.className = 'ff-tab' + (tab === active ? ' active' : '') + (tab.loading ? ' loading' : '');
      var ic = document.createElement(tab.loading ? 'span' : 'img');
      if (tab.loading) { ic.className = 'ff-spin'; }
      else {
        ic.className = 'ff-fav';
        ic.src = tab.icon || 'assets/firefox_png.webp';
        ic.onerror = function () { this.src = 'assets/firefox_png.webp'; };
      }
      var label = document.createElement('span');
      label.className = 'ff-label';
      label.textContent = tab.title;
      el.appendChild(ic);
      el.appendChild(label);
      if (tab.closable) {
        var x = document.createElement('span');
        x.className = 'ff-close';
        x.textContent = '×';
        x.addEventListener('click', function (e) { e.stopPropagation(); closeTab(tab); });
        el.appendChild(x);
      }
      el.addEventListener('click', function () { activate(tab); });
      el.addEventListener('auxclick', function (e) { if (e.button === 1) closeTab(tab); });
      tabbar.appendChild(el);
    });
  }

  /* ------------------------------ navigation ----------------------------- */
  function navigate(tab, url, replace) {
    if (tab.kind === 'store') { tab = newTab(); }        /* store tab is immutable */
    url = normalize(url);
    if (!replace) {
      tab.history = tab.history.slice(0, tab.hi + 1);
      tab.history.push(url);
      tab.hi = tab.history.length - 1;
    }
    show(tab, url);
  }

  function normalize(q) {
    q = q.trim();
    if (!q) return 'illumitati://newtab';
    if (/^illumitati:\/\//.test(q)) return q;
    if (/^https?:\/\//i.test(q)) return q;
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(q)) return 'https://' + q;
    return SEARCH + encodeURIComponent(q);             /* not a URL → search */
  }

  function show(tab, url) {
    tab.url = url;
    if (url === 'illumitati://newtab') {
      tab.kind = 'start'; tab.title = 'New Tab'; tab.icon = '';
      renderStartPage(tab);
    } else if (url === 'illumitati://merch') {
      activate(storeTab); return;
    } else if (isBlocked(url)) {
      tab.kind = 'error'; tab.title = hostOf(url); tab.icon = favicon(url);
      renderErrorPage(tab, url);
    } else {
      tab.kind = 'page'; tab.title = hostOf(url); tab.icon = favicon(url);
      tab.loading = true;
      tab.view.innerHTML = '';
      var f = document.createElement('iframe');
      f.className = 'ff-frame';
      f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock');
      /* A cross-origin frame can't be inspected from here: even a dead host
         fires 'load' (with the browser's own error page), so we can't reliably
         auto-detect failure without false-positiving slow real pages. Just
         clear the spinner; a floating "open externally" button (below) is the
         escape hatch when a page is blank or refuses to frame. */
      var settled = false;
      function clearSpin() { if (settled) return; settled = true; tab.loading = false; renderTabs(); }
      f.addEventListener('load', clearSpin);
      setTimeout(clearSpin, 15000);
      f.src = url;
      tab.view.appendChild(f);

      var esc = document.createElement('button');
      esc.className = 'ff-external';
      esc.title = 'Open this page in a real browser';
      esc.textContent = 'Open externally ↗';
      esc.addEventListener('click', function () { window.open(url, '_blank', 'noopener'); });
      tab.view.appendChild(esc);
    }
    if (tab === active || tab.kind === 'store') activate(tab);
    renderTabs();
  }

  function goBack() {
    var t = active;
    if (t.kind === 'store' || t.hi <= 0) return;
    t.hi--; show(t, t.history[t.hi]);
  }
  function goForward() {
    var t = active;
    if (t.kind === 'store' || t.hi >= t.history.length - 1) return;
    t.hi++; show(t, t.history[t.hi]);
  }
  function reload() {
    var t = active;
    if (t.kind === 'page') show(t, t.url);
  }

  /* ---------------------------- built-in pages --------------------------- */
  function renderStartPage(tab) {
    var v = tab.view;
    v.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'ff-start';
    page.innerHTML =
      '<img class="ff-start-logo" src="assets/Tati-Contact-Sports-logo.png" alt=""/>' +
      '<form class="ff-start-search"><input type="text" placeholder="Search the web (Marginalia)"/>' +
      '<button type="submit">Search</button></form>' +
      '<div class="ff-start-grid"></div>' +
      '<div class="ff-start-tip">Tip: most modern sites refuse to live inside an iframe &mdash; the retro web works better here.</div>';
    var grid = page.querySelector('.ff-start-grid');
    QUICK_LINKS.forEach(function (l) {
      var a = document.createElement('button');
      a.className = 'ff-quick';
      a.innerHTML = '<img src="' + (l.icon || favicon(l.url)) + '" onerror="this.src=\'assets/firefox_png.webp\'"/><span>' + l.label + '</span>';
      a.addEventListener('click', function () { navigate(tab, l.url); });
      grid.appendChild(a);
    });
    page.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = this.querySelector('input').value.trim();
      if (q) navigate(tab, q);
    });
    v.appendChild(page);
  }

  function renderErrorPage(tab, url, reason) {
    tab.kind = 'error';
    var timeout = reason === 'timeout';
    var title = timeout
      ? hostOf(url) + ' didn&rsquo;t load.'
      : hostOf(url) + ' refuses to be embedded.';
    var text = timeout
      ? 'The site may be down, slow, or blocking embedded frames. Try again, or open it in a real browser.'
      : 'This site sends anti-framing headers, so it cannot load inside Illumitati OS.';
    var v = tab.view;
    v.innerHTML = '';
    var page = document.createElement('div');
    page.className = 'ff-error';
    page.innerHTML =
      '<div class="ff-error-box">' +
      '<div class="ff-error-icon">&#9888;</div>' +
      '<div class="ff-error-title">' + title + '</div>' +
      '<div class="ff-error-text">' + text + '</div>' +
      '<div class="ff-error-actions">' +
      (timeout ? '<button class="ff-btn" data-act="retry">Try Again</button>' : '') +
      '<button class="ff-btn" data-act="external">Open in a Real Browser</button>' +
      '<button class="ff-btn" data-act="home">Back to Start Page</button>' +
      '</div></div>';
    var retry = page.querySelector('[data-act="retry"]');
    if (retry) retry.addEventListener('click', function () { show(tab, url); });
    page.querySelector('[data-act="external"]').addEventListener('click', function () {
      window.open(url, '_blank', 'noopener');
    });
    page.querySelector('[data-act="home"]').addEventListener('click', function () {
      navigate(tab, 'illumitati://newtab');
    });
    v.appendChild(page);
  }

  /* ------------------------------ chrome wiring -------------------------- */
  newBtn.addEventListener('click', function () { newTab(); });
  var plus = win.querySelector('.plus-buton-padding');
  if (plus) plus.addEventListener('click', function () { newTab(); });

  /* the arrows image: left half = back, right half = forward */
  var arrows = win.querySelector('.back-button-padding');
  if (arrows) arrows.addEventListener('click', function (e) {
    var r = arrows.getBoundingClientRect();
    (e.clientX - r.left < r.width / 2) ? goBack() : goForward();
  });
  var refresh = win.querySelector('.reload-button-padding');
  if (refresh) refresh.addEventListener('click', reload);

  if (addressForm) addressForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (addressInput.value.trim()) navigate(active, addressInput.value);
  });
  if (searchForm) searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = searchInput.value.trim();
    if (q) { navigate(active, SEARCH + encodeURIComponent(q)); searchInput.value = ''; }
  });

  /* bookmarks open inside the browser */
  var BOOKMARK_URLS = {
    'Apple': 'https://www.apple.com/',
    'Fidget Spinner Store': 'https://www.amazon.com/s?k=fidget+spinner',
    'Arizona Tea': 'https://drinkarizona.com/',
    'Minecraft': 'https://classic.minecraft.net/'
  };
  root.querySelectorAll('a').forEach(function (a) {
    var label = a.textContent.trim();
    a.addEventListener('click', function (e) {
      e.preventDefault();
      navigate(active, BOOKMARK_URLS[label] || a.href);
    });
  });

  activate(storeTab);

  /* public API so the desktop (e.g. the minecraft icon) can open a URL
     inside the firefox window in a fresh tab */
  window.IllumitatiBrowser = {
    open: function (url) { newTab(url); }
  };
})();
