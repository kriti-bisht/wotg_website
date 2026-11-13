/* user_notice.js -- the notice shown in front of a person right after login (written 2026-11-12). English only.
   window.UserNotice.check({ fetch, base }) is called once by chat.html when the page has started (after the one-time pronouns prompt, never together with it).
   - `fetch` is the page's own keycard-carrying fetch (reportsFetch); `base` is the user management address.
   - It asks the back end for the notice this person is owed. Asking IS the showing (the back end counts it), so it asks at most once per login: the answer is
     remembered under a stamp made from the login keycard and the day (so someone who stays signed in for days is asked once a day, not on every refresh or tab).
   - A notice has one way out: the "Got it" button, with the "Don't show me this message again" tick beside it. No close button, no Esc, no click outside.
   - Nothing here ever gets in the person's way: any failure just means no notice. The words are put in with textContent, never as HTML. */
(function () {
  'use strict';
  var KEY = 'wotg_notice_asked';
  var ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/></svg>'];
  var SPARK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>';
  var NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(cls, html) { var s = el('span', cls); s.innerHTML = html; return s; }       // only ever the fixed icons above
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function stamp() {
    var token = ''; try { token = localStorage.getItem('login_token') || ''; } catch (e) {}
    return token ? hash(token) + '|' + new Date().toISOString().slice(0, 10) : '';
  }
  // a piece of text with one phrase picked out (the brand name in the heading, "WOTG helps you:" in the intro)
  function withPhrase(node, text, phrase, cls, tag) {
    var i = phrase ? text.indexOf(phrase) : -1;
    if (i < 0) { node.textContent = text; return; }
    node.appendChild(document.createTextNode(text.slice(0, i)));
    node.appendChild(el(tag || 'span', cls, phrase));
    node.appendChild(document.createTextNode(text.slice(i + phrase.length)));
  }

  function build(notice, done) {
    var c = notice.content || {};
    var back = el('div', 'un-backdrop'); back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-labelledby', 'unTitle');
    var card = el('div', 'un-card'); back.appendChild(card);
    var hero = el('div', 'un-hero');
    ['a', 'b', 'c'].forEach(function (k) { hero.appendChild(svg('un-spark ' + k, SPARK)); });
    var h = el('h1'); h.id = 'unTitle'; withPhrase(h, c.heading || notice.title || '', 'Wisdom on the GO!', 'un-brand'); hero.appendChild(h); hero.appendChild(el('div', 'un-rule'));
    card.appendChild(hero);
    var body = el('div', 'un-body');
    if (c.highlight) body.appendChild(el('blockquote', 'un-highlight', c.highlight));
    if (c.intro) { var p = el('p', 'un-intro'); withPhrase(p, c.intro, 'WOTG helps you:', '', 'b'); body.appendChild(p); }
    if (c.points && c.points.length) {
      var ul = el('ul', 'un-points');
      c.points.forEach(function (t, i) { var li = el('li', 'un-point'); li.appendChild(svg('un-ico', ICONS[i % ICONS.length])); li.appendChild(el('span', '', t)); ul.appendChild(li); });
      body.appendChild(ul);
    }
    if (c.tagline && c.tagline.length) {
      var nos = el('div', 'un-nos');
      c.tagline.forEach(function (t) { var n = el('span', 'un-no'); n.appendChild(svg('', NO)); n.appendChild(document.createTextNode(t)); nos.appendChild(n); });
      body.appendChild(nos);
    }
    if (c.closing) body.appendChild(el('p', 'un-closing', c.closing));
    card.appendChild(body);
    var foot = el('div', 'un-foot');
    var label = el('label', 'un-tick'); var box = document.createElement('input'); box.type = 'checkbox'; box.id = 'unDont';
    label.appendChild(box); label.appendChild(svg('un-box', TICK)); label.appendChild(document.createTextNode("Don't show me this message again"));
    var btn = el('button', 'un-gotit', 'Got it'); btn.type = 'button';
    foot.appendChild(label); foot.appendChild(btn); card.appendChild(foot);
    btn.onclick = function () { btn.disabled = true; done(box.checked, back); };
    // Esc and a click outside do nothing: "Got it" is the only way out. Tab stays inside the notice.
    back.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key !== 'Tab') return;
      var f = [box, btn]; var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    return { back: back, focus: function () { btn.focus(); } };
  }

  var showing = false;
  window.UserNotice = {
    check: function (host) {
      try {
        if (showing || !host || !host.fetch || !host.base) return Promise.resolve(false);
        var s = stamp(); if (!s) return Promise.resolve(false);
        try { if (localStorage.getItem(KEY) === s) return Promise.resolve(false); localStorage.setItem(KEY, s); } catch (e) {}   // set BEFORE asking, so two tabs opening together ask once
        return host.fetch(host.base + '/api/notices/next', { method: 'POST' })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            var n = data && data.notice; if (!n || !n.notice_id) return false;
            showing = true;
            var view = build(n, function (dont, back) {
              host.fetch(host.base + '/api/notices/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notice_id: n.notice_id, dont_show_again: !!dont }) })
                .catch(function () {}).then(function () { if (back.parentNode) back.parentNode.removeChild(back); showing = false; document.body.style.overflow = view.prevOverflow || ''; });
            });
            view.prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
            document.body.appendChild(view.back); view.focus();
            return true;
          })
          .catch(function () { return false; });
      } catch (e) { return Promise.resolve(false); }
    }
  };
})();
