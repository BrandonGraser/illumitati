# Illumitati — Webflow-free rebuild

A dependency-free static rebuild of [illumitati.com](https://www.illumitati.com/)
(originally built by the site owner on Webflow). No jQuery, no jQuery UI,
no webflow.js, no Google Fonts CDN — everything is self-hosted.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Boot screen → OS login (Work / Other…, Sleep / Restart / Shut Down) |
| `home.html` | The desktop: draggable icons, my-work launcher, work gallery, contact, "firefox" store window |
| `404.html` | Starfield + spinning globe error page |
| `css/webflow.css` | The site's compiled stylesheet with all CDN URLs rewritten to local `assets/` + `fonts/` |
| `css/site.css` | Custom layer: self-hosted fonts, CRT tube/scanline effects, window/lightbox animation |
| `js/boot.js` | Boot loader timeline (exact timings ported from the Webflow interaction data) + Sleep/Shut Down |
| `js/os.js` | Desktop engine: dragging, window management, lightbox, product modal, Shopify buy button, browser bar |
| `assets/`, `fonts/` | All images/GIFs and fonts (Press Start 2P, Lucida Grande, New York Extra Large) |
| `_rip/` | Raw scrape + analysis scratch files. Safe to delete once you're happy. |

## Run locally

Any static server works, e.g.:

```sh
python -m http.server 8734
# then open http://localhost:8734
```

## Deploy

Push the folder (minus `_rip/`) to Netlify / Vercel / Cloudflare Pages / GitHub Pages.
To keep the original `/home` URL, enable "clean URLs" on your host or add a
redirect from `/home` to `/home.html`.

## Upgrades over the Webflow original

- **No dependencies** — vanilla JS replaces jQuery, jQuery UI, webflow.js and the WebFont loader (~600 KB less JavaScript).
- **Dragging works on touch too** — pointer-events based, windows drag by their title bar, and a drag no longer triggers an accidental click/open.
- **Click-to-front windows** — pressing any window raises it above the others.
- **Boot screen is skippable** — click or press any key.
- **Sleep / Shut Down actually work** — CRT power-off collapse, click to power back on. Restart reboots the OS.
- **Better lightbox** — arrow keys, Esc, prev/next buttons, captions, backdrop-click close.
- **Live browser bar** — the address bar navigates, the Google box actually searches (new tab).
- **Working contact form** — opens the visitor's mail app addressed to you. To capture submissions instead, set `CONTACT_ENDPOINT` at the top of `js/os.js` to a Formspree/Basin endpoint.
- Fonts are preloaded and self-hosted; above-the-fold images are no longer lazy-loaded.

### Classic Mac desktop chrome

- **Menu bar** — pinstriped Aqua-style bar with the Illumitati logo as the
  Apple menu (About This Computer, Sleep, Restart, Shut Down), quick-open
  menus for each window, a battery glyph and a live clock.
- All chrome is positioned inside the iMac bezel's visible screen area
  (the bezel PNG covers the outer ~13%/9% of the viewport on desktop,
  ~8%/6.5% on mobile — measured from the images' alpha channel).
- **Dock** — translucent shelf with magnify-on-hover icons: Store, My Work,
  Contact, Minecraft, and Trash.
- **About This Computer** — draggable window with the OS logo and specs
  ("256 MB of pure creativity").
- **Desktop icon selection** — classic click-highlight on icons.
- **Trash opens in-OS** — instead of leaving the site, the trash now opens a
  draggable "trash" window with Elon Musk's Wikipedia page in an iframe
  (lazy-loaded on first open).
- **Startup chime** — a soft synthesized chord plays when you pick the
  Work account on the login screen.

## Notes

- The **Shopify Buy Button** still points at your storefront
  (`ed04f5.myshopify.com`, product `10018037006636`) and loads the SDK from
  Shopify's CDN on first product click — checkout works exactly as before.
- The Webflow-commerce add-to-cart markup was removed (it only worked on
  Webflow's backend); Shopify is the single purchase path.
- Easter eggs preserved: "Other…" login rickroll, trash → Elon Musk wiki,
  minecraft icon → classic.minecraft.net.
