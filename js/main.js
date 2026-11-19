/* Portofolio Arsyad Kariman — logika halaman (tanpa build step). */
(function () {
  'use strict';

  var cfg = window.PORTFOLIO_CONFIG || {};
  var html = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }

  /* ---------------- loader (sekali per sesi) ---------------- */
  function runLoader(done) {
    var el = $('#loader');
    var seen = false;
    try { seen = sessionStorage.getItem('portfolio-intro-finished') === 'true'; } catch (e) {}
    if (!el || seen || reduced) {
      if (el) el.remove();
      html.classList.remove('is-loading');
      done();
      return;
    }
    var num = $('#loader-num'), bar = $('#loader-bar');
    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      try { sessionStorage.setItem('portfolio-intro-finished', 'true'); } catch (e) {}
      el.classList.add('is-leaving');
      html.classList.remove('is-loading');
      setTimeout(function () { el.remove(); }, 700);
      done();
    }
    var start = performance.now(), dur = 1500;
    (function tick(now) {
      if (finished) return;
      var t = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - t, 3);
      num.textContent = Math.round(e * 100);
      bar.style.transform = 'scaleX(' + e + ')';
      if (t < 1) requestAnimationFrame(tick); else setTimeout(finish, 180);
    })(start);
    setTimeout(finish, 4500); // jaga-jaga jika rAF tertahan (tab di latar)
  }

  /* ---------------- navbar ---------------- */
  function navbar() {
    var nav = $('#navbar'), toggle = $('#nav-toggle');
    var links = $$('.navbar-link'), pill = $('.navbar-active-pill');
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = -1;

    function movePill() {
      var a = links[current];
      if (!a || !pill || pill.offsetParent === null) return;
      var pr = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
      pill.style.width = r.width + 'px';
      pill.style.transform = 'translateX(' + (r.left - pr.left) + 'px)';
      pill.style.opacity = '1';
    }
    function setActive(i) {
      if (i === current) return;
      current = i;
      links.forEach(function (a, k) {
        a.classList.toggle('is-active', k === i);
        if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      movePill();
    }
    var ticking = false;
    function spy() {
      ticking = false;
      var y = window.scrollY + window.innerHeight * 0.4, idx = 0;
      sections.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = sections.length - 1;
      setActive(idx);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    window.addEventListener('resize', function () { movePill(); });
    spy();

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    }
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    links.forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
  }

  /* ---------------- teks ketik ---------------- */
  function typewriter() {
    var el = $('#typed');
    var roles = (cfg.roles && cfg.roles.length) ? cfg.roles : [el.textContent];
    if (reduced) { el.textContent = roles[0]; return; }
    var r = 0, c = 0, typing = true;
    el.textContent = '';
    (function loop() {
      var word = roles[r], delay;
      if (typing) {
        if (c < word.length) { el.textContent = word.slice(0, ++c); delay = 90; }
        else { typing = false; delay = 2000; }
      } else {
        if (c > 0) { el.textContent = word.slice(0, --c); delay = 45; }
        else { typing = true; r = (r + 1) % roles.length; delay = 300; }
      }
      setTimeout(loop, delay);
    })();
  }

  /* ---------------- efek latar: meteor, orb, partikel ---------------- */
  function meteors() {
    var box = $('#meteors');
    if (!box || reduced) return;
    var n = window.innerWidth < 768 ? 4 : 8;
    for (var i = 0; i < n; i++) {
      var m = document.createElement('span');
      m.className = 'meteor';
      m.style.setProperty('--meteor-top', (Math.random() * 60 - 10) + '%');
      m.style.setProperty('--meteor-left', (Math.random() * 90) + '%');
      m.style.setProperty('--meteor-duration', (5 + Math.random() * 6) + 's');
      m.style.setProperty('--meteor-delay', (Math.random() * 9) + 's');
      box.appendChild(m);
    }
  }

  function orbs() {
    if (!window.gsap || reduced) return;
    gsap.to('.orb-1', { x: '14vw', y: '10vh', duration: 16, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.orb-2', { x: '-12vw', y: '-8vh', duration: 19, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.orb-3', { x: '10vw', y: '-12vh', duration: 22, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  function particles() {
    var cv = $('#particles');
    if (!cv || reduced) return;
    var ctx = cv.getContext('2d');
    var w = 0, h = 0, dpr = 1, pts = [], raf = 0, small = false;
    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth; h = window.innerHeight; small = w < 768;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(small ? 28 : 64, Math.round(w * h / 22000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() * 1.4 + .5 });
    }
    function frame() {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < pts.length; i++) {
        p = pts[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = 'rgba(147,197,253,.65)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      if (small) return;
      for (i = 0; i < pts.length; i++) for (j = i + 1; j < pts.length; j++) {
        p = pts[i]; q = pts[j]; dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
        if (d < 12100) {
          ctx.strokeStyle = 'rgba(96,165,250,' + (0.16 * (1 - d / 12100)) + ')';
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    build(); frame();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) frame();
    });
  }

  /* ---------------- reveal saat scroll ---------------- */
  function reveals() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (e) { e.classList.add('is-in-view'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- tab portofolio ---------------- */
  function tabs() {
    var btns = $$('.tab-btn');
    function select(btn, focus) {
      btns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) btn.focus();
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var kids = panel ? $$('.skill-card, .empty-card', panel) : [];
      if (window.gsap && !reduced && kids.length) {
        gsap.fromTo(kids, { y: 22, autoAlpha: 0, scale: .94 }, { y: 0, autoAlpha: 1, scale: 1, duration: .55, stagger: .045, ease: 'back.out(1.3)', clearProps: 'transform,opacity,visibility' });
      }
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b, false); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = btns.length, t = null;
        if (k === 'ArrowRight') t = btns[(i + 1) % n];
        else if (k === 'ArrowLeft') t = btns[(i - 1 + n) % n];
        else if (k === 'Home') t = btns[0];
        else if (k === 'End') t = btns[n - 1];
        if (t) { e.preventDefault(); select(t, true); }
      });
    });
  }

  /* ---------------- kartu glow yang mengikuti kursor ---------------- */
  function glowCards() {
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.glow-card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------------- gambar karakter ---------------- */
  function portrait() {
    var img = $('#portrait-img'), stage = $('#portrait-stage');
    if (!img || !stage) return;
    img.addEventListener('error', function () { stage.classList.add('is-missing'); });
    img.addEventListener('load', function () { stage.classList.remove('is-missing'); });
    img.src = cfg.portraitSrc || 'assets/ellen.png';
    if (window.gsap && window.ScrollTrigger && !reduced) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo('.about-portrait', { y: 24 }, { y: -24, ease: 'none', scrollTrigger: { trigger: '#About', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  /* ---------------- util form ---------------- */
  function setStatus(el, msg, kind) { el.textContent = msg || ''; el.className = 'form-status' + (kind ? ' is-' + kind : ''); }
  function cooldownLeft(key, ms) {
    var last = parseInt(safeGet(key) || '0', 10) || 0;
    return Math.max(0, ms - (Date.now() - last));
  }
  function clean(s) { return String(s || '').replace(/\u0000/g, '').trim(); }
  function linkCount(s) { return (s.match(/https?:\/\/|www\./gi) || []).length; }

  /* ---------------- form kontak (Web3Forms) ---------------- */
  function contactForm() {
    var form = $('#contact-form'); if (!form) return;
    var status = $('#contact-status'), btn = $('#contact-submit'), COOL = 30000, KEY = 'portfolio-contact-last';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website && form.website.value) { setStatus(status, 'Terkirim. Terima kasih!', 'ok'); form.reset(); return; } // bot
      var name = clean(form.name.value), email = clean(form.email.value), message = clean(form.message.value);
      if (!name || !email || !message) return setStatus(status, 'Lengkapi nama, email, dan pesan dulu ya.', 'err');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus(status, 'Format email sepertinya belum benar.', 'err');
      if (!cfg.web3formsAccessKey) return setStatus(status, 'Form belum diaktifkan. Pemilik situs perlu mengisi access key di js/config.js.', 'err');
      var left = cooldownLeft(KEY, COOL);
      if (left > 0) return setStatus(status, 'Tunggu ' + Math.ceil(left / 1000) + ' detik sebelum kirim lagi.', 'err');

      btn.disabled = true; setStatus(status, 'Mengirim…');
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: cfg.web3formsAccessKey, subject: 'Pesan baru dari portofolio', from_name: name, name: name, email: email, message: message, botcheck: '' })
      }).then(function (r) { return r.json().catch(function () { return { success: false }; }); })
        .then(function (res) {
          if (res && res.success) {
            safeSet(KEY, String(Date.now()));
            form.reset(); setStatus(status, 'Pesan terkirim. Terima kasih!', 'ok');
          } else {
            setStatus(status, 'Gagal mengirim' + (res && res.message ? ': ' + res.message : '. Coba lagi nanti.'), 'err');
          }
        })
        .catch(function () { setStatus(status, 'Tidak bisa terhubung. Cek koneksi internet lalu coba lagi.', 'err'); })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------------- komentar publik (Supabase via REST, fallback lokal) ---------------- */
  function comments() {
    var form = $('#comment-form'), list = $('#comment-list'); if (!form || !list) return;
    var status = $('#comment-status'), btn = $('#comment-submit'), note = $('#demo-note');
    var COOL = 20000, KEY = 'portfolio-comment-last', LOCAL = 'portfolio-contact-comments';
    var base = (cfg.supabaseUrl || '').replace(/\/+$/, ''), anon = cfg.supabaseAnonKey || '';
    var online = !!(base && anon);
    if (!online) note.hidden = false;

    function api(path, opts) {
      opts = opts || {};
      // Kunci publishable baru (sb_publishable_...) cukup lewat header apikey; kunci anon lama berupa JWT (eyJ...)
      var auth = /^eyJ/.test(anon) ? { Authorization: 'Bearer ' + anon } : {};
      opts.headers = Object.assign({ apikey: anon, 'Content-Type': 'application/json' }, auth, opts.headers || {});
      return fetch(base + '/rest/v1/' + path, opts).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || r.status); });
        // PostgREST membalas 201/204 dengan isi kosong untuk "return=minimal"
        return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
      });
    }
    function ago(iso) {
      var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      if (isNaN(s)) return '';
      if (s < 60) return 'baru saja';
      var m = s / 60; if (m < 60) return Math.floor(m) + ' menit lalu';
      var h = m / 60; if (h < 24) return Math.floor(h) + ' jam lalu';
      var d = h / 24; if (d < 30) return Math.floor(d) + ' hari lalu';
      return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    function hue(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
    function render(items) {
      list.textContent = '';
      if (!items.length) {
        var li = document.createElement('li'); li.className = 'comment-empty'; li.textContent = 'Belum ada komentar. Jadilah yang pertama!'; list.appendChild(li); return;
      }
      items.forEach(function (c) {
        var li = document.createElement('li'); li.className = 'comment-item';
        var av = document.createElement('div'); av.className = 'comment-avatar';
        av.textContent = (c.name || '?').trim().charAt(0).toUpperCase();
        av.style.background = 'hsl(' + hue(c.name || '') + ' 62% 42%)';
        var body = document.createElement('div'); body.className = 'comment-body';
        var head = document.createElement('div'); head.className = 'comment-head';
        var nm = document.createElement('span'); nm.className = 'comment-name'; nm.textContent = c.name;
        var tm = document.createElement('span'); tm.className = 'comment-time'; tm.textContent = ago(c.created_at);
        head.appendChild(nm); head.appendChild(tm);
        var tx = document.createElement('p'); tx.className = 'comment-text'; tx.textContent = c.message;
        body.appendChild(head); body.appendChild(tx);
        li.appendChild(av); li.appendChild(body); list.appendChild(li);
      });
    }
    function readLocal() { try { var a = JSON.parse(safeGet(LOCAL) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function load() {
      if (!online) return render(readLocal());
      var li = document.createElement('li'); li.className = 'comment-empty'; li.textContent = 'Memuat komentar…'; list.textContent = ''; list.appendChild(li);
      api('comments?select=id,name,message,created_at&order=created_at.desc&limit=50')
        .then(render)
        .catch(function () { list.textContent = ''; var x = document.createElement('li'); x.className = 'comment-empty'; x.textContent = 'Komentar belum bisa dimuat sekarang.'; list.appendChild(x); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website && form.website.value) { form.reset(); return; } // bot
      var name = clean(form.name.value).replace(/\s+/g, ' ').slice(0, 40), message = clean(form.message.value).slice(0, 500);
      if (!name || !message) return setStatus(status, 'Isi nama dan komentarnya dulu ya.', 'err');
      if (linkCount(message) > 1) return setStatus(status, 'Maksimal satu link per komentar.', 'err');
      var left = cooldownLeft(KEY, COOL);
      if (left > 0) return setStatus(status, 'Tunggu ' + Math.ceil(left / 1000) + ' detik sebelum komentar lagi.', 'err');

      btn.disabled = true; setStatus(status, 'Mengirim…');
      var done = function (ok, msg) { btn.disabled = false; setStatus(status, msg, ok ? 'ok' : 'err'); };
      if (!online) {
        var arr = readLocal(); arr.unshift({ id: String(Date.now()), name: name, message: message, created_at: new Date().toISOString() });
        safeSet(LOCAL, JSON.stringify(arr.slice(0, 60))); safeSet(KEY, String(Date.now()));
        form.message.value = ''; render(arr); return done(true, 'Komentar tersimpan (mode demo).');
      }
      api('comments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: name, message: message }) })
        .then(function () { safeSet(KEY, String(Date.now())); form.message.value = ''; load(); done(true, 'Komentar terkirim. Terima kasih!'); })
        .catch(function (err) {
          var m = String(err && err.message || '');
          done(false, /flood|Terlalu banyak/i.test(m) ? 'Lagi ramai, coba lagi sebentar ya.' : 'Gagal mengirim komentar. Coba lagi nanti.');
        });
    });
    load();
  }

  /* ---------------- lain-lain ---------------- */
  function misc() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
    var top = $('#to-top');
    if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  }

  function startLanyard() {
    var mount = $('#lanyard-mount');
    if (!mount) return;
    if (!window.PortfolioLanyard) { mount.classList.add('lanyard-fallback-on'); return; }
    try {
      window.PortfolioLanyard.init(mount, { name: cfg.name || 'Arsyad Kariman', intro: true, reducedMotion: reduced });
    } catch (err) {
      console.warn('[lanyard] gagal dimulai:', err);
      mount.classList.add('lanyard-fallback-on');
    }
  }

  /* ---------------- start ---------------- */
  function safely(fn) { try { fn(); } catch (err) { console.error('[portfolio]', fn.name || 'step', err); } }
  function boot() {
    [misc, navbar, meteors, orbs, particles, tabs, glowCards, portrait, contactForm, comments].forEach(safely);
    runLoader(function () {
      clearTimeout(window.__revealFallback);
      [typewriter, reveals, startLanyard].forEach(safely);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
