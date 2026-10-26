/* Request Early Access: one form, shared by all four pages.
   Every "Request Early Access" link opens it. To connect it, set ENDPOINT below to the
   address that receives the form (it gets a JSON POST). While ENDPOINT is empty the form
   works but says plainly that nothing was sent. */
(function () {
  var ENDPOINT = 'https://wotg-publicwebsite-form.azurewebsites.net/api/request-access';
  var FALLBACK_EMAIL = 'inquiry@korporatewisdom.com';
  var FREE = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|proton|protonmail|gmx|mail|zoho|yandex|rediffmail)\.[a-z.]+$/i;

  var css = '\
.ra-bg{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(4,26,64,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}\
.ra-bg.open{display:flex;animation:raf .3s ease both;}\
@keyframes raf{from{opacity:0}}\
.ra{position:relative;width:min(560px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:30px 30px 30px 96px;background:linear-gradient(135deg,#dbe5f3 0%,#f6f1dc 100%);padding:clamp(26px,4vw,42px);font-family:Poppins,sans-serif;color:#041A40;box-shadow:0 30px 80px rgba(4,26,64,.35);animation:rau .4s cubic-bezier(.2,.7,.2,1) both;}\
@keyframes rau{from{opacity:0;transform:translateY(18px)}}\
.ra h2{font-weight:500;font-size:clamp(1.5rem,3vw,2rem);letter-spacing:-.03em;line-height:1.15;margin:0;padding-right:40px;}\
.ra .ra-sub{margin:8px 0 0;font-size:.95rem;line-height:1.5;color:#2A3C5D;}\
.ra .ra-x{position:absolute;top:18px;right:20px;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.7);color:#041A40;font-size:1.3rem;line-height:1;cursor:pointer;}\
.ra .ra-x:hover{background:#fff;}\
.ra form{margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:14px;}\
.ra .f{display:flex;flex-direction:column;gap:6px;min-width:0;} .ra .f.w{grid-column:1/-1;}\
.ra label{font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#2A3C5D;}\
.ra input,.ra select,.ra textarea{width:100%;font:inherit;font-size:.98rem;color:#041A40;background:rgba(255,255,255,.85);border:1.5px solid rgba(4,26,64,.14);border-radius:14px;padding:.8rem 1rem;outline:none;transition:border-color .2s,box-shadow .2s;}\
.ra textarea{min-height:92px;resize:vertical;}\
.ra input:focus,.ra select:focus,.ra textarea:focus{border-color:#2d9640;box-shadow:0 0 0 4px rgba(58,181,74,.18);}\
.ra .bad{border-color:#b3261e;} .ra .err{display:none;font-size:.8rem;color:#b3261e;} .ra .f.bad .err{display:block;} .ra .f.bad input,.ra .f.bad select{border-color:#b3261e;}\
.ra .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;}\
.ra .ra-go{grid-column:1/-1;margin-top:4px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}\
.ra .ra-send{font:inherit;font-weight:500;font-size:.95rem;border:0;border-radius:999px;padding:1rem 2rem;background:#041A40;color:#fff;cursor:pointer;transition:background .25s;}\
.ra .ra-send:hover{background:#1f7a31;} .ra .ra-send:disabled{opacity:.6;cursor:default;}\
.ra .ra-note{font-size:.78rem;color:#4F5F79;line-height:1.4;max-width:30ch;}\
.ra .ra-msg{grid-column:1/-1;display:none;font-size:.88rem;padding:.8rem 1rem;border-radius:12px;background:rgba(179,38,30,.1);color:#8c1d18;}\
.ra .ra-msg a{color:inherit;font-weight:600;}\
.ra .ra-ok{display:none;text-align:left;padding:10px 0 4px;} .ra .ra-ok .tick{width:60px;height:60px;border-radius:50%;background:#3ab54a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.9rem;margin-bottom:18px;}\
.ra .ra-ok p{margin:10px 0 0;color:#2A3C5D;line-height:1.55;} .ra .ra-ok .prev{display:inline-block;margin-top:14px;padding:.45rem .9rem;border-radius:999px;background:#E4CA0A;font-size:.8rem;font-weight:600;color:#041A40;}\
.ra.done form,.ra.done .ra-sub,.ra.done>h2{display:none;} .ra.done .ra-ok{display:block;}\
@media (max-width:560px){.ra form{grid-template-columns:1fr;} .ra{border-radius:26px 26px 26px 70px;}}\
@media (prefers-reduced-motion:reduce){.ra,.ra-bg.open{animation:none;}}';

  var html = '\
<div class="ra" role="dialog" aria-modal="true" aria-labelledby="ra-t">\
<button type="button" class="ra-x" aria-label="Close">&times;</button>\
<h2 id="ra-t">Request early access</h2>\
<p class="ra-sub">Tell us a little about your organization. We read every request and reply personally.</p>\
<form novalidate>\
<div class="f"><label for="ra-name">Your name</label><input id="ra-name" name="name" autocomplete="name" required><span class="err">Please add your name.</span></div>\
<div class="f"><label for="ra-email">Work email</label><input id="ra-email" name="email" type="email" autocomplete="email" required><span class="err" id="ra-eerr">Please use your work email.</span></div>\
<div class="f"><label for="ra-co">Company</label><input id="ra-co" name="company" autocomplete="organization" required><span class="err">Please add your company.</span></div>\
<div class="f"><label for="ra-hc">Approx. headcount</label><select id="ra-hc" name="headcount" required><option value="">Select</option><option>1&ndash;50</option><option>51&ndash;200</option><option>201&ndash;1,000</option><option>1,001&ndash;5,000</option><option>5,000+</option></select><span class="err">Please choose a range.</span></div>\
<div class="f w"><label for="ra-msg">A short message <span style="text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label><textarea id="ra-msg" name="message" maxlength="1000" placeholder="What would you like human skills development to change in your organization?"></textarea></div>\
<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">\
<div class="ra-msg" role="alert"></div>\
<div class="ra-go"><button class="ra-send" type="submit">Send request</button><span class="ra-note">We use your details only to reply to this request.</span></div>\
</form>\
<div class="ra-ok" role="status"><div class="tick">&#10003;</div><h2 id="ra-okh">Thank you.</h2><p>We have your request and will reply within one business day.</p></div>\
</div>';

  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var bg = document.createElement('div'); bg.className = 'ra-bg'; bg.innerHTML = html; document.body.appendChild(bg);
  var box = bg.querySelector('.ra'), form = bg.querySelector('form'), msg = bg.querySelector('.ra-msg'), send = bg.querySelector('.ra-send'), okp = bg.querySelector('.ra-ok p'), okh = bg.querySelector('#ra-okh'), last = null;

  function open(from) { last = from || document.activeElement; box.classList.remove('done'); bg.classList.add('open'); document.documentElement.style.overflow = 'hidden'; setTimeout(function () { form.elements.name.focus(); }, 60); }
  function close() { bg.classList.remove('open'); document.documentElement.style.overflow = ''; if (last && last.focus) last.focus(); }
  bg.querySelector('.ra-x').addEventListener('click', close);
  bg.addEventListener('mousedown', function (e) { if (e.target === bg) close(); });
  document.addEventListener('keydown', function (e) {
    if (!bg.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      var f = [].slice.call(box.querySelectorAll('button,input:not(.hp),select,textarea,a[href]')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  [].forEach.call(document.querySelectorAll('a[href^="mailto:' + FALLBACK_EMAIL + '?subject=WOTG%20Early%20Access"]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); var nav = document.getElementById('nav'); if (nav) nav.classList.remove('open'); open(a); });
  });

  function flag(el, bad) { var f = el.closest('.f'); if (f) f.classList.toggle('bad', bad); return bad; }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); msg.style.display = 'none';
    var v = function (n) { return (form.elements[n].value || '').trim(); };
    var email = v('email'), badMail = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || FREE.test(email);
    document.getElementById('ra-eerr').textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please use your work email.' : 'Please enter a valid email.';
    var bad = [flag(form.elements.name, !v('name')), flag(form.elements.email, badMail), flag(form.elements.company, !v('company')), flag(form.elements.headcount, !v('headcount'))].some(Boolean);
    if (bad) { var first = form.querySelector('.f.bad input,.f.bad select'); if (first) first.focus(); return; }
    if (v('website')) { box.classList.add('done'); return; }
    var data = { name: v('name'), email: email, company: v('company'), headcount: v('headcount'), message: v('message'), page: location.pathname, sentAt: new Date().toISOString() };
    if (!ENDPOINT) {
      okh.textContent = 'Preview only.'; okp.innerHTML = 'The form is not connected yet, so nothing was sent.<br><span class="prev">Not sent</span>';
      box.classList.add('done'); form.reset(); return;
    }
    send.disabled = true; send.textContent = 'Sending...';
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error('bad'); okh.textContent = 'Thank you.'; okp.textContent = 'We have your request and will reply within one business day.'; box.classList.add('done'); form.reset(); })
      .catch(function () { msg.innerHTML = 'Sorry, that did not go through. Please try again, or write to <a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + '</a>.'; msg.style.display = 'block'; })
      .then(function () { send.disabled = false; send.textContent = 'Send request'; });
  });
})();
