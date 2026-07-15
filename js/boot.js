/* Illumitati OS — boot & login sequence
   Timeline reproduced from the original Webflow IX2 "Loading Bar Progress"
   interaction, reimplemented in vanilla JS (no jQuery / webflow.js).
   Upgrades: click-to-skip boot, working Sleep & Shut Down buttons. */

(function () {
  var bg       = document.querySelector('.background');
  var loading  = document.querySelector('.loading');
  var login    = document.querySelector('.login');
  var buttons  = document.querySelector('.buttons');
  var header1  = document.querySelector('.text-block-2');       // "Illumitati OS X"
  var header2  = document.querySelector('.text-block-2-copy');  // "Illumitati's Computer"
  var bar      = document.querySelector('.lblue');
  var content  = document.getElementById('awge-content');
  var screenOff = document.getElementById('screen-off');

  /* background fades in to 14% (original: delay 800ms, duration 8s) */
  setTimeout(function () { bg && bg.classList.add('bg-on'); }, 50);

  /* Loading bar steps: x-offset, transition duration, delay before step.
     Matches IX2 groups: -332 → (2000ms wait) -302 → -195 → -179 → -19 → 0 */
  var steps = [
    { x: -302, dur: 500, delay: 2000 },
    { x: -195, dur: 500, delay: 0 },
    { x: -179, dur: 500, delay: 0 },
    { x: -19,  dur: 500, delay: 0 },
    { x: 0,    dur: 1000, delay: 0 }
  ];

  var timers = [];
  var done = false;

  function schedule() {
    var t = 0;
    steps.forEach(function (s) {
      t += s.delay;
      (function (s, at) {
        timers.push(setTimeout(function () {
          bar.style.transition = 'transform ' + s.dur + 'ms ease';
          bar.style.transform = 'translate3d(' + s.x + 'px, 0, 0)';
        }, at));
      })(s, t);
      t += s.dur;
    });
    /* original: 500ms after the bar completes, swap loader → login */
    timers.push(setTimeout(showLogin, t + 500));
  }

  function showLogin() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    bar.style.transition = 'transform 200ms ease';
    bar.style.transform = 'translate3d(0, 0, 0)';
    loading.style.display = 'none';
    login.style.display = 'flex';
    buttons.style.display = 'flex';
    header1.style.display = 'none';
    header2.style.display = 'flex';
  }

  schedule();

  /* upgrade: click (or any key) skips the boot */
  document.addEventListener('click', function skip(e) {
    if (!done && !e.target.closest('.buttons')) showLogin();
  });
  document.addEventListener('keydown', function (e) {
    if (!done) showLogin();
  });

  /* ---- Sleep / Shut Down: CRT turn-off, click to wake ---- */
  function powerDown() {
    content.classList.add('is-off');
    setTimeout(function () { screenOff.classList.add('on'); }, 520);
  }
  function wake() {
    screenOff.classList.remove('on');
    content.classList.remove('is-off');
    /* replay the CRT turn-on animation */
    content.style.animation = 'none';
    void content.offsetWidth;
    content.style.animation = '';
  }

  /* soft synthesized startup chord when picking an account (user gesture,
     so autoplay rules allow it) — then continue to the desktop */
  var workLink = document.querySelector('.link-block');
  if (workLink) {
    workLink.addEventListener('click', function (e) {
      e.preventDefault();
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
        gain.connect(ctx.destination);
        [185, 233.08, 277.18, 369.99].forEach(function (f) {   /* F#2 chord-ish */
          var o = ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = f;
          o.connect(gain);
          o.start();
          o.stop(ctx.currentTime + 1.15);
        });
      } catch (_) {}
      setTimeout(function () { location.href = workLink.getAttribute('href'); }, 650);
    });
  }

  var sleepBtn = document.getElementById('btn-sleep');
  var shutBtn  = document.getElementById('btn-shutdown');
  if (sleepBtn) sleepBtn.addEventListener('click', function (e) { e.stopPropagation(); powerDown(); });
  if (shutBtn)  shutBtn.addEventListener('click',  function (e) { e.stopPropagation(); powerDown(); });
  if (screenOff) screenOff.addEventListener('click', wake);
})();
