/*
 * atom_slides.js -- the code-made Learning Atom slides (Kriti, 2026-10-15).
 *
 * The Master Instructional Designer writes WORDS (slide titles, on-screen text, voiceover, activities); this file decides how they LOOK.
 * Every word on a slide is live text dropped into a slot, so it works in any language and on a phone. The looks are the ones Kriti froze in
 * do-not-push-live/learning_atom_templates_preview.html, rebuilt here to read the Master's real slide data (see the Slide Menu).
 *
 * The only words this file writes itself are in WORDS below, in one table, so they can be reviewed and translated in one place.
 *
 * Public API (window.AtomSlides). Each render function returns { el, voice, ... }: el is the card to put in the page, voice the words the page shows
 * as "Read along" text and the browser reads aloud.
 *   renderCover(cover, ctx)         -> { el, onStart(fn), setReady(), markStarted() }               the cover (slide 1), made by code; its button is greyed out until setReady()
 *   renderSlide(slide, ctx)         -> { el, voice }                                one Master slide (ctx.number = the number shown)
 *   renderActivity(activity, ctx)   -> { el, voice, response, onDone(fn), isFinished() }          the activity that follows a slide; response = the Master's trainer_response
 *   renderCommitment(slide, ctx)    -> { el, voice, onSubmit(fn(text)), lock(text), unlock() }   the closing "So what? Now what?" slide
 *   Voice                           browser speech for the voiceover (an interim voice; Azure Speech replaces it later)
 *   useScriptFont(base, font)       loads the web font for the learner's language
 *   words                           the fixed-words table (Continue / Finish labels and so on)
 *
 * ctx: { seed: the session ID (so a slide keeps the same look when the session is resumed), number, readonly, apiBase, saved,
 *        progress (an activity: what the learner had done so far, as onProgress last reported it; the activity is drawn at that step),
 *        onProgress(progress, finished) (an activity: called each time the learner does something) }
 *   apiBase (cover, commitment): the backend address the language font is fetched from.   saved (commitment): the text already saved, if any, so
 *   the card is shown greyed out with it.
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------------------------------------------------------------
  // The fixed words. Everything else on a slide comes from the Master.
  // ---------------------------------------------------------------------------------------------------------------------------------
  var WORDS = {
    slideTag: 'Learning atom slide {n}',
    activityTag: 'Activity',
    commitTag: 'Your commitment',
    cont: 'Continue',
    finish: 'Finish my learning atom',
    // from -> to
    insteadOf: 'Instead of', tryThis: 'Try', tapToFlip: 'Tap to flip', tapToFlipBack: 'Tap to flip back',
    // lens
    lensNow: 'How it looks right now', lensClear: 'How it looks, clearly', lensLets: 'What this lets you do:',
    // compass
    compassPulled: 'Where you may be pulled', compassNorth: 'Your true north', compassWhy: 'Holding this lets you:',
    // fork
    forkNow: 'The road you are on', forkChosen: 'The road you choose', forkChanges: 'What changes:',
    // if / then
    ifLabel: 'IF', thenLabel: 'THEN',
    // branch map
    wayThrough: 'Way through', evSupported: 'Well supported', evPartly: 'Partly assumed', evWatch: 'Worth watching',
    // activities
    kindFinish: 'Finish the thought', kindBuild: 'Build your response', kindRank: 'Rank it', kindStory: 'Mini story',
    kindRole: 'Role play', kindView: 'Your view', kindGut: 'Gut check', kindSpot: 'Spot it',
    leadsTo: 'What this tends to lead to', ownWords: 'Or finish it in your own words…', done: 'Done',
    yourMessage: 'Your message', pickPieces: 'Pick a piece for each part…', checkMessage: 'Check my message', almost: 'Almost',
    pickFirst: 'Pick one piece for each part first.', lockIt: 'Lock it in', matchOrder: 'Matches the suggested order.',
    suggestedSpot: 'Suggested spot:', pauseHere: 'Pause here:', whatHappened: 'What happened', you: 'You', them: 'Them',
    tryItOut: 'Your turn', sayIt: 'Say your opening line…', send: 'Send', ownView: 'Or tell me in your own words…', share: 'Share',
    youPin: 'You:', check: 'Check', foundOf: 'You found {a} of {b}.', strongerAll: 'Strong. You chose the stronger piece every time.',
    strongerNone: 'Not yet. Every piece you picked was the weaker version.', strongerSome: 'You chose {a} of {b} stronger pieces.',
    strongerKey: 'Green is the stronger version of each part. Amber is where you picked the weaker one.',
    // cover
    coverEyebrow: 'Your learning atom · about 6 minutes', coverHi: 'Hi,', coverAsk: 'You came here to sort out',
    coverSkill: 'Skill you will unlock', coverBoarding: 'Learning atom · boarding now', coverMinutes: 'minutes',
    exSlidesB: 'Slides', exSlidesT: 'Short slides, one idea at a time', exAudioB: 'Read or listen', exAudioT: 'Your trainer speaks, or read along',
    exAskB: 'Ask anytime', exAskT: 'Type or speak a question', exBackB: 'Go back', exBackT: 'Revisit any slide at your pace',
    expectTitle: 'What to expect', voiceOn: 'Voice on', voiceOff: 'Voice off',
    voiceHelp: 'Want to hear your trainer? Keep voice on and turn your device volume up. If you hear nothing, check that this tab is not muted and that your browser allows sound for this site.',
    playTest: 'Play a test sound', testPlayed: 'Played. Did you hear it?', testNone: 'Sound is not available in this browser',
    testLine: 'Hello {name}. If you can hear this, your voice is working.',
    stepRead: 'Reading your situation', stepPrep: 'Preparing your slides', stepTrainer: 'Getting your trainer ready',
    gettingReady: 'Getting your slides ready…', letsGo: "Let's go",
    // commitment
    commitHeading: 'So what? Now what?', commitSub: 'You have the idea, the technique and the barriers… What will you actually do with them?',
    commitSave: 'Submit my commitment', commitPrefix: 'I will… ', commitSaved: 'Saved.', commitSavedSub: 'On its way to future you.',
    commitVoice: 'Before we call it a day, let’s turn learning into action, because knowing what to do never changed the world. Doing it did. So, what will you do next? Type your commitment for action, and I’ll follow up to keep you on track.',
    readAlong: 'Read along',
    viewLabel: 'Better view', viewHelp: 'Want the slides bigger? Press the expand arrows at the top right of this window, next to the X. For the most room, put your browser in full screen too (Ctrl + Cmd + F on a Mac, F11 on Windows).',
    // the player under each slide, and the extra question button
    playLabel: 'Play', pauseLabel: 'Pause', replayLabel: 'Play again', volumeLabel: 'Volume', ccLabel: 'Read along', ccHide: 'Hide the read-along text',
    ccShow: 'Show the read-along text', expandLabel: 'Expand the window', shrinkLabel: 'Shrink the window', smallLabel: 'Smaller slide', normalLabel: 'Normal size slide',
    diffQuestion: 'I have a different question',
    diffReply: 'Sure, what’s on your mind? (You can click the mic icon and speak your question, or type it in the box below.)',
    // labels inside a few slides
    yourMove: 'Your move', ideaLabel: 'The idea', exampleLabel: 'For example', goalLabel: 'Your goal:', evidencePin: 'Evidence:',
    coverAdmit: 'ADMIT ONE', commitPlaceholder: 'I will… ',
    commitTyping: 'Type your commitment here.', commitSaving: 'Submitting…'
  };

  // Language name (as the platform stores it) -> the code the browser's voices use.
  var LANG_CODES = {
    'English': 'en-US', 'Hinglish': 'en-IN', 'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE', 'Portuguese': 'pt-PT',
    'Italian': 'it-IT', 'Dutch': 'nl-NL', 'Filipino': 'fil-PH', 'Arabizi': 'en-US', 'Hindi': 'hi-IN', 'Tamil': 'ta-IN',
    'Telugu': 'te-IN', 'Kannada': 'kn-IN', 'Malayalam': 'ml-IN', 'Arabic': 'ar-SA', 'Chinese (Simplified)': 'zh-CN',
    'Chinese (Traditional)': 'zh-TW', 'Japanese': 'ja-JP', 'Korean': 'ko-KR'
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function str(v) { return (typeof v === 'string') ? v : (v == null ? '' : String(v)); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
  function fill(template, vars) { return template.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); }

  function hash(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 16; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  // The look of a slide is picked here, never by the back end. The back end only sends a number on the cover and every slide (look_rotation: how many
  // sessions this learner had before this one), so the looks step on by one from session to session and back-to-back sessions do not open with the
  // same cover or agenda. The pools below still hold only looks that suit the content. Without the number (an older session) the session ID decides.
  // Either way the same session always gives the same pick, so a slide keeps its look when the session is resumed.
  var lookRotation = null;
  function noteRotation(slide) { lookRotation = (slide && typeof slide.look_rotation === 'number') ? slide.look_rotation : null; }
  function seedPick(ctx, pool, salt) {
    var r = (ctx && typeof ctx.rotation === 'number') ? ctx.rotation : lookRotation;
    if (typeof r === 'number') return pool[(r + hash(String(salt))) % pool.length];
    return pool[hash(String((ctx && ctx.seed) || 'atom') + ':' + salt) % pool.length];
  }
  function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // Code shuffles the options the learner chooses between (the Master is told not to rely on position). Same seed, same order.
  function shuffled(list, ctx, salt) {
    var out = list.slice(), rnd = seeded(hash(String((ctx && ctx.seed) || 'atom') + ':shuffle:' + salt));
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t; }
    return out;
  }

  var uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || 'a') + uidCounter; }

  function node(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function $q(root, sel) { return root.querySelector(sel); }
  function $all(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  var ICON = {
    slides: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>',
    ask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.5 6.8L12 17l-6.2 3.5 1.5-6.8L2.2 9l6.9-.7z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>'
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Voice -- the browser's own speech, as an interim voice. Off switch and a test sound live on the cover.
  // ---------------------------------------------------------------------------------------------------------------------------------
  var Voice = {
    enabled: true,
    language: 'English',
    volume: 1,
    listeners: [],
    supported: function () { return 'speechSynthesis' in global; },
    setLanguage: function (name) { Voice.language = name || 'English'; },
    // The cover's switch calls this; the player and the chat read Voice.enabled and listen for the change.
    setEnabled: function (on) {
      Voice.enabled = !!on;
      if (!on) Voice.stop();
      Voice.listeners.forEach(function (fn) { try { fn(Voice.enabled); } catch (e) { /* a listener must never break the switch */ } });
    },
    onChange: function (fn) { Voice.listeners.push(fn); },
    stop: function () { try { if (Voice.supported()) global.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ } },
    pause: function () { try { if (Voice.supported()) global.speechSynthesis.pause(); } catch (e) { /* nothing to pause */ } },
    resume: function () { try { if (Voice.supported()) global.speechSynthesis.resume(); } catch (e) { /* nothing to resume */ } },
    // force: the cover's test sound and the player's own play button play even when the switch is off, because the person asked for it.
    // handlers (all optional): onstart(), onprogress(fraction 0..1, charIndex), onend(), onerror(). startAt: a character position to begin from.
    // Returns true when speech was started.
    speak: function (text, force, handlers, startAt) {
      if ((!Voice.enabled && !force) || !Voice.supported() || !text) return false;
      try {
        global.speechSynthesis.cancel();
        var offset = startAt > 0 ? startAt : 0, h = handlers || {};
        var u = new SpeechSynthesisUtterance(offset ? text.slice(offset) : text);
        u.lang = LANG_CODES[Voice.language] || 'en-US';
        u.volume = Voice.volume;
        var voices = global.speechSynthesis.getVoices() || [];
        var prefix = u.lang.split('-')[0];
        var match = voices.filter(function (v) { return v.lang === u.lang; })[0] || voices.filter(function (v) { return v.lang && v.lang.split('-')[0] === prefix; })[0];
        if (match) u.voice = match;
        u.onstart = function () { if (h.onstart) h.onstart(); };
        u.onboundary = function (e) { if (h.onprogress) h.onprogress((offset + e.charIndex) / text.length, offset + e.charIndex); };
        u.onend = function () { if (h.onend) h.onend(); };
        u.onerror = function (e) { if (e && (e.error === 'canceled' || e.error === 'interrupted')) return; if (h.onerror) h.onerror(); };
        global.speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; /* speech is a nicety: the text is always on the page */ }
    }
  };

  // The web font that draws the learner's language (the backend serves exactly the files script_fonts.py lists).
  function useScriptFont(apiBase, font) {
    var root = document.documentElement;
    if (!font || !font.file || font.script === 'latin') { root.style.removeProperty('--atm-script'); return; }
    var id = 'atm-font-' + font.script;
    if (!document.getElementById(id)) {
      var style = document.createElement('style');
      style.id = id;
      style.textContent = "@font-face{font-family:'AtmScript-" + font.script + "';src:url('" + apiBase + "/api/fonts/" + encodeURIComponent(font.file) + "');font-display:swap;}";
      document.head.appendChild(style);
    }
    root.style.setProperty('--atm-script', "'AtmScript-" + font.script + "',");
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // The slide frame: grey bar with the number, then the Master's title, then the body.
  // ---------------------------------------------------------------------------------------------------------------------------------
  function sameText(a, b) { return str(a).trim().toLowerCase() === str(b).trim().toLowerCase(); }

  // spec = what a renderer returned: { body, bodyClass, noTitle }. A slide whose design carries its own title (the recap) sets noTitle.
  function frame(slide, ctx, spec) {
    var title = spec.noTitle ? '' : str(slide.slide_title).trim();
    return '<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(fill(WORDS.slideTag, { n: ctx.number != null ? ctx.number : '' })) + '</div>'
      + '<div class="slide-body' + (spec.bodyClass ? ' ' + spec.bodyClass : '') + '">' + (title ? '<h2>' + esc(title) + '</h2>' : '') + spec.body + '</div></div></div>';
  }
  // A heading inside the template, shown only when it adds something to the slide title.
  function subTitle(slide, inner) {
    var t = str(inner).trim();
    return (t && !sameText(t, slide.slide_title)) ? '<div class="atm-sub">' + esc(t) + '</div>' : '';
  }

  var SLIDES = {};      // slide_type -> function(slide, ctx) -> { body, bodyClass, after(root) }
  var ACTIVITIES = {};  // activity_type -> function(activity, ctx) -> { html, after(root, done) }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Artwork lifted unchanged from the frozen preview: the four agenda scenes and the three barrier backdrops.
  // ---------------------------------------------------------------------------------------------------------------------------------
  // A scene's gradients are named inside the drawing; give each copy its own names so two drawings on one page never share them.
  function uniqueNames(svg) {
    var suffix = '-' + uid('s'), names = {};
    svg.replace(/ id="([A-Za-z0-9_]+)"/g, function (m, n) { names[n] = 1; return m; });
    Object.keys(names).forEach(function (n) {
      svg = svg.split(' id="' + n + '"').join(' id="' + n + suffix + '"').split('url(#' + n + ')').join('url(#' + n + suffix + ')');
    });
    return svg;
  }
  var STARS = [[60,40,1],[130,95,2],[210,30,3],[300,70,1],[380,25,2],[520,50,3],[610,20,1],[690,80,2],[770,35,3],[850,60,1],[930,28,2],[40,150,3],[470,200,1],[560,150,2],[820,170,3],[960,190,1],[250,200,2],[110,205,1]];
  function agSceneSvg(kind){
    var head = '<svg viewBox="0 0 1000 240" preserveAspectRatio="xMidYMid slice">', foot = '<g data-atm="marks"></g></svg>', b = '';
    if (kind === 'summit') {
      b = '<defs><linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd7f0"/><stop offset="1" stop-color="#fdf1c4"/></linearGradient></defs><rect width="1000" height="240" fill="url(#skyA)"/>'
        + '<circle cx="880" cy="62" r="46" fill="#E4CA0A" opacity=".25"/><circle cx="880" cy="62" r="28" fill="#E4CA0A"/>'
        + '<g fill="#fff" opacity=".9"><ellipse cx="180" cy="50" rx="46" ry="12"/><ellipse cx="215" cy="42" rx="30" ry="11"/><ellipse cx="560" cy="34" rx="40" ry="10"/><ellipse cx="780" cy="108" rx="36" ry="9"/></g>'
        + '<polygon points="0,240 0,165 90,120 170,165 260,110 360,170 470,125 560,175 660,112 780,170 900,130 1000,170 1000,240" fill="#9db4cf"/>'
        + '<polygon points="110,240 320,92 450,240" fill="#4F5F79"/><polygon points="320,92 296,128 312,120 326,138 340,120 356,128" fill="#fff" opacity=".9"/>'
        + '<polygon points="420,240 700,40 970,240" fill="#2A3C5D"/><polygon points="700,40 664,92 688,80 706,104 724,80 748,92" fill="#fff"/>'
        + '<polygon points="0,240 0,208 160,188 330,212 520,198 700,218 1000,204 1000,240" fill="#2d9640"/><polygon points="0,240 0,228 200,216 420,232 640,222 1000,230 1000,240" fill="#3ab54a"/>'
        + '<path data-atm="route" class="ag-route-draw" d="M72 212 C 170 186, 250 210, 340 176 S 520 170, 585 130 S 660 92, 700 48" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round"/>';
    } else if (kind === 'road') {
      b = '<defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f7"/><stop offset="1" stop-color="#fff6d6"/></linearGradient></defs><rect width="1000" height="240" fill="url(#skyB)"/>'
        + '<circle cx="120" cy="52" r="26" fill="#E4CA0A"/><g fill="#fff" opacity=".9"><ellipse cx="420" cy="44" rx="48" ry="12"/><ellipse cx="460" cy="36" rx="30" ry="10"/><ellipse cx="820" cy="58" rx="42" ry="11"/></g>'
        + '<path d="M0 150 C 150 90, 300 150, 450 120 S 800 70, 1000 110 L1000 240 L0 240Z" fill="#9fd29a"/><path d="M0 190 C 200 150, 380 200, 560 170 S 860 140, 1000 170 L1000 240 L0 240Z" fill="#3ab54a"/>'
        + '<g fill="#2d9640"><polygon points="250,170 268,128 286,170"/><polygon points="620,150 636,110 652,150"/><polygon points="890,130 904,96 918,130"/></g><g fill="#6b4a2a"><rect x="265" y="170" width="6" height="12"/><rect x="633" y="150" width="6" height="12"/><rect x="901" y="130" width="6" height="12"/></g>'
        + '<path d="M30 204 C 180 124, 330 236, 520 156 S 820 96, 970 146" fill="none" stroke="#2A3C5D" stroke-width="30" stroke-linecap="round"/>'
        + '<path data-atm="route" class="ag-route-draw" d="M30 204 C 180 124, 330 236, 520 156 S 820 96, 970 146" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="14 12" stroke-linecap="round"/>';
    } else if (kind === 'stones') {
      b = '<defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe6f7"/><stop offset="1" stop-color="#fff2cc"/></linearGradient><linearGradient id="wat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fc3e8"/><stop offset="1" stop-color="#2f7fb8"/></linearGradient></defs>'
        + '<rect width="1000" height="240" fill="url(#skyC)"/><circle cx="500" cy="52" r="34" fill="#E4CA0A" opacity=".9"/><g fill="#fff" opacity=".9"><ellipse cx="200" cy="48" rx="46" ry="12"/><ellipse cx="800" cy="60" rx="44" ry="11"/></g>'
        + '<rect y="120" width="1000" height="120" fill="url(#wat)"/><g fill="none" stroke="#fff" stroke-width="2" opacity=".55"><path d="M40 160 q 20 -10 40 0 t 40 0 t 40 0"/><path d="M300 200 q 20 -10 40 0 t 40 0 t 40 0"/><path d="M560 168 q 20 -10 40 0 t 40 0 t 40 0"/><path d="M780 210 q 20 -10 40 0 t 40 0 t 40 0"/></g>'
        + '<path d="M0 120 C 60 100, 120 110, 170 130 L170 240 L0 240Z" fill="#3ab54a"/><path d="M830 128 C 880 104, 950 100, 1000 112 L1000 240 L830 240Z" fill="#3ab54a"/>'
        + '<path data-atm="route" d="M120 172 Q 500 205 890 168" fill="none" stroke="none"/>';
    } else {
      var dots = STARS.map(function(s){ return '<circle class="ag-svg-twinkle t' + s[2] + '" cx="' + s[0] + '" cy="' + s[1] + '" r="' + (s[2] === 2 ? 2 : 1.4) + '" fill="#fff"/>'; }).join('');
      b = '<defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#041A40"/><stop offset="1" stop-color="#16407a"/></linearGradient></defs><rect width="1000" height="240" fill="url(#skyD)"/>'
        + '<circle cx="90" cy="56" r="26" fill="#fff6c9"/><circle cx="102" cy="50" r="24" fill="#0a2a5c"/>' + dots
        + '<path data-atm="route" class="ag-route-draw" d="M110 176 C 220 96, 330 196, 470 124 S 700 60, 890 112" fill="none" stroke="#E4CA0A" stroke-width="2.5" stroke-dasharray="6 7" stroke-linecap="round"/>';
    }
    return head + b + foot;
  }
  function agMarkers(root, kind, n){
    var path = root.querySelector('[data-atm="route"]'), g = root.querySelector('[data-atm="marks"]'); if (!path || !g) return;
    var len = path.getTotalLength(), h = '';
    for (var i = 0; i < n; i++) {
      var pt = path.getPointAtLength(len * (n === 1 ? 1 : i / (n - 1))), x = pt.x.toFixed(1), y = pt.y.toFixed(1), last = i === n - 1, num = i + 1;
      if (kind === 'summit') {
        h += '<g transform="translate(' + x + ' ' + y + ')"><line x1="0" y1="0" x2="0" y2="-34" stroke="#041A40" stroke-width="3" stroke-linecap="round"/><path d="M0 -34 L' + (last ? 34 : 26) + ' -25 L0 -16Z" fill="' + (last ? '#E4CA0A' : '#3ab54a') + '"/><circle r="12" fill="#fff" stroke="#041A40" stroke-width="2.5"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="700" font-family="Fredoka,Poppins,sans-serif" fill="#041A40">' + num + '</text></g>';
      } else if (kind === 'road') {
        h += '<g transform="translate(' + x + ' ' + y + ')"><path d="M0 0 C -4 -10, -18 -16, -18 -30 a18 18 0 1 1 36 0 C 18 -16, 4 -10, 0 0Z" fill="' + (last ? '#E4CA0A' : '#3ab54a') + '" stroke="#041A40" stroke-width="2.5"/><circle cy="-30" r="11" fill="#fff"/><text y="-25.5" text-anchor="middle" font-size="13" font-weight="700" font-family="Fredoka,Poppins,sans-serif" fill="#041A40">' + num + '</text></g>';
      } else if (kind === 'stones') {
        if (last) { h += '<g transform="translate(' + x + ' ' + (+y - 4) + ')"><line x1="0" y1="0" x2="0" y2="-46" stroke="#041A40" stroke-width="3.5" stroke-linecap="round"/><path d="M0 -46 L38 -34 L0 -22Z" fill="#E4CA0A"/><circle r="13" fill="#fff" stroke="#041A40" stroke-width="2.5"/><text y="5" text-anchor="middle" font-size="14" font-weight="700" font-family="Fredoka,Poppins,sans-serif" fill="#041A40">' + num + '</text></g>'; }
        else { h += '<g transform="translate(' + x + ' ' + y + ')"><ellipse cy="6" rx="36" ry="14" fill="#6f7f93"/><ellipse rx="36" ry="14" fill="#c9d0da"/><ellipse cy="-3" rx="26" ry="8" fill="#e6eaf0"/><text y="5" text-anchor="middle" font-size="15" font-weight="700" font-family="Fredoka,Poppins,sans-serif" fill="#041A40">' + num + '</text></g>'; }
      } else {
        var r = last ? 17 : 12, pts = [];
        for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1)); }
        h += '<g transform="translate(' + x + ' ' + y + ')"><circle r="' + (r + 8) + '" fill="#E4CA0A" opacity=".22"/><polygon points="' + pts.join(' ') + '" fill="#E4CA0A"/><text x="' + (r + 10) + '" y="5" font-size="15" font-weight="700" font-family="Fredoka,Poppins,sans-serif" fill="#fff">' + num + '</text></g>';
      }
    }
    g.innerHTML = h;
  }

  function barArt(skin){
    var h = '<svg viewBox="0 0 1000 92" preserveAspectRatio="xMidYMid slice">';
    if (skin === 'road') {
      h += '<rect width="1000" height="92" fill="#cfe6f7"/><path d="M0 60 C 200 40, 400 66, 600 50 S 900 44, 1000 54 L1000 92 L0 92Z" fill="#9fd29a"/><rect y="62" width="1000" height="30" fill="#2A3C5D"/><path d="M0 78 H1000" stroke="#fff" stroke-width="3" stroke-dasharray="18 14"/>'
        + '<g transform="translate(560 40)"><rect x="-4" y="0" width="8" height="34" fill="#6f7f93"/><rect x="-60" y="-4" width="120" height="18" fill="#fff" stroke="#041A40" stroke-width="2"/><path d="M-56 -4 L-36 14 M-28 -4 L-8 14 M0 -4 L20 14 M28 -4 L48 14" stroke="#E4CA0A" stroke-width="9"/></g>'
        + '<g transform="translate(700 62)"><polygon points="0,-26 14,0 -14,0" fill="#ff8a1f"/><rect x="-18" y="0" width="36" height="5" fill="#041A40"/></g><circle cx="900" cy="22" r="14" fill="#E4CA0A"/>';
    } else if (skin === 'storm') {
      h += '<defs><linearGradient id="stg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4F5F79"/><stop offset="1" stop-color="#b8c0cc"/></linearGradient></defs><rect width="1000" height="92" fill="url(#stg)"/>'
        + '<g fill="#e3e8f0"><ellipse cx="180" cy="34" rx="90" ry="26"/><ellipse cx="260" cy="26" rx="60" ry="22"/><ellipse cx="560" cy="30" rx="110" ry="28"/><ellipse cx="660" cy="22" rx="64" ry="22"/></g><g fill="#2A3C5D" opacity=".75"><ellipse cx="380" cy="40" rx="80" ry="22"/><ellipse cx="820" cy="38" rx="90" ry="24"/></g>'
        + '<path d="M330 50 L312 78 L330 76 L318 92 L352 62 L334 64Z" fill="#E4CA0A"/><circle cx="930" cy="76" r="24" fill="#E4CA0A" opacity=".9"/><g stroke="#fff" stroke-width="2" opacity=".5"><path d="M120 60 l-8 18 M150 56 l-8 18 M470 62 l-8 18 M500 58 l-8 18 M720 64 l-8 18"/></g>';
    } else {
      h += '<rect width="1000" height="92" fill="#e8e1d6"/><g stroke="#a89d8f" stroke-width="2" fill="none"><path d="M0 23 H1000 M0 46 H1000 M0 69 H1000"/><path d="M60 0 V23 M180 0 V23 M300 0 V23 M420 0 V23 M540 0 V23 M660 0 V23 M780 0 V23 M900 0 V23 M120 23 V46 M240 23 V46 M360 23 V46 M480 23 V46 M600 23 V46 M720 23 V46 M840 23 V46 M60 46 V69 M180 46 V69 M300 46 V69 M420 46 V69 M540 46 V69 M660 46 V69 M780 46 V69 M900 46 V69 M120 69 V92 M240 69 V92 M360 69 V92 M480 69 V92 M600 69 V92 M720 69 V92 M840 69 V92"/></g>'
        + '<g transform="translate(470 8)"><path d="M0 84 V34 a30 30 0 0 1 60 0 V84Z" fill="#3ab54a" stroke="#041A40" stroke-width="3"/><circle cx="46" cy="58" r="4" fill="#E4CA0A"/></g>';
    }
    return h + '</svg>';
  }
  function brSvgTree(n){ var ys = n === 1 ? [50] : [25,75]; return '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + ys.map(function(y){ return '<path d="M0 50 C 55 50, 45 ' + y + ', 100 ' + y + '"/>'; }).join('') + '</svg>'; }
  function brSvgDrop(n){ var xs = n === 1 ? [50] : [25,75]; return '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + xs.map(function(x){ return '<path d="M50 0 C 50 60, ' + x + ' 40, ' + x + ' 100"/>'; }).join('') + '</svg>'; }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // SEGMENT 0 -- AGENDA.   on_screen_text: { title, items[] }
  // ---------------------------------------------------------------------------------------------------------------------------------
  SLIDES.agenda = function (slide, ctx) {
    var t = obj(slide.on_screen_text), items = arr(t.items).map(str).filter(Boolean);
    var look = seedPick(ctx, ['summit', 'road', 'stones', 'stars'], 'agenda');
    return {
      body: subTitle(slide, t.title) + '<div class="ag-scene">' + uniqueNames(agSceneSvg(look)) + '</div><ol class="ag-items" style="--n:' + items.length + '">'
        + items.map(function (x, i) { return '<li style="--i:' + i + '">' + esc(x) + '</li>'; }).join('') + '</ol>',
      after: function (root) { agMarkers(root, look, items.length); }
    };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // SEGMENT 1 -- MINDSET.
  // ---------------------------------------------------------------------------------------------------------------------------------
  // from_to   on_screen_text: { pairs: [ { wrong, right } ] }
  SLIDES.from_to = function (slide, ctx) {
    var rows = arr(obj(slide.on_screen_text).pairs).map(function (p) { return [str(obj(p).wrong), str(obj(p).right)]; })
      .filter(function (r) { return r[0] || r[1]; });
    var look = seedPick(ctx, rows.length === 1 ? ['rewrite', 'bubbles'] : ['bubbles', 'rewrite', 'flip'], 'fromto');
    var curve = '<svg viewBox="0 0 90 60"><path d="M6 44 C 28 6, 58 6, 76 30" pathLength="100"/><g class="head" transform="translate(76 30) rotate(53)"><path d="M-10 -7 L0 0 L-10 7"/></g></svg>';
    var body;
    if (look === 'bubbles') {
      body = '<div class="ft">' + rows.map(function (r, i) {
        return '<div class="ft-row" style="--d:' + (i * 0.9) + 's"><div class="ft-from">' + esc(r[0]) + '</div><div class="ft-link">' + curve + '</div><div class="ft-to">' + esc(r[1]) + '<span class="bulb">' + ICON.bulb + '</span></div></div>';
      }).join('') + '</div>';
    } else if (look === 'rewrite') {
      body = '<div class="rw">' + rows.map(function (r, i) {
        return '<div class="rw-row" style="--d:' + (i * 1.3) + 's"><span class="rw-lab a">' + esc(WORDS.insteadOf) + '</span><div class="rw-old"><span>' + esc(r[0]) + '</span></div><span class="rw-lab b">' + esc(WORDS.tryThis) + '</span><div class="rw-new"><span>' + esc(r[1]) + '</span></div></div>';
      }).join('') + '</div>';
    } else {
      body = '<div class="flips">' + rows.map(function (r) {
        return '<div class="flip" onclick="this.classList.toggle(\'on\')"><div class="flip-in"><div class="face front"><span>' + esc(r[0]) + '</span><span class="tapme">' + esc(WORDS.tapToFlip) + '</span></div><div class="face back"><span>' + esc(r[1]) + '</span><span class="tapme">' + esc(WORDS.tapToFlipBack) + '</span></div></div></div>';
      }).join('') + '</div>';
    }
    return { body: body };
  };

  // lens   on_screen_text: { title, wrong_reading, right_reading, what_it_lets_you_do }
  SLIDES.lens = function (slide) {
    var t = obj(slide.on_screen_text);
    return {
      body: subTitle(slide, t.title) + '<div class="lens"><div class="lens-side"><div class="lens-ring old">' + esc(str(t.wrong_reading)) + '</div><div class="lens-cap">' + esc(WORDS.lensNow) + '</div></div>'
        + '<div class="lens-bridge"><span>' + ICON.arrow + '</span></div><div class="lens-side n"><div class="lens-ring new">' + esc(str(t.right_reading)) + '</div><div class="lens-cap">' + esc(WORDS.lensClear) + '</div></div></div>'
        + (str(t.what_it_lets_you_do) ? '<div class="lens-foot"><b>' + esc(WORDS.lensLets) + '</b> ' + esc(str(t.what_it_lets_you_do)) + '</div>' : '')
    };
  };

  // compass   on_screen_text: { title, pulled_toward, true_north, why }
  SLIDES.compass = function (slide) {
    var t = obj(slide.on_screen_text), ticks = '';
    for (var i = 0; i < 24; i++) {
      var a = i * 15 * Math.PI / 180, r1 = i % 6 === 0 ? 86 : 94, r2 = 102;
      ticks += '<line x1="' + (120 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (120 - Math.cos(a) * r1).toFixed(1) + '" x2="' + (120 + Math.sin(a) * r2).toFixed(1) + '" y2="' + (120 - Math.cos(a) * r2).toFixed(1) + '" stroke="#4F5F79" stroke-width="' + (i % 6 === 0 ? 3 : 1.5) + '"/>';
    }
    var svg = '<svg class="cp-svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="112" fill="#fff" stroke="#041A40" stroke-width="6"/><circle cx="120" cy="120" r="104" fill="#f6f8fb"/>' + ticks
      + '<text x="120" y="52" text-anchor="middle" font-family="Fredoka,Poppins,sans-serif" font-weight="700" font-size="22" fill="#2d9640">N</text><text x="120" y="204" text-anchor="middle" font-family="Fredoka,Poppins,sans-serif" font-weight="700" font-size="18" fill="#6b7685">S</text><text x="40" y="127" text-anchor="middle" font-family="Fredoka,Poppins,sans-serif" font-weight="700" font-size="18" fill="#6b7685">W</text><text x="200" y="127" text-anchor="middle" font-family="Fredoka,Poppins,sans-serif" font-weight="700" font-size="18" fill="#6b7685">E</text>'
      + '<g class="cp-needle"><polygon points="120,34 108,120 132,120" fill="#3ab54a"/><polygon points="120,206 108,120 132,120" fill="#041A40"/></g><circle cx="120" cy="120" r="9" fill="#E4CA0A" stroke="#041A40" stroke-width="3"/></svg>';
    return {
      body: subTitle(slide, t.title) + '<div class="cp"><div class="cp-card pull"><small>' + esc(WORDS.compassPulled) + '</small>' + esc(str(t.pulled_toward)) + '</div>' + svg
        + '<div class="cp-card north"><small>' + esc(WORDS.compassNorth) + '</small>' + esc(str(t.true_north)) + '</div></div>'
        + (str(t.why) ? '<div class="cp-foot"><b>' + esc(WORDS.compassWhy) + '</b> ' + esc(str(t.why)) + '</div>' : '')
    };
  };

  // fork   on_screen_text: { title, road_now, road_chosen, what_changes }
  SLIDES.fork = function (slide) {
    var t = obj(slide.on_screen_text);
    var roads = '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M200 60 C 200 30, 90 36, 30 4" stroke="#b8c0cc" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M200 60 C 200 30, 310 36, 370 4" stroke="#3ab54a" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M200 60 C 200 30, 310 36, 370 4" stroke="#fff" stroke-width="2.5" stroke-dasharray="8 8" fill="none"/></svg>';
    return {
      body: subTitle(slide, t.title) + '<div class="fk"><div class="fk-sign l"><small>' + esc(WORDS.forkNow) + '</small>' + esc(str(t.road_now)) + '</div><div class="fk-post"><i></i></div><div class="fk-sign r"><small>' + esc(WORDS.forkChosen) + '</small>' + esc(str(t.road_chosen)) + '</div></div><div class="fk-roads">' + roads + '</div>'
        + (str(t.what_changes) ? '<div class="fk-foot"><b>' + esc(WORDS.forkChanges) + '</b> ' + esc(str(t.what_changes)) + '</div>' : '')
    };
  };

  // key_idea   on_screen_text: { idea, example }
  SLIDES.key_idea = function (slide) {
    var t = obj(slide.on_screen_text);
    return {
      body: '<div class="idea"><div class="k">' + esc(WORDS.ideaLabel) + '</div><div class="big">' + esc(str(t.idea)) + '</div></div>'
        + (str(t.example) ? '<div class="example"><div class="q">&ldquo;</div><div class="bub"><b>' + esc(WORDS.exampleLabel) + '</b>' + esc(str(t.example)) + '</div></div>' : '')
    };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // SEGMENT 2 -- HOW TO APPLY (one technique).
  // ---------------------------------------------------------------------------------------------------------------------------------
  var FWCOL = { 2: ['#041A40', '#2d9640'], 3: ['#041A40', '#4F5F79', '#3ab54a'], 4: ['#041A40', '#2A3C5D', '#2d9640', '#3ab54a'], 5: ['#041A40', '#2A3C5D', '#4F5F79', '#2d9640', '#3ab54a'] };

  // framework   on_screen_text: { name, steps: [ { label, line } ], is_acronym }
  SLIDES.framework = function (slide, ctx) {
    var t = obj(slide.on_screen_text);
    var steps = arr(t.steps).map(function (s) { return [str(obj(s).label), str(obj(s).line)]; }).filter(function (s) { return s[0] || s[1]; });
    var n = Math.max(2, Math.min(5, steps.length)), cols = FWCOL[n] || FWCOL[5];
    var maxLen = Math.max.apply(null, steps.map(function (x) { return x[1].length; }).concat([0]));
    var pool = ['ladder']; if (steps.length <= 4 && maxLen <= 130) pool.push('chev', 'path', 'cards');
    var style = seedPick(ctx, pool, 'framework');
    // The first letters are shown only when the Master says the steps spell the name; otherwise the steps are numbered.
    var mark = function (i) { return t.is_acronym === true ? (steps[i][0].trim().charAt(0).toUpperCase() || (i + 1)) : (i + 1); };
    var out;
    if (style === 'chev') {
      out = '<div class="fw-h" style="grid-template-columns:repeat(' + steps.length + ',1fr)">' + steps.map(function (s, i) {
        return '<div class="col"><div class="chev" style="background:' + cols[i % cols.length] + '"><span class="ltr">' + esc(mark(i)) + '</span>' + esc(s[0]) + '</div><div class="desc">' + esc(s[1]) + '</div></div>';
      }).join('') + '</div>';
    } else if (style === 'path') {
      out = '<div class="fw-p" style="grid-template-columns:repeat(' + steps.length + ',1fr); --n:' + steps.length + '">' + steps.map(function (s, i) {
        return '<div class="node"><div class="dot" style="background:' + cols[i % cols.length] + '">' + esc(mark(i)) + '</div><div><div class="t">' + esc(s[0]) + '</div><div class="d">' + esc(s[1]) + '</div></div></div>';
      }).join('') + '</div>';
    } else if (style === 'cards') {
      out = '<div class="cards" style="--n:' + steps.length + '">' + steps.map(function (s) {
        return '<div class="pc"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>';
      }).join('') + '</div>';
    } else {
      out = '<div class="fw-v">' + steps.map(function (s, i) {
        return '<div class="row"><div class="dot" style="background:' + cols[i % cols.length] + '">' + esc(mark(i)) + '</div><div class="box"><div class="t">' + esc(s[0]) + '</div><div class="d">' + esc(s[1]) + '</div></div></div>';
      }).join('') + '</div>';
    }
    return { body: subTitle(slide, t.name) + out };
  };

  // grid_2x2   on_screen_text: { title, x_axis [left, right], y_axis [top, bottom], boxes [ { name, line } x4 ] in reading order
  //            (top-left, top-right, bottom-left, bottom-right), aim_for 1..4 }
  SLIDES.grid_2x2 = function (slide) {
    var t = obj(slide.on_screen_text), x = arr(t.x_axis).map(str), y = arr(t.y_axis).map(str);
    var boxes = arr(t.boxes).map(function (b) { return [str(obj(b).name), str(obj(b).line)]; });
    var aim = Number(t.aim_for) || 0;
    var cell = function (i) {
      var b = boxes[i] || ['', ''];
      return '<div class="gd-c' + (aim === i + 1 ? ' hot' : '') + '" style="--i:' + i + '" data-hot="' + esc(WORDS.yourMove) + '"><b>' + esc(b[0]) + '</b>' + esc(b[1]) + '</div>';
    };
    return {
      body: subTitle(slide, t.title) + '<div class="gd"><div class="gd-y"><span>' + esc(y[0] || '') + '</span><span>' + esc(y[1] || '') + '</span></div>'
        + cell(0) + cell(1) + '<div class="gd-y" style="visibility:hidden"></div>' + cell(2) + cell(3)
        + '<div class="gd-x"><span>' + esc(x[0] || '') + '</span><span>' + esc(x[1] || '') + '</span></div></div>'
    };
  };

  // loop   on_screen_text: { title, steps: [ { label, line } ], repeat_note }
  SLIDES.loop = function (slide) {
    var t = obj(slide.on_screen_text), s = arr(t.steps).map(function (x) { return [str(obj(x).label), str(obj(x).line)]; });
    var back = '<div class="lp-back"><svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M96 0 C 96 52, 4 52, 4 4"/></svg>' + (str(t.repeat_note) ? '<span>' + esc(str(t.repeat_note)) + '</span>' : '') + '</div>';
    return {
      body: subTitle(slide, t.title) + '<div class="lp-row" style="grid-template-columns:repeat(' + s.length + ',1fr)">' + s.map(function (x, i) {
        return '<div class="lp-node" style="--i:' + i + '"><span class="n">' + (i + 1) + '</span><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>';
      }).join('') + back + '</div>'
    };
  };

  // formula   on_screen_text: { title, parts: [ { label, line } ], result: { label, line } }
  SLIDES.formula = function (slide) {
    var t = obj(slide.on_screen_text), parts = arr(t.parts).map(function (x) { return [str(obj(x).label), str(obj(x).line)]; }), res = obj(t.result);
    var h = '';
    parts.forEach(function (x, i) {
      h += '<div class="fm-t" style="--i:' + i + '"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>' + (i < parts.length - 1 ? '<div class="fm-op">+</div>' : '');
    });
    h += '<div class="fm-op">=</div><div class="fm-res"><b>' + esc(str(res.label)) + '</b><span>' + esc(str(res.line)) + '</span></div>';
    return { body: subTitle(slide, t.title) + '<div class="fm">' + h + '</div>' };
  };

  // if_then   on_screen_text: { title, rules: [ { if, then } ] }
  function startsWithWord(text, word) { return str(text).trim().toLowerCase().indexOf(str(word).toLowerCase() + ' ') === 0; }
  SLIDES.if_then = function (slide) {
    var t = obj(slide.on_screen_text), r = arr(t.rules).map(function (x) { return [str(obj(x)['if']), str(obj(x)['then'])]; });
    return {
      body: subTitle(slide, t.title) + '<div class="it">' + r.map(function (x, i) {
        // The Master often starts the condition with "If ..." itself; the label is then left out so it does not read "IF If ...".
        return '<div class="it-row" style="--i:' + i + '"><div class="it-if">' + (startsWithWord(x[0], WORDS.ifLabel) ? '' : '<small>' + esc(WORDS.ifLabel) + '</small><br>') + esc(x[0])
          + '</div><div class="it-ar">&#10140;</div><div class="it-then">' + (startsWithWord(x[1], WORDS.thenLabel) ? '' : '<small>' + esc(WORDS.thenLabel) + '</small><br>') + esc(x[1]) + '</div></div>';
      }).join('') + '</div>'
    };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // SEGMENT 3 -- BARRIERS.   branch_map   on_screen_text: { title, barriers: [ { barrier, evidence, ways_through [] } ] }
  // evidence is supported | partly_assumed | worth_watching (from the risk assessment)
  // ---------------------------------------------------------------------------------------------------------------------------------
  SLIDES.branch_map = function (slide, ctx) {
    var t = obj(slide.on_screen_text);
    var tagOf = { supported: ['real', WORDS.evSupported], partly_assumed: ['assumed', WORDS.evPartly], worth_watching: ['watch', WORDS.evWatch] };
    var R = arr(t.barriers).slice(0, 3).map(function (b) {
      var tag = tagOf[str(obj(b).evidence).trim()] || ['assumed', ''];
      return { tag: tag[0], tagText: tag[1], risk: str(obj(b).barrier), opts: arr(obj(b).ways_through).map(str).filter(Boolean).slice(0, 2) };
    });
    var skin = seedPick(ctx, ['road', 'storm', 'wall'], 'skin');
    var look = R.length === 1 ? 'tree' : seedPick(ctx, ['tree', 'cols'], 'layout');
    var box = function (r) { return '<div class="bm-risk">' + (r.tagText ? '<span class="tag ' + r.tag + '">' + esc(r.tagText) + '</span>' : '') + '<b>' + esc(r.risk) + '</b></div>'; };
    var opt = function (o, k) { return '<div class="bm-opt" style="--k:' + k + '"><small>' + esc(WORDS.wayThrough) + ' ' + (k + 1) + '</small>' + esc(o) + '</div>'; };
    var body = look === 'tree'
      ? '<div class="bm-tree">' + R.map(function (r) { return '<div class="bm-trow">' + box(r) + '<div class="bm-link">' + brSvgTree(r.opts.length) + '</div><div class="bm-opts">' + r.opts.map(opt).join('') + '</div></div>'; }).join('') + '</div>'
      : '<div class="bm-cols" style="--c:' + R.length + '">' + R.map(function (r) { return '<div class="bm-col">' + box(r) + '<div class="bm-drop">' + brSvgDrop(r.opts.length) + '</div><div class="bm-oprow" style="--o:' + r.opts.length + '">' + r.opts.map(opt).join('') + '</div></div>'; }).join('') + '</div>';
    return { bodyClass: 'sk-' + skin, body: subTitle(slide, t.title) + '<div class="bar-art">' + uniqueNames(barArt(skin)) + '</div>' + body };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // SEGMENT 4 -- RECAP (the Master's last slide).   on_screen_text: { segments: [ { heading, lines [] } ] }, one or two segments.
  // The slide title, the headings and the lines are all the Master's words; this design adds none. The "Horizon" look is the one approved.
  // ---------------------------------------------------------------------------------------------------------------------------------
  SLIDES.recap = function (slide) {
    var t = obj(slide.on_screen_text);
    var raw = arr(t.segments).length ? arr(t.segments) : (arr(t.groups).length ? arr(t.groups) : arr(t.parts));
    var segs = raw.map(function (g) {
      g = obj(g);
      var lines = arr(g.lines).length ? arr(g.lines) : (arr(g.items).length ? arr(g.items) : (str(g.text) ? [g.text] : []));
      return { k: str(g.heading || g.title || g.k), items: lines.map(str).filter(Boolean) };
    }).filter(function (g) { return g.items.length; });
    var lis = function (g) { return '<ul>' + g.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    var hills = '<svg class="rhz-hills" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 40 V20 C 50 -2, 110 30, 190 14 S 330 -8, 400 18 V40 Z" fill="#3ab54a"/></svg>';
    return {
      noTitle: true, bodyClass: 'atm-pad',
      body: '<div class="rcw rhz"><div class="rhz-sky"><i class="rhz-cloud c1"></i><i class="rhz-cloud c2"></i><i class="rhz-sun"></i><div class="rhz-title">' + esc(str(slide.slide_title)) + '</div>' + hills + '</div>'
        + '<div class="rhz-ground"><div class="rhz-cols">' + segs.map(function (g) { return '<div class="rhz-seg">' + (g.k ? '<div class="rhz-gk">' + esc(g.k) + '</div>' : '') + lis(g) + '</div>'; }).join('') + '</div></div></div>'
    };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // ACTIVITIES -- the interaction that follows a slide, as its own step.
  //   activity: { activity_type, activity_instruction, activity_voiceover, activity_content {...}, trainer_response }
  // Each activity answers instantly from the Master's prepared words (no model call). When the learner has completed it, done() is called;
  // the page then shows the Master's trainer_response and the Continue button. The order of the options the learner chooses between is
  // shuffled by code (same seed, same order), because the Master is told not to rely on position.
  // ---------------------------------------------------------------------------------------------------------------------------------
  function actFrame(emoji, kind, activity, inner) {
    var instr = str(activity.activity_instruction).trim();
    return '<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(WORDS.activityTag) + '</div><div class="slide-body"><div class="ix"><span class="ix-kind">' + emoji + ' ' + esc(kind) + '</span>'
      + (instr ? '<p class="atm-instr">' + esc(instr) + '</p>' : '') + inner + '</div></div></div></div>';
  }
  function bubble(label, text, cls) { return '<div class="ix-bub ' + (cls || 'coach') + '"><b>' + esc(label) + '</b>' + esc(text) + '</div>'; }
  function single(root, sel, onPick) {
    $all(root, sel).forEach(function (b) { b.onclick = function () { $all(root, sel).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); onPick(b); }; });
  }

  // pick   activity_content: { kind (card | move | pressure | barrier), question, scenario, twist, cards: [ { emoji, text, reaction } ] }
  ACTIVITIES.pick = function (activity, ctx) {
    var c = obj(activity.activity_content), cards = arr(c.cards).map(function (x) { return { emoji: str(obj(x).emoji), text: str(obj(x).text), reaction: str(obj(x).reaction) }; });
    cards = shuffled(cards, ctx, 'pick');
    var look = seedPick(ctx, ['deck', 'tiles', 'scenario'], 'pick');
    var cls = look === 'deck' ? 'pk-deck' : (look === 'tiles' ? 'pk-tiles' : 'pk-scn-l'), rots = ['-2.5deg', '1.5deg', '-1deg', '2.5deg'];
    var html = '<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(WORDS.activityTag) + '</div><div class="slide-body">'
      + (str(c.scenario) ? '<div class="pk-scn">' + esc(str(c.scenario)) + '</div>' : '') + (str(c.twist) ? '<div class="pk-twist">' + esc(str(c.twist)) + '</div>' : '')
      + '<div class="pk-q">' + esc(str(c.question)) + '</div><div class="pk-cards ' + cls + '" style="--n:' + cards.length + '">'
      + cards.map(function (x, i) { return '<button class="pkc" style="--r:' + rots[i % 4] + '" data-i="' + i + '"><span class="em">' + esc(x.emoji) + '</span><span class="tx">' + esc(x.text) + '</span></button>'; }).join('')
      + '</div><div class="pk-out"></div></div></div></div>';
    return { html: html, after: function (root, done, report, saved) {
      var out = $q(root, '.pk-out');
      single(root, '.pkc', function (b) { out.innerHTML = bubble(WORDS.leadsTo, cards[+b.dataset.i].reaction); done({ picked: +b.dataset.i }); });
      var back = saved && saved.picked != null && $q(root, '.pkc[data-i="' + saved.picked + '"]'); if (back) back.click();
    } };
  };

  // finish_thought   activity_content: { stem, endings [] }
  ACTIVITIES.finish_thought = function (activity, ctx) {
    var c = obj(activity.activity_content), ends = shuffled(arr(c.endings).map(str).filter(Boolean), ctx, 'finish');
    var inner = '<div class="ft-stem">' + esc(str(c.stem)) + ' <u class="ft-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u></div>'
      + '<div class="ix-picks">' + ends.map(function (e) { return '<button class="ix-pick">' + esc(e) + '</button>'; }).join('') + '</div>'
      + '<div class="ix-input"><textarea placeholder="' + esc(WORDS.ownWords) + '"></textarea><button class="ix-btn ft-go">' + esc(WORDS.done) + '</button></div>';
    return { html: actFrame('&#9999;&#65039;', WORDS.kindFinish, activity, inner), after: function (root, done, report, saved) {
      var blank = $q(root, '.ft-blank'), txt = $q(root, 'textarea'), go = $q(root, '.ft-go'), choices = $all(root, '.ix-pick'), picked = null;
      single(root, '.ix-pick', function (b) { blank.textContent = b.textContent; txt.value = ''; picked = choices.indexOf(b); report({ picked: picked, text: '', sent: false }, false); });
      go.onclick = function () {
        var v = txt.value.trim() || blank.textContent.replace(/ /g, '').trim(); if (!v) return;
        var typed = txt.value.trim();
        if (typed) blank.textContent = v;
        go.disabled = true; txt.disabled = true; $all(root, '.ix-pick').forEach(function (b) { b.disabled = true; });
        done({ picked: picked, text: typed, sent: true });
      };
      if (saved && saved.picked != null && choices[saved.picked]) choices[saved.picked].click();
      if (saved && saved.sent) { txt.value = saved.text || ''; go.click(); }
    } };
  };

  // build_response   activity_content: { title, parts: [ { label, strong, weak } ] }
  ACTIVITIES.build_response = function (activity, ctx) {
    var c = obj(activity.activity_content);
    var parts = arr(c.parts).map(function (p, i) {
      p = obj(p);
      return { label: str(p.label), opts: shuffled([{ text: str(p.strong), strong: true }, { text: str(p.weak), strong: false }], ctx, 'build' + i) };
    });
    var inner = (str(c.title) ? '<h3>' + esc(str(c.title)) + '</h3>' : '')
      + parts.map(function (p, i) {
        return '<div class="bd-row"><div class="bd-lab">' + esc(p.label) + '</div><div class="bd-opts" data-p="' + i + '">' + p.opts.map(function (o, j) { return '<button class="ix-pick" data-j="' + j + '">' + esc(o.text) + '</button>'; }).join('') + '</div></div>';
      }).join('')
      + '<div class="bd-msg"><small>' + esc(WORDS.yourMessage) + '</small><span class="bd-text">' + esc(WORDS.pickPieces) + '</span></div><div class="ix-actions"><button class="ix-btn bd-go">' + esc(WORDS.checkMessage) + '</button></div><div class="bd-out" style="margin-top:0.7rem"></div>';
    return { html: actFrame('&#129521;', WORDS.kindBuild, activity, inner), after: function (root, done, report, saved) {
      var pick = parts.map(function () { return null; }), msg = $q(root, '.bd-text'), out = $q(root, '.bd-out'), go = $q(root, '.bd-go');
      $all(root, '.bd-opts').forEach(function (box) {
        $all(box, '.ix-pick').forEach(function (b) {
          b.onclick = function () {
            $all(box, '.ix-pick').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); pick[+box.dataset.p] = +b.dataset.j;
            msg.textContent = pick.map(function (j, i) { return j === null ? '…' : parts[i].opts[j].text; }).join(' ');
            report({ picks: pick.slice(), checked: false }, false);
          };
        });
      });
      go.onclick = function () {
        if (pick.indexOf(null) > -1) { out.innerHTML = bubble(WORDS.almost, WORDS.pickFirst); return; }
        var n = pick.length, strong = pick.filter(function (j, i) { return parts[i].opts[j].strong; }).length;
        $all(root, '.bd-opts').forEach(function (box) {
          var p = +box.dataset.p, chosen = pick[p];
          $all(box, '.ix-pick').forEach(function (b) {
            var j = +b.dataset.j; b.disabled = true; b.classList.remove('on');
            if (parts[p].opts[j].strong) b.classList.add('good'); else if (j === chosen) b.classList.add('miss');
            if (j === chosen) b.classList.add('chosen');
          });
        });
        go.disabled = true;
        var head = strong === n ? WORDS.strongerAll : (strong === 0 ? WORDS.strongerNone : fill(WORDS.strongerSome, { a: strong, b: n }));
        out.innerHTML = bubble(head, strong === n ? '' : WORDS.strongerKey);
        done({ picks: pick.slice(), checked: true });
      };
      if (saved && Array.isArray(saved.picks)) saved.picks.forEach(function (j, p) { var b = j != null && $q(root, '.bd-opts[data-p="' + p + '"] .ix-pick[data-j="' + j + '"]'); if (b) b.click(); });
      if (saved && saved.checked) go.click();
    } };
  };

  // rank_it   activity_content: { title, items: [ { item, why } ] } -- listed in the SUGGESTED order; the learner sees them shuffled
  ACTIVITIES.rank_it = function (activity, ctx) {
    var c = obj(activity.activity_content), items = arr(c.items).map(function (x) { return [str(obj(x).item), str(obj(x).why)]; });
    var order = shuffled(items.map(function (x, i) { return i; }), ctx, 'rank');
    if (items.length > 1 && order.every(function (v, i) { return v === i; })) order.push(order.shift());   // never start already in the suggested order
    var inner = (str(c.title) ? '<h3>' + esc(str(c.title)) + '</h3>' : '') + '<div class="rk-list"></div><div class="ix-actions"><button class="ix-btn rk-go">' + esc(WORDS.lockIt) + '</button></div>';
    return { html: actFrame('&#128290;', WORDS.kindRank, activity, inner), after: function (root, done, report, saved) {
      var list = $q(root, '.rk-list'), go = $q(root, '.rk-go'), locked = false, last = items.length - 1;
      function draw() {
        list.innerHTML = order.map(function (ix, pos) {
          return '<div class="rk-item" data-p="' + pos + '"><span class="rk-n">' + (pos + 1) + '</span><span>' + esc(items[ix][0]) + '</span><span class="rk-b"><button data-d="-1">&#9650;</button><button data-d="1">&#9660;</button></span></div>';
        }).join('');
        $all(list, '.rk-b button').forEach(function (b) {
          b.onclick = function () {
            var p = +b.closest('.rk-item').dataset.p, q = p + (+b.dataset.d); if (q < 0 || q > last) return;
            var t = order[p]; order[p] = order[q]; order[q] = t; draw();
            report({ order: order.slice(), locked: false }, false);
          };
        });
      }
      if (saved && Array.isArray(saved.order) && saved.order.length === order.length) saved.order.forEach(function (ix, pos) { order[pos] = ix; });
      draw();
      go.onclick = function () {
        if (locked) return; locked = true; go.disabled = true;
        list.innerHTML = order.map(function (ix, pos) {
          var ok = ix === pos;
          return '<div class="rk-item ' + (ok ? 'ok' : 'no') + '"><span class="rk-n">' + (pos + 1) + '</span><span>' + esc(items[ix][0]) + '</span><span>' + (ok ? '&#10003;' : '') + '</span><span class="rk-why">'
            + (ok ? esc(WORDS.matchOrder) + ' ' : esc(WORDS.suggestedSpot) + ' ' + (ix + 1) + '. ') + esc(items[ix][1]) + '</span></div>';
        }).join('');
        done({ order: order.slice(), locked: true });
      };
      if (saved && saved.locked) go.click();
    } };
  };

  // mini_story   activity_content: { who, story, question, choices [2: one strong, one weak], outcome }
  // The Slide Menu does not name the fields of a choice, so a choice may be plain text or an object; both are understood.
  function storyChoice(c) {
    if (typeof c === 'string') return { text: c, strong: null };
    c = obj(c);
    var text = str(c.text || c.choice || c.option || c.label || c.answer || c.action);
    var q = str(c.strength || c.quality || c.kind || c.type || c.rating).toLowerCase();
    return { text: text, strong: c.strong === true || q === 'strong' ? true : (c.weak === true || q === 'weak' ? false : null) };
  }
  ACTIVITIES.mini_story = function (activity, ctx) {
    var c = obj(activity.activity_content), choices = arr(c.choices).map(storyChoice);
    if (!choices.length && (c.strong || c.weak)) choices = [{ text: str(c.strong), strong: true }, { text: str(c.weak), strong: false }];
    choices = shuffled(choices, ctx, 'story');
    var inner = '<div class="st-card"><div class="st-head"><span class="em">&#128222;</span>' + esc(str(c.who)) + '</div><div class="st-body">' + esc(str(c.story))
      + '<div class="st-stop">&#9208; ' + esc(WORDS.pauseHere) + ' ' + esc(str(c.question)) + '</div></div></div>'
      + '<div class="ix-picks">' + choices.map(function (x) { return '<button class="ix-pick">' + esc(x.text) + '</button>'; }).join('') + '</div><div class="st-out"></div>';
    return { html: actFrame('&#128214;', WORDS.kindStory, activity, inner), after: function (root, done, report, saved) {
      var out = $q(root, '.st-out'), picked = false;
      $all(root, '.ix-pick').forEach(function (b, i) {
        b.onclick = function () {
          $all(root, '.ix-pick').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
          out.innerHTML = bubble(WORDS.whatHappened, str(c.outcome));
          if (!picked) { picked = true; done({ picked: i }); }
        };
      });
      var back = saved && saved.picked != null && $all(root, '.ix-pick')[saved.picked]; if (back) back.click();
    } };
  };

  // role_play   activity_content: { user_role, other_role, goal }.  The learner writes the line they would say; the Master's trainer_response is the feedback.
  ACTIVITIES.role_play = function (activity) {
    var c = obj(activity.activity_content);
    var inner = '<div class="ix-roles"><div class="ix-role you"><b>' + esc(WORDS.you) + '</b>' + esc(str(c.user_role)) + '</div><div class="ix-role"><b>' + esc(WORDS.them) + '</b>' + esc(str(c.other_role)) + '</div></div>'
      + '<div class="ix-goal"><b>' + esc(WORDS.goalLabel) + '</b> ' + esc(str(c.goal)) + '</div>'
      + '<div class="ix-input"><textarea placeholder="' + esc(WORDS.sayIt) + '"></textarea><button class="ix-btn rp-send">' + esc(WORDS.send) + '</button></div><div class="rp-out ix-thread"></div>';
    return { html: actFrame('&#127917;', WORDS.kindRole, activity, inner), after: function (root, done, report, saved) {
      var txt = $q(root, 'textarea'), send = $q(root, '.rp-send'), out = $q(root, '.rp-out');
      send.onclick = function () {
        var v = txt.value.trim(); if (!v) return;
        out.innerHTML = '<div class="ix-bub me"><b>' + esc(WORDS.you) + '</b>' + esc(v) + '</div>';
        txt.disabled = true; send.disabled = true; done({ text: v });
      };
      if (saved && saved.text) { txt.value = saved.text; send.click(); }
    } };
  };

  // your_view   activity_content: { question, choices [] }.  No right answer: the learner picks one or writes their own.
  ACTIVITIES.your_view = function (activity, ctx) {
    var c = obj(activity.activity_content), choices = shuffled(arr(c.choices).map(str).filter(Boolean), ctx, 'view');
    var inner = '<h3>' + esc(str(c.question)) + '</h3><div class="ix-picks">' + choices.map(function (x) { return '<button class="ix-pick">' + esc(x) + '</button>'; }).join('') + '</div>'
      + '<div class="ix-input"><textarea placeholder="' + esc(WORDS.ownView) + '"></textarea><button class="ix-btn vw-share">' + esc(WORDS.share) + '</button></div><div class="vw-out ix-thread"></div>';
    return { html: actFrame('&#128172;', WORDS.kindView, activity, inner), after: function (root, done, report, saved) {
      var txt = $q(root, 'textarea'), share = $q(root, '.vw-share'), out = $q(root, '.vw-out'), choices = $all(root, '.ix-pick');
      single(root, '.ix-pick', function (b) { report({ picked: choices.indexOf(b), text: '', shared: false }, false); });
      share.onclick = function () {
        var on = $q(root, '.ix-pick.on'), typed = txt.value.trim(), v = typed || (on ? on.textContent : ''); if (!v) return;
        out.innerHTML = '<div class="ix-bub me"><b>' + esc(WORDS.you) + '</b>' + esc(v) + '</div>';
        share.disabled = true; txt.disabled = true; $all(root, '.ix-pick').forEach(function (b) { b.disabled = true; });
        done({ picked: on ? choices.indexOf(on) : null, text: typed, shared: true });
      };
      if (saved && saved.picked != null && choices[saved.picked]) choices[saved.picked].click();
      if (saved && saved.shared) { txt.value = saved.text || ''; share.click(); }
    } };
  };

  // gut_check   activity_content: { question, low_label, high_label, evidence_value (0..10 or ""), evidence_note }
  ACTIVITIES.gut_check = function (activity) {
    var c = obj(activity.activity_content), hasEv = c.evidence_value !== '' && c.evidence_value != null && !isNaN(Number(c.evidence_value));
    var inner = '<h3>' + esc(str(c.question)) + '</h3><div class="gc-track"><input type="range" min="0" max="10" value="5"></div>'
      + '<div class="gc-ends"><span>' + esc(str(c.low_label)) + '</span><span>' + esc(str(c.high_label)) + '</span></div><div class="gc-val">5</div>'
      + '<div class="ix-actions" style="justify-content:center"><button class="ix-btn gc-lock">' + esc(WORDS.lockIt) + '</button></div><div class="gc-out"></div>';
    return { html: actFrame('&#127919;', WORDS.kindGut, activity, inner), after: function (root, done, report, saved) {
      var r = $q(root, 'input[type=range]'), val = $q(root, '.gc-val'), track = $q(root, '.gc-track'), lock = $q(root, '.gc-lock'), out = $q(root, '.gc-out');
      var pos = function (v) { return 'calc(' + (v * 10) + '% + ' + ((5 - v) * 1.6) + 'px)'; };
      r.oninput = function () { val.textContent = r.value; report({ value: +r.value, locked: false }, false); };
      lock.onclick = function () {
        r.disabled = true; lock.disabled = true;
        track.insertAdjacentHTML('beforeend', '<span class="gc-pin" style="left:' + pos(+r.value) + '">' + esc(WORDS.youPin) + ' ' + esc(r.value) + '</span>');
        if (hasEv) {
          setTimeout(function () {
            track.insertAdjacentHTML('beforeend', '<span class="gc-pin ev" style="left:' + pos(Number(c.evidence_value)) + ';top:30px">' + esc(WORDS.evidencePin) + ' ' + esc(c.evidence_value) + '</span>');
            if (str(c.evidence_note)) out.innerHTML = '<div style="margin-top:2.4rem">' + bubble(WORDS.evidencePin.replace(/:$/, ''), str(c.evidence_note)) + '</div>';
          }, 700);
        }
        done({ value: +r.value, locked: true });
      };
      if (saved && saved.value != null) { r.value = saved.value; val.textContent = saved.value; }
      if (saved && saved.locked) lock.click();
    } };
  };

  // spot_it   activity_content: { instruction, line, weak_words [] }
  function norm(w) { return str(w).toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''); }
  ACTIVITIES.spot_it = function (activity) {
    var c = obj(activity.activity_content), words = str(c.line).split(/\s+/).filter(Boolean), weak = {};
    arr(c.weak_words).forEach(function (w) { str(w).split(/\s+/).forEach(function (p) { if (norm(p)) weak[norm(p)] = 1; }); });
    var inner = (str(c.instruction) ? '<h3>' + esc(str(c.instruction)) + '</h3>' : '') + '<div class="so-line">' + words.map(function (w) { return '<button class="so-w" data-k="' + esc(norm(w)) + '">' + esc(w) + '</button>'; }).join('')
      + '</div><div class="ix-actions"><button class="ix-btn so-check">' + esc(WORDS.check) + '</button></div><div class="so-out"></div>';
    return { html: actFrame('&#128269;', WORDS.kindSpot, activity, inner), after: function (root, done, report, saved) {
      var check = $q(root, '.so-check'), out = $q(root, '.so-out'), wordBtns = $all(root, '.so-w');
      var marked = function () { var on = []; wordBtns.forEach(function (b, i) { if (b.classList.contains('on')) on.push(i); }); return on; };
      wordBtns.forEach(function (b) { b.onclick = function () { if (!check.disabled) { b.classList.toggle('on'); report({ on: marked(), checked: false }, false); } }; });
      check.onclick = function () {
        var found = 0, total = 0, chosen = marked();
        $all(root, '.so-w').forEach(function (b) {
          var isW = !!weak[b.dataset.k], on = b.classList.contains('on'); b.classList.remove('on');
          if (isW) total += 1;
          if (isW && on) { b.classList.add('hit'); found += 1; } else if (isW) b.classList.add('miss'); else if (on) b.classList.add('wrong');
        });
        check.disabled = true; out.innerHTML = bubble(fill(WORDS.foundOf, { a: found, b: total }), ''); done({ on: chosen, checked: true });
      };
      if (saved && Array.isArray(saved.on)) saved.on.forEach(function (i) { if (wordBtns[i]) wordBtns[i].click(); });
      if (saved && saved.checked) check.click();
    } };
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Shared by the cover and the commitment card: the learner's language -- the voice's language and the web font that draws its letters.
  // ---------------------------------------------------------------------------------------------------------------------------------
  function prepareLanguage(data, ctx) {
    if (data.language) Voice.setLanguage(str(data.language));
    if (ctx && ctx.apiBase != null && data.font) useScriptFont(str(ctx.apiBase), obj(data.font));
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // COVER (slide 1) -- made by code. cover: { first_name, situation_title, skill_name, language, font }.
  // Three looks (welcome / ticket / split) chosen from the session ID; a long situation line always gets the split look, which has the most room.
  // It shows the time ("about 6 minutes") and never a count of steps or slides, because the number is not known yet.
  // ---------------------------------------------------------------------------------------------------------------------------------
  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.5 6.8L12 17l-6.2 3.5 1.5-6.8L2.2 9l6.9-.7z"/></svg>';
  var DECO = '<svg class="dec d1" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#E4CA0A"/></svg>'
    + '<svg class="dec d2" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#3ab54a" stroke-width="6"/></svg>'
    + '<svg class="dec d3" viewBox="0 0 40 40"><path d="M20 4v32M4 20h32" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>'
    + '<svg class="dec d4" viewBox="0 0 40 40"><path d="M20 3l5 11 12 1.5-9 8 2.5 12L20 29.5 9.5 35.5 12 23.5l-9-8L15 14z" fill="#3ab54a"/></svg>'
    + '<svg class="dec d5" viewBox="0 0 40 40"><path d="M20 4l16 30H4z" fill="#fff" opacity="0.85"/></svg>'
    + '<svg class="dec d6" viewBox="0 0 60 20"><path d="M2 10 Q 9 0 16 10 T 30 10 T 44 10 T 58 10" fill="none" stroke="#E4CA0A" stroke-width="4" stroke-linecap="round"/></svg>';
  var EXPECT = [['slides', 'exSlidesB', 'exSlidesT'], ['audio', 'exAudioB', 'exAudioT'], ['ask', 'exAskB', 'exAskT'], ['back', 'exBackB', 'exBackT']];

  function renderCover(cover, ctx) {
    noteRotation(cover);
    cover = obj(cover); ctx = ctx || {};
    prepareLanguage(cover, ctx);
    var name = str(cover.first_name).trim(), title = str(cover.situation_title).trim(), skill = str(cover.skill_name).trim();
    var readonly = !!ctx.readonly;
    var long = title.length > 60;
    var look = long ? 'split' : seedPick(ctx, ['welcome', 'ticket', 'split'], 'cover');

    var hi = (name ? esc(WORDS.coverHi) + ' <span class="u">' + esc(name) + '</span>!' : esc(WORDS.coverHi.replace(/,\s*$/, '')) + '!') + ' <span class="wavehand">&#128075;</span>';
    var ask = title ? '<div class="cv-ask"><small>' + esc(WORDS.coverAsk) + '</small><div class="cv-bubble">' + esc(title) + '</div></div>' : '';
    var sticker = skill ? '<div class="cv-sticker"><span class="star">' + STAR + '</span><span><small>' + esc(WORDS.coverSkill) + '</small><b>' + esc(skill) + '</b></span></div>' : '';
    var expectCards = '<div class="cv-expect fun-ex">' + EXPECT.map(function (x) {
      return '<div class="cv-ex"><div class="ic">' + ICON[x[0]] + '</div><b>' + esc(WORDS[x[1]]) + '</b><span>' + esc(WORDS[x[2]]) + '</span></div>';
    }).join('') + '</div>';

    var sound = '<div class="cv-sound fun-snd"><div class="cv-sw" role="switch" aria-checked="true" tabindex="0"><i></i><u class="cv-swlab">' + esc(WORDS.voiceOn) + '</u></div>'
      + '<div class="bars"><i></i><i></i><i></i><i></i></div><p>' + esc(WORDS.voiceHelp) + '</p><button type="button" class="cv-test">' + esc(WORDS.playTest) + '</button></div>';
    var viewTip = '<div class="cv-sound fun-snd cv-tip"><b class="cv-tiplab">' + esc(WORDS.viewLabel) + '</b><p>' + esc(WORDS.viewHelp) + '</p></div>';
    var foot = '<div class="cv-foot"><ul class="cv-steps"><li class="done">' + esc(WORDS.stepRead) + '</li><li class="doing">' + esc(WORDS.stepPrep) + '</li><li>' + esc(WORDS.stepTrainer) + '</li></ul>'
      + '<button type="button" class="cv-start fun-start" disabled>' + esc(WORDS.gettingReady) + '</button></div>';

    var body;
    if (look === 'welcome') {
      body = '<div class="cv-hero fun-hero">' + DECO + '<div class="eyebrow">' + esc(WORDS.coverEyebrow) + '</div><h1 class="cv-hi">' + hi + '</h1>' + ask + sticker + '</div>' + expectCards;
    } else if (look === 'ticket') {
      var route = title
        ? '<div class="cv-route"><div class="pt"><div class="k">' + esc(WORDS.coverAsk) + '</div><div class="v fun">' + esc(title) + '</div></div><div class="plane"></div><div class="pt to"><div class="k">' + esc(WORDS.coverSkill) + '</div><div class="v fun">' + esc(skill) + '</div></div></div>'
        : '<div class="cv-route one"><div class="pt to"><div class="k">' + esc(WORDS.coverSkill) + '</div><div class="v fun">' + esc(skill) + '</div></div></div>';
      body = '<div class="cv-ticket"><div class="stamp">' + esc(WORDS.coverAdmit) + '</div><div class="cv-tmain"><div class="eyebrow">' + esc(WORDS.coverBoarding) + '</div><h1 class="fun cv-thi">' + hi + '</h1>' + route
        + '<div class="cv-tsub">' + EXPECT.map(function (x) { return '<span>' + esc(WORDS[x[1]]) + '</span>'; }).join('') + '</div></div>'
        + '<div class="cv-tstub"><div><b class="fun">~6</b><span>' + esc(WORDS.coverMinutes) + '</span></div></div></div>';
    } else {
      body = '<div class="cv-split"><div class="l">' + DECO + '<div class="eyebrow">' + esc(WORDS.coverEyebrow) + '</div><h1 class="cv-hi cv-hi-s">' + hi + '</h1>' + ask + sticker + '</div>'
        + '<div class="r"><h3>' + esc(WORDS.expectTitle) + '</h3><ul>' + EXPECT.map(function (x) {
          return '<li><span class="ic">' + ICON[x[0]] + '</span><span><b>' + esc(WORDS[x[1]]) + '.</b> ' + esc(WORDS[x[2]]) + '</span></li>';
        }).join('') + '</ul></div></div>';
    }

    var el = node('<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(fill(WORDS.slideTag, { n: ctx.number != null ? ctx.number : 1 }))
      + '</div><div class="slide-body atm-pad">' + body + (readonly ? '' : sound + viewTip + foot) + '</div></div></div>');

    var startHandlers = [], started = false;
    var btn = $q(el, '.cv-start');
    if (!readonly) {
      var sw = $q(el, '.cv-sw'), lab = $q(el, '.cv-swlab'), bars = $q(el, '.bars'), test = $q(el, '.cv-test');
      var flip = function () {
        var off = !sw.classList.contains('off');
        sw.classList.toggle('off', off); sw.setAttribute('aria-checked', off ? 'false' : 'true');
        lab.textContent = off ? WORDS.voiceOff : WORDS.voiceOn; bars.style.opacity = off ? 0.25 : 1;
        Voice.setEnabled(!off);
      };
      Voice.setEnabled(true);
      sw.onclick = flip;
      sw.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
      test.onclick = function () {
        if (!Voice.supported()) { test.textContent = WORDS.testNone; return; }
        Voice.speak(fill(WORDS.testLine, { name: name }), true);
        test.textContent = WORDS.testPlayed;
      };
      btn.onclick = function () {
        if (btn.disabled || started) return;
        started = true; btn.disabled = true;
        startHandlers.forEach(function (fn) { fn(); });
      };
    }
    return {
      el: el, voice: '',
      onStart: function (fn) { startHandlers.push(fn); },
      setReady: function () {
        if (readonly || started) return;
        $all(el, '.cv-steps li').forEach(function (li) { li.className = 'done'; });
        btn.disabled = false; btn.classList.add('ready');
        btn.innerHTML = esc(WORDS.letsGo) + ICON.arrow;
      },
      // The cover as it looks once the learner has pressed the button (a resumed session): ready, and already used.
      markStarted: function () {
        if (readonly || started) return;
        $all(el, '.cv-steps li').forEach(function (li) { li.className = 'done'; });
        btn.classList.add('ready'); btn.innerHTML = esc(WORDS.letsGo) + ICON.arrow;
        started = true; btn.disabled = true;
      }
    };
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // COMMITMENT ("So what? Now what?", the closing slide) -- made by code. slide: { skill_name, language, font }.
  // Three looks (postcard / airmail / chat) chosen from the session ID, so a session keeps its look when it is resumed. The learner types
  // inside the card. ctx.saved (text) means a commitment already exists: the card is then shown with those words and nothing to press;
  // ctx.date is the day it was submitted (today when absent). The voiceover is code-made: WORDS.commitVoice, returned as .voice.
  // snapshot(text) makes the picture of the card with the learner's words in it: a still copy built from the same markup at a fixed width
  // (so a phone and a laptop give the same picture), drawn to a JPEG by html2canvas, which assets/html2canvas.min.js provides.
  // ---------------------------------------------------------------------------------------------------------------------------------
  function meaningful(text) { var t = str(text).trim(); return t.length > 0 && t !== WORDS.commitPlaceholder.trim(); }
  var CM_LOOKS = ['postcard', 'airmail', 'chat'];
  var CM_DOODLE = '<svg class="cm-doodle" viewBox="0 0 150 12"><path d="M3 8 C 30 2, 55 11, 85 5 S 130 3, 147 7"/></svg>';
  var CM_WAVES = '<svg class="cm-wavy" viewBox="0 0 92 34"><path d="M0 6 q 8 -6 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 12 0 M0 14 q 8 -6 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 12 0 M0 22 q 8 -6 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 12 0"/></svg>';
  // The ruled lines of the written card as real elements (the picture-maker does not draw the sized gradient they are on screen); the box clips the spare ones.
  var CM_RULES = (function () { var h = ''; for (var k = 0; k < 40; k++) h += '<i class="cm-rule" style="top:' + (31 * k + 30) + 'px"></i>'; return h; })();
  function cmDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    try { return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; }
  }
  // o: { skill, date, editable, text } -> the card for one look. editable: a box to type in; otherwise the words, fixed.
  function cmCard(look, o) {
    var skill = '<span class="cm-skill">' + esc(o.skill) + '</span>';
    var mark = '<span class="cm-mark"><span>' + esc(o.date) + '</span></span>';
    var head = '<h2>' + esc(WORDS.commitHeading) + '</h2>' + CM_DOODLE + '<div class="sub">' + esc(WORDS.commitSub) + '</div>';
    var field = o.editable
      ? '<textarea class="cm-box' + (look === 'chat' ? '' : ' hand') + '" rows="5" dir="auto" aria-label="' + esc(WORDS.commitHeading) + '">' + esc(WORDS.commitPlaceholder) + '</textarea>'
      : '<div class="cm-handtext" dir="auto">' + esc(o.text) + '</div>' + (look === 'chat' ? '' : CM_RULES);
    if (look === 'chat') {
      return '<div class="cm cm-chatwrap"><div class="cm-chat"><div class="cm-chathead">' + skill + '<span class="cm-date">' + esc(o.date) + '</span></div>'
        + '<div class="cm-thread"><div class="cm-bub in"><div class="cm-bh">' + esc(WORDS.commitHeading) + '</div>' + esc(WORDS.commitSub) + '</div>'
        + (o.editable ? '' : '<div class="cm-bub out" dir="auto">' + esc(o.text) + '</div><div class="cm-ticks">&#10003;&#10003;</div>') + '</div>'
        + (o.editable ? '<div class="cm-composer">' + field + '</div>' : '') + '</div></div>';
    }
    if (look === 'airmail') {
      return '<div class="cm cm-airwrap"><div class="cm-airframe"><div class="cm-air"><div class="cm-top"><div class="cm-airtag"><span class="cm-airlab">AIR MAIL</span>' + skill
        + '</div><div class="cm-stampbox">' + CM_WAVES + '<span class="cm-stamp2"><i>WOTG<br>&#10003;</i></span>' + mark + '</div></div>' + head
        + '<div class="cm-lines">' + field + '</div></div></div></div>';
    }
    return '<div class="cm cm-post"><div class="cm-card"><div class="cm-top">' + skill + mark + '</div>' + head + '<div class="cm-lines">' + field + '</div></div></div>';
  }
  // Waits (at most a few seconds) for the card's fonts, so the picture is not drawn in a stand-in face.
  function cmFontsReady(text) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var loads = [document.fonts.load("1.55rem 'Caveat'", text), document.fonts.load("600 1.4rem 'Fredoka'", text), document.fonts.load("1rem 'Poppins'", text)];
    var script = getComputedStyle(document.documentElement).getPropertyValue('--atm-script');
    var face = /'([^']+)'/.exec(script || '');
    if (face) loads.push(document.fonts.load("1.2rem '" + face[1] + "'", text));
    return Promise.race([Promise.all(loads), new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
  }

  // The saved picture of the card is kept small: drawn at 1.5 times the card's size, then written as a JPEG at the highest quality that
  // still fits PICTURE_BUDGET_BYTES (the pictures land at about 50-70 KB). If even the lowest quality does not fit (a heavy script), the
  // card is drawn again at a smaller size, down to PICTURE_SCALES' last. The servers drop anything above 80 KB.
  var PICTURE_SCALES = [1.5, 1.25, 1.0], PICTURE_BUDGET_BYTES = 70000;
  var PICTURE_QUALITIES = [0.92, 0.89, 0.86, 0.83, 0.80, 0.77, 0.74, 0.71, 0.68, 0.65, 0.62, 0.59, 0.56, 0.53, 0.50, 0.47, 0.44];
  function encodeWithinBudget(canvas) {
    return new Promise(function (resolve, reject) {
      var i = 0, last = null;
      (function next() {
        canvas.toBlob(function (blob) {
          if (!blob) { if (last) resolve(last); else reject(new Error('the picture could not be encoded')); return; }
          last = blob;
          if (blob.size <= PICTURE_BUDGET_BYTES || i >= PICTURE_QUALITIES.length - 1) { resolve(blob); return; }
          i++; next();
        }, 'image/jpeg', PICTURE_QUALITIES[i]);
      })();
    });
  }

  function renderCommitment(slide, ctx) {
    slide = obj(slide); ctx = ctx || {};
    prepareLanguage(slide, ctx);
    var look = seedPick(ctx, CM_LOOKS, 'commit'), skill = str(slide.skill_name).trim(), date = cmDate(ctx.date);
    var tag = ctx.number != null ? fill(WORDS.slideTag, { n: ctx.number }) : WORDS.commitTag;
    var el = node('<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(tag) + '</div><div class="slide-body atm-pad cmt-body"><div class="cmt-card"></div>'
      + '<div class="cmt-foot"><button type="button" class="ix-btn cmt-go" disabled>' + esc(WORDS.commitSave) + '</button></div>'
      + '<div class="cmt-saved" hidden><b>' + esc(WORDS.commitSaved) + '</b> ' + esc(WORDS.commitSavedSub) + '</div></div></div></div>');
    var holder = $q(el, '.cmt-card'), go = $q(el, '.cmt-go'), savedLine = $q(el, '.cmt-saved'), foot = $q(el, '.cmt-foot'), handlers = [], locked = false, box;

    function draw(editable, text) {
      holder.innerHTML = cmCard(look, { skill: skill, date: date, editable: editable, text: text });
      box = $q(holder, '.cm-box');
      if (!box) return;
      var grow = function () { box.style.height = 'auto'; box.style.height = box.scrollHeight + 'px'; };   // the box grows with what is typed
      box.addEventListener('input', function () { go.disabled = locked || !meaningful(box.value); grow(); });
      box.addEventListener('focus', function () { var n = box.value.length; try { box.setSelectionRange(n, n); } catch (e) { /* not essential */ } });
    }
    draw(true, '');
    go.onclick = function () {
      if (locked || !meaningful(box.value)) return;
      go.disabled = true; box.disabled = true; go.textContent = WORDS.commitSaving;
      var text = box.value.trim();
      handlers.forEach(function (fn) { fn(text); });
    };
    function lock(text) {
      locked = true; draw(false, str(text));
      foot.hidden = true; savedLine.hidden = false; el.classList.add('is-locked');
    }
    if (meaningful(ctx.saved)) lock(ctx.saved);
    return {
      el: el, voice: WORDS.commitVoice, look: look,
      onSubmit: function (fn) { handlers.push(fn); },
      lock: lock,
      // The save did not go through: give the box back so the person can try again (the page tells them why).
      unlock: function () { if (locked) return; box.disabled = false; go.textContent = WORDS.commitSave; go.disabled = !meaningful(box.value); },
      // The picture of this card with `text` in it, as a JPEG Blob. Rejects when the picture cannot be made.
      snapshot: function (text) {
        if (typeof global.html2canvas !== 'function') return Promise.reject(new Error('html2canvas is not loaded'));
        var host = document.createElement('div');
        host.className = 'atom-root cm-snap';
        host.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;';
        host.innerHTML = '<div class="cm-snapbody">' + cmCard(look, { skill: skill, date: date, editable: false, text: str(text) }) + '</div>';
        document.body.appendChild(host);
        var done = function () { if (host.parentNode) host.parentNode.removeChild(host); };
        var attempt = function (i) {
          return global.html2canvas(host.firstChild, { scale: PICTURE_SCALES[i], backgroundColor: '#ffffff', logging: false, useCORS: true })
            .then(encodeWithinBudget)
            .then(function (blob) { return (blob.size <= PICTURE_BUDGET_BYTES || i >= PICTURE_SCALES.length - 1) ? blob : attempt(i + 1); });
        };
        return cmFontsReady(str(text)).then(function () { return attempt(0); }).then(function (blob) { done(); return blob; }, function (err) { done(); throw err; });
      }
    };
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Master slides and activities: the public functions. An unknown type never leaves a blank card.
  // ---------------------------------------------------------------------------------------------------------------------------------
  // Older spellings of the activity types, folded onto the Slide Menu names.
  var TYPE_ALIASES = {
    pick_a_card: 'pick', choose_your_move: 'pick', spot_the_barrier: 'pick', pressure_test: 'pick', before_after: 'pick',
    finish_the_thought: 'finish_thought', build_your_response: 'build_response', rank: 'rank_it'
  };
  function normType(t) {
    var k = str(t).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return TYPE_ALIASES[k] || k;
  }

  // Whatever the Master wrote, shown plainly: used only when the type is unknown or its design could not be drawn.
  function plainBody(value) {
    var out = '';
    (function walk(v) {
      if (typeof v === 'string') { if (v.trim()) out += '<p class="atm-plain">' + esc(v) + '</p>'; }
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); });
    })(value);
    return out;
  }

  function renderSlide(slide, ctx) {
    noteRotation(slide);
    slide = obj(slide); ctx = ctx || {};
    var type = normType(slide.slide_type), spec = null;
    if (SLIDES[type]) {
      try { spec = SLIDES[type](slide, ctx); } catch (e) { console.warn('atom_slides: could not draw a "' + type + '" slide', e); spec = null; }
    } else {
      console.warn('atom_slides: unknown slide type "' + slide.slide_type + '", showing its text plainly');
    }
    if (!spec || typeof spec.body !== 'string') spec = { body: plainBody(slide.on_screen_text) };
    var el = node(frame(slide, ctx, spec));
    if (typeof spec.after === 'function') { try { spec.after(el); } catch (e) { console.warn('atom_slides: a slide could not finish drawing', e); } }
    return { el: el, voice: str(slide.voiceover) };
  }

  function renderActivity(activity, ctx) {
    activity = obj(activity); ctx = ctx || {};
    var type = normType(activity.activity_type), spec = null;
    if (ACTIVITIES[type]) {
      try { spec = ACTIVITIES[type](activity, ctx); } catch (e) { console.warn('atom_slides: could not draw a "' + type + '" activity', e); spec = null; }
    } else {
      console.warn('atom_slides: unknown activity type "' + activity.activity_type + '", showing its instruction with a Done button');
    }
    var instr = str(activity.activity_instruction).trim();
    if (!spec || typeof spec.html !== 'string') {
      spec = {
        html: '<div class="atom-root"><div class="slide"><div class="slide-tag">' + esc(WORDS.activityTag) + '</div><div class="slide-body"><div class="ix">'
          + (instr ? '<p class="atm-instr">' + esc(instr) + '</p>' : '') + plainBody(activity.activity_content) + '<div class="ix-actions"><button type="button" class="ix-btn atm-done">' + esc(WORDS.done) + '</button></div></div></div></div></div>',
        after: function (root, done, report, saved) { var b = $q(root, '.atm-done'); b.onclick = function (e) { e.target.disabled = true; done({ checked: true }); }; if (saved && saved.checked) b.click(); }
      };
    }
    var el = node(spec.html), doneFns = [], finished = false, restoring = false;
    // Everything the learner does is reported, except while the saved progress is being put back (that is not the learner acting).
    function report(progress, isFinished) { if (!restoring && ctx.onProgress) ctx.onProgress(progress, !!isFinished); }
    function done(final) { if (finished) return; finished = true; report(final, true); doneFns.forEach(function (fn) { fn(); }); }
    restoring = true;
    try { spec.after(el, done, report, ctx.progress || null); } catch (e) { console.warn('atom_slides: an activity could not finish drawing', e); }
    restoring = false;
    return {
      el: el, voice: str(activity.activity_voiceover), response: str(activity.trainer_response),
      onDone: function (fn) { if (finished) fn(); else doneFns.push(fn); },
      isFinished: function () { return finished; }
    };
  }

  global.AtomSlides = {
    renderCover: renderCover, renderSlide: renderSlide, renderActivity: renderActivity, renderCommitment: renderCommitment,
    Voice: Voice, useScriptFont: useScriptFont, words: WORDS
  };
})(window);
