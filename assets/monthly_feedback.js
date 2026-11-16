/* monthly_feedback.js -- the once-a-month "How's Wisdom on the GO! doing for you?" question (written 2026-11-16 from Kriti's approved mock-up,
   do-not-push-live/monthly_feedback_banner_mockup.html). English only. Used by chat.html and admin.html (a user or an admin, whichever track).

   window.MonthlyFeedback.start({ base }) is called once by each page when it has started. `base` is the user management address.
   What it does, in order:
   1. COUNTS TIME. While this tab is visible it adds up the seconds the person has spent on Wisdom on the GO! -- across pages (chat, admin...) because the
      total is kept in the browser under a stamp made from the login keycard and the day: a new login, or a new day, starts again from zero.
   2. After 7 minutes it waits for a CALM MOMENT: no key pressed for 3 seconds, the microphone not listening, no notice popup on screen, the tab visible.
      (What Wisdom is saying or typing does not matter.)
   3. Just before showing, it asks the back end "is this person due?" (POST /api/monthly-feedback/due). The back end decides everything about who is asked
      and how often (see user_management/monthly_feedback.py); asking IS the recording that the person was asked. Not due -> nothing is shown and this page
      stops asking for the rest of the day. Any failure of that call also just means nothing is shown.
   4. The banner: one line, hanging from the bottom edge of the header at the top right (the full width under the header on a phone). It floats over the
      page, nothing moves. There is no cross and no skip on the question: it stays until Good, Fine or Bad is tapped.
        Good / Fine -> the answer is sent, "Thank you" shows for about 2 seconds and the banner vanishes.
        Bad         -> the answer is sent at once; the question is replaced by a separate roomy panel "What would have made it better?" with a text box,
                       Send below it, and a small quiet X at the top right that closes it without a comment. Send (with text) -> "Thank you" -> vanishes.
   A person who ignores the question is asked again on every later visit (the back end keeps asking until they answer).
   Nothing here ever gets in the person's way: every failure is swallowed and the page carries on. All words are put in with textContent, never as HTML.
   For testing only: ?mf_seconds=20 in the page address changes the 7 minutes. The back end still decides who is asked. */
(function () {
  'use strict';
  var SECONDS_NEEDED = 7 * 60;      // 7 minutes on the system
  var CALM_MS = 3000;               // no key pressed for this long
  var TICK_MS = 5000;               // the clock is added up every 5 seconds
  var KEY = 'wotg_mf_clock';
  var THANKS_MS = 2000;

  var CSS =
    '.mf-ban{position:fixed;z-index:1500;background:#F3F7FC;color:#041A40;border:1px solid #D5E0EE;border-top:none;border-bottom:3px solid #3ab54a;' +
      'border-radius:0 0 12px 12px;box-shadow:0 8px 18px rgba(4,26,64,.16);font-family:Poppins,sans-serif;font-size:.76rem;font-weight:500;opacity:0;transition:opacity .3s}' +
    '.mf-ban.mf-in{opacity:1}' +
    '.mf-q{display:flex;align-items:center;gap:.6rem;height:34px;padding:0 .35rem 0 .9rem}' +
    '.mf-t{white-space:nowrap}' +
    '.mf-go{color:#3ab54a;font-weight:700}' +
    '.mf-pills{display:flex;gap:.3rem}' +
    '.mf-pill{border:1.5px solid #C6D1E0;background:#fff;color:#2A3C5D;border-radius:999px;padding:.18rem .75rem;font:600 .72rem Poppins,sans-serif;cursor:pointer}' +
    '.mf-pill.g{border-color:#9bd7a4;color:#1f7a2e}.mf-pill.f{border-color:#A9B8CF;color:#2A3C5D}.mf-pill.b{border-color:#eaa6a3;color:#b13b37}' +
    '.mf-pill.on.g{background:#3ab54a;border-color:#3ab54a;color:#fff}.mf-pill.on.f{background:#2A3C5D;border-color:#2A3C5D;color:#fff}.mf-pill.on.b{background:#d9534f;border-color:#d9534f;color:#fff}' +
    '.mf-pill.off{opacity:.4;cursor:default}' +
    '.mf-thanks{display:flex;align-items:center;height:34px;padding:0 1rem;font-style:italic;color:#1f7a2e}' +
    '.mf-fu{position:relative;padding:.6rem .8rem .65rem;width:420px;max-width:100%;box-sizing:border-box}' +
    '.mf-fq{font-weight:600;font-size:.8rem;margin:0 1.4rem .4rem 0}' +
    '.mf-ta{display:block;width:100%;box-sizing:border-box;height:84px;resize:none;background:#fff;border:1px solid #C6D1E0;border-radius:10px;padding:.5rem .65rem;font:400 16px Poppins,sans-serif;color:#041A40}' +
    '.mf-send-row{display:flex;justify-content:flex-end;margin-top:.5rem}' +
    '.mf-send{background:#3ab54a;color:#fff;border:0;border-radius:999px;padding:.38rem 1.3rem;font:700 .78rem Poppins,sans-serif;cursor:pointer}' +
    '.mf-x{position:absolute;top:.5rem;right:.6rem;background:none;border:0;padding:.1rem .25rem;font-size:.8rem;line-height:1;color:#8a97ab;cursor:pointer}' +
    '@media (max-width:520px){.mf-ban{left:0 !important;right:0 !important}.mf-q{justify-content:space-between;padding-left:.8rem}.mf-t{font-size:.66rem}.mf-opt{display:none}.mf-pill{padding:.15rem .5rem;font-size:.68rem}.mf-fu{width:100%}}';

  var H = null;                      // { base }
  var needed = SECONDS_NEEDED;
  var lastKey = 0;
  var banner = null;                 // the banner on screen, or null
  var asking = false;
  var timer = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function token() { try { return localStorage.getItem('login_token') || ''; } catch (e) { return ''; } }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function stamp() { var t = token(); return t ? hash(t) + '|' + new Date().toISOString().slice(0, 10) : ''; }

  // the running total for this login and day: { k: stamp, s: seconds, done: true once there is nothing more to ask today }
  function readClock(k) {
    try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.k === k) return c; } catch (e) { /* none */ }
    return { k: k, s: 0, done: false };
  }
  function writeClock(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* the clock then simply does not run */ } }

  function post(path, body) {
    var headers = { 'Authorization': 'Bearer ' + token() };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(H.base + path, { method: 'POST', headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; });
  }

  function addCss() {
    if (document.getElementById('mfStyle')) return;
    var s = document.createElement('style'); s.id = 'mfStyle'; s.textContent = CSS; document.head.appendChild(s);
  }
  // hangs from the bottom edge of the header, at the right (the full width on a phone: the CSS above)
  function place() {
    if (!banner) return;
    // the lowest bar at the top of the screen: the page header and, when the chat fills the screen (header hidden), the conversation's own title bar
    var top = 0;
    function lowest(sel) { var e = document.querySelector(sel); if (!e) return; var r = e.getBoundingClientRect(); if (r.height > 0 && r.top < 120) top = Math.max(top, r.bottom); }
    lowest('header.topbar');
    if (document.body.classList.contains('chat-maximized')) lowest('.chat-panel.active .chat-panel-head');
    banner.style.top = Math.max(0, top) + 'px'; banner.style.right = '14px';
  }
  function close(done) {
    var b = banner; banner = null;
    if (!b) return;
    b.classList.remove('mf-in');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 350);
    if (done) { var c = readClock(stamp()); c.done = true; writeClock(c); }
  }
  function thankYou() {
    if (!banner) return;
    banner.innerHTML = '';
    banner.appendChild(el('div', 'mf-thanks', 'Thank you'));
    place();
    setTimeout(function () { close(true); }, THANKS_MS);
  }
  // Bad: the question goes; a separate, roomy panel asks what would have made it better
  function followUp() {
    if (!banner) return;
    banner.innerHTML = '';
    var fu = el('div', 'mf-fu');
    var x = el('button', 'mf-x', '✕'); x.type = 'button'; x.title = 'Close'; x.setAttribute('aria-label', 'Close');
    x.onclick = function () { close(true); };
    var q = el('div', 'mf-fq', 'What would have made it better?');
    var ta = document.createElement('textarea'); ta.className = 'mf-ta'; ta.maxLength = 1000; ta.setAttribute('aria-label', 'What would have made it better?');
    var row = el('div', 'mf-send-row'); var send = el('button', 'mf-send', 'Send'); send.type = 'button'; row.appendChild(send);
    send.onclick = function () {
      var text = ta.value.trim();
      if (!text) { close(true); return; }          // nothing written: the same as closing it
      send.disabled = true;
      post('/api/monthly-feedback/comment', { comment: text });
      thankYou();
    };
    fu.appendChild(x); fu.appendChild(q); fu.appendChild(ta); fu.appendChild(row);
    banner.appendChild(fu);
    place();
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) { /* a phone may refuse */ } }, 60);
  }
  function choose(rating, pills) {
    pills.forEach(function (p) { p.classList.add(p.dataset.r === rating ? 'on' : 'off'); p.disabled = true; });
    post('/api/monthly-feedback/rating', { rating: rating });      // sent the moment it is tapped; a failure never traps the person
    if (rating === 'bad') setTimeout(followUp, 250); else setTimeout(thankYou, 250);
  }
  function show() {
    addCss();
    banner = el('div', 'mf-ban'); banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'Monthly feedback');
    var q = el('div', 'mf-q');
    var t = el('span', 'mf-t');
    t.appendChild(document.createTextNode("How's Wisdom on the ")); t.appendChild(el('span', 'mf-go', 'GO!')); t.appendChild(document.createTextNode(' doing'));
    t.appendChild(el('span', 'mf-opt', ' for you')); t.appendChild(document.createTextNode('?'));
    var pillsBox = el('span', 'mf-pills'), pills = [];
    [['good', 'Good', 'g'], ['fine', 'Fine', 'f'], ['bad', 'Bad', 'b']].forEach(function (o) {
      var b = el('button', 'mf-pill ' + o[2], o[1]); b.type = 'button'; b.dataset.r = o[0];
      b.onclick = function () { choose(o[0], pills); };
      pills.push(b); pillsBox.appendChild(b);
    });
    q.appendChild(t); q.appendChild(pillsBox); banner.appendChild(q);
    document.body.appendChild(banner);
    place();
    requestAnimationFrame(function () { if (banner) banner.classList.add('mf-in'); });
  }

  function calm() {
    if (document.hidden || banner) return false;
    if (Date.now() - lastKey < CALM_MS) return false;
    var mic = document.getElementById('micBtn');
    if (mic && (mic.classList.contains('listening') || mic.classList.contains('preparing'))) return false;
    if (document.querySelector('.un-backdrop')) return false;                        // the notice popup is on screen
    return true;
  }

  function tick() {
    try {
      if (!H) return;
      var k = stamp(); if (!k) return;
      var c = readClock(k);
      if (banner) place();      // the chat may have been made full-screen (or back) since the banner appeared
      if (c.done) return;
      if (!document.hidden) { c.s += TICK_MS / 1000; writeClock(c); }
      if (c.s < needed || asking || !calm()) return;
      asking = true;
      post('/api/monthly-feedback/due').then(function (data) {
        asking = false;
        if (!data || !data.due) { if (data) { var d = readClock(k); d.done = true; writeClock(d); } return; }   // not due: nothing more today. (No answer at all: try again later.)
        if (calm()) show();
        else { /* the moment passed while we asked: the back end counted it as asked; the next calm moment shows it */ pendingShow = true; }
      });
    } catch (e) { asking = false; }
  }
  var pendingShow = false;
  function tryPending() { if (pendingShow && calm()) { pendingShow = false; show(); } }

  window.MonthlyFeedback = {
    start: function (host) {
      try {
        if (H || !host || !host.base) return;
        H = host;
        try { var m = /[?&]mf_seconds=(\d+)/.exec(location.search); if (m) needed = parseInt(m[1], 10); } catch (e) { /* the normal 7 minutes */ }
        document.addEventListener('keydown', function () { lastKey = Date.now(); }, true);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, { passive: true });
        timer = setInterval(function () { tick(); tryPending(); }, TICK_MS);
        if (needed < 60) { clearInterval(timer); TICK_MS = 1000; timer = setInterval(function () { tick(); tryPending(); }, 1000); }   // testing only (a short mf_seconds)
      } catch (e) { /* the question simply does not come */ }
    }
  };
})();
