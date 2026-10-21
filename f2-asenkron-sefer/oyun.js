// F2 Asenkron Sefer — ekranlar: başlık, hazırlık (dükkân + dizilim), savaş, bitiş; ?oto=1 sürücüsü.
(function () {
  'use strict';
  const A = F2.AYAR;
  const P = new URLSearchParams(location.search);
  const OTO = P.get('oto') === '1';
  const OTO_N = Math.max(1, parseInt(P.get('n'), 10) || 1);
  const OTO_HIZLI = P.get('hizli') === '1' || OTO_N > 1;
  const OTO_ZEKA = P.get('zeka') != null ? +P.get('zeka') : 0.9;
  const KAYIT = OTO ? 'f2_sefer_oto' : F2.KAYIT_ANAHTARI;

  KarakterGorselleriYukle('../ortak/');

  // ---------- yerleşim ----------
  const S = 132;                 // alan hücresi
  const OY_X = [322, 172];       // oyuncu: [ön sütun, arka sütun] sol kenar
  const RK_X = [826, 976];       // rakip: [ön, arka]
  const SIRA_Y = [96, 244];
  const YS = 86, YEDEK_X = 172, YEDEK_Y = 404, YEDEK_ARA = 98;
  const DK = { x: 16, y: 520, w: 1248, h: 190 };
  const KART_X = 238, KART_Y = 536, KART_W = 150, KART_H = 160, KART_ARA = 164;
  const SAVAS_BTN = { x: 1078, y: 548, w: 172, h: 92 };
  const LVL_RENK = [null, '#cfd3da', '#5ec8ff', '#ffcc33'];
  const ROL_HARF = { tank: 'T', savasci: 'S', nisanci: 'N', buyucu: 'B' };
  const KOKEN_HARF = { kum: 'K', kor: 'A', gece: 'G' };
  const MENZIL_AD = { yakin: 'Yakın', uzak: 'Uzak', atlar: 'Yakın (arkaya atlar)' };

  const hucreXY = (takim, kol, sira) => ({ x: (takim === 0 ? OY_X : RK_X)[kol], y: SIRA_Y[sira] });
  const alanXY = i => hucreXY(0, F2.hucreKol(i), F2.hucreSira(i));
  const yedekXY = i => ({ x: YEDEK_X + i * YEDEK_ARA, y: YEDEK_Y });
  const kartXY = i => ({ x: KART_X + i * KART_ARA, y: KART_Y });
  const konXY = kon => kon.yer === 'alan' ? alanXY(kon.i) : yedekXY(kon.i);
  const konBoy = kon => kon.yer === 'alan' ? S : YS;

  // ---------- küçük çizim yardımcıları ----------
  // Kit.dugme'nin kilitlenebilen kopyası: modal ya da duraklatma açıkken alttaki düğmeler tıklanmaz
  let girdiKilit = false;
  function dugme(c, x, y, w, h, etiket, o) {
    o = o || {};
    const pasif = o.pasif, kilit = girdiKilit && !o.ust;
    const ust = !pasif && !kilit && Kit.icinde(x, y, w, h);
    const bas = ust && Kit.fare.basili;
    Kit.yd(c, x, y + (bas ? 2 : 0), w, h, o.r != null ? o.r : 10);
    c.fillStyle = pasif ? '#2a2a33' : (ust ? (o.ustRenk || '#f2c14e') : (o.renk || '#d9a521'));
    c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.stroke();
    Kit.metin(c, etiket, x + w / 2, y + h / 2 + (bas ? 2 : 0), { boyut: o.boyut || 22, renk: pasif ? '#777' : (o.yaziRenk || '#1a1206') });
    if (!pasif && !kilit && Kit.tikAl(x, y, w, h)) { Ses.cal('tikla'); return true; }
    return false;
  }
  function kalp(c, x, y, s, renk) {
    c.fillStyle = renk;
    c.beginPath();
    c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.78, x, y + s);
    c.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    c.fill();
  }
  function altinIkon(c, x, y, r) {
    c.fillStyle = '#f5c542'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a77a12'; c.lineWidth = Math.max(1.5, r * 0.18); c.beginPath(); c.arc(x, y, r * 0.62, 0, Math.PI * 2); c.stroke();
  }
  function cip(c, x, y, r, harf, renk) {
    c.fillStyle = renk; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.5; c.stroke();
    Kit.metin(c, harf, x, y + 0.5, { boyut: r * 1.15, renk: '#111' });
  }
  function kilitIkon(c, x, y, s, aktif) {
    c.strokeStyle = aktif ? '#9fe8ff' : 'rgba(255,255,255,0.5)'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y - s * 0.15, s * 0.28, Math.PI, 0); c.stroke();
    c.fillStyle = aktif ? '#9fe8ff' : 'rgba(255,255,255,0.35)';
    Kit.yd(c, x - s * 0.4, y - s * 0.15, s * 0.8, s * 0.6, 3); c.fill();
  }

  // Kahraman jetonu. h: {id, lvl, dal, esyalar}; o: savaş/görünüm ayrıntıları
  function tokenCiz(c, h, x, y, s, o) {
    o = o || {};
    const kr = KarakterBul(h.id);
    const lr = LVL_RENK[h.lvl];
    c.save();
    c.globalAlpha = o.alpha != null ? o.alpha : 1;
    const sc = o.olcek || 1;
    if (sc !== 1) { c.translate(x + s / 2, y + s / 2); c.scale(sc, sc); c.translate(-(x + s / 2), -(y + s / 2)); }
    if (h.lvl >= 2) { c.shadowColor = lr; c.shadowBlur = h.lvl === 3 ? 24 : 14; }
    Kit.yd(c, x, y, s, s, s * 0.12); c.fillStyle = '#191924'; c.fill();
    c.shadowBlur = 0;
    const g = c.createLinearGradient(x, y, x, y + s);
    g.addColorStop(0, kr.renk + '66'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fill();
    c.lineWidth = h.lvl === 1 ? 2.5 : h.lvl === 2 ? 4 : 5; c.strokeStyle = o.kenar || lr; c.stroke();
    const cx = x + s / 2, cy = y + s * 0.42, r = s * 0.3;
    // dolum halkası (savaşta)
    if (o.dolum != null) {
      c.lineWidth = Math.max(3, s * 0.035); c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.beginPath(); c.arc(cx, cy, r + s * 0.05, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = o.dolum >= 0.85 ? '#bff2ff' : '#5fc8ff';
      c.beginPath(); c.arc(cx, cy, r + s * 0.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.dolum); c.stroke();
    }
    if (o.tel) {
      const p = 1 - o.tel.kalan / o.tel.toplam;
      c.lineWidth = Math.max(5, s * 0.05); c.strokeStyle = '#ff7a2a';
      c.beginPath(); c.arc(cx, cy, r + s * 0.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
    }
    Kit.portre(c, Kit.gorsel('portre_' + h.id), cx, cy, r, { kenar: kr.renk, kalin: Math.max(2, s * 0.025), yedek: kr.renk });
    if (o.flas > 0) {
      c.globalAlpha = (o.alpha != null ? o.alpha : 1) * Math.min(1, o.flas / 0.12) * 0.85;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = o.alpha != null ? o.alpha : 1;
    }
    Kit.metin(c, '★'.repeat(h.lvl), cx, cy + r - s * 0.01, { boyut: s * 0.14, renk: lr, kontur: '#000', konturKalin: 3 });
    Kit.metin(c, kr.ad, cx, y + s * 0.83, { boyut: Math.max(10, s * 0.095), renk: '#eee', kontur: '#000', konturKalin: 3 });
    const d = F2.KAHRAMAN[h.id];
    const cr = Math.max(7, s * 0.075);
    cip(c, x + s * 0.13, y + s * 0.13, cr, ROL_HARF[d.rol], F2.ROLLER[d.rol].renk);
    cip(c, x + s * 0.13, y + s * 0.13 + cr * 2.3, cr, KOKEN_HARF[d.koken], F2.KOKENLER[d.koken].renk);
    h.esyalar.forEach((e, i) => {
      const es = F2.ESYA[e];
      const ex = x + s * 0.87, ey = y + s * 0.13 + i * cr * 2.4;
      c.fillStyle = es.renk; Kit.yd(c, ex - cr, ey - cr, cr * 2, cr * 2, 3); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke();
      Kit.metin(c, es.kisa, ex, ey + 0.5, { boyut: cr * 0.95, renk: '#fff', kontur: '#000', konturKalin: 2 });
    });
    if (h.dal != null) {
      const bx = x + s * 0.87, by = y + s * 0.6;
      c.fillStyle = '#5ec8ff'; c.beginPath(); c.moveTo(bx, by - cr); c.lineTo(bx + cr, by); c.lineTo(bx, by + cr); c.lineTo(bx - cr, by); c.closePath(); c.fill();
      Kit.metin(c, h.dal === 0 ? 'A' : 'B', bx, by + 0.5, { boyut: cr * 1.05, renk: '#082030' });
    }
    if (o.kopya && h.lvl < 3 && (h.lvl === 1 || o.kopya >= 2)) {
      Kit.metin(c, o.kopya + '/3', x + s * 0.14, y + s * 0.62, { boyut: Math.max(11, s * 0.1), renk: o.kopya >= 2 ? '#ffd166' : '#bbb', kontur: '#000', konturKalin: 3 });
    }
    // savaş göstergeleri
    if (o.can != null) {
      const bw = s - 16;
      const oran = o.can / o.maxCan;
      Kit.bar(c, x + 8, y + s - 14, bw, 9, oran, oran > 0.5 ? '#4ade80' : oran > 0.25 ? '#facc15' : '#f87171', { iz: o.iz, kenar: 'rgba(0,0,0,0.8)' });
      if (o.kalkan > 0.5) Kit.bar(c, x + 8, y + s - 20, bw * Math.min(1, o.kalkan / o.maxCan), 5, 1, '#9fd8ff', { arka: 'rgba(0,0,0,0)' });
    }
    if (o.sersem > 0) {
      for (let i = 0; i < 3; i++) {
        const a = Kit.zaman * 5 + i * 2.1;
        Kit.metin(c, '✦', cx + Math.cos(a) * r * 0.8, y + s * 0.08 + Math.sin(a) * 5, { boyut: s * 0.12, renk: '#ffe066', kontur: '#000', konturKalin: 2 });
      }
    }
    if (o.bekliyor) Kit.metin(c, 'önü boşalınca girer', cx, y - 9, { boyut: 12, renk: '#aab', kalin: false });
    c.restore();
  }

  // Basma anının konumu: hızlı sürüklemede (bas-çek-bırak tek karede) başlangıç kaybolmasın
  const basma = { x: 0, y: 0 };
  window.addEventListener('pointerdown', e => {
    const t = document.querySelector('canvas'); if (!t) return;
    const r = t.getBoundingClientRect();
    basma.x = (e.clientX - r.left) / r.width * Kit.W; basma.y = (e.clientY - r.top) / r.height * Kit.H;
  }, true);

  // ---------- oyun durumu ----------
  let kosu = null, havuz = null, kayitlar = [];
  let zorluk = Kit.kayitOku('f2_zorluk', 'normal');
  const oto = { kosu: 0, sonuclar: [], hata: 0, gecmisKarsilasma: 0, basla: 0 };
  if (OTO) {
    window.addEventListener('error', e => { oto.hata++; console.log('[OTO] HATA ' + e.message + ' @' + e.lineno); });
    try { localStorage.removeItem(KAYIT); localStorage.removeItem(KAYIT + '_no'); } catch (e) { /* yok */ }
    zorluk = P.get('z') || 'normal';
  }

  function kosuBaslat() {
    const tohum = (Math.random() * 1e9) | 0;
    kosu = F2.yeniKosu(tohum, zorluk);
    kosu.kosuNo = F2.kosuNoAl(KAYIT);
    kosu.basZaman = performance.now();
    kosu.hasarId = {};
    havuz = F2.hayaletHavuzu(tohum);
    kayitlar = F2.kayitOku(KAYIT);
    Kit.sahneDegistir(OyunSahnesi);
  }

  // ---------- başlık ----------
  const BaslikSahnesi = {
    gir() { this.kayitSay = F2.kayitOku(KAYIT).length; if (OTO) { oto.basla = performance.now(); setTimeout(kosuBaslat, 50); } },
    guncelle() {
      girdiKilit = false;
      if (Kit.tusBasildi('Enter') || Kit.tusBasildi('Space')) kosuBaslat();
    },
    ciz(c) {
      arkaPlan(c);
      Karakterler.forEach((k, i) => {
        const x = 120 + i * 130, y = 118 + Math.sin(Kit.zaman * 1.4 + i) * 6;
        Kit.portre(c, Kit.gorsel('portre_' + k.id), x, y, 48, { kenar: k.renk, kalin: 3, yedek: k.renk });
      });
      Kit.metin(c, 'ASENKRON SEFER', 640, 222, { boyut: 64, renk: '#ffd77a', kontur: '#000', konturKalin: 8 });
      Kit.metin(c, 'Dükkândan topla, birleştir, diz — kayıtlı rakip takımlara karşı otomatik savaş', 640, 268, { boyut: 20, renk: '#cfc8b8', kalin: false });
      Kit.panel(c, 250, 296, 780, 214, { renk: 'rgba(20,18,30,0.88)' });
      const satirlar = [
        '• Her tur 10 altın. Dükkândan kahraman (3) ve eşya (1–3) al; yenile 1 altın.',
        '• Kahramanları 2×2 alana sürükle. Ön sütun önce vurulur; yakın dövüşçüler önde ister.',
        '• Aynı kahramandan 3 tane = BİRLEŞME: seviye 2 ve skill dalı seçimi. 3 tane seviye 2 = seviye 3.',
        '• Savaş kendiliğinden işler. Rakip, başka bir koşunun (ya da senin eski koşunun) aynı turdaki takımı.',
        '• 10 galibiyet = sefer tamam. 5 can; yenilgi −1 (7. turdan sonra −2), berabere can götürmez.',
      ];
      satirlar.forEach((s, i) => Kit.metin(c, s, 272, 322 + i * 30, { boyut: 17, renk: '#e8e2d4', hiza: 'left', kalin: false }));
      Kit.metin(c, 'Fare: sürükle-bırak, tıkla  ·  Boşluk: Savaş/Devam  ·  Y: yenile  ·  Esc/P: duraklat  ·  R: yeniden  ·  M: ses', 640, 486, { boyut: 15, renk: '#a59fb5', kalin: false });
      Kit.metin(c, 'Zorluk (rakip havuzundan kimler gelir):', 640, 538, { boyut: 17, renk: '#cfc8b8' });
      ['kolay', 'normal', 'zor'].forEach((z, i) => {
        const sec = zorluk === z;
        if (dugme(c, 430 + i * 145, 556, 130, 44, { kolay: 'Kolay', normal: 'Normal', zor: 'Zor' }[z], { renk: sec ? '#d9a521' : '#3a3648', yaziRenk: sec ? '#1a1206' : '#ddd', boyut: 19 })) {
          zorluk = z; Kit.kayitYaz('f2_zorluk', z);
        }
      });
      if (dugme(c, 540, 616, 200, 58, 'Başla', { boyut: 28 })) kosuBaslat();
      Kit.metin(c, 'Kayıtlı takımların: ' + this.kayitSay + ' (sonraki koşularda rakip olarak gelir)', 640, 694, { boyut: 14, renk: '#8f89a0', kalin: false });
      if (this.kayitSay && dugme(c, 1120, 676, 140, 30, 'Kayıtları sil', { boyut: 14, renk: '#3a3648', yaziRenk: '#ccc' })) {
        F2.kayitYaz([], KAYIT); this.kayitSay = 0;
      }
    },
  };

  function arkaPlan(c) {
    const g = c.createLinearGradient(0, 0, 0, Kit.H);
    g.addColorStop(0, '#1d1a2b'); g.addColorStop(1, '#0b0a12');
    c.fillStyle = g; c.fillRect(0, 0, Kit.W, Kit.H);
    // ufukta sabit güneş (Dönmeyen Dünya)
    const gg = c.createRadialGradient(640, 520, 20, 640, 520, 520);
    gg.addColorStop(0, 'rgba(255,170,80,0.10)'); gg.addColorStop(1, 'rgba(255,170,80,0)');
    c.fillStyle = gg; c.fillRect(0, 0, Kit.W, Kit.H);
  }

  // ---------- oyun sahnesi (hazırlık + savaş) ----------
  const OyunSahnesi = {
    gir() {
      this.evre = 'hazirlik';
      this.surukle = null; this.esyaSec = -1; this.hover = null;
      this.ucanlar = []; this.gizli = {}; this.pop = {}; this.buyukYazilar = [];
      this.kalpAnim = null; this.duraklat = false; this.rBekle = 0;
      this.ipucu = this.ipucu || { alindi: false, yerlesti: false, savasildi: false, birlesti: false, esya: false };
      this.dalModal = null; this.mermiler = []; this.g = {};
      this.hiz = 1; this.acc = 0;
      Ses.cal('dalga');
      this.buyukYazi('Tur ' + kosu.tur, 'Dükkân açıldı', '#ffd77a');
    },

    buyukYazi(metin, alt, renk, sure) { this.buyukYazilar.push({ metin, alt, renk: renk || '#fff', t: 0, sure: sure || 1.3 }); },

    animVar() { return this.ucanlar.length > 0; },

    guncelle(dt, gdt) {
      for (const y of this.buyukYazilar) y.t += gdt;
      this.buyukYazilar = this.buyukYazilar.filter(y => y.t < y.sure);
      if (this.rBekle > 0) this.rBekle -= gdt;
      if (Kit.tusBasildi('Escape') || Kit.tusBasildi('KeyP')) { this.duraklat = !this.duraklat; Ses.cal('tikla'); }
      if (Kit.tusBasildi('KeyR')) {
        if (this.rBekle > 0) { kosuBaslat(); return; }
        this.rBekle = 2; this.buyukYazi('Yeniden başlat?', 'Onay için R\'ye tekrar bas', '#ffb0b0', 2);
      }
      girdiKilit = this.duraklat || !!this.dalModal;
      if (this.duraklat) return;
      // uçan birleşme jetonları
      for (const u of this.ucanlar) u.t += gdt;
      const varan = this.ucanlar.filter(u => u.t >= u.sure);
      this.ucanlar = this.ucanlar.filter(u => u.t < u.sure);
      for (const u of varan) if (u.son) this.birlesmeVardi(u.b);

      if (this.evre === 'hazirlik') this.hazirlikGuncelle(gdt);
      else this.savasGuncelle(dt, gdt);
    },

    // ================= HAZIRLIK =================
    hazirlikGuncelle(gdt) {
      const f = Kit.fare;
      if (this.dalModal) { this.dalModalGuncelle(); return; }
      if (this.dalModalAc()) return;
      if (OTO) {
        if (!this.animVar()) { F2.botAlisveris(kosu, OTO_ZEKA, kosu.rnd); this.savasBaslat(); }
        return;
      }
      // hover
      this.hover = this.nesneAt(f.x, f.y);
      // kilit simgeleri
      for (let i = 0; i < A.teklifSayisi; i++) {
        const p = kartXY(i);
        if (kosu.dukkan[i] && Kit.tikAl(p.x + KART_W - 30, p.y + 4, 26, 26)) { F2.dondur(kosu, i); Ses.cal(kosu.donuk[i] ? 'kalkan' : 'tikla'); }
      }
      // basma: sürükleme adayı
      if (Kit.tikVarMi() && !this.surukle) {
        const n = this.nesneAt(basma.x, basma.y);
        if (this.esyaSec >= 0) {
          if (n && n.tur === 'sahip') this.esyaTak(this.esyaSec, F2.konumdaki(kosu, n.kon).kuid);
          else if (!(n && n.tur === 'teklif')) { this.esyaSec = -1; }
          if (n && n.tur === 'sahip') { Kit.tikTuket(); return; }
        }
        if (n && (n.tur === 'sahip' || n.tur === 'teklif')) {
          Kit.tikTuket();
          const p = n.tur === 'sahip' ? konXY(n.kon) : kartXY(n.i);
          this.surukle = Object.assign({}, n, { basX: basma.x, basY: basma.y, ox: basma.x - p.x, oy: basma.y - p.y, aktif: false });
        }
      }
      if (this.surukle) {
        const s = this.surukle;
        if (!s.aktif && Kit.mesafe(s.basX, s.basY, f.x, f.y) > 7) s.aktif = true;
        if (f.birakildi || !f.basili) {
          if (s.aktif) this.birak(s, f.x, f.y);
          else this.tikla(s);
          this.surukle = null;
        }
      }
      if (Kit.tusBasildi('KeyY')) this.yenile();
      if (Kit.tusBasildi('Space') && kosu.alan.some(Boolean)) this.savasBaslat();
    },

    // Fare altındaki nesne
    nesneAt(x, y) {
      for (let i = 0; i < 4; i++) { const p = alanXY(i); if (x >= p.x && x <= p.x + S && y >= p.y && y <= p.y + S) return kosu.alan[i] ? { tur: 'sahip', kon: { yer: 'alan', i } } : { tur: 'bos', kon: { yer: 'alan', i } }; }
      for (let i = 0; i < A.yedek; i++) { const p = yedekXY(i); if (x >= p.x && x <= p.x + YS && y >= p.y && y <= p.y + YS) return kosu.yedek[i] ? { tur: 'sahip', kon: { yer: 'yedek', i } } : { tur: 'bos', kon: { yer: 'yedek', i } }; }
      for (let i = 0; i < A.teklifSayisi; i++) { const p = kartXY(i); if (kosu.dukkan[i] && x >= p.x && x <= p.x + KART_W && y >= p.y && y <= p.y + KART_H) return { tur: 'teklif', i }; }
      return null;
    },

    tikla(s) {
      if (s.tur === 'teklif') {
        const t = kosu.dukkan[s.i];
        if (t.tur === 'kahraman') this.kahramanAl(s.i, null);
        else {
          if (kosu.altin < F2.ESYA[t.id].fiyat) { this.uyar('Altın yetmiyor'); return; }
          this.esyaSec = this.esyaSec === s.i ? -1 : s.i;
          Ses.cal('tikla');
        }
      }
    },

    birak(s, x, y) {
      const n = this.nesneAt(x, y);
      const dukkanUstu = x >= DK.x && x <= DK.x + DK.w && y >= DK.y && y <= DK.y + DK.h;
      if (s.tur === 'sahip') {
        if (dukkanUstu) {
          const h = F2.konumdaki(kosu, s.kon);
          const p = konXY(s.kon);
          const para = F2.sat(kosu, s.kon);
          Ses.cal('para');
          Kit.yaziUcur(x, y - 20, '+' + para + ' altın', { renk: '#ffd166', boyut: 24 });
          Kit.parcacik(x, y, { sayi: 14, renk: ['#f5c542', '#fff1a8'], hiz: 220 });
          kosu.dalBekleyen = kosu.dalBekleyen.filter(k => k !== h.kuid);
          void p;
          return;
        }
        if (n && (n.tur === 'sahip' || n.tur === 'bos')) {
          if (n.kon.yer !== s.kon.yer || n.kon.i !== s.kon.i) {
            F2.tasi(kosu, s.kon, n.kon);
            Ses.cal('hareket');
            const p = konXY(n.kon), b = konBoy(n.kon);
            Kit.halka(p.x + b / 2, p.y + b / 2, { renk: '#ffffff', r0: b * 0.3, r1: b * 0.6, omur: 0.25, kalin: 3 });
            if (n.kon.yer === 'alan') this.ipucu.yerlesti = true;
          }
        }
        return;
      }
      if (s.tur === 'teklif') {
        const t = kosu.dukkan[s.i];
        if (t.tur === 'kahraman') {
          if (n && (n.tur === 'bos' || n.tur === 'sahip')) this.kahramanAl(s.i, n.tur === 'bos' ? n.kon : null);
        } else if (n && n.tur === 'sahip') {
          this.esyaTak(s.i, F2.konumdaki(kosu, n.kon).kuid);
        }
      }
    },

    uyar(m) { Ses.cal('uyari'); Kit.yaziUcur(Kit.fare.x, Kit.fare.y - 24, m, { renk: '#ff9a9a', boyut: 20 }); },

    kahramanAl(i, hedef) {
      const kp = kartXY(i);
      const r = F2.kahramanAl(kosu, i, hedef);
      if (!r.ok) { this.uyar(r.neden === 'altin' ? 'Altın yetmiyor' : r.neden === 'yer' ? 'Yer yok (sat ya da alana koy)' : '—'); return; }
      Ses.cal('satin');
      this.ipucu.alindi = true;
      if (hedef && hedef.yer === 'alan') this.ipucu.yerlesti = true;
      const kon = F2.konumBul(kosu, r.kahraman.kuid);
      if (kon) {
        const p = konXY(kon), b = konBoy(kon);
        Kit.parcacik(p.x + b / 2, p.y + b / 2, { sayi: 12, renk: ['#ffd166', '#fff'], hiz: 180 });
        this.pop[r.kahraman.kuid] = { s: 1.25 };
        Kit.tween(this.pop[r.kahraman.kuid], { s: 1 }, 0.25, Kit.ease.geri);
      }
      if (r.birlesmeler.length) this.birlesmeAnim(r.birlesmeler, kp);
    },

    esyaTak(i, kuid) {
      const r = F2.esyaAl(kosu, i, kuid);
      this.esyaSec = -1;
      if (!r.ok) { this.uyar(r.neden === 'altin' ? 'Altın yetmiyor' : r.neden === 'dolu' ? 'En çok 2 eşya' : '—'); return; }
      Ses.cal('kalkan');
      this.ipucu.esya = true;
      const kon = F2.konumBul(kosu, kuid), p = konXY(kon), b = konBoy(kon);
      Kit.halka(p.x + b / 2, p.y + b / 2, { renk: r.esya.renk, r0: 10, r1: b * 0.7, omur: 0.4, kalin: 5 });
      Kit.yaziUcur(p.x + b / 2, p.y, r.esya.ad, { renk: '#fff', boyut: 18 });
    },

    yenile() {
      if (!F2.yenile(kosu)) { this.uyar('Altın yetmiyor'); return; }
      Ses.cal('hareket');
      for (let i = 0; i < A.teklifSayisi; i++) if (!kosu.donuk[i]) { const p = kartXY(i); Kit.parcacik(p.x + KART_W / 2, p.y + KART_H / 2, { sayi: 6, renk: '#8fa0ff', hiz: 120, omur: 0.3 }); }
    },

    // Birleşme: üç kopya hedefe uçar, varınca büyük patlama
    birlesmeAnim(liste, kaynakKart) {
      liste.forEach((b, sira) => {
        const hedefP = konXY(b.kon), hb = konBoy(b.kon);
        this.gizli[b.kahraman.kuid] = true;
        const gecikme = sira * 0.55;
        b.kaynaklar.forEach((kon, j) => {
          const p = kon ? konXY(kon) : kaynakKart;
          const bb = kon ? konBoy(kon) : YS;
          this.ucanlar.push({
            b, id: b.kahraman.id, lvl: b.kahraman.lvl - 1,
            x0: p.x + bb / 2, y0: p.y + bb / 2, x1: hedefP.x + hb / 2, y1: hedefP.y + hb / 2,
            t: -gecikme - j * 0.06, sure: 0.42, son: j === b.kaynaklar.length - 1,
          });
        });
      });
    },
    birlesmeVardi(b) {
      const p = konXY(b.kon), s = konBoy(b.kon);
      const cx = p.x + s / 2, cy = p.y + s / 2;
      delete this.gizli[b.kahraman.kuid];
      this.pop[b.kahraman.kuid] = { s: 1.9 };
      Kit.tween(this.pop[b.kahraman.kuid], { s: 1 }, 0.5, Kit.ease.geri);
      const renk = LVL_RENK[b.kahraman.lvl];
      Kit.halka(cx, cy, { renk, r0: 20, r1: 170, omur: 0.5, kalin: 8 });
      Kit.halka(cx, cy, { renk: '#ffffff', r0: 10, r1: 110, omur: 0.35, kalin: 4 });
      Kit.parcacik(cx, cy, { sayi: 60, renk: [renk, '#ffffff', KarakterBul(b.kahraman.id).renk], hiz: 520, omur: 0.9, boyut: 6 });
      Kit.flas(renk, 0.25); Kit.salla(10, 0.3); Kit.durakla(0.08);
      Ses.cal('birlesme'); setTimeout(() => Ses.cal('seviye'), 180);
      const d = F2.KAHRAMAN[b.kahraman.id];
      if (b.kahraman.lvl === 3) this.buyukYazi('SEVİYE 3!', KarakterBul(d.id).ad + ' · yeni pasif: ' + d.pasif.ad, '#ffcc33', 2.2);
      else this.buyukYazi('BİRLEŞME!', KarakterBul(d.id).ad + ' seviye 2 · can ve saldırı ×1,9', '#5ec8ff', 1.8);
      if (b.geriEsya && b.geriEsya.length) Kit.yaziUcur(cx, cy - 60, 'Fazla eşya kayboldu: ' + b.geriEsya.map(e => F2.ESYA[e].ad).join(', '), { renk: '#ffb0b0', boyut: 15, omur: 2 });
      this.ipucu.birlesti = true;
    },

    dalModalAc() {
      if (this.animVar()) return false;
      while (kosu.dalBekleyen.length) {
        const kuid = kosu.dalBekleyen[0];
        const kon = F2.konumBul(kosu, kuid);
        if (!kon) { kosu.dalBekleyen.shift(); continue; }
        this.dalModal = { kuid, kon };
        Ses.cal('yukselis');
        return true;
      }
      return false;
    },
    dalModalGuncelle() {
      const m = this.dalModal;
      for (let d = 0; d < 2; d++) {
        const x = 300 + d * 350, y = 290;
        if (Kit.tikAl(x, y, 330, 190)) {
          F2.dalSec(kosu, m.kuid, d);
          Ses.cal('seviye');
          const kon = F2.konumBul(kosu, m.kuid);
          if (kon) { const p = konXY(kon), s = konBoy(kon); Kit.halka(p.x + s / 2, p.y + s / 2, { renk: '#5ec8ff', r0: 10, r1: 120, omur: 0.45, kalin: 6 }); }
          this.dalModal = null;
          return;
        }
      }
      if (Kit.tikVarMi()) Kit.tikTuket();
    },

    // ================= SAVAŞ =================
    savasBaslat() {
      if (!kosu.alan.some(Boolean)) return;
      this.ipucu.savasildi = true;
      this.surukle = null; this.esyaSec = -1;
      if (this.hiz === 'atla') this.hiz = 1;
      F2.takimKaydet(kosu, KAYIT);
      this.rakip = F2.rakipSec(kosu, havuz, kayitlar);
      if (this.rakip.kaynak === 'oyuncu') { kosu.karsilasilanGecmis++; oto.gecmisKarsilasma++; }
      this.sim = new F2.Savas(F2.takimAnlik(kosu), this.rakip.takim, (Math.random() * 1e9) | 0);
      this.g = {};
      for (const u of this.sim.birimler) {
        const p = hucreXY(u.takim, u.kol, u.sira);
        this.g[u.uid] = { x: p.x + (u.takim === 1 ? 420 : 0), y: p.y, lunge: 0, ldx: 0, ldy: 0, flas: 0, iz: 1, olumT: 0 };
        if (u.takim === 1) Kit.tween(this.g[u.uid], { x: p.x }, 0.5 + u.kol * 0.1, Kit.ease.cikKub);
      }
      this.mermiler = [];
      this.evre = 'tanitim';
      this.tanitimT = OTO ? 1.0 : 2.0;
      this.acc = 0;
      this.sonucT = 0;
      Ses.cal('uyari');
    },

    savasGuncelle(dt, gdt) {
      if (this.evre === 'tanitim') {
        this.tanitimT -= gdt * (OTO ? 4 : 1);
        if (this.tanitimT <= 0 || (!OTO && Kit.tikVarMi() && Kit.fare.y < DK.y)) {
          this.evre = 'savas';
          Ses.cal('dalga');
          this.buyukYazi('SAVAŞ!', null, '#ffe6a0', 0.9);
        }
        return;
      }
      if (this.evre === 'savas') {
        if (OTO && OTO_HIZLI) this.hiz = 'atla';
        else if (OTO) this.hiz = 8;
        if (this.hiz === 'atla') {
          this.sim.sonaKadar();
          this.sim.olaylar.length = 0;
        } else {
          this.acc += dt * this.hiz;
          let guv = 0;
          while (this.acc >= F2.ADIM && !this.sim.bitti && guv++ < 40) { this.acc -= F2.ADIM; this.sim.adim(F2.ADIM); }
          this.olaylariIsle();
        }
        this.gorselGuncelle(dt);
        if (this.sim.bitti) this.savasBitti();
        return;
      }
      if (this.evre === 'sonuc') {
        this.gorselGuncelle(dt);
        this.sonucT += gdt;
        if (this.kalpAnim) this.kalpAnim.t += gdt;
        const hazir = this.sonucT > 0.8;
        if ((OTO && this.sonucT > 0.25) || (hazir && (Kit.tusBasildi('Space') || Kit.tusBasildi('Enter')))) this.devam();
      }
    },

    gorselGuncelle(dt) {
      for (const id in this.g) {
        const g = this.g[id];
        g.lunge = Math.max(0, g.lunge - dt * 6);
        g.flas = Math.max(0, g.flas - dt);
        const u = this.sim.uid(+id);
        const oran = u ? Math.max(0, u.can / u.maxCan) : 0;
        g.iz = g.iz > oran ? Math.max(oran, g.iz - dt * 0.6) : oran;
        if (u && u.olu) g.olumT += dt;
      }
      for (const m of this.mermiler) m.t += dt;
      this.mermiler = this.mermiler.filter(m => m.t < m.sure);
    },

    merkez(u) { const g = this.g[u.uid]; return { x: g.x + S / 2, y: g.y + S * 0.42 }; },

    olaylariIsle() {
      const sim = this.sim;
      for (const o of sim.olaylar) {
        const k = o.kaynak != null ? sim.uid(o.kaynak) : null;
        const h = o.hedef != null && typeof o.hedef === 'number' ? sim.uid(o.hedef) : null;
        if (o.tip === 'vurus' && k && h) {
          const a = this.merkez(k), b = this.merkez(h);
          if (o.menzil === 'uzak') this.mermiler.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0, sure: 0.16, renk: KarakterBul(k.id).renk });
          else { const g = this.g[k.uid]; const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; g.ldx = (b.x - a.x) / d; g.ldy = (b.y - a.y) / d; g.lunge = 1; }
        } else if (o.tip === 'hasar' && h) {
          const p = this.merkez(h);
          this.g[h.uid].flas = 0.12;
          let renk = '#ffffff', boyut = 22, metin = String(o.miktar);
          if (o.tur === 'skill') { renk = '#ffb347'; boyut = 30; }
          if (o.kritik) { renk = '#ffe14d'; boyut = Math.max(boyut, 32); metin += '!'; }
          if (o.tur === 'yanma') { renk = '#ff7a3a'; boyut = 16; }
          if (o.tur === 'kanama') { renk = '#ff4a6a'; boyut = 16; }
          if (o.tur === 'firtina') { renk = '#d8b26a'; boyut = 18; }
          if (o.tur === 'diken') { renk = '#9fd38a'; boyut = 16; }
          if (o.emilen >= o.miktar && o.miktar > 0) renk = '#9fd8ff';
          if (o.miktar > 0) Kit.yaziUcur(p.x, p.y - 30, metin, { renk, boyut });
          if (o.tur === 'duz') Ses.cal(o.kritik ? 'kritik' : 'vurus');
          if (o.tur === 'skill' && o.miktar >= 30) { Ses.cal('agirVurus'); Kit.salla(Math.min(14, 4 + o.miktar / 10), 0.2); Kit.durakla(0.05); }
          else if (o.kritik && o.miktar >= 25) { Kit.salla(5, 0.12); Kit.durakla(0.03); }
          if (o.tur === 'skill' || o.kritik) Kit.parcacik(p.x, p.y, { sayi: 10, renk: [renk, '#fff'], hiz: 260, omur: 0.4 });
        } else if (o.tip === 'iyiles' && h) {
          const p = this.merkez(h);
          Kit.yaziUcur(p.x, p.y - 30, '+' + o.miktar, { renk: '#6dff9a', boyut: 22 });
          Kit.parcacik(p.x, p.y + 20, { sayi: 10, renk: ['#6dff9a', '#d0ffd8'], hiz: 90, yercekimi: -160, omur: 0.6 });
          Ses.cal('iyiles');
        } else if (o.tip === 'kalkan' && h) {
          const p = this.merkez(h);
          Kit.yaziUcur(p.x, p.y - 30, '+' + o.miktar + ' kalkan', { renk: '#9fd8ff', boyut: 18 });
          Kit.halka(p.x, p.y, { renk: '#9fd8ff', r0: 20, r1: 70, omur: 0.4, kalin: 5 });
          Ses.cal('kalkan');
        } else if (o.tip === 'sersem' && h) {
          const p = this.merkez(h);
          Kit.yaziUcur(p.x, p.y - 50, 'Sersem', { renk: '#ffe066', boyut: 18 });
        } else if (o.tip === 'kesildi' && k) {
          const p = this.merkez(k);
          Kit.yaziUcur(p.x, p.y - 56, 'KESİLDİ!', { renk: '#ff5050', boyut: 30, omur: 1.2 });
          Kit.halka(p.x, p.y, { renk: '#ff5050', r0: 60, r1: 10, omur: 0.3, kalin: 6 });
          Ses.cal('kesme'); Kit.salla(6, 0.15);
        } else if (o.tip === 'telBasla' && k) {
          const p = this.merkez(k);
          Kit.yaziUcur(p.x, p.y - 70, o.ad + '!', { renk: '#ffb060', boyut: 20, omur: Math.max(0.9, o.sure), vy: -20 });
          Ses.cal('uyari');
        } else if (o.tip === 'skill' && k) {
          const p = this.merkez(k);
          if (!o.hucreler && o.hedef == null) Kit.yaziUcur(p.x, p.y - 70, o.ad, { renk: '#ffe6a0', boyut: 18, vy: -30 });
          Kit.halka(p.x, p.y, { renk: KarakterBul(k.id).renk, r0: 30, r1: 90, omur: 0.35, kalin: 5 });
          if (o.hucreler) this.hucrePatlat(o.takim, o.hucreler, KarakterBul(k.id).renk, false);
          if (o.hedef != null) { const t = sim.uid(o.hedef); if (t && !t.olu) { const q = this.merkez(t); this.mermiler.push({ x0: p.x, y0: p.y, x1: q.x, y1: q.y, t: 0, sure: 0.12, renk: '#ffe6a0', kalin: 7 }); Kit.halka(q.x, q.y, { renk: '#ff5040', r0: 70, r1: 10, omur: 0.25, kalin: 6 }); } }
          const ses = { kor_ustasi: 'ates', avci: 'patlama', oncu: 'buyu', akinci: 'agirVurus', nisanci: 'ok', duellocu: 'kesme', infazci: 'kritik' }[k.id];
          if (ses) Ses.cal(ses);
        } else if (o.tip === 'patlama') {
          this.hucrePatlat(o.takim, o.hucreler, o.renk, o.kucuk);
          Ses.cal(o.kucuk ? 'ok' : 'patlama');
        } else if (o.tip === 'olum' && h) {
          const p = this.merkez(h);
          Kit.parcacik(p.x, p.y, { sayi: 40, renk: [KarakterBul(h.id).renk, '#ffffff', '#555'], hiz: 380, omur: 0.8, boyut: 6, sekil: 'kare' });
          Kit.halka(p.x, p.y, { renk: '#ffffff', r0: 20, r1: 100, omur: 0.35, kalin: 5 });
          Ses.cal('olum'); Kit.salla(6, 0.18);
          if (h.takim === 1) Kit.yaziUcur(p.x, p.y - 60, 'DÜŞTÜ', { renk: '#ffd0d0', boyut: 18 });
        } else if (o.tip === 'diril' && h) {
          const p = this.merkez(h);
          this.g[h.uid].olumT = 0;
          Kit.yaziUcur(p.x, p.y - 50, 'Geri döndü!', { renk: '#ffd77a', boyut: 22 });
          Kit.parcacik(p.x, p.y, { sayi: 24, renk: ['#ffd77a', '#fff'], hiz: 200, yercekimi: -120 });
          Ses.cal('yukselis');
        } else if (o.tip === 'yazi' && h) {
          const p = this.merkez(h);
          Kit.yaziUcur(p.x, p.y - 56, o.metin, { renk: o.renk || '#fff', boyut: o.buyuk ? 30 : 18 });
        } else if (o.tip === 'ilerle' && k) {
          const p = hucreXY(k.takim, k.kol, k.sira);
          Kit.tween(this.g[k.uid], { x: p.x, y: p.y }, 0.3, Kit.ease.cikKub);
          Ses.cal('hareket');
        } else if (o.tip === 'firtina') {
          this.buyukYazi('KUM FIRTINASI!', 'Uzayan savaşta herkes giderek artan hasar alır', '#e0b24a', 1.6);
          Ses.cal('dalga');
        }
      }
      sim.olaylar.length = 0;
    },

    hucrePatlat(takim, hucreler, renk, kucuk) {
      for (const [kol, s] of hucreler) {
        const p = hucreXY(takim, kol, s);
        const cx = p.x + S / 2, cy = p.y + S / 2;
        Kit.parcacik(cx, cy, { sayi: kucuk ? 10 : 28, renk: [renk, '#fff', '#ffcc66'], hiz: kucuk ? 200 : 360, omur: 0.6, boyut: 5 });
        Kit.halka(cx, cy, { renk, r0: 10, r1: kucuk ? 60 : 95, omur: 0.35, kalin: kucuk ? 3 : 6 });
      }
      if (!kucuk) Kit.salla(8, 0.2);
    },

    savasBitti() {
      const sim = this.sim;
      this.evre = 'sonuc';
      this.sonucT = 0;
      // istatistik
      this.enCok = null;
      for (const u of sim.birimler) {
        if (u.takim !== 0) continue;
        kosu.hasarId[u.id] = (kosu.hasarId[u.id] || 0) + u.toplamHasar;
        if (!this.enCok || u.toplamHasar > this.enCok.toplamHasar) this.enCok = u;
      }
      const onceCan = kosu.can;
      this.sonuc = sim.kazanan;
      const kayip = F2.turBitir(kosu, sim.kazanan, this.rakip);
      if (kayip) this.kalpAnim = { once: onceCan, kayip, t: 0 }; else this.kalpAnim = null;
      if (sim.kazanan === 0) { this.buyukYazi('ZAFER!', this.rakip.kaynak === 'oyuncu' ? 'Geçmiş takımını yendin!' : this.rakip.ad + ' yenildi', '#ffd77a', 99); Ses.cal('zafer'); Kit.parcacik(640, 200, { sayi: 60, renk: ['#ffd77a', '#fff', '#ffb347'], hiz: 500, yercekimi: 400, omur: 1.2 }); }
      else if (sim.kazanan === 1) { this.buyukYazi('YENİLGİ', '−' + kayip + ' can', '#ff6a6a', 99); Ses.cal('yenilgi'); Kit.salla(8, 0.3); }
      else { this.buyukYazi('BERABERE', 'Can gitmedi', '#cfd3da', 99); Ses.cal('uyari'); }
    },

    devam() {
      this.buyukYazilar = [];
      if (kosu.bitti) { Kit.sahneDegistir(BitisSahnesi); return; }
      this.evre = 'hazirlik';
      this.sim = null; this.kalpAnim = null;
      Ses.cal('dalga');
      this.buyukYazi('Tur ' + kosu.tur, F2.kademe(kosu.tur) !== F2.kademe(kosu.tur - 1) ? 'Dükkân kademesi ' + F2.kademe(kosu.tur) + ' açıldı: daha güçlü kahraman ve eşyalar' : 'Dükkân yenilendi', '#ffd77a', 1.6);
    },

    // ================= ÇİZİM =================
    ciz(c) {
      arkaPlan(c);
      const savas = this.evre !== 'hazirlik';
      // zemin: iki taraf
      this.alanZemin(c, 0);
      if (savas) this.alanZemin(c, 1);
      if (!savas) this.hazirlikCiz(c);
      else this.savasCiz(c);
      this.ustSerit(c);
    },

    alanZemin(c, takim) {
      const X = takim === 0 ? OY_X : RK_X;
      const sol = Math.min(X[0], X[1]) - 14, sag = Math.max(X[0], X[1]) + S + 14;
      Kit.panel(c, sol, SIRA_Y[0] - 26, sag - sol, S * 2 + 16 + 40, { renk: 'rgba(255,255,255,0.03)', kenar: 'rgba(255,255,255,0.06)' });
      for (let kol = 0; kol < 2; kol++) for (let s = 0; s < 2; s++) {
        const p = hucreXY(takim, kol, s);
        Kit.yd(c, p.x, p.y, S, S, 14);
        c.fillStyle = kol === 0 ? 'rgba(255,190,120,0.06)' : 'rgba(150,170,255,0.05)'; c.fill();
        c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
      }
      Kit.metin(c, 'ÖN', X[0] + S / 2, SIRA_Y[0] - 13, { boyut: 13, renk: '#d9b98a' });
      Kit.metin(c, 'ARKA', X[1] + S / 2, SIRA_Y[0] - 13, { boyut: 13, renk: '#a9b4e8' });
    },

    hazirlikCiz(c) {
      const sur = this.surukle && this.surukle.aktif ? this.surukle : null;
      // alan ve yedek jetonları
      for (let i = 0; i < 4; i++) {
        const h = kosu.alan[i]; const p = alanXY(i);
        if (sur && sur.tur !== 'sahip' && !h) this.hedefVurgu(c, p.x, p.y, S);
        if (sur && sur.tur === 'sahip' && !(sur.kon.yer === 'alan' && sur.kon.i === i)) this.hedefVurgu(c, p.x, p.y, S, true);
        if (!h || this.gizli[h.kuid] || (sur && sur.tur === 'sahip' && sur.kon.yer === 'alan' && sur.kon.i === i)) continue;
        this.sahipCiz(c, h, p.x, p.y, S);
      }
      Kit.metin(c, 'YEDEK (savaşmaz)', YEDEK_X + 140, YEDEK_Y - 11, { boyut: 12, renk: '#8f89a0' });
      for (let i = 0; i < A.yedek; i++) {
        const p = yedekXY(i), h = kosu.yedek[i];
        Kit.yd(c, p.x, p.y, YS, YS, 12); c.fillStyle = 'rgba(255,255,255,0.04)'; c.fill();
        c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
        if (sur && !h && sur.tur !== 'sahip') this.hedefVurgu(c, p.x, p.y, YS);
        if (!h || this.gizli[h.kuid] || (sur && sur.tur === 'sahip' && sur.kon.yer === 'yedek' && sur.kon.i === i)) continue;
        this.sahipCiz(c, h, p.x, p.y, YS);
      }
      this.bilgiPanel(c);
      this.etiketPanel(c, F2.takimAnlik(kosu), 976, 70, this.hover);
      this.dukkanCiz(c);
    },

    sahipCiz(c, h, x, y, s) {
      const pop = this.pop[h.kuid] ? this.pop[h.kuid].s : 1;
      const esyaHedef = (this.esyaSec >= 0 || (this.surukle && this.surukle.aktif && this.surukle.tur === 'teklif' && kosu.dukkan[this.surukle.i] && kosu.dukkan[this.surukle.i].tur === 'esya')) && h.esyalar.length < A.esyaMaks;
      tokenCiz(c, h, x, y, s, { olcek: pop, kopya: F2.kopyaSay(kosu, h.id, h.lvl), kenar: esyaHedef ? '#7dffb0' : null });
    },

    hedefVurgu(c, x, y, s, soluk) {
      Kit.yd(c, x + 3, y + 3, s - 6, s - 6, 12);
      c.strokeStyle = soluk ? 'rgba(255,255,255,0.25)' : 'rgba(255,215,120,' + (0.5 + 0.3 * Math.sin(Kit.zaman * 8)) + ')';
      c.lineWidth = 3; c.stroke();
    },

    bilgiPanel(c) {
      const x = 480, y = 70, w = 486, h = 392;
      Kit.panel(c, x, y, w, h, { renk: 'rgba(16,15,26,0.9)' });
      const n = this.surukle && this.surukle.aktif ? this.surukle : this.hover;
      let kahraman = null, esya = null, teklif = false;
      if (n && n.tur === 'sahip') kahraman = F2.konumdaki(kosu, n.kon);
      else if (n && n.tur === 'teklif') { const t = kosu.dukkan[n.i]; if (t && t.tur === 'kahraman') { kahraman = { id: t.id, lvl: 1, dal: null, esyalar: [] }; teklif = true; } else if (t) esya = F2.ESYA[t.id]; }
      if (kahraman) return this.kahramanBilgi(c, kahraman, x, y, w, teklif);
      if (esya) {
        c.fillStyle = esya.renk; Kit.yd(c, x + 20, y + 20, 64, 64, 10); c.fill();
        Kit.metin(c, esya.kisa, x + 52, y + 52, { boyut: 26, kontur: '#000' });
        Kit.metin(c, esya.ad, x + 100, y + 38, { boyut: 26, hiza: 'left', renk: '#ffe6a0' });
        Kit.metin(c, 'Eşya · ' + esya.fiyat + ' altın · katman ' + esya.katman, x + 100, y + 68, { boyut: 15, hiza: 'left', renk: '#aaa', kalin: false });
        Kit.metinKutu(c, esya.acik, x + 22, y + 104, w - 44, { boyut: 19, renk: '#eee' });
        Kit.metinKutu(c, 'Bir kahramanın üstüne sürükle (ya da tıkla, sonra kahramana tıkla). Kahraman başına en çok 2 eşya. Birleşmede eşyalar yeni kahramana geçer.', x + 22, y + 170, w - 44, { boyut: 15, renk: '#9a96a8' });
        return;
      }
      // varsayılan: dizilim rehberi
      Kit.metin(c, 'Dizilim nasıl işler', x + 20, y + 26, { boyut: 20, hiza: 'left', renk: '#ffe6a0' });
      const satirlar = [
        'Düz vuruşlar önce ÖN sütuna gider (aynı sıra öncelikli).',
        'Yakın dövüşçü ARKADAysa, önündeki dost düşene kadar vuramaz.',
        'Kuzgun arka sütunu hedefler. Barut Fıçısı ARKA sütunu,',
        'Ay Işığı ÖN sütunu vurur. Alev Topu ve Süvari Hücumu bir',
        'SIRAYI (üst ya da alt: ön+arka) vurur: aynı sırada iki kırılgan',
        'kahraman risklidir. Telegraf (kırmızı kare) iner, dizilim karşılar.',
      ];
      satirlar.forEach((s, i) => Kit.metin(c, s, x + 20, y + 62 + i * 26, { boyut: 15, hiza: 'left', renk: '#d8d2c4', kalin: false }));
      Kit.metin(c, 'Sıradaki rakip', x + 20, y + 232, { boyut: 18, hiza: 'left', renk: '#ffe6a0' });
      const eskiSay = kayitlar.filter(t => t.tur === kosu.tur && t.kosuNo !== kosu.kosuNo).length;
      Kit.metinKutu(c, 'Tur ' + kosu.tur + ' havuzundan bir takım: başka koşuların bu turdaki takımları' + (eskiSay ? ' ve senin geçmiş koşularından ' + eskiSay + ' takım (büyük olasılıkla biri gelir).' : '. Bu turdaki takımın da kaydedilecek; sonraki koşularda rakip olarak gelebilir.'), x + 20, y + 252, w - 40, { boyut: 15, renk: '#d8d2c4' });
      Kit.metin(c, 'Bir kahramanın ya da teklifin üstüne gel: ayrıntılar burada.', x + 20, y + h - 22, { boyut: 13, hiza: 'left', renk: '#8f89a0', kalin: false });
    },

    kahramanBilgi(c, h, x, y, w, teklif) {
      const d = F2.KAHRAMAN[h.id], kr = KarakterBul(h.id), kat = F2.SEVIYE_KAT[h.lvl];
      Kit.portre(c, Kit.gorsel('portre_' + h.id), x + 62, y + 62, 44, { kenar: LVL_RENK[h.lvl], kalin: 4, yedek: kr.renk });
      Kit.metin(c, kr.ad, x + 120, y + 34, { boyut: 26, hiza: 'left', renk: '#ffe6a0' });
      Kit.metin(c, 'Seviye ' + h.lvl + ' ' + '★'.repeat(h.lvl) + (teklif ? '  ·  3 altın' : ''), x + 120, y + 62, { boyut: 16, hiza: 'left', renk: LVL_RENK[h.lvl] });
      const rol = F2.ROLLER[d.rol], kok = F2.KOKENLER[d.koken];
      cip(c, x + 128, y + 90, 9, ROL_HARF[d.rol], rol.renk);
      Kit.metin(c, rol.ad, x + 142, y + 90, { boyut: 15, hiza: 'left', renk: rol.renk });
      cip(c, x + 220, y + 90, 9, KOKEN_HARF[d.koken], kok.renk);
      Kit.metin(c, kok.ad, x + 234, y + 90, { boyut: 15, hiza: 'left', renk: kok.renk });
      Kit.metin(c, 'Can ' + Math.round(d.can * kat) + '   Vuruş ' + Math.round(d.atk * kat) + ' / ' + d.hiz + ' sn   ' + MENZIL_AD[d.menzil], x + 20, y + 128, { boyut: 16, hiza: 'left', renk: '#eee' });
      let yy = y + 152;
      const tel = d.skill.tel ? ' · ' + d.skill.tel + ' sn telegraf' : ' · anlık';
      Kit.metin(c, 'Skill: ' + d.skill.ad + '  (her ' + d.cd + ' sn' + tel + ')', x + 20, yy, { boyut: 17, hiza: 'left', renk: '#ffb060' });
      yy += 14;
      yy += Kit.metinKutu(c, d.skill.acik + (h.lvl > 1 ? ' (sayılar ×' + kat + ')' : ''), x + 20, yy, w - 40, { boyut: 15, renk: '#ddd' }) + 6;
      if (h.dal != null) {
        Kit.metin(c, 'Dal ' + (h.dal === 0 ? 'A' : 'B') + ': ' + d.dallar[h.dal].ad, x + 20, yy + 8, { boyut: 16, hiza: 'left', renk: '#5ec8ff' });
        yy += 18;
        yy += Kit.metinKutu(c, d.dallar[h.dal].acik, x + 20, yy, w - 40, { boyut: 15, renk: '#cfe9ff' }) + 6;
      } else {
        Kit.metin(c, 'Seviye 2\'de dal seçimi:', x + 20, yy + 8, { boyut: 15, hiza: 'left', renk: '#7aa9c8' });
        yy += 18;
        d.dallar.forEach((dl, i) => { yy += Kit.metinKutu(c, (i ? 'B' : 'A') + ' · ' + dl.ad + ': ' + dl.acik, x + 20, yy, w - 40, { boyut: 14, renk: '#9fbcd0' }); });
        yy += 6;
      }
      Kit.metin(c, (h.lvl >= 3 ? 'Pasif: ' : 'Seviye 3 pasifi: ') + d.pasif.ad, x + 20, yy + 8, { boyut: 15, hiza: 'left', renk: h.lvl >= 3 ? '#ffcc33' : '#a08a50' });
      yy += 18;
      yy += Kit.metinKutu(c, d.pasif.acik, x + 20, yy, w - 40, { boyut: 14, renk: h.lvl >= 3 ? '#ffe6a0' : '#8f8060' }) + 4;
      for (const e of h.esyalar) { const es = F2.ESYA[e]; Kit.metin(c, '◆ ' + es.ad + ': ' + es.acik, x + 20, yy + 8, { boyut: 14, hiza: 'left', renk: '#cde', kalin: false }); yy += 20; }
      if (teklif) {
        const c1 = F2.kopyaSay(kosu, h.id, 1);
        if (c1) Kit.metin(c, 'Sende ' + c1 + ' tane var' + (c1 >= 2 ? ' → bunu alırsan BİRLEŞİR!' : ''), x + 20, y + 392 - 22, { boyut: 16, hiza: 'left', renk: '#ffd166' });
      }
    },

    etiketPanel(c, takim, x, y, hover) {
      const w = 290, h = 392;
      Kit.panel(c, x, y, w, h, { renk: 'rgba(16,15,26,0.9)' });
      Kit.metin(c, 'Etiket bonusları (alandakiler)', x + w / 2, y + 18, { boyut: 14, renk: '#ffe6a0' });
      const say = F2.etiketSay(takim);
      const kd = F2.etiketKademe(say);
      let vurgu = null;
      if (hover && hover.tur === 'sahip') { const hh = F2.konumdaki(kosu, hover.kon); if (hh) vurgu = F2.KAHRAMAN[hh.id]; }
      if (hover && hover.tur === 'teklif') { const t = kosu.dukkan[hover.i]; if (t && t.tur === 'kahraman') vurgu = F2.KAHRAMAN[t.id]; }
      let yy = y + 40;
      const satir = (anahtar, tanim, harf) => {
        const n = say[anahtar] || 0, aktif = kd[anahtar] || 0;
        const isik = vurgu && (vurgu.rol === anahtar || vurgu.koken === anahtar);
        if (isik) { Kit.yd(c, x + 6, yy - 6, w - 12, 46, 6); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill(); }
        cip(c, x + 18, yy + 6, 9, harf, aktif ? tanim.renk : '#555');
        const esikMetin = tanim.esik.map(e => (n >= e ? '●' : '○')).join('');
        Kit.metin(c, tanim.ad + '  ' + n + '/' + tanim.esik[tanim.esik.length - 1], x + 34, yy + 6, { boyut: 15, hiza: 'left', renk: aktif ? tanim.renk : '#9a96a8' });
        Kit.metin(c, esikMetin, x + w - 14, yy + 6, { boyut: 14, hiza: 'right', renk: aktif ? tanim.renk : '#666' });
        const ac = tanim.acik[Math.max(0, aktif - 1)];
        Kit.metin(c, (aktif ? '✓ ' : tanim.esik[0] + ' tane: ') + ac, x + 34, yy + 26, { boyut: 12, hiza: 'left', renk: aktif ? '#e8e2d4' : '#8a86a0', kalin: false });
        yy += 48;
      };
      for (const r in F2.ROLLER) satir(r, F2.ROLLER[r], ROL_HARF[r]);
      for (const k in F2.KOKENLER) satir(k, F2.KOKENLER[k], KOKEN_HARF[k]);
    },

    dukkanCiz(c) {
      const sur = this.surukle && this.surukle.aktif ? this.surukle : null;
      Kit.panel(c, DK.x, DK.y, DK.w, DK.h, { renk: 'rgba(22,19,32,0.95)', kenar: 'rgba(255,215,120,0.25)' });
      // sol: altın, yenile
      altinIkon(c, 52, DK.y + 40, 18);
      Kit.metin(c, String(kosu.altin), 80, DK.y + 41, { boyut: 34, hiza: 'left', renk: '#ffd77a', kontur: '#000' });
      Kit.metin(c, 'altın (birikmez)', 34, DK.y + 72, { boyut: 13, hiza: 'left', renk: '#9a96a8', kalin: false });
      if (dugme(c, 34, DK.y + 90, 180, 44, 'Yenile · 1', { pasif: kosu.altin < A.yenile, boyut: 19 })) this.yenile();
      const kd = F2.kademe(kosu.tur);
      Kit.metin(c, 'Dükkân kademesi ' + '●'.repeat(kd) + '○'.repeat(3 - kd), 34, DK.y + 156, { boyut: 14, hiza: 'left', renk: '#c8b890' });
      Kit.metin(c, kd < 3 ? (kd === 1 ? '3. turda' : '6. turda') + ' yükselir' : 'en yüksek', 34, DK.y + 174, { boyut: 12, hiza: 'left', renk: '#8f89a0', kalin: false });
      // kartlar
      for (let i = 0; i < A.teklifSayisi; i++) {
        const t = kosu.dukkan[i], p = kartXY(i);
        if (!t) {
          Kit.yd(c, p.x, p.y, KART_W, KART_H, 12); c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.stroke();
          Kit.metin(c, 'satın alındı', p.x + KART_W / 2, p.y + KART_H / 2, { boyut: 13, renk: '#555', kalin: false });
          continue;
        }
        if (sur && sur.tur === 'teklif' && sur.i === i) { Kit.yd(c, p.x, p.y, KART_W, KART_H, 12); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.stroke(); continue; }
        this.kartCiz(c, t, p.x, p.y, i);
      }
      if (this.esyaSec >= 0) Kit.metin(c, 'Eşyayı takacağın kahramana tıkla (iptal: boş yere tıkla)', 640, DK.y - 12, { boyut: 15, renk: '#7dffb0' });
      // savaş düğmesi
      const hazir = kosu.alan.some(Boolean);
      if (dugme(c, SAVAS_BTN.x, SAVAS_BTN.y, SAVAS_BTN.w, SAVAS_BTN.h, hazir ? 'SAVAŞ!' : 'Alana koy', { pasif: !hazir, boyut: hazir ? 32 : 20, renk: '#e0652b', ustRenk: '#ff8a4a', yaziRenk: '#fff' })) this.savasBaslat();
      Kit.metin(c, 'Boşluk', SAVAS_BTN.x + SAVAS_BTN.w / 2, SAVAS_BTN.y + SAVAS_BTN.h + 14, { boyut: 12, renk: '#8f89a0', kalin: false });
      // satma bölgesi
      if (sur && sur.tur === 'sahip') {
        const h = F2.konumdaki(kosu, sur.kon);
        const ust = Kit.icinde(DK.x, DK.y, DK.w, DK.h);
        Kit.panel(c, DK.x, DK.y, DK.w, DK.h, { renk: ust ? 'rgba(120,30,30,0.85)' : 'rgba(60,20,20,0.7)', kenar: '#ff8080' });
        Kit.metin(c, 'Buraya bırak: SAT  (+' + (h.lvl === 1 ? 1 : h.lvl === 2 ? 3 : 6) + ' altın)', 640, DK.y + DK.h / 2, { boyut: 30, renk: '#ffd0d0', kontur: '#000' });
      }
    },

    kartCiz(c, t, x, y, i) {
      const ust = Kit.icinde(x, y, KART_W, KART_H) && !girdiKilit;
      const donuk = kosu.donuk[i];
      Kit.yd(c, x, y - (ust ? 3 : 0), KART_W, KART_H, 12);
      c.fillStyle = ust ? '#2b2740' : '#221f33'; c.fill();
      c.lineWidth = donuk ? 4 : 2; c.strokeStyle = donuk ? '#9fe8ff' : (this.esyaSec === i ? '#7dffb0' : 'rgba(255,255,255,0.18)'); c.stroke();
      const yy = y - (ust ? 3 : 0);
      if (t.tur === 'kahraman') {
        const d = F2.KAHRAMAN[t.id], kr = KarakterBul(t.id);
        Kit.portre(c, Kit.gorsel('portre_' + t.id), x + KART_W / 2, yy + 52, 40, { kenar: kr.renk, kalin: 3, yedek: kr.renk });
        Kit.metin(c, kr.ad, x + KART_W / 2, yy + 106, { boyut: 15, renk: '#fff' });
        cip(c, x + 20, yy + 20, 9, ROL_HARF[d.rol], F2.ROLLER[d.rol].renk);
        cip(c, x + 20, yy + 42, 9, KOKEN_HARF[d.koken], F2.KOKENLER[d.koken].renk);
        Kit.metin(c, F2.ROLLER[d.rol].ad + ' · ' + F2.KOKENLER[d.koken].ad, x + KART_W / 2, yy + 125, { boyut: 12, renk: '#aaa', kalin: false });
        altinIkon(c, x + KART_W / 2 - 12, yy + 146, 8);
        Kit.metin(c, '3', x + KART_W / 2 + 4, yy + 147, { boyut: 16, hiza: 'left', renk: kosu.altin >= 3 ? '#ffd77a' : '#ff7070' });
        const c1 = F2.kopyaSay(kosu, t.id, 1);
        if (c1 >= 2) {
          const pl = 0.6 + 0.4 * Math.sin(Kit.zaman * 6);
          Kit.yd(c, x - 3, yy - 3, KART_W + 6, KART_H + 6, 14); c.strokeStyle = 'rgba(255,209,102,' + pl + ')'; c.lineWidth = 4; c.stroke();
          Kit.panel(c, x + 20, yy - 12, KART_W - 40, 22, { r: 8, renk: '#ffd166', kenar: '#000' });
          Kit.metin(c, 'BİRLEŞİR!', x + KART_W / 2, yy - 1, { boyut: 14, renk: '#2a1a00' });
        } else if (c1 === 1) {
          Kit.panel(c, x + 36, yy - 10, KART_W - 72, 20, { r: 8, renk: '#3a3550', kenar: '#ffd166' });
          Kit.metin(c, 'sende 1/3', x + KART_W / 2, yy, { boyut: 12, renk: '#ffd166' });
        }
      } else {
        const e = F2.ESYA[t.id];
        c.fillStyle = e.renk; Kit.yd(c, x + KART_W / 2 - 28, yy + 16, 56, 56, 10); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 2; c.stroke();
        Kit.metin(c, e.kisa, x + KART_W / 2, yy + 44, { boyut: 22, renk: '#fff', kontur: '#000' });
        Kit.metin(c, e.ad, x + KART_W / 2, yy + 88, { boyut: 15, renk: '#fff' });
        Kit.metinKutu(c, e.acik, x + 10, yy + 100, KART_W - 20, { boyut: 11, renk: '#bbb', satir: 13 });
        altinIkon(c, x + KART_W / 2 - 12, yy + 146, 8);
        Kit.metin(c, String(e.fiyat), x + KART_W / 2 + 4, yy + 147, { boyut: 16, hiza: 'left', renk: kosu.altin >= e.fiyat ? '#ffd77a' : '#ff7070' });
        Kit.metin(c, 'EŞYA', x + 26, yy + 14, { boyut: 11, renk: '#7dffb0' });
      }
      kilitIkon(c, x + KART_W - 17, yy + 20, 20, donuk);
    },

    savasCiz(c) {
      const sim = this.sim;
      // telegraf kareleri (jetonların altında)
      for (const u of sim.birimler) {
        if (u.olu || !u.tel) continue;
        const p = 1 - u.tel.kalan / u.tel.toplam;
        const nabiz = 0.5 + 0.5 * Math.sin(Kit.zaman * 14);
        if (u.tel.hucreler) {
          for (const [kol, s] of u.tel.hucreler) {
            const q = hucreXY(1 - u.takim, kol, s);
            Kit.yd(c, q.x - 4, q.y - 4, S + 8, S + 8, 16);
            c.fillStyle = 'rgba(255,60,30,' + (0.16 + 0.12 * nabiz) + ')'; c.fill();
            c.lineWidth = 4; c.strokeStyle = '#ff5a2a'; c.stroke();
            // dolan şerit
            c.fillStyle = 'rgba(255,120,40,0.35)';
            c.fillRect(q.x, q.y + S - S * p, S, S * p);
          }
        }
      }
      // jetonlar
      for (const u of sim.birimler) {
        const g = this.g[u.uid];
        let alpha = 1;
        if (u.olu) alpha = Math.max(0.12, 1 - g.olumT * 2);
        const lx = g.ldx * 22 * Math.sin(g.lunge * Math.PI), ly = g.ldy * 22 * Math.sin(g.lunge * Math.PI);
        const h = { id: u.id, lvl: u.lvl, dal: u.dal, esyalar: u.esyalar };
        tokenCiz(c, h, g.x + lx, g.y + ly, S, {
          alpha, can: Math.max(0, u.can), maxCan: u.maxCan, kalkan: u.kalkan, iz: g.iz, flas: g.flas,
          dolum: u.olu ? null : (u.tel ? 1 : u.dolum), tel: u.olu ? null : u.tel, sersem: u.olu ? 0 : u.sersem,
          bekliyor: !u.olu && u.d.menzil === 'yakin' && u.kol === 1,
        });
      }
      // telegraf üst katmanı: geri sayım ve kahramana kilitli nişangâh
      for (const u of sim.birimler) {
        if (u.olu || !u.tel) continue;
        const kp = this.merkez(u);
        if (u.tel.hucreler) {
          const ilk = u.tel.hucreler[0]; const q = hucreXY(1 - u.takim, ilk[0], ilk[1]);
          for (const [kol, s] of u.tel.hucreler) {
            const r = hucreXY(1 - u.takim, kol, s);
            Kit.metin(c, u.tel.kalan.toFixed(1), r.x + S / 2, r.y + S / 2, { boyut: 34, renk: '#ffe0c0', kontur: '#5a1000', konturKalin: 6 });
          }
          Kit.metin(c, u.tel.ad, q.x + S / 2, q.y - 2, { boyut: 14, renk: '#ffb060', kontur: '#000' });
        }
        if (u.tel.hedefUid != null) {
          const t = sim.uid(u.tel.hedefUid);
          if (t && !t.olu) {
            const tp = this.merkez(t);
            c.setLineDash([10, 8]); c.lineDashOffset = -Kit.zaman * 60;
            c.strokeStyle = 'rgba(255,80,50,0.8)'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(kp.x, kp.y); c.lineTo(tp.x, tp.y); c.stroke();
            c.setLineDash([]); c.lineDashOffset = 0;
            const r = 54 + 6 * Math.sin(Kit.zaman * 10);
            c.strokeStyle = '#ff4a3a'; c.lineWidth = 4;
            c.beginPath(); c.arc(tp.x, tp.y, r, 0, Math.PI * 2); c.stroke();
            c.save(); c.translate(tp.x, tp.y); c.rotate(Kit.zaman * 2);
            for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(r - 12, 0); c.lineTo(r + 12, 0); c.stroke(); }
            c.restore();
            Kit.metin(c, u.tel.kalan.toFixed(1), tp.x, tp.y + 4, { boyut: 30, renk: '#ffe0c0', kontur: '#5a1000', konturKalin: 6 });
          }
        }
      }
      // mermiler
      for (const m of this.mermiler) {
        const p = Math.min(1, m.t / m.sure);
        const x = Kit.lerp(m.x0, m.x1, p), y = Kit.lerp(m.y0, m.y1, p);
        c.strokeStyle = m.renk; c.lineWidth = m.kalin || 4;
        c.beginPath(); c.moveTo(Kit.lerp(m.x0, m.x1, Math.max(0, p - 0.25)), Kit.lerp(m.y0, m.y1, Math.max(0, p - 0.25))); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      }
      // rakip başlığı
      const r = this.rakip;
      const oyuncudan = r.kaynak === 'oyuncu';
      Kit.metin(c, (oyuncudan ? '★ ' : '') + r.ad, RK_X[0] + 141, 448, { boyut: 20, renk: oyuncudan ? '#ffd166' : '#e8e2d4', kontur: '#000' });
      Kit.metin(c, r.tur + '. tur takımı' + (oyuncudan ? ' (geçmiş koşundan)' : ''), RK_X[0] + 141, 472, { boyut: 14, renk: '#aaa', kalin: false });
      Kit.metin(c, 'Senin takımın', OY_X[1] + 141, 448, { boyut: 20, renk: '#e8e2d4', kontur: '#000' });
      Kit.metin(c, 'VS', 640, 236, { boyut: 40, renk: 'rgba(255,255,255,0.12)' });
      this.etiketSerit(c, sim.kademeler[0], OY_X[1] - 14, 410);
      this.etiketSerit(c, sim.kademeler[1], RK_X[0] - 14, 410);
      // tanıtım bandı
      if (this.evre === 'tanitim') {
        const a = Math.min(1, (2 - this.tanitimT) * 4);
        c.globalAlpha = a;
        Kit.panel(c, 340, 200, 600, 150, { renk: 'rgba(10,8,16,0.92)', kenar: oyuncudan ? '#ffd166' : '#ff8a4a', kalin: 3 });
        Kit.metin(c, 'RAKİP', 640, 228, { boyut: 16, renk: '#aaa' });
        Kit.metin(c, r.ad, 640, 266, { boyut: 34, renk: oyuncudan ? '#ffd166' : '#ffe6a0', kontur: '#000' });
        Kit.metin(c, oyuncudan ? 'Geçmiş koşundan: ' + r.tur + '. tur takımın!' : r.tur + '. tur takımı · kayıtlı koşu', 640, 304, { boyut: 18, renk: '#ddd' });
        Kit.metin(c, 'tıkla: hemen başlat', 640, 334, { boyut: 12, renk: '#888', kalin: false });
        c.globalAlpha = 1;
      }
      // alt şerit: hız düğmeleri
      Kit.panel(c, DK.x, DK.y + 40, DK.w, DK.h - 40, { renk: 'rgba(22,19,32,0.95)' });
      Kit.metin(c, 'Savaş ' + sim.zaman.toFixed(1) + ' sn', 120, DK.y + 90, { boyut: 22, renk: '#e8e2d4' });
      const kalan = A.firtinaBaslangic - sim.zaman;
      Kit.metin(c, kalan > 0 ? 'Kum fırtınasına ' + Math.ceil(kalan) + ' sn' : 'KUM FIRTINASI', 120, DK.y + 120, { boyut: 14, renk: kalan > 0 ? '#9a96a8' : '#e0b24a', kalin: false });
      if (this.evre === 'savas' || this.evre === 'tanitim') {
        [['1×', 1], ['2×', 2], ['Atla', 'atla']].forEach(([et, v], i) => {
          if (dugme(c, 480 + i * 110, DK.y + 80, 96, 48, et, { renk: this.hiz === v ? '#d9a521' : '#3a3648', yaziRenk: this.hiz === v ? '#1a1206' : '#ddd', boyut: 20 })) this.hiz = v;
        });
        Kit.metin(c, 'Savaşta oyuncu girdisi yok; dizilim ve kadro konuşur.', 1000, DK.y + 104, { boyut: 14, renk: '#8f89a0', kalin: false });
      }
      if (this.evre === 'sonuc') {
        if (this.enCok) Kit.metin(c, 'En çok hasar: ' + KarakterBul(this.enCok.id).ad + ' (' + Math.round(this.enCok.toplamHasar) + ')', 640, DK.y + 82, { boyut: 18, renk: '#ffe6a0' });
        if (this.sonucT > 0.8 && dugme(c, 540, DK.y + 102, 200, 54, kosu.bitti ? 'Sonuçlar' : 'Devam', { boyut: 24 })) this.devam();
        Kit.metin(c, 'Boşluk', 640, DK.y + 172, { boyut: 12, renk: '#8f89a0', kalin: false });
      }
    },

    etiketSerit(c, kd, x, y) {
      const adlar = [];
      for (const k in kd) {
        const t = F2.ROLLER[k] || F2.KOKENLER[k];
        adlar.push({ ad: t.ad + (t.esik.length > 1 ? ' ' + t.esik[kd[k] - 1] : ''), renk: t.renk });
      }
      if (!adlar.length) { Kit.metin(c, 'etiket bonusu yok', x, y, { boyut: 12, renk: '#666', hiza: 'left', kalin: false }); return; }
      let xx = x;
      for (const a of adlar) {
        c.font = '700 13px ' + Kit.FONT;
        const w = c.measureText(a.ad).width + 16;
        Kit.panel(c, xx, y - 10, w, 20, { r: 8, renk: 'rgba(0,0,0,0.5)', kenar: a.renk });
        Kit.metin(c, a.ad, xx + w / 2, y, { boyut: 13, renk: a.renk });
        xx += w + 6;
      }
    },

    ustSerit(c) {
      c.fillStyle = 'rgba(8,7,14,0.85)'; c.fillRect(0, 0, Kit.W, 54);
      Kit.metin(c, 'TUR ' + kosu.tur, 24, 27, { boyut: 26, hiza: 'left', renk: '#ffe6a0' });
      // canlar
      const ka = this.kalpAnim;
      for (let i = 0; i < A.can; i++) {
        let renk = i < kosu.can ? '#ff4d6d' : '#3a2a32', dx = 0, dy = 0, a = 1;
        if (ka && i >= kosu.can && i < ka.once) {
          const t = ka.t;
          if (t < 0.6) { renk = '#ff4d6d'; dx = Math.sin(t * 60) * 4; }
          else if (t < 1.4) { renk = '#ff4d6d'; dy = (t - 0.6) * 60; a = Math.max(0, 1 - (t - 0.6) / 0.8); }
        }
        c.globalAlpha = a;
        kalp(c, 170 + i * 30 + dx, 14 + dy, 24, renk);
        c.globalAlpha = 1;
      }
      // galibiyet
      Kit.metin(c, 'Galibiyet', 352, 27, { boyut: 15, hiza: 'left', renk: '#c8b890' });
      for (let i = 0; i < A.hedefGalibiyet; i++) {
        c.fillStyle = i < kosu.galibiyet ? '#ffd166' : 'rgba(255,255,255,0.12)';
        c.beginPath(); c.arc(440 + i * 20, 27, 7, 0, Math.PI * 2); c.fill();
      }
      Kit.metin(c, kosu.galibiyet + '/' + A.hedefGalibiyet, 640, 27, { boyut: 18, hiza: 'left', renk: '#ffd166' });
      if (kosu.seri >= 2) Kit.metin(c, 'Seri ' + kosu.seri + '!', 700, 27, { boyut: 16, hiza: 'left', renk: '#ff9a4a' });
      altinIkon(c, 790, 27, 11);
      Kit.metin(c, String(kosu.altin), 808, 28, { boyut: 22, hiza: 'left', renk: '#ffd77a' });
      Kit.metin(c, { kolay: 'Kolay', normal: 'Normal', zor: 'Zor' }[kosu.zorluk], 862, 27, { boyut: 13, hiza: 'left', renk: '#8f89a0', kalin: false });
      Kit.metin(c, 'Esc duraklat · R yeniden · M ses', Kit.W - 16, 27, { boyut: 13, hiza: 'right', renk: '#77738a', kalin: false });
    },

    ustCiz(c) {
      // sürüklenen
      const s = this.surukle;
      if (s && s.aktif) {
        const f = Kit.fare;
        if (s.tur === 'sahip') { const h = F2.konumdaki(kosu, s.kon); if (h) tokenCiz(c, h, f.x - S / 2, f.y - S / 2, S, { alpha: 0.9 }); }
        else { const t = kosu.dukkan[s.i]; if (t) { c.globalAlpha = 0.9; this.kartCiz(c, t, f.x - s.ox, f.y - s.oy, s.i); c.globalAlpha = 1; } }
      }
      // uçan birleşme jetonları
      for (const u of this.ucanlar) {
        if (u.t < 0) continue;
        const p = Kit.ease.gir(Math.min(1, u.t / u.sure));
        const x = Kit.lerp(u.x0, u.x1, p), y = Kit.lerp(u.y0, u.y1, p) - Math.sin(p * Math.PI) * 60;
        tokenCiz(c, { id: u.id, lvl: u.lvl, dal: null, esyalar: [] }, x - YS / 2, y - YS / 2, YS, { alpha: 1 });
        Kit.parcacik(x, y, { sayi: 1, renk: LVL_RENK[u.lvl + 1], hiz: 40, omur: 0.3 });
      }
      // ipuçları
      if (this.evre === 'hazirlik' && !OTO) this.ipucuCiz(c);
      // büyük yazılar
      for (const y of this.buyukYazilar) {
        const t = y.t, gir = Math.min(1, t / 0.18);
        const a = y.sure > 50 ? 1 : Math.min(1, (y.sure - t) / 0.3);
        const sc = 0.6 + 0.4 * Kit.ease.geri(gir);
        c.save(); c.globalAlpha = Math.max(0, a);
        c.translate(640, 190); c.scale(sc, sc);
        Kit.metin(c, y.metin, 0, 0, { boyut: 64, renk: y.renk, kontur: '#000', konturKalin: 9 });
        if (y.alt) Kit.metin(c, y.alt, 0, 52, { boyut: 22, renk: '#f0ece0', kontur: '#000', konturKalin: 5 });
        c.restore();
      }
      if (this.dalModal) this.dalModalCiz(c);
      if (this.duraklat) {
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, Kit.W, Kit.H);
        Kit.metin(c, 'DURAKLATILDI', 640, 250, { boyut: 56, kontur: '#000' });
        if (dugme(c, 540, 310, 200, 52, 'Devam', { ust: true })) this.duraklat = false;
        if (dugme(c, 540, 374, 200, 52, 'Yeniden başlat', { ust: true, boyut: 20 })) kosuBaslat();
        if (dugme(c, 540, 438, 200, 52, 'Başlığa dön', { ust: true, boyut: 20 })) Kit.sahneDegistir(BaslikSahnesi);
      }
    },

    ipucuCiz(c) {
      const ip = this.ipucu;
      let m = null;
      const esyaVar = kosu.dukkan.some(t => t && t.tur === 'esya');
      if (!ip.alindi) m = 'Dükkândan bir kahramanı yukarıdaki 2×2 alana sürükle (ya da tıkla: yedeğe gider).';
      else if (!ip.yerlesti && !kosu.alan.some(Boolean)) m = 'Yedekteki kahramanı 2×2 alana sürükle: yalnız alandakiler savaşır.';
      else if (!ip.savasildi) m = 'Ön sütun önce vurulur: dayanıklıyı öne koy. Hazırsan SAVAŞ\'a bas.';
      else if (!ip.birlesti && kosu.tur >= 2) m = 'Aynı kahramandan 3 tane = BİRLEŞME! "BİRLEŞİR!" yazan kartı kaçırma.';
      else if (!ip.esya && esyaVar && kosu.tur >= 2) m = 'Eşyayı bir kahramanın üstüne sürükle. Kilit simgesi teklifi sonraki tura saklar.';
      if (!m) return;
      const w = 770;
      Kit.panel(c, 860 - w / 2, 472, w, 34, { r: 10, renk: 'rgba(40,34,10,0.92)', kenar: '#ffd166' });
      Kit.metin(c, 'İpucu: ' + m, 860, 489, { boyut: 15, renk: '#ffe6a0' });
    },

    dalModalCiz(c) {
      const m = this.dalModal;
      const h = F2.konumdaki(kosu, m.kon) || {};
      if (!h.id) return;
      const d = F2.KAHRAMAN[h.id];
      c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(0, 0, Kit.W, Kit.H);
      Kit.panel(c, 270, 150, 740, 360, { renk: 'rgba(16,15,28,0.97)', kenar: '#5ec8ff', kalin: 3 });
      Kit.portre(c, Kit.gorsel('portre_' + h.id), 340, 220, 46, { kenar: '#5ec8ff', kalin: 4 });
      Kit.metin(c, 'SEVİYE 2 · ' + KarakterBul(h.id).ad, 400, 204, { boyut: 30, hiza: 'left', renk: '#5ec8ff', kontur: '#000' });
      Kit.metin(c, d.skill.ad + ' için bir dal seç (koşu boyunca kalır)', 400, 240, { boyut: 17, hiza: 'left', renk: '#ddd', kalin: false });
      for (let i = 0; i < 2; i++) {
        const x = 300 + i * 350, y = 290;
        const ust = Kit.icinde(x, y, 330, 190);
        Kit.panel(c, x, y - (ust ? 4 : 0), 330, 190, { renk: ust ? '#20314a' : '#1a2233', kenar: ust ? '#9fe0ff' : '#3c6a8a', kalin: ust ? 4 : 2 });
        Kit.metin(c, (i ? 'B' : 'A') + ' · ' + d.dallar[i].ad, x + 165, y + 34 - (ust ? 4 : 0), { boyut: 24, renk: '#cfefff' });
        Kit.metinKutu(c, d.dallar[i].acik, x + 20, y + 66 - (ust ? 4 : 0), 290, { boyut: 18, renk: '#e8f4ff', hiza: 'left' });
      }
    },
  };

  // ---------- bitiş ----------
  const BitisSahnesi = {
    gir() {
      const k = kosu;
      const sure = (performance.now() - k.basZaman) / 1000;
      this.sure = sure;
      let en = null;
      for (const h of F2.tumKahramanlar(k)) {
        const p = h.lvl * 1e6 + (k.hasarId[h.id] || 0);
        if (!en || p > en.p) en = { h, p };
      }
      this.en = en;
      this.toplam = Object.values(k.hasarId).reduce((a, b) => a + b, 0);
      Ses.cal(k.kazandi ? 'zafer' : 'yenilgi');
      if (k.kazandi) Kit.parcacik(640, 150, { sayi: 120, renk: ['#ffd77a', '#fff', '#ffb347', '#5ec8ff'], hiz: 600, yercekimi: 300, omur: 1.6 });
      if (OTO) {
        oto.kosu++;
        oto.sonuclar.push({ kazandi: k.kazandi, galibiyet: k.galibiyet, tur: k.tur, sure: Math.round(sure) });
        console.log('[OTO] koşu ' + oto.kosu + '/' + OTO_N + ': ' + (k.kazandi ? 'KAZANDI' : 'bitti') + ' · ' + k.galibiyet + 'G ' + k.maglubiyet + 'M ' + k.berabere + 'B · ' + k.tur + ' tur · geçmiş takımla karşılaşma ' + k.karsilasilanGecmis + ' · ' + sure.toFixed(1) + ' sn');
        if (oto.kosu < OTO_N) setTimeout(kosuBaslat, 30);
        else {
          const n = oto.sonuclar.length, kaz = oto.sonuclar.filter(s => s.kazandi).length;
          const ortTur = oto.sonuclar.reduce((a, s) => a + s.tur, 0) / n, ortG = oto.sonuclar.reduce((a, s) => a + s.galibiyet, 0) / n;
          console.log('[OTO] ÖZET: ' + n + ' koşu · kazanma oranı %' + Math.round(kaz / n * 100) + ' · ort. galibiyet ' + ortG.toFixed(1) + ' · ort. tur ' + ortTur.toFixed(1) + ' · geçmiş takımla karşılaşma ' + oto.gecmisKarsilasma + ' · hata ' + oto.hata + ' · toplam ' + ((performance.now() - oto.basla) / 1000).toFixed(1) + ' sn');
          window.__OTO_BITTI = true;
        }
      }
    },
    guncelle() {
      girdiKilit = false;
      if (Kit.tusBasildi('Space') || Kit.tusBasildi('Enter') || Kit.tusBasildi('KeyR')) kosuBaslat();
    },
    ciz(c) {
      arkaPlan(c);
      const k = kosu;
      Kit.metin(c, k.kazandi ? 'SEFER TAMAMLANDI!' : 'SEFER BİTTİ', 640, 110, { boyut: 60, renk: k.kazandi ? '#ffd77a' : '#ff8a8a', kontur: '#000', konturKalin: 8 });
      Kit.metin(c, k.kazandi ? '10 galibiyete ulaştın.' : (k.can <= 0 ? 'Canların tükendi.' : 'Tur sınırına gelindi.'), 640, 160, { boyut: 22, renk: '#ddd', kalin: false });
      Kit.panel(c, 330, 196, 620, 364, { renk: 'rgba(16,15,26,0.92)' });
      const dk = Math.floor(this.sure / 60), sn = Math.floor(this.sure % 60);
      const satir = [
        ['Galibiyet', k.galibiyet + ' / ' + A.hedefGalibiyet],
        ['Yenilgi · berabere', k.maglubiyet + ' · ' + k.berabere],
        ['Tur', String(k.tur)],
        ['En uzun galibiyet serisi', String(k.enUzunSeri)],
        ['Toplam hasar', String(Math.round(this.toplam))],
        ['Geçmiş takımlarınla karşılaşma (yendin)', k.karsilasilanGecmis + ' (' + k.yenilenGecmis + ')'],
        ['Süre', dk + ' dk ' + sn + ' sn'],
      ];
      satir.forEach(([a, b], i) => {
        Kit.metin(c, a, 360, 224 + i * 32, { boyut: 18, hiza: 'left', renk: '#bdb6a6', kalin: false });
        Kit.metin(c, b, 920, 224 + i * 32, { boyut: 20, hiza: 'right', renk: '#fff' });
      });
      if (this.en) {
        Kit.metin(c, 'En güçlü kahraman', 360, 506, { boyut: 18, hiza: 'left', renk: '#bdb6a6', kalin: false });
        tokenCiz(c, this.en.h, 840, 462, 84, {});
        Kit.metin(c, Math.round(k.hasarId[this.en.h.id] || 0) + ' hasar', 820, 506, { boyut: 16, hiza: 'right', renk: '#ffe6a0' });
      }
      if (dugme(c, 430, 580, 200, 56, 'Tekrar', { boyut: 26 })) kosuBaslat();
      if (dugme(c, 650, 580, 200, 56, 'Başlığa dön', { boyut: 22, renk: '#3a3648', yaziRenk: '#eee', ustRenk: '#4a4560' })) Kit.sahneDegistir(BaslikSahnesi);
      Kit.metin(c, 'Bu koşudaki takımların kaydedildi; sonraki koşularda rakip olarak karşına çıkabilir.', 640, 662, { boyut: 15, renk: '#8f89a0', kalin: false });
    },
  };

  window.F2Oyun = { BaslikSahnesi, OyunSahnesi, BitisSahnesi, kosu: () => kosu };
  // Otomatik testte (ve ?test=1 ile) kare döngüsü arkadaki/gizli pencerede de dursun diye setTimeout ile sürülür.
  if (OTO || P.get('test') === '1') window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), OTO ? 1 : 16);
  Kit.baslat(BaslikSahnesi);
})();
