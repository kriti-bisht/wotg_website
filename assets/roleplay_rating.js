/* roleplay_rating.js -- the one-question rating after the role play feedback.  Written 2026-11-16 from Kriti's approved mock-up (do-not-push-live/role_play_rating_mockup.html).

   When the learner has been given their role play feedback (and only then: roleplay.js calls RolePlayRating.ask once the feedback has finished playing), the page adds a NORMAL
   trainer message, outside the yellow role play panel and directly above the slide's own "Finish my learning atom" button:
        "How helpful was that practice and the feedback?"      [ Good ] [ Fine ] [ Bad ]
   Until one is chosen the message box, the microphone and that button are locked (the learner cannot move on). Nothing is blacked out and there is no way to close it.
     - Good / Fine: the answer is sent, a one-line thank-you shows and fades away by itself, and everything unlocks.
     - Bad: the answer is sent at once, then a small optional box asks "What would have made it better?" with Skip and Submit; either one unlocks everything.
   The answers go to the role play app (POST /api/roleplay/rating, saved by roleplay_rating.py on the role play table). A failure of that call never traps the learner:
   the page unlocks whatever the answer. Nothing is redrawn on a resume (the question is asked once, live).
   Everything the page owns is reached through the `host` object chat.html hands over with RolePlayRating.configure(host); this file touches no page global by name. */
(function () {
  'use strict';
  var RR = window.RolePlayRating = {};
  var H = null;
  var asked = {};            // session IDs already asked in this page load: the question comes once
  var current = null;        // the question on screen: { sid, row, bubble, rating, locked, watch }

  var WORDS = {
    question: 'How helpful was that practice and the feedback?',
    good: 'Good', fine: 'Fine', bad: 'Bad',
    why: 'Sorry to hear that. What would have made it better?', placeholder: 'Optional: a few words are enough', skip: 'Skip', submit: 'Submit',
    thanks: 'Thank you, that helps us improve.'
  };
  var CSS =
    '.rr-bubble{max-width:340px}' +
    '.rr-q{font-weight:600;line-height:1.35;margin-bottom:.55rem}' +
    '.rr-pills{display:flex;gap:.4rem}' +
    '.rr-pill{flex:1;border:1.5px solid #b8c0cc;background:#fff;border-radius:999px;padding:.34rem 0;font:600 .8rem Poppins,sans-serif;color:#041A40;cursor:pointer}' +
    '.rr-pill.good{border-color:#3ab54a}.rr-pill.fine{border-color:#E4CA0A}.rr-pill.bad{border-color:#d9534f}' +
    '.rr-pill.on.good{background:#3ab54a;color:#fff}.rr-pill.on.fine{background:#E4CA0A}.rr-pill.on.bad{background:#d9534f;color:#fff}' +
    '.rr-pill.off{opacity:.4;cursor:default}' +
    '.rr-why{margin-top:.55rem}.rr-why .rr-l{font-size:.78rem;font-weight:600;margin-bottom:.3rem}' +
    '.rr-why textarea{width:100%;height:56px;border:1.5px solid #b8c0cc;border-radius:8px;padding:.4rem .55rem;font:400 16px Poppins,sans-serif;resize:none;box-sizing:border-box}' +
    '.rr-btns{display:flex;gap:.45rem;margin-top:.45rem;justify-content:flex-end}' +
    '.rr-btns button{border-radius:999px;padding:.3rem .95rem;font:600 .78rem Poppins,sans-serif;cursor:pointer}' +
    '.rr-skip{border:1.5px solid #2A3C5D;background:#fff;color:#041A40}.rr-submit{border:1.5px solid #3ab54a;background:#3ab54a;color:#fff}' +
    '.rr-thanks{font-size:.8rem;color:#6b7685;font-style:italic;text-align:center;padding:.1rem .2rem;transition:opacity .5s}' +
    '.rr-locked{opacity:.45;cursor:not-allowed}';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function addCss() {
    if (document.getElementById('rrStyle')) return;
    var s = document.createElement('style'); s.id = 'rrStyle'; s.textContent = CSS; document.head.appendChild(s);
  }
  function navButton() { var w = H && H.navWrap && H.navWrap(); return w && w.isConnected ? w.querySelector('button') : null; }

  function lock(q) {
    if (q.locked) return;
    q.locked = true;
    try { H.busyBegin(); } catch (e) { /* the box then stays as it is */ }
    var b = navButton(); if (b) { b.disabled = true; b.classList.add('rr-locked'); }
  }
  function unlock(q) {
    if (!q.locked) return;
    q.locked = false;
    clearInterval(q.watch);
    try { H.busyEnd(); } catch (e) { /* nothing to release */ }
    var b = navButton(); if (b) { b.disabled = false; b.classList.remove('rr-locked'); }
    if (current === q) current = null;
    try { H.keepNavLast(); H.scrollToEnd(); } catch (e) { /* cosmetic */ }
  }
  // The learner is never held by this question: if its message is taken off the page (a new conversation, a reset) everything is released.
  RR.reset = function () {
    if (!current) return;
    var q = current;
    if (q.row && q.row.parentNode && !q.thanking) q.row.parentNode.removeChild(q.row);
    unlock(q);
  };

  function send(q, rating, comment) {
    try {
      var body = { session_id: q.sid, rating: rating };
      if (comment) body.comment = comment;
      H.fetch(H.base() + '/api/roleplay/rating', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .catch(function (e) { console.warn('role play rating: not saved', e); });
    } catch (e) { console.warn('role play rating: not saved', e); }
  }

  function finish(q) {
    // the thank-you replaces the question, then fades away by itself; the learner can move on at once
    q.thanking = true;
    q.bubble.innerHTML = '';
    q.bubble.appendChild(el('div', 'rr-thanks', WORDS.thanks));
    unlock(q);
    var row = q.row;
    setTimeout(function () { var t = row && row.querySelector('.rr-thanks'); if (t) t.style.opacity = '0'; }, 1700);
    setTimeout(function () { if (row && row.parentNode) row.parentNode.removeChild(row); try { H.keepNavLast(); } catch (e) { /* cosmetic */ } }, 2300);
  }

  function choose(q, rating, pills) {
    if (q.rating) return;
    q.rating = rating;
    pills.forEach(function (p) { p.classList.add(p.dataset.r === rating ? 'on' : 'off'); p.disabled = true; });
    send(q, rating, null);
    if (rating !== 'bad') { finish(q); return; }
    var box = el('div', 'rr-why', '<div class="rr-l">' + WORDS.why + '</div>');
    var ta = el('textarea'); ta.placeholder = WORDS.placeholder; ta.maxLength = 1000; box.appendChild(ta);
    var btns = el('div', 'rr-btns');
    var skip = el('button', 'rr-skip', WORDS.skip); skip.type = 'button';
    var submit = el('button', 'rr-submit', WORDS.submit); submit.type = 'button';
    skip.onclick = function () { finish(q); };
    submit.onclick = function () { var t = ta.value.trim(); if (t) send(q, 'bad', t); finish(q); };
    btns.appendChild(skip); btns.appendChild(submit); box.appendChild(btns);
    q.bubble.appendChild(box);
    try { H.scrollToEnd(); } catch (e) { /* cosmetic */ }
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) { /* a phone may refuse */ } }, 50);
  }

  // Called by roleplay.js when the live feedback has finished playing.
  RR.ask = function (sessionId) {
    try {
      if (!H || !sessionId || asked[sessionId]) return;
      asked[sessionId] = true;
      addCss();
      var bubble = H.message(WORDS.question);
      if (!bubble) return;
      var q = { sid: sessionId, bubble: bubble, row: bubble.closest ? (bubble.closest('.msg') || bubble) : bubble, rating: null, locked: false, thanking: false, watch: null };
      current = q;
      bubble.classList.add('rr-bubble');
      bubble.innerHTML = '';
      bubble.appendChild(el('div', 'rr-q', WORDS.question));
      var row = el('div', 'rr-pills'), pills = [];
      [['good', WORDS.good], ['fine', WORDS.fine], ['bad', WORDS.bad]].forEach(function (o) {
        var b = el('button', 'rr-pill ' + o[0], o[1]); b.type = 'button'; b.dataset.r = o[0];
        b.onclick = function () { choose(q, o[0], pills); };
        pills.push(b); row.appendChild(b);
      });
      bubble.appendChild(row);
      lock(q);
      q.watch = setInterval(function () { if (!q.row || !q.row.isConnected) unlock(q); }, 1000);   // the message was cleared away: release everything
      H.keepNavLast(); H.scrollToEnd();
    } catch (e) {
      console.warn('role play rating: could not be asked', e);
      if (current) unlock(current);
    }
  };
  RR.configure = function (host) { H = host; };
})();
