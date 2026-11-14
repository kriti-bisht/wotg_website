/* roleplay.js -- the role play on the learner's page.  Written 2026-11-12 from the approved previews; live since 2026-11-13.  Changed 2026-11-14 (recap-only button, the Role play guide slide, feedback-or-finish) -- those changes are NOT DEPLOYED yet.

   What it does (all talking to the role play app, never to the three tracks):
     - one slide before the technique slide it asks the role play app to check whether a role play would help (the app saves the answer);
     - on the RECAP slide only (the last slide; Kriti, 2026-11-14) it shows the "Do a role play" button, above the slide's "Finish my learning atom", when the answer was yes and the role play is unused;
     - "Do a role play" first shows a "Role play guide" slide (three tips) with "Got it, let's begin"; only that button asks the app for the role play and starts it (Kriti, 2026-11-14);
     - the role play itself: the other person speaking first (read aloud), the learner answering in the page's message box or microphone, an
       "End role play" button after every turn, and the warnings and endings the app decides (a slide-too-short warning, irrelevant-message warnings and
       ending, the Scope Checker's ending, the turn ceiling);
     - "Give me feedback": the feedback slide, drawn in one of four designs the app chose (index_focus, two_fields, timeline, coach_thread), each point's
       text appearing when its voiceover starts, every point staying on the slide, the same player as a training slide;
     - Parking Lot resume and Conversation History: the role play is drawn right after the slide it was started on (the app says which slide).
   Everything the page owns (sending messages, the Continue button, the voice, the mute, the chat area) is reached through the `host` object chat.html hands over
   with RolePlay.configure(host) -- this file touches no page global by name, so it can be tested on its own.  If the role play app cannot be reached the
   learner simply sees no role play: the button, the block and the history entry are left out and nothing is shown as an error. */
(function () {
  'use strict';
  var RP = window.RolePlay = {};
  var H = null;                               // the host (chat.html)
  var CONTINUE_WITH_FEEDBACK = true;          // true: Continue is shown beside "Give me feedback", so feedback can be skipped (the preview's open question)
  RP.placeholder = 'Reply to the person in the role play...';

  var WORDS = {
    good: 'What went well', dev: 'What could be even better', tag: 'Role play feedback', soon: 'Coming up', nowPlaying: 'Playing now',
    hintResume: 'Press play to hear all your feedback, or click a point on the left to hear just that one.',
    hintDone: 'That is all of your feedback. Click any point on the left to hear it again.',
    hintHistory: 'Click a point on the left to read it here.',
    preparing: 'Preparing your feedback...', ended: 'Role play ended.', endBtn: 'End role play', keep: 'Keep going', endNoFb: 'End without feedback',
    feedbackBtn: 'Give me feedback', withoutFeedback: ' without feedback', chip: 'Do a role play', head: 'Role play', sub: 'You practice with an AI who plays the other person.',
    guideTag: 'Role play guide', guideEyebrow: 'Before you begin', guideTitle: 'Make the most of your ', guideTitleEm: 'role play',
    guideLead: 'Excellent choice, ', guideLeadEm: 'practice does make perfect!', guideLeadRest: ' Before you start, here are some quick tips to make this practice session useful.',
    gotIt: 'Got it, let\u2019s begin',
    tips: [
      { h: 'End whenever you like', p: 'You can end this role play at any time by clicking the <b>\u201cEnd role play\u201d</b> button.' },
      { h: 'Feedback, once you have practiced', p: 'If you have practiced enough for us to give you meaningful feedback, we will offer it when you end the role play.' },
      { h: 'Say it out loud', p: 'For the best experience, we suggest turning on your microphone and speaking your responses aloud, as you would in a real conversation.' }
    ]
  };
  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    good: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11v9H4v-9z"/><path d="M7 11l4-8a2.2 2.2 0 0 1 2.2 2.4L12.7 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7"/></svg>',
    dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>'
  };
  var DESIGN_OF = { index_focus: 'A', two_fields: 'B', timeline: 'C', coach_thread: 'D' };

  function fresh() {
    return { sid: '', view: null, loading: null, offer: null, offerBtn: null, slideNumber: 0, isLast: false, activity: null, doneAt: 0, assessing: false, began: false, block: null, list: null, actions: null,
             renderedN: 0, pending: null, warnRow: null, endedLine: false, feedbackUi: null, guideGo: null };
  }
  var S = fresh();

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function lines(s) { return esc(s).replace(/\n/g, '<br>'); }
  function plain(err) { return (err && !(err instanceof TypeError) && err.message) ? err.message : 'Something went wrong reaching the server -- please try again.'; }
  function initials(name) {
    var stripped = String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (!stripped) return 'R';
    var w = stripped.split(/\s+/);
    return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function button(label, cls, onClick) { var b = el('button', cls); b.type = 'button'; b.textContent = label; b.onclick = function () { if (!b.disabled) onClick(b); }; return b; }

  // ---------------------------------------------------------------------------------------------------------------- talking to the role play app
  function post(path, body) {
    return H.fetch(H.base() + '/api/roleplay/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) { var e = new Error(data.detail || ''); e.status = res.status; throw e; }
          // every answer names the session it is about: one that is not for the session asked about is never drawn (it could sit under another session's content)
          if (body && body.session_id && data.session_id !== body.session_id) { var m = new Error('The role play answer was not for this session'); m.status = 0; throw m; }
          return data;
        });
      });
  }
  RP.configure = function (host) { H = host; };
  RP.reset = function () { stopFeedback(S.feedbackUi); S = fresh(); };

  // (Re)reads the role play of the open session. Never fails: if the app cannot be reached the answer is null and the learner sees no role play.
  RP.load = function (sid) {
    sid = sid || H.sessionId();
    if (S.sid !== sid) { S = fresh(); S.sid = sid; }
    S.loading = post('state', { session_id: sid }).then(function (v) { S.view = v; return v; })
      .catch(function (e) { console.warn('role play: could not read its state', e); S.view = null; return null; });
    return S.loading;
  };
  // The same for any session (Conversation History): nothing in the open session is touched.
  RP.loadFor = function (sid) {
    return post('state', { session_id: sid }).catch(function (e) { console.warn('role play: could not read its state', e); return null; });
  };
  RP.isActive = function () { return !!(S.view && S.view.status === 'in_progress' && S.began && S.block && S.block.isConnected); };

  // ---------------------------------------------------------------------------------------------------------------- the button
  // Called by the page each time a slide is drawn live (or the parked slide on a resume), after the slide's own buttons are in place.
  // `activity` says what the slide has: null (no activity), 'open' (an activity not yet finished) or 'done' (finished). `isLast` is true on the recap, the Master's last slide: the only slide that ever offers the role play.
  // The button has a row of its own: under the slide, or under its activity (grey until the activity is done), just above the slide's Continue.
  RP.onSlide = function (number, activity, isLast) {
    var sid = H.sessionId();
    if (S.sid !== sid) { S = fresh(); S.sid = sid; }
    S.slideNumber = number; S.isLast = !!isLast; S.activity = activity || null;
    if (activity === 'done') S.doneAt = Math.max(S.doneAt, number);
    clearOffer();
    var ready = S.view ? Promise.resolve(S.view) : RP.load(sid);
    return ready.then(function (v) {
      if (!v || S.sid !== sid) return;
      var tech = v.technique_slide;
      // on the technique slide (and on any later one, e.g. a resumed session) the app checks, once, whether a role play would help
      if (v.need === 'not_assessed' && tech && number >= tech && !S.assessing) assess();
      refreshOffer();
    });
  };
  // The page tells when an activity on slide `number` has been finished (as it happens, or when an earlier slide is redrawn on a resume).
  RP.activityDone = function (number) {
    S.doneAt = Math.max(S.doneAt, number);
    if (number === S.slideNumber) S.activity = 'done';
    syncLock(); RP.place();
  };
  // The page has drawn a new activity under the slide: the button moves below it.
  RP.activityDrawn = function () { RP.place(); };
  // The slide's Continue was pressed: this slide's button goes (the next slide draws its own, if the role play is still on offer).
  RP.leaveSlide = function () { clearOffer(); };
  // Keeps the button's row directly above the slide's Continue (or last, when there is none).
  RP.place = function () {
    if (!S.offer || !S.offer.isConnected) return;
    var area = H.chat(), nav = H.navWrap();
    if (nav && nav.isConnected && nav.parentNode === area) { if (nav.previousElementSibling !== S.offer) area.insertBefore(S.offer, nav); }
    else if (area.lastElementChild !== S.offer) area.appendChild(S.offer);
  };
  function assess() {
    S.assessing = true;
    var sid = S.sid;
    post('assess', { session_id: sid }).catch(function (e) { console.warn('role play: assessment', e); return null; })
      .then(function (v) { return waitWhileAssessing(sid, v); })
      .then(function (v) { S.assessing = false; if (S.sid !== sid) return; if (v) S.view = v; refreshOffer(); });
  }
  function waitWhileAssessing(sid, v) {   // another call may still be making the decision
    var tries = 0;
    function again(cur) {
      if (!cur || cur.need !== 'assessing' || tries >= 20) return Promise.resolve(cur);
      tries += 1;
      return new Promise(function (r) { setTimeout(r, 3000); }).then(function () { return post('state', { session_id: sid }); }).catch(function () { return null; }).then(again);
    }
    return again(v);
  }
  function clearOffer() {
    if (S.offer) S.offer.remove();
    S.offer = null; S.offerBtn = null;
  }
  // Grey until the slide's activity is done; once any activity from the technique slide on has been finished, it stays open on the slides after.
  function isLocked() {
    var tech = S.view && S.view.technique_slide;
    return S.activity === 'open' && !(tech && S.doneAt >= tech);
  }
  function syncLock() {
    var b = S.offerBtn; if (!b) return;
    var locked = isLocked();
    b.disabled = locked; b.classList.toggle('rp-locked', locked);
    b.title = locked ? 'Finish the activity to unlock' : '';
  }
  // Shown on the recap slide only (Kriti, 2026-11-14: a role play in the middle of the training is disorienting, and the Trainer knows nothing of it), until the learner starts a role
  // play (the app then says it is no longer available: never again). The check itself still runs from the technique slide on, so the answer is ready by the recap.
  function refreshOffer() {
    clearOffer();
    var v = S.view;
    if (!v || !v.available || S.began) return;
    if (!S.isLast) return;
    var b = el('button', 'vo-chip vo-chip-rp', ICON.play + esc(WORDS.chip));
    b.type = 'button';
    b.onclick = function () { if (!b.disabled) startRolePlay(b); };
    S.offerBtn = b; S.offer = H.appendExtra(b, 'vo-chips vo-rpoffer');
    syncLock(); RP.place();
  }

  // ---------------------------------------------------------------------------------------------------------------- the conversation
  function learnerBubble(text) {
    var row = el('div', 'msg msg-user');
    var av = el('div', 'msg-avatar avatar-user'); H.userAvatar(av);
    var right = el('div');
    var bubble = el('div', 'msg-bubble bubble-user', lines(text)); bubble.setAttribute('dir', 'auto');
    right.appendChild(bubble); right.appendChild(el('div', 'msg-meta', esc(H.formatTime())));
    row.appendChild(av); row.appendChild(right);
    return row;
  }
  function partnerBubble(t, readOnly) {
    var name = t.name || 'Role player';
    var row = el('div', 'msg');
    row.appendChild(el('div', 'msg-avatar avatar-user', esc(initials(name))));
    var right = el('div');
    var bubble = el('div', 'msg-bubble bubble-rp', '<div class="rp-who">' + esc(name) + '</div><span>' + lines(t.text) + '</span>');
    bubble.setAttribute('dir', 'auto');
    if (!readOnly) H.speakerButton(bubble);                       // the same small speaker as every Trainer answer: one mute for the whole page
    right.appendChild(bubble); right.appendChild(el('div', 'msg-meta', esc(H.formatTime())));
    row.appendChild(right);
    return row;
  }
  function sysLine(text) { return el('div', 'rp-sys', lines(text)); }

  // Draws the turns the block has not shown yet. Returns the role player's new lines (what is to be read aloud).
  function drawNewTurns(v, readOnly) {
    var toSpeak = [];
    (v.turns || []).forEach(function (t) {
      if (t.n <= S.renderedN) return;
      S.renderedN = Math.max(S.renderedN, t.n);
      if (t.speaker === 'learner') {
        if (S.pending) { S.pending = null; return; }              // already on screen (shown when it was sent)
        S.list.appendChild(learnerBubble(t.text));
      } else if (t.speaker === 'role_player') {
        S.list.appendChild(partnerBubble(t, readOnly)); toSpeak.push(t.text);
      } else {
        S.list.appendChild(sysLine(t.text));
      }
    });
    return toSpeak;
  }
  function makeBlock() {
    var block = el('div', 'rp-block');
    block.appendChild(el('div', 'rp-head', '<b>' + esc(WORDS.head) + '</b><span>' + esc(WORDS.sub) + '</span>'));
    S.list = el('div', 'rp-list'); S.actions = el('div', 'rp-actions');
    block.appendChild(S.list); block.appendChild(S.actions);
    S.block = block; S.renderedN = 0; S.endedLine = false; S.pending = null; S.warnRow = null;
    return block;
  }
  function renderActions(v) {
    var a = S.actions; a.innerHTML = ''; a.style.display = ''; a.style.visibility = ''; a.style.pointerEvents = '';
    if (v.status === 'in_progress') { a.appendChild(button(WORDS.endBtn, 'btn-end', function () { onEnd(false); })); return; }
    if (v.status === 'ended' && v.feedback_offered) a.appendChild(button(WORDS.feedbackBtn, 'vo-nav-btn', giveFeedback));
  }
  // The role play is over (by the learner, by a warning, by the Scope Checker, by the ceiling): the slide's own Continue comes back.
  function finishEnded(v, quiet) {
    if (v.ended_how === 'learner' && !S.endedLine) { S.endedLine = true; S.list.appendChild(sysLine(WORDS.ended)); }
    renderActions(v);
    S.began = false;
    if (!quiet) { H.chips(false); if (!v.feedback_offered || CONTINUE_WITH_FEEDBACK) H.showNav(v.feedback_offered ? WORDS.withoutFeedback : ''); H.setInput(true); }   // beside "Give me feedback" the slide's button reads "Continue without feedback"
    H.keepNavLast(); H.scrollToEnd();
  }

  // "Do a role play" was pressed. NOTHING is asked of the app yet (so the role play's clock has not started): the guide slide appears at once, with its own
  // button. Only "Got it, let's begin" asks for the role play and the other person's first line (Kriti, 2026-11-14). Nothing on the page is redrawn or re-animated:
  // the guide is added after the slide, and later the role play block is added after the guide, so nothing already on screen moves.
  function startRolePlay(btn) {
    if (S.began) return;
    btn.disabled = true; S.began = true; H.busyBegin();             // the message box stays shut while the guide is up
    clearOffer(); H.chips(true); H.hideNav();
    H.appendAtomRow(guideSlide());                                    // the page puts a new slide at the top of the window, as it does for every slide
    S.guideGo = H.appendExtra(button(WORDS.gotIt, 'rp-go-btn', onGotIt), 'vo-nav rp-gowrap');
  }
  function guideSlide() {
    var root = el('div', 'atom-root');
    var tips = WORDS.tips.map(function (t, i) {
      var ico = i === 0 ? ICON.stop : i === 1 ? ICON.dev : ICON.mic;
      return '<div class="rpg-tip"><div class="rpg-num">' + (i + 1) + '</div><div class="rpg-ico' + (i === 2 ? ' pulse' : '') + '">' + ico + '</div><h3>' + esc(t.h) + '</h3><p>' + t.p + '</p></div>';
    }).join('');
    var art = '<svg class="rpg-art" viewBox="0 0 340 210" aria-hidden="true">' +
      '<g class="fl1"><rect x="14" y="22" width="196" height="74" rx="22" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.35)"/><path d="M52 96 L40 118 L78 96Z" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.35)"/>' +
      '<circle class="dot" cx="70" cy="59" r="6" fill="#fff"/><circle class="dot" cx="112" cy="59" r="6" fill="#fff"/><circle class="dot" cx="154" cy="59" r="6" fill="#fff"/></g>' +
      '<g class="fl2"><rect x="118" y="112" width="208" height="80" rx="22" fill="#E4CA0A"/><path d="M290 192 L304 212 L262 192Z" fill="#E4CA0A"/>' +
      '<rect x="142" y="134" width="150" height="10" rx="5" fill="#041A40" opacity=".55"/><rect x="142" y="154" width="112" height="10" rx="5" fill="#041A40" opacity=".35"/></g>' +
      '<circle cx="292" cy="40" r="22" fill="rgba(255,255,255,.14)" stroke="rgba(255,255,255,.4)"/><path d="M292 28 L295 37 L304 40 L295 43 L292 52 L289 43 L280 40 L289 37Z" fill="#E4CA0A"/>' +
      '<circle cx="24" cy="150" r="16" fill="#3ab54a"/><path d="M24 143a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm-8 17a8 8 0 0 1 16 0z" fill="#fff"/></svg>';
    root.innerHTML = '<div class="slide rpg"><div class="slide-tag">' + esc(WORDS.guideTag) + '</div>' +
      '<div class="rpg-hero"><div class="rpg-hero-text"><div class="rpg-eyebrow"><i></i>' + esc(WORDS.guideEyebrow) + '</div><h2>' + esc(WORDS.guideTitle) + '<span>' + esc(WORDS.guideTitleEm) + '</span></h2><p>' + esc(WORDS.sub) + '</p></div>' + art + '</div>' +
      '<div class="rpg-body"><p class="rpg-lead"><b>' + esc(WORDS.guideLead) + '<em>' + esc(WORDS.guideLeadEm) + '</em></b>' + esc(WORDS.guideLeadRest) + '</p><div class="rpg-tips">' + tips + '</div></div></div>';
    return root;
  }
  function onGotIt(btn) {
    btn.disabled = true; H.showTyping();                              // a short wait for the other person's first line, with the usual typing dots
    var started = false;
    post('start', { session_id: S.sid }).then(function (v) {
      started = true; H.removeTyping(); S.view = v;
      if (S.guideGo) { S.guideGo.remove(); S.guideGo = null; }
      var block = makeBlock(); block.classList.add('rp-fade');        // it only fades in
      H.chat().appendChild(block);
      drawNewTurns(v, false);
      renderActions(v);
      H.keepNavLast();
      block.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // one gentle scroll, only if the block is out of view
      var first = (v.turns || []).filter(function (t) { return t.speaker === 'role_player'; })[0];
      if (first) H.say(first.text);                                   // the voice starts together with the panel
    }).catch(function (e) {
      H.removeTyping(); btn.disabled = false; H.appendError(plain(e)); // the guide stays; "Got it" can be pressed again
    }).then(function () { if (started) { H.busyEnd(); if (S.began) H.setInput(true, RP.placeholder); } });
  }

  // The learner answered (the page's message box or microphone): the answer goes to the role play instead of the Trainer.
  RP.send = function (text) {
    if (!RP.isActive()) return;
    var bubble = learnerBubble(text);
    S.list.appendChild(bubble); S.pending = bubble;
    S.actions.style.display = 'none'; H.busyBegin(); H.showTyping(); H.scrollToEnd();
    post('turn', { session_id: S.sid, message: text }).then(function (v) {
      H.removeTyping(); S.view = v;
      var toSpeak = drawNewTurns(v, false);
      toSpeak.forEach(function (t) { H.say(t); });
      if (v.status === 'in_progress') renderActions(v); else finishEnded(v);
    }).catch(function (e) {
      H.removeTyping();
      if (S.pending) { S.pending.remove(); S.pending = null; }       // nothing of this turn was saved: the words go back into the box to be sent again
      H.restoreInputText(text); S.actions.style.display = ''; H.appendError(plain(e));
    }).then(function () { H.busyEnd(); if (RP.isActive()) H.setInput(true, RP.placeholder); H.scrollToEnd(); });
  };

  function onEnd(confirm) {
    S.actions.style.display = 'none'; H.busyBegin();
    post('end', { session_id: S.sid, confirm: !!confirm }).then(function (v) {
      S.view = v;
      if (v.needs_confirmation) { askKeepOrEnd(v.message); return; }
      drawNewTurns(v, false); finishEnded(v);
    }).catch(function (e) { S.actions.style.display = ''; H.appendError(plain(e)); })
      .then(function () { H.busyEnd(); if (RP.isActive()) H.setInput(true, RP.placeholder); H.scrollToEnd(); });
  }
  // Too early for feedback: the app asks whether to keep going or end without it.
  function askKeepOrEnd(message) {
    var warn = sysLine(message); S.list.appendChild(warn); S.warnRow = warn;
    var a = S.actions; a.innerHTML = ''; a.style.display = '';
    a.appendChild(button(WORDS.keep, 'btn-soft', function () { warn.remove(); S.warnRow = null; S.view.needs_confirmation = false; renderActions(S.view); }));
    a.appendChild(button(WORDS.endNoFb, 'btn-end', function () { warn.remove(); S.warnRow = null; onEnd(true); }));
  }

  // The learner pressed the slide's Continue / Finish: an offer of feedback that was still open goes away (it is one or the other).
  // It is hidden, not removed: taking its height away made the page jog by about 48 px for a split second before the next slide scrolled in (Kriti, 2026-11-14).
  RP.onAdvance = function () { if (S.actions) { S.actions.style.visibility = 'hidden'; S.actions.style.pointerEvents = 'none'; } };

  // ---------------------------------------------------------------------------------------------------------------- the feedback
  function giveFeedback(btn) {
    btn.disabled = true; H.busyBegin();
    H.hideNav();                                              // one or the other (Kriti, 2026-11-14): choosing feedback takes "Finish ... without feedback" away at once
    var note = el('div', 'rp-wait', esc(WORDS.preparing)); S.actions.style.display = 'none'; S.block.appendChild(note); H.showTyping(); H.scrollToEnd();
    post('feedback', { session_id: S.sid }).then(function (v) {
      H.removeTyping(); note.remove(); S.view = v;
      S.actions.innerHTML = ''; S.actions.style.display = '';
      H.hideNav();                                            // Continue returns when the last voiceover has finished
      S.feedbackUi = buildFeedback(v, 'live', null);
      if (!S.feedbackUi) { H.showNav(''); }
      H.keepNavLast();
    }).catch(function (e) {
      H.removeTyping(); note.remove(); S.actions.style.display = ''; btn.disabled = false; H.appendError(plain(e));
      H.showNav(WORDS.withoutFeedback);                      // the feedback could not be made: both choices are back
    }).then(function () { H.busyEnd(); H.setInput(true); H.scrollToEnd(); });
  }

  // ---------------------------------------------------------------------------------------------------------------- the feedback slide: four designs
  function pointsOf(fb) {
    if (!fb) return [];
    var out = [];
    (fb.motivational_feedback || []).forEach(function (p) { out.push({ kind: 'good', ost: p.on_screen_text, vo: p.voiceover }); });
    (fb.developmental_feedback || []).forEach(function (p) { out.push({ kind: 'dev', ost: p.on_screen_text, vo: p.voiceover }); });
    return out;
  }
  function labEl(kind, count) {
    return '<div class="rflab ' + kind + '"><span class="ico">' + ICON[kind] + '</span>' + (kind === 'good' ? WORDS.good : WORDS.dev) +
      (count !== undefined ? '<span class="cnt">(' + count + ')</span>' : '') + '</div>';
  }
  var EQ = '<span class="rfeq"><i></i><i></i><i></i></span>';
  function idxOf(F, kind) { return F.pts.map(function (p, i) { return p.kind === kind ? i : -1; }).filter(function (i) { return i >= 0; }); }
  function nOf(F, kind) { return F.pts.filter(function (p) { return p.kind === kind; }).length; }
  function frame(F, inner) {
    return '<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(WORDS.tag) + '</div><div class="slide-body rpf-body d' + F.pts.length +
      (F.narrow ? ' rpf-narrow' : '') + '">' + inner + '</div></div></div>';
  }
  var TL = { x0: 50, w: 900, ax: 245 };
  var RENDER = {
    A: function (F) {
      var items = function (k) { return idxOf(F, k).map(function (i) { return '<div class="rfix k-' + F.pts[i].kind + ' next" data-i="' + i + '"><span class="rfnum">' + (i + 1) + '</span><span class="tx">' + WORDS.soon + '</span>' + EQ + '</div>'; }).join(''); };
      var sec = function (k, n) { return '<div class="sec ' + k + (k === 'dev' ? ' rfghost' : '') + '" data-sec="' + k + '">' + labEl(k, n) + items(k) + '</div>'; };
      return '<div class="A"><div class="side">' + sec('good', nOf(F, 'good')) + (nOf(F, 'dev') ? sec('dev', nOf(F, 'dev')) : '') + '</div><div class="main rpf-focus-host"></div></div>';
    },
    B: function (F) {
      var N = F.pts.length, ng = nOf(F, 'good'), dev = nOf(F, 'dev');
      var sx = dev ? Math.round(Math.max(520, Math.min(650, 1000 * ng / N + 20))) : 1000;
      var items = function (k) { return idxOf(F, k).map(function (i) { return '<div class="rfitem rfhid hh k-' + k + '" data-i="' + i + '"><span class="bn">' + (i + 1) + '</span><span class="txt">' + esc(F.pts[i].ost) + '</span>' + EQ + '</div>'; }).join(''); };
      var wave = 'M' + sx + ',0 C' + (sx + 70) + ',110 ' + (sx - 70) + ',190 ' + sx + ',245 S' + (sx + 70) + ',380 ' + sx + ',490 L1000,490 L1000,0 Z';
      var h = '<div class="B rpf-field">';
      if (dev) h += '<svg class="wave" viewBox="0 0 1000 490" preserveAspectRatio="none"><defs><linearGradient id="rpGold' + F.uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0b0"/><stop offset="1" stop-color="#f1d96c"/></linearGradient></defs><path d="' + wave + '" fill="url(#rpGold' + F.uid + ')"/></svg>';
      h += '<div class="mark" style="left:-40px;bottom:-50px">' + ICON.good + '</div>';
      if (dev) h += '<div class="mark right" style="right:-40px;bottom:-50px">' + ICON.dev + '</div>';
      h += '<div class="rfcol" style="left:46px;width:' + (sx - 100) + 'px">' + labEl('good', ng) + items('good') + '</div>';
      if (dev) h += '<div class="rfcol right" style="left:' + (sx + 50) + 'px;right:42px">' + labEl('dev', dev) + items('dev') + '</div>';
      return h + '</div>';
    },
    C: function (F) {
      var N = F.pts.length, cw = Math.min(250, TL.w / N * 1.9), ng = nOf(F, 'good'), bx = TL.x0 + TL.w * ng / N;
      var h = '<div class="T"><div class="axis"></div><div class="rfprog good" id="pg' + F.uid + '" style="left:' + TL.x0 + 'px"></div><div class="rfprog dev" id="pd' + F.uid + '" style="left:' + bx + 'px"></div>';
      h += '<div class="seclab" style="left:' + TL.x0 + 'px">' + labEl('good', ng) + '</div>';
      if (nOf(F, 'dev')) h += '<div class="bound" style="left:' + (bx - 1) + 'px"></div><div class="seclab rfghost" data-sec="dev" style="left:' + (bx + 10) + 'px">' + labEl('dev', nOf(F, 'dev')) + '</div>';
      F.pts.forEach(function (p, i) {
        var cx = TL.x0 + TL.w * (i + 0.5) / N, above = i % 2 === 0, left = Math.max(10, Math.min(990 - cw, cx - cw / 2));
        h += '<div class="tn k-' + p.kind + '" data-i="' + i + '" style="left:' + cx + 'px">' + (i + 1) + '</div>';
        h += '<div class="stem hh rfhid" data-i="' + i + '" style="left:' + cx + 'px;top:' + (above ? TL.ax - 36 : TL.ax + 15) + 'px"></div>';
        h += '<div class="rfpt hh rfhid k-' + p.kind + '" data-i="' + i + '" style="left:' + left + 'px;width:' + cw + 'px;' + (above ? 'bottom:' + (490 - TL.ax + 36) + 'px' : 'top:' + (TL.ax + 36) + 'px') + '"><span class="txt">' + esc(p.ost) + '</span>' + EQ + '</div>';
      });
      return h + '</div>';
    },
    D: function (F) {
      var msgs = function (k) { return idxOf(F, k).map(function (i) { return '<div class="rfmsg rfpt hh rfhid k-' + k + '" data-i="' + i + '"><div class="rfbub"><span class="rfnum">' + (i + 1) + '</span><span class="txt">' + esc(F.pts[i].ost) + '</span>' + EQ + '</div></div>'; }).join(''); };
      var dv = function (k, n, ghost) { return '<div class="dv' + (ghost ? ' rfghost' : '') + '" data-sec="' + k + '"><span class="line"></span>' + labEl(k, n) + '<span class="line"></span></div>'; };
      return '<div class="H">' + dv('good', nOf(F, 'good'), false) + msgs('good') + (nOf(F, 'dev') ? dv('dev', nOf(F, 'dev'), true) + msgs('dev') : '') + '</div>';
    }
  };

  // keeps the picture in step with F.shown (the points on the slide) and F.cur (the one being spoken)
  function syncA(F) {
    F.root.querySelectorAll('.rfix').forEach(function (n) {
      var i = +n.dataset.i, p = F.pts[i], state = i > F.shown ? 'next' : (i === F.cur ? 'cur' : 'done');
      n.className = 'rfix k-' + p.kind + ' ' + state + (state === 'done' && i === F.prev && !F.still ? ' in' : '');
      n.querySelector('.tx').textContent = state === 'next' ? WORDS.soon : (state === 'cur' && F.mode !== 'history' ? WORDS.nowPlaying : p.ost);
    });
    F.root.querySelectorAll('.sec').forEach(function (s) { if (s.querySelector('.rfix:not(.next)')) s.classList.remove('rfghost'); });
    var key = F.cur >= 0 ? 'p' + F.cur : (F.done ? 'done' : 'idle');
    if (key !== F.focusKey) {
      F.focusKey = key;
      var f = F.root.querySelector('.rpf-focus-host');
      if (F.cur >= 0) {
        var p = F.pts[F.cur];
        f.innerHTML = '<div class="focus k-' + p.kind + (F.still ? '' : ' pop') + '"><div><span class="rfbig"><span class="ico">' + ICON[p.kind] + '</span></span></div>' + labEl(p.kind) + '<div class="ost">' + esc(p.ost) + '</div></div>';
      } else {
        f.innerHTML = '<div class="focus"><div class="hint"><span class="rfbig"><span class="ico">' + ICON.speaker + '</span></span><br>' +
          esc(F.mode === 'history' ? WORDS.hintHistory : (F.done ? WORDS.hintDone : WORDS.hintResume)) + '</div></div>';
      }
    }
    var b = F.body, sd = F.root.querySelector('.A .side');
    b.classList.remove('tight'); if (sd && sd.scrollHeight > sd.clientHeight + 1) b.classList.add('tight');
  }
  function syncGeneric(F, newIdx) {
    F.root.querySelectorAll('[data-i]').forEach(function (n) {
      var i = +n.dataset.i;
      if (n.classList.contains('hh')) {
        n.classList.toggle('rfhid', i > F.shown);
        if (i === newIdx && !F.still) { n.classList.remove('in'); void n.offsetWidth; n.classList.add('in'); }
      }
      n.classList.toggle('cur', i === F.cur);
      if (n.classList.contains('tn')) n.classList.toggle('reached', i <= F.shown);
    });
    F.root.querySelectorAll('[data-sec]').forEach(function (s) {
      var k = s.dataset.sec; if (F.pts.some(function (p, i) { return p.kind === k && i <= F.shown; })) s.classList.remove('rfghost');
    });
    if (F.design === 'B') { var f = F.root.querySelector('.rpf-field'); if (f) f.classList.toggle('gold', F.pts.some(function (p, i) { return p.kind === 'dev' && i <= F.shown; })); }
    if (F.design === 'C') {
      var N = F.pts.length, bx = TL.x0 + TL.w * nOf(F, 'good') / N, xl = F.shown >= 0 ? TL.x0 + TL.w * (F.shown + 0.5) / N : TL.x0;
      var pg = F.root.querySelector('#pg' + F.uid), pd = F.root.querySelector('#pd' + F.uid);
      if (pg) pg.style.width = Math.max(0, Math.min(xl, bx) - TL.x0) + 'px'; if (pd) pd.style.width = Math.max(0, xl - bx) + 'px';
    }
  }
  function sync(F, newIdx) {
    if (F.design === 'A') syncA(F); else syncGeneric(F, newIdx === undefined ? -1 : newIdx);
    F.body.classList.toggle('speaking', F.playing);
    var tag = F.root.querySelector('.slide-tag');
    if (tag) tag.textContent = (F.mode === 'live' && F.cur >= 0 && !F.done) ? WORDS.tag + ' · point ' + (F.cur + 1) + ' of ' + F.pts.length : WORDS.tag;
    if (F.ui) {
      F.ui.playBtn.innerHTML = F.playing ? H.icons().pause : H.icons().play;
      F.ui.script.textContent = F.cur >= 0 ? F.pts[F.cur].vo : WORDS.hintResume.replace('on the left ', '');
    }
  }
  function setFill(F, f) { if (F.ui) F.ui.fill.style.width = Math.max(0, Math.min(1, f)) * 100 + '%'; }
  function stopFeedback(F) { if (!F) return; F.token += 1; clearTimeout(F.gap); clearInterval(F.timer); F.playing = false; F.paused = false; }

  // Plays point i: its text appears on the slide at the moment its voiceover starts; when the voiceover ends the next point follows.
  function playPoint(F, i, animate) {
    stopFeedback(F);
    var mine = F.token, fresh = i > F.shown;
    F.shown = Math.max(F.shown, i); F.prev = F.cur; F.cur = i; F.playing = true; F.paused = false; F.done = false; setFill(F, 0);
    sync(F, fresh && animate ? i : -1);
    H.takeAudio(F.api);
    var text = F.pts[i].vo, V = H.voice();
    var advance = function () {
      if (mine !== F.token) return;
      F.playing = false; F.prev = F.cur; sync(F, -1);
      if (i < F.pts.length - 1) F.gap = setTimeout(function () { if (mine === F.token) playPoint(F, i + 1, true); }, 500);
      else finishFeedback(F);
    };
    var simulate = function () {                              // the voice is off: the points still roll, at reading pace
      var total = Math.max(2, text.trim().split(/\s+/).length / 2.6) * 1000, t0 = Date.now(); F.simElapsed = 0; F.audio = false;
      F.timer = setInterval(function () {
        if (F.paused) { t0 = Date.now() - F.simElapsed; return; }
        F.simElapsed = Date.now() - t0; setFill(F, Math.min(1, F.simElapsed / total));
        if (F.simElapsed >= total) { clearInterval(F.timer); advance(); }
      }, 200);
    };
    var started = V && V.enabled && V.speak(text, false, {
      onprogress: function (f) { if (mine === F.token) setFill(F, f); },
      onend: function () { if (mine === F.token) { setFill(F, 1); advance(); } },
      onerror: function () { if (mine === F.token) simulate(); }
    });
    if (started) F.audio = true; else simulate();
  }
  function finishFeedback(F) {
    F.done = true; F.cur = -1; F.playing = false; sync(F, -1);
    if (F.mode === 'live') { H.showNav(''); H.keepNavLast(); H.scrollToEnd(); }
  }

  function buildPlayer(F) {
    var I = H.icons(), W = H.words();
    var bar = el('div', 'vo-player',
      '<button type="button" class="vo-pbtn vo-play"></button><div class="vo-track"><div class="vo-fill"></div></div>' +
      '<button type="button" class="vo-pbtn vo-replay-btn" title="' + W.replayLabel + '" aria-label="' + W.replayLabel + '">' + I.replay + '</button>' +
      '<span class="vo-volwrap"><button type="button" class="vo-pbtn vo-vol-btn" title="' + W.muteLabel + '" aria-label="' + W.muteLabel + '">' + I.volumeOn + I.volumeOff + '</button>' +
      '<button type="button" class="vo-vol-more" title="' + W.volumeLabel + '" aria-label="' + W.volumeLabel + '">' + I.volumeMore + '</button>' +
      '<input class="vo-slim" type="range" min="0" max="1" step="0.05" aria-label="' + W.volumeLabel + '"></span>' +
      '<button type="button" class="vo-readalong-btn vo-cc-btn" aria-pressed="false">' + W.readAlong + '</button>');
    var script = el('div', 'vo-script', '<div class="vo-script-label">' + esc(W.ccLabel) + '</div><div class="vo-script-text" dir="auto"></div>');
    var box = el('div', 'vo-pbox'); box.appendChild(bar); box.appendChild(script);
    var q = function (s) { return bar.querySelector(s); };
    F.ui = { box: box, bar: bar, fill: q('.vo-fill'), playBtn: q('.vo-play'), script: script.querySelector('.vo-script-text') };
    F.ui.playBtn.onclick = function () {
      var V = H.voice();
      if (F.playing) { F.paused = true; F.playing = false; if (F.audio && V) V.pause(); sync(F, -1); }
      else if (F.paused) { F.paused = false; F.playing = true; if (F.audio && V) V.resume(); sync(F, -1); }
      else playPoint(F, F.cur >= 0 ? F.cur : 0, false);
    };
    q('.vo-replay-btn').onclick = function () { playPoint(F, F.cur >= 0 ? F.cur : 0, false); };
    q('.vo-vol-btn').onclick = H.toggleMute;
    q('.vo-vol-more').onclick = function () { bar.classList.toggle('vol-open'); };
    q('.vo-slim').oninput = function (e) { H.setVolume(parseFloat(e.target.value)); };
    q('.vo-cc-btn').onclick = function (ev) { H.toggleCc(ev.currentTarget); };
    return box;
  }

  // History does not scale slides by itself: the 1000-pixel design is shrunk to the width of the history area, the way the live page shrinks every slide.
  function fitHistory(F) {
    if (F.narrow) return;
    var wrap = F.root.parentElement, avail = (wrap && wrap.clientWidth) || 1000, scale = Math.min(1, avail / 1000);
    F.root.style.width = '1000px'; F.root.style.transform = 'scale(' + scale + ')'; F.root.style.transformOrigin = '0 0';
    wrap.style.height = Math.round(F.root.offsetHeight * scale) + 'px'; wrap.style.overflow = 'hidden';
  }
  var uid = 0;
  // mode: 'live' (rolls by itself, Continue returns at the end), 'resume' (all points there, nothing plays by itself, audio works) or 'history' (read-only: no audio,
  // no player; target is the history area). Returns the feedback object, or null if there is nothing to show.
  function buildFeedback(v, mode, target) {
    var pts = pointsOf(v.feedback);
    if (!pts.length) return null;
    var narrow = (mode === 'history' ? target.width() : H.chat().clientWidth) < 760;
    var F = { pts: pts, mode: mode, narrow: narrow, uid: ++uid, shown: -1, cur: -1, prev: -1, playing: false, paused: false, done: false, token: 0, still: mode !== 'live', focusKey: null, audio: false };
    F.design = narrow ? 'D' : (DESIGN_OF[v.feedback_design] || 'D');
    var holder = el('div'); holder.innerHTML = frame(F, RENDER[F.design](F));
    F.root = holder.firstChild; F.body = F.root.querySelector('.rpf-body');
    F.api = { reset: function () { stopFeedback(F); sync(F, -1); } };
    var row;
    if (mode === 'history') { row = target.appendAtomRow(F.root); fitHistory(F); } else row = H.appendAtomRow(F.root);
    F.root.addEventListener('click', function (e) {
      var n = e.target.closest('[data-i]'); if (!n) return; var i = +n.dataset.i;
      if (mode === 'history') { if (F.design === 'A') { F.cur = i; sync(F, -1); } return; }
      if (i <= F.shown) playPoint(F, i, false);
    });
    if (mode === 'history') {
      F.shown = pts.length - 1; F.cur = F.design === 'A' ? 0 : -1; sync(F, -1);
      pts.forEach(function (p, i) { target.message('ai', 'Point ' + (i + 1) + ': ' + p.vo); });          // no audio in history: every voiceover is written out
      return F;
    }
    var wrap = H.appendExtra(buildPlayer(F), 'vo-playerwrap');
    row.classList.add('vo-has-player'); wrap.classList.add('vo-attached');
    H.syncView(); H.syncMute();
    if (mode === 'live') playPoint(F, 0, true);
    else { F.shown = pts.length - 1; sync(F, -1); }
    H.keepNavLast();
    return F;
  }

  // ---------------------------------------------------------------------------------------------------------------- Parking Lot resume
  // Called by the page after each slide of a resumed session has been drawn (with its Trainer chat). If the role play was started on that slide, it is drawn
  // here, right after the slide: as it was left (an unfinished one is live again, with its End button), or finished with its feedback.
  RP.placeResumed = function (number, isParkedSlide) {
    var v = S.view;
    if (!v || S.sid !== H.sessionId() || v.slide_number !== number) return;
    if (['in_progress', 'ended', 'feedback_given'].indexOf(v.status) < 0) return;
    S.began = v.status === 'in_progress';
    var block = makeBlock();
    H.chat().appendChild(block);
    drawNewTurns(v, true);
    if (v.status === 'in_progress') {
      renderActions(v);
      if (isParkedSlide) { H.chips(true); H.hideNav(); }
    } else {
      if (v.ended_how === 'learner') { S.endedLine = true; S.list.appendChild(sysLine(WORDS.ended)); }
      renderActions(v);
      if (v.status === 'ended' && v.feedback_offered) {
        if (isParkedSlide) H.showNav(WORDS.withoutFeedback);                                        // the learner is still on this slide: Continue reads "without feedback"
        else S.actions.style.display = 'none';                                                    // they moved on: the offer is gone
      }
      if (v.status === 'feedback_given') S.feedbackUi = buildFeedback(v, 'resume', null);
    }
    H.keepNavLast();
  };

  // ---------------------------------------------------------------------------------------------------------------- Conversation History (read-only)
  // `target` is the history area: { appendAtomRow(el) -> row, message(role, text), append(node) }.
  RP.drawHistory = function (v, number, target) {
    if (!v || v.slide_number !== number || ['in_progress', 'ended', 'feedback_given'].indexOf(v.status) < 0) return;
    var saved = { list: S.list, actions: S.actions, block: S.block, renderedN: S.renderedN, pending: S.pending };
    var block = el('div', 'rp-block'); block.appendChild(el('div', 'rp-head', '<b>' + esc(WORDS.head) + '</b>'));
    var list = el('div', 'rp-list'); block.appendChild(list);
    (v.turns || []).forEach(function (t) {
      if (t.speaker === 'learner') list.appendChild(learnerBubble(t.text));
      else if (t.speaker === 'role_player') list.appendChild(partnerBubble(t, true));
      else list.appendChild(sysLine(t.text));
    });
    if (v.status === 'ended' && v.ended_how === 'learner') list.appendChild(sysLine(WORDS.ended));
    if (v.status === 'in_progress') list.appendChild(sysLine('This role play was not finished.'));
    target.append(block);
    if (v.status === 'feedback_given') buildFeedback(v, 'history', target);
    S.list = saved.list; S.actions = saved.actions; S.block = saved.block; S.renderedN = saved.renderedN; S.pending = saved.pending;
  };
})();
