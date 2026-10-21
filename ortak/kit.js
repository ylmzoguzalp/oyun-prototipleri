// Prototip ortak çekirdeği (F1, F2, F3 aynı dosyayı kullanır).
// Bağımlılık yok; klasik <script> olarak yüklenir, böylece index.html çift tıklayınca (file://) çalışır.
// Mantıksal ekran 1280x720; tuval pencereye sığacak biçimde ölçeklenir.
(function () {
  const Kit = {};
  window.Kit = Kit;

  const W = 1280, H = 720;
  Kit.W = W; Kit.H = H;

  // ---------- Tuval ve döngü ----------
  let tuval, ctx, olcek = 1, ofsX = 0, ofsY = 0, dpr = 1;
  let sahne = null;
  let sonZaman = 0;
  let durakla = 0;          // vuruş anı donması (sn)
  let sarsGuc = 0, sarsSure = 0, sarsToplam = 0;
  let flasRenk = null, flasSure = 0, flasToplam = 0;
  Kit.zamanOlcegi = 1;
  Kit.zaman = 0;            // oyun saati (sn)

  function boyutla() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = window.innerWidth, ph = window.innerHeight;
    olcek = Math.min(pw / W, ph / H);
    const cw = Math.floor(W * olcek), ch = Math.floor(H * olcek);
    ofsX = Math.floor((pw - cw) / 2); ofsY = Math.floor((ph - ch) / 2);
    tuval.style.width = cw + 'px'; tuval.style.height = ch + 'px';
    tuval.style.left = ofsX + 'px'; tuval.style.top = ofsY + 'px';
    tuval.width = Math.floor(cw * dpr); tuval.height = Math.floor(ch * dpr);
  }

  // sahne: { guncelle(dt), ciz(ctx) } — Kit.sahneDegistir ile değişir
  Kit.baslat = function (ilkSahne) {
    tuval = document.createElement('canvas');
    tuval.style.position = 'absolute';
    tuval.style.touchAction = 'none';
    document.body.style.margin = '0';
    document.body.style.background = '#07070c';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(tuval);
    ctx = tuval.getContext('2d');
    Kit.ctx = ctx;
    window.addEventListener('resize', boyutla);
    boyutla();
    girdiKur();
    Kit.sahneDegistir(ilkSahne);
    requestAnimationFrame(dongu);
  };

  Kit.sahneDegistir = function (s) {
    sahne = s;
    parcaciklar.length = 0; yazilar.length = 0; tweenler.length = 0;
    if (s && s.gir) s.gir();
  };

  function dongu(t) {
    requestAnimationFrame(dongu);
    let dt = sonZaman ? (t - sonZaman) / 1000 : 0;
    sonZaman = t;
    if (dt > 0.05) dt = 0.05; // sekme arkadayken büyük sıçrama olmasın
    let oyunDt = dt * Kit.zamanOlcegi;
    if (durakla > 0) { durakla -= dt; oyunDt = 0; }
    Kit.zaman += oyunDt;
    Kit.gercekDt = dt;

    tweenGuncelle(dt);
    if (sahne && sahne.guncelle) sahne.guncelle(oyunDt, dt);
    parcacikGuncelle(oyunDt);
    yaziGuncelle(dt);
    if (sarsSure > 0) sarsSure -= dt;
    if (flasSure > 0) flasSure -= dt;

    // çizim
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, tuval.width, tuval.height);
    const s = olcek * dpr;
    let sx = 0, sy = 0;
    if (sarsSure > 0) {
      const k = sarsGuc * (sarsSure / sarsToplam);
      sx = (Math.random() * 2 - 1) * k; sy = (Math.random() * 2 - 1) * k;
    }
    ctx.setTransform(s, 0, 0, s, sx * s, sy * s);
    if (sahne && sahne.ciz) sahne.ciz(ctx);
    parcacikCiz(ctx);
    yaziCiz(ctx);
    if (sahne && sahne.ustCiz) sahne.ustCiz(ctx); // arayüz: sarsıntıdan etkilenir ama parçacıkların üstünde
    if (flasSure > 0 && flasRenk) {
      ctx.globalAlpha = Math.max(0, flasSure / flasToplam) * 0.5;
      ctx.fillStyle = flasRenk; ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalAlpha = 1;
    }
    girdiKareSonu();
  }

  Kit.durakla = function (sn) { durakla = Math.max(durakla, sn); };
  Kit.salla = function (guc, sure) {
    if (guc >= sarsGuc * (sarsSure / (sarsToplam || 1))) { sarsGuc = guc; sarsSure = sure; sarsToplam = sure; }
  };
  Kit.flas = function (renk, sure) { flasRenk = renk; flasSure = sure; flasToplam = sure; };

  // ---------- Girdi ----------
  const fare = { x: 0, y: 0, basili: false, tiklandi: false, birakildi: false, sagTik: false };
  Kit.fare = fare;
  const tuslar = {}, tusKenar = {};
  function konum(e) {
    const r = tuval.getBoundingClientRect();
    fare.x = (e.clientX - r.left) / r.width * W;
    fare.y = (e.clientY - r.top) / r.height * H;
  }
  function girdiKur() {
    tuval.addEventListener('pointerdown', e => {
      konum(e);
      if (e.button === 2) { fare.sagTik = true; return; }
      fare.basili = true; fare.tiklandi = true;
      if (window.Ses) Ses.ac();
    });
    window.addEventListener('pointermove', e => konum(e));
    window.addEventListener('pointerup', e => { konum(e); if (fare.basili) fare.birakildi = true; fare.basili = false; });
    tuval.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (!tuslar[e.code]) tusKenar[e.code] = true;
      tuslar[e.code] = true;
      if (window.Ses) Ses.ac();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { tuslar[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in tuslar) tuslar[k] = false; });
  }
  function girdiKareSonu() {
    fare.tiklandi = false; fare.birakildi = false; fare.sagTik = false;
    for (const k in tusKenar) delete tusKenar[k];
    tikTuketildi = false;
  }
  Kit.tus = c => !!tuslar[c];
  Kit.tusBasildi = c => !!tusKenar[c];
  Kit.icinde = (x, y, w, h) => fare.x >= x && fare.x <= x + w && fare.y >= y && fare.y <= y + h;
  Kit.daireIcinde = (x, y, r) => (fare.x - x) ** 2 + (fare.y - y) ** 2 <= r * r;
  // Aynı karede tıklamanın iki öğe tarafından alınmaması için
  let tikTuketildi = false;
  Kit.tikAl = function (x, y, w, h) {
    if (fare.tiklandi && !tikTuketildi && Kit.icinde(x, y, w, h)) { tikTuketildi = true; return true; }
    return false;
  };
  Kit.tikTuket = () => { tikTuketildi = true; };
  Kit.tikVarMi = () => fare.tiklandi && !tikTuketildi;

  // ---------- Tween ----------
  const tweenler = [];
  Kit.ease = {
    lin: t => t,
    cik: t => 1 - (1 - t) * (1 - t),
    gir: t => t * t,
    cikKub: t => 1 - Math.pow(1 - t, 3),
    geri: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    sicra: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; },
  };
  Kit.tween = function (obj, hedef, sure, ease, bitince) {
    const bas = {};
    for (const k in hedef) bas[k] = obj[k];
    const t = { obj, hedef, bas, sure, gecen: 0, ease: ease || Kit.ease.cikKub, bitince };
    tweenler.push(t);
    return t;
  };
  function tweenGuncelle(dt) {
    for (let i = tweenler.length - 1; i >= 0; i--) {
      const t = tweenler[i];
      t.gecen += dt;
      const p = Math.min(1, t.gecen / t.sure), e = t.ease(p);
      for (const k in t.hedef) t.obj[k] = t.bas[k] + (t.hedef[k] - t.bas[k]) * e;
      if (p >= 1) { tweenler.splice(i, 1); if (t.bitince) t.bitince(); }
    }
  }

  // ---------- Parçacıklar ----------
  const parcaciklar = [];
  // secenek: sayi, renk (dizi olabilir), hiz, omur, boyut, yercekimi, yayilma (radyan), aci, surtunme, sekil ('daire'|'kare'|'cizgi')
  Kit.parcacik = function (x, y, o) {
    o = o || {};
    const n = o.sayi || 10;
    for (let i = 0; i < n; i++) {
      const a = (o.aci != null ? o.aci : 0) + (Math.random() - 0.5) * (o.yayilma != null ? o.yayilma : Math.PI * 2);
      const v = (o.hiz || 200) * (0.4 + Math.random() * 0.8);
      const renk = Array.isArray(o.renk) ? o.renk[(Math.random() * o.renk.length) | 0] : (o.renk || '#fff');
      const omur = (o.omur || 0.6) * (0.6 + Math.random() * 0.6);
      parcaciklar.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, omur, kalan: omur, renk, boyut: (o.boyut || 4) * (0.6 + Math.random() * 0.8), g: o.yercekimi || 0, s: o.surtunme != null ? o.surtunme : 3, sekil: o.sekil || 'daire' });
    }
    if (parcaciklar.length > 1500) parcaciklar.splice(0, parcaciklar.length - 1500);
  };
  // Genişleyen halka
  Kit.halka = function (x, y, o) {
    o = o || {};
    parcaciklar.push({ halka: true, x, y, r: o.r0 || 10, r1: o.r1 || 80, omur: o.omur || 0.35, kalan: o.omur || 0.35, renk: o.renk || '#fff', kalin: o.kalin || 4 });
  };
  function parcacikGuncelle(dt) {
    for (let i = parcaciklar.length - 1; i >= 0; i--) {
      const p = parcaciklar[i];
      p.kalan -= dt;
      if (p.kalan <= 0) { parcaciklar.splice(i, 1); continue; }
      if (p.halka) continue;
      p.vx -= p.vx * p.s * dt; p.vy -= p.vy * p.s * dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function parcacikCiz(c) {
    for (const p of parcaciklar) {
      const k = p.kalan / p.omur;
      c.globalAlpha = Math.min(1, k * 1.5);
      if (p.halka) {
        const r = p.r1 + (p.r - p.r1) * k;
        c.strokeStyle = p.renk; c.lineWidth = p.kalin * k + 0.5;
        c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.stroke();
        continue;
      }
      c.fillStyle = p.renk;
      const b = p.boyut * (0.4 + 0.6 * k);
      if (p.sekil === 'kare') c.fillRect(p.x - b / 2, p.y - b / 2, b, b);
      else if (p.sekil === 'cizgi') {
        c.strokeStyle = p.renk; c.lineWidth = b * 0.5;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); c.stroke();
      } else { c.beginPath(); c.arc(p.x, p.y, b, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  // ---------- Uçan yazılar (hasar sayıları) ----------
  const yazilar = [];
  Kit.yaziUcur = function (x, y, metin, o) {
    o = o || {};
    yazilar.push({ x: x + (Math.random() - 0.5) * 16, y, metin: String(metin), renk: o.renk || '#fff', boyut: o.boyut || 26, omur: o.omur || 0.9, kalan: o.omur || 0.9, vy: o.vy != null ? o.vy : -70, pop: 1 });
  };
  function yaziGuncelle(dt) {
    for (let i = yazilar.length - 1; i >= 0; i--) {
      const y = yazilar[i];
      y.kalan -= dt; y.y += y.vy * dt; y.vy *= (1 - 2 * dt);
      if (y.kalan <= 0) yazilar.splice(i, 1);
    }
  }
  function yaziCiz(c) {
    for (const y of yazilar) {
      const gecen = y.omur - y.kalan;
      const s = gecen < 0.12 ? 1 + 0.6 * (1 - gecen / 0.12) : 1;
      c.globalAlpha = Math.min(1, y.kalan / (y.omur * 0.4));
      Kit.metin(c, y.metin, y.x, y.y, { boyut: y.boyut * s, renk: y.renk, kalin: true, kontur: '#000' });
    }
    c.globalAlpha = 1;
  }

  // ---------- Çizim yardımcıları ----------
  Kit.FONT = '"Segoe UI", "Trebuchet MS", system-ui, sans-serif';
  Kit.metin = function (c, txt, x, y, o) {
    o = o || {};
    c.font = (o.kalin === false ? '' : '700 ') + Math.round(o.boyut || 20) + 'px ' + Kit.FONT;
    c.textAlign = o.hiza || 'center';
    c.textBaseline = o.taban || 'middle';
    if (o.kontur) { c.lineJoin = 'round'; c.lineWidth = o.konturKalin || Math.max(3, (o.boyut || 20) / 6); c.strokeStyle = o.kontur; c.strokeText(txt, x, y); }
    c.fillStyle = o.renk || '#fff';
    c.fillText(txt, x, y);
  };
  // Satırlara bölerek yaz; döndürdüğü değer kullanılan yükseklik
  Kit.metinKutu = function (c, txt, x, y, genislik, o) {
    o = o || {};
    const boyut = o.boyut || 16, satirH = o.satir || boyut * 1.3;
    c.font = (o.kalin ? '700 ' : '') + boyut + 'px ' + Kit.FONT;
    const kelimeler = String(txt).split(' ');
    let satir = '', yy = y;
    c.textAlign = o.hiza || 'left'; c.textBaseline = 'top'; c.fillStyle = o.renk || '#ddd';
    for (const k of kelimeler) {
      const dene = satir ? satir + ' ' + k : k;
      if (c.measureText(dene).width > genislik && satir) { c.fillText(satir, x, yy); satir = k; yy += satirH; }
      else satir = dene;
    }
    if (satir) { c.fillText(satir, x, yy); yy += satirH; }
    return yy - y;
  };
  Kit.yd = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  Kit.panel = function (c, x, y, w, h, o) {
    o = o || {};
    Kit.yd(c, x, y, w, h, o.r != null ? o.r : 12);
    c.fillStyle = o.renk || 'rgba(15,15,25,0.85)'; c.fill();
    if (o.kenar !== null) { c.lineWidth = o.kalin || 2; c.strokeStyle = o.kenar || 'rgba(255,255,255,0.15)'; c.stroke(); }
  };
  Kit.bar = function (c, x, y, w, h, oran, renk, o) {
    o = o || {};
    oran = Math.max(0, Math.min(1, oran));
    Kit.yd(c, x, y, w, h, h / 2); c.fillStyle = o.arka || 'rgba(0,0,0,0.6)'; c.fill();
    if (o.iz != null && o.iz > oran) { // gecikmeli beyaz iz (hasar sonrası)
      Kit.yd(c, x, y, w * Math.min(1, o.iz), h, h / 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    }
    if (oran > 0) { Kit.yd(c, x, y, Math.max(h, w * oran), h, h / 2); c.fillStyle = renk; c.fill(); }
    if (o.kenar) { Kit.yd(c, x, y, w, h, h / 2); c.strokeStyle = o.kenar; c.lineWidth = 1.5; c.stroke(); }
  };
  // Daire içine kırpılmış portre
  Kit.portre = function (c, img, x, y, r, o) {
    o = o || {};
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath();
    if (img && img.complete && img.naturalWidth) { c.clip(); c.drawImage(img, x - r, y - r, r * 2, r * 2); }
    else { c.fillStyle = o.yedek || '#444'; c.fill(); }
    c.restore();
    if (o.kenar) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = o.kalin || 4; c.strokeStyle = o.kenar; c.stroke(); }
  };
  // Anlık mod düğme: tıklandıysa true döner
  Kit.dugme = function (c, x, y, w, h, etiket, o) {
    o = o || {};
    const pasif = o.pasif;
    const ust = !pasif && Kit.icinde(x, y, w, h);
    const bas = ust && Kit.fare.basili;
    Kit.yd(c, x, y + (bas ? 2 : 0), w, h, o.r != null ? o.r : 10);
    c.fillStyle = pasif ? '#2a2a33' : (ust ? (o.ustRenk || '#f2c14e') : (o.renk || '#d9a521'));
    c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.stroke();
    Kit.metin(c, etiket, x + w / 2, y + h / 2 + (bas ? 2 : 0), { boyut: o.boyut || 22, renk: pasif ? '#777' : (o.yaziRenk || '#1a1206') });
    if (!pasif && Kit.tikAl(x, y, w, h)) { if (window.Ses) Ses.cal('tikla'); return true; }
    return false;
  };

  // ---------- Görseller ----------
  const gorseller = {};
  // Kit.gorselYukle({ad: 'yol', ...})
  Kit.gorselYukle = function (harita) {
    for (const ad in harita) {
      const img = new Image();
      img.src = harita[ad];
      gorseller[ad] = img;
    }
  };
  Kit.gorsel = ad => gorseller[ad];

  // ---------- Rastgele ve matematik ----------
  Kit.rastgeleTohum = function (tohum) {
    let a = tohum >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  Kit.sec = (dizi, r) => dizi[Math.floor((r || Math.random)() * dizi.length)];
  Kit.karistir = function (dizi, r) {
    r = r || Math.random;
    const d = dizi.slice();
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d;
  };
  Kit.sinirla = (v, a, b) => Math.max(a, Math.min(b, v));
  Kit.lerp = (a, b, t) => a + (b - a) * t;
  Kit.mesafe = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  // ---------- Kalıcı kayıt (tarayıcı izin vermezse sessizce geçer) ----------
  Kit.kayitOku = function (anahtar, varsayilan) {
    try { const v = localStorage.getItem(anahtar); return v ? JSON.parse(v) : varsayilan; } catch (e) { return varsayilan; }
  };
  Kit.kayitYaz = function (anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch (e) { /* yok say */ }
  };
})();
