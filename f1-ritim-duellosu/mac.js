// F1 maç sahnesi: savaş alanı çizimi, oyuncu girdisi, geri bildirim, raund akışı ve raund arası gelişim ekranı.
(function () {
  const RENK = { oyuncu: '#4cc9f0', bot: '#ff4d6d', ritim: '#ffd166', tel: '#ff5a1f', altin: '#ffd166', yazi: '#ece8df', soluk: '#9a96a8' };
  window.RENK = RENK;
  const KARE_W = 176, KARE_H = 158;
  const NABIZ = { x: 640, y: 306 };
  const UI = {
    ipucu: { x: 340, y: 482, w: 600, h: 34 },
    ritim: { x: 340, y: 524, w: 600, h: 34 },
    secici: i => ({ x: 16 + i * 106, y: 568, w: 100, h: 142 }),
    dugme: i => ({ x: 340 + i * 152, y: 568, w: 144, h: 142 }),
    bilgi: { x: 954, y: 568, w: 310, h: 142 },
  };
  const EYLEMLER = [
    { tur: 'ucuz', tus: 'Q', kod: 'KeyQ' },
    { tur: 'agir', tus: 'W', kod: 'KeyW' },
    { tur: 'savun', tus: 'Boşluk', kod: 'Space' },
    { tur: 'ult', tus: 'E', kod: 'KeyE' },
  ];

  function kareXY(t, s, r) {
    const x = t === 0 ? (s === 0 ? 484 : 296) : (s === 0 ? 796 : 984);
    return { x, y: r === 0 ? 222 : 390 };
  }
  window.kareXY = kareXY;
  const icinde = (p, R) => p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h;
  const sn = b => (b / 2).toString().replace('.', ',');

  class Mac {
    constructor(secim, zorluk) {
      this.secim = secim.slice(); this.zorluk = zorluk;
      const botTakim = Kit.karistir(KAHRAMAN_SIRASI).slice(0, 3);
      this.S = new Savas(this.secim, botTakim);
      this.botlar = [new Bot(this.S, 1, zorluk)];
      if (OYUN.oto) this.botlar.push(new Bot(this.S, 0, OYUN.otoZorluk || 'normal'));
      this.g = new Map();
      for (const k of this.S.hepsi()) { const p = kareXY(k.taraf, k.kare.s, k.kare.r); this.g.set(k, { x: p.x, y: p.y, ox: 0, oy: 0, flas: 0, olcek: 1, iz: 1 }); }
      this.secili = this.S.takimlar[0].kahramanlar[0];
      this.hedefleme = null; this.surukle = null;
      this.mermiler = []; this.afisler = []; this.nabiz = 0; this.acc = 0;
      this.faz = 'geri'; this.fazT = 0; this.duraklat = false; this.rZaman = -9;
      this.uyari = null; this.ritimUyari = 0; this.gercekSure = 0;
      this.ipuclari = [
        { id: 'sec', aktif: true, metin: 'Kahramanına tıkla (ya da 1-2-3), alttan skill seç: Q ucuz, W ağır. Ritim dolunca harca!' },
        { id: 'kac', metin: 'Kırmızı = büyük saldırı! Kareyse boş kareye sürükle; nişangâhsa Boşluk ile savun ya da sahibini kes.' },
        { id: 'kes', metin: 'Rakip hazırlanıyor (turuncu halka)! Sayaç bitmeden vur ya da sersemlet: KESİLİR.' },
        { id: 'muk', metin: 'Sayaç 1’deyken Savun (Boşluk) = MÜKEMMEL: hasar sıfır, Ritim geri.' },
        { id: 'ult', metin: 'Altın halka doldu: E ile ultimate. Bedava ve anında!' },
      ];
      this.S.olayFn = (t, v) => this.olay(t, v);
    }

    gir() {
      window.F1_MAC = this; // konsoldan inceleme için
      Kit.zamanOlcegi = OYUN.oto ? OYUN.otoHiz : OYUN.elHiz;
      if (this.S.raund === 0) this.S.raundBaslat();
    }

    G(k) { return this.g.get(k); }
    ipucu(id, alan) { const i = this.ipuclari.find(x => x.id === id); if (i) i[alan] = true; }
    afis(metin, o) { o = o || {}; this.afisler.push({ metin, alt: o.alt || '', renk: o.renk || '#fff', t: 0, sure: o.sure || 1.1, boyut: o.boyut || 46, y: o.y || 118, bant: o.bant }); }
    yaziUst(k, metin, renk, boyut) { const g = this.G(k); Kit.yaziUcur(g.x, g.y - 70, metin, { renk, boyut: boyut || 30, omur: 1.1, vy: -40 }); }

    // ---------- Savaştan gelen olaylar → görüntü ve ses ----------
    olay(tur, v) {
      const S = this.S;
      switch (tur) {
        case 'vurus': {
          const g = this.G(v.k), gh = this.G(v.h), dx = gh.x - g.x, dy = gh.y - g.y;
          if (v.k.p.vurus.tur === 'uzak') {
            this.mermiler.push({ x0: g.x, y0: g.y, x1: gh.x, y1: gh.y, t: 0, sure: 0.14, renk: v.k.def.renk });
            Ses.cal(v.k.id === 'nisanci' ? 'ok' : 'buyu');
          } else {
            Kit.tween(g, { ox: dx * 0.22, oy: dy * 0.22 }, 0.07, Kit.ease.cik, () => Kit.tween(g, { ox: 0, oy: 0 }, 0.16));
            Ses.cal('vurus');
          }
          break;
        }
        case 'hasar': {
          const g = this.G(v.h);
          g.flas = 1;
          const renk = { vurus: '#ffffff', skill: '#ffb703', ult: RENK.altin, yanma: '#ff8c42', kanama: '#ff4d6d', diken: '#c0c0c0' }[v.tur] || '#fff';
          const boyut = v.tur === 'ult' ? 34 : v.buyuk ? 42 : (v.tur === 'yanma' || v.tur === 'kanama' || v.tur === 'diken') ? 18 : 24;
          if (v.m > 0) Kit.yaziUcur(g.x + (Math.random() - 0.5) * 30, g.y - 30, v.m, { renk, boyut });
          if (v.emilen > 0) Kit.yaziUcur(g.x + 34, g.y - 10, '(' + v.emilen + ')', { renk: '#7fd3ff', boyut: 18 });
          if (v.buyuk) { Kit.salla(12, 0.3); Kit.durakla(0.08); Ses.cal('agirVurus'); Kit.parcacik(g.x, g.y, { sayi: 26, renk: ['#ff5a1f', '#ffd166', '#fff'], hiz: 380 }); }
          else if (v.tur === 'ult') { Kit.salla(5, 0.15); Kit.parcacik(g.x, g.y, { sayi: 10, renk: [RENK.altin, '#fff'], hiz: 260 }); }
          else if (v.tur === 'vurus' || v.tur === 'skill') Kit.parcacik(g.x, g.y, { sayi: 6, renk: ['#fff', renk], hiz: 180, omur: 0.3 });
          break;
        }
        case 'mukemmel': {
          const g = this.G(v.h);
          Kit.yaziUcur(g.x, g.y - 80, 'MÜKEMMEL!', { renk: RENK.altin, boyut: 46, omur: 1.4, vy: -30 });
          Kit.halka(g.x, g.y, { renk: RENK.altin, r0: 40, r1: 130, omur: 0.5, kalin: 8 });
          Kit.parcacik(g.x, g.y, { sayi: 30, renk: [RENK.altin, '#fff'], hiz: 420 });
          Kit.flas(RENK.altin, 0.25); Kit.durakla(0.14); Kit.salla(6, 0.2);
          Ses.cal('kalkan'); Ses.cal('seviye');
          if (v.h.taraf === 0) { this.afis('MÜKEMMEL SAVUNMA', { alt: 'Hasar sıfır · +1 Ritim', renk: RENK.altin }); this.ipucu('muk', 'tamam'); }
          break;
        }
        case 'kesme': {
          const g = this.G(v.h);
          Kit.yaziUcur(g.x, g.y - 80, 'KESİLDİ!', { renk: '#ffffff', boyut: 52, omur: 1.4, vy: -30 });
          Kit.halka(g.x, g.y, { renk: '#fff', r0: 30, r1: 150, omur: 0.45, kalin: 10 });
          Kit.parcacik(g.x, g.y, { sayi: 34, renk: ['#fff', '#ff5a1f', '#ffd166'], hiz: 460, sekil: 'cizgi' });
          Kit.flas('#ffffff', 0.22); Kit.durakla(0.14); Kit.salla(14, 0.32);
          Ses.cal('kesme');
          if (v.h.taraf === 1) { this.afis('KESTİN!', { alt: v.tel.ad + ' boşa gitti', renk: '#7dffb0' }); this.ipucu('kes', 'tamam'); }
          else this.afis('KESİLDİN', { alt: v.tel.ad + ' boşa gitti', renk: RENK.bot, boyut: 36 });
          break;
        }
        case 'telegraf': {
          const k = v.tel.sahip;
          this.yaziUst(k, v.tel.ad + '!', '#ffb36b', 24);
          Ses.cal('uyari');
          if (k.taraf === 1) {
            this.ipucu('kes', 'aktif');
            const hedefOyuncu = v.tel.kilit === 'kare' ? S.karelerdekiler(0, v.tel.kareler).length > 0 : v.tel.hedef && v.tel.hedef.taraf === 0;
            if (hedefOyuncu) { this.ipucu('kac', 'aktif'); if (v.tel.kilit === 'kahraman') this.ipucu('muk', 'aktif'); }
          }
          break;
        }
        case 'patla': {
          const tel = v.tel, t = 1 - tel.sahip.taraf;
          const noktalar = tel.kilit === 'kare' ? tel.kareler.map(q => kareXY(t, q.s, q.r)) : [this.G(tel.hedef)];
          for (const p of noktalar) {
            Kit.parcacik(p.x, p.y, { sayi: 30, renk: ['#ff5a1f', '#ffd166', '#ff2e2e', '#fff'], hiz: 420, omur: 0.7 });
            Kit.halka(p.x, p.y, { renk: '#ff7b39', r0: 20, r1: 110, omur: 0.4, kalin: 8 });
          }
          Kit.salla(12, 0.3); Ses.cal(tel.sahip.id === 'zaman_ustasi' ? 'buyu' : 'patlama');
          break;
        }
        case 'kacis': this.yaziUst(v.h, 'KAÇTI!', '#7dffb0', 34); Ses.cal('yukselis'); if (v.h.taraf === 0) this.afis('KAÇTIN!', { renk: '#7dffb0', boyut: 38, sure: 0.8 }); break;
        case 'bosa': this.yaziUst(v.tel.sahip, 'boşa gitti', RENK.soluk, 20); break;
        case 'telegrafSondu': break;
        case 'ult': {
          const g = this.G(v.k);
          this.afis(v.ad.toUpperCase() + '!', { alt: v.k.def.ad, renk: v.k.def.renk, boyut: 44 });
          Kit.flas(v.k.def.renk, 0.3); Kit.salla(9, 0.3); Kit.durakla(0.1);
          Kit.halka(g.x, g.y, { renk: v.k.def.renk, r0: 50, r1: 220, omur: 0.6, kalin: 10 });
          Kit.parcacik(g.x, g.y, { sayi: 40, renk: [v.k.def.renk, RENK.altin, '#fff'], hiz: 500 });
          Ses.cal('ult');
          if (v.k.taraf === 0) this.ipucu('ult', 'tamam');
          break;
        }
        case 'dalga': Ses.cal('ok'); for (const k of S.takimlar[1 - v.k.taraf].kahramanlar) if (!k.olu) { const g = this.G(k); Kit.parcacik(g.x, g.y - 60, { sayi: 8, renk: ['#bfe3ff', '#fff'], hiz: 300, aci: Math.PI / 2, yayilma: 0.6, sekil: 'cizgi' }); } break;
        case 'skill': {
          this.yaziUst(v.k, v.ad, '#ffe08a', 22);
          Ses.cal(v.ses || 'buyu');
          const g = this.G(v.k);
          if (v.hedef && v.hedef.taraf !== v.k.taraf) { const gh = this.G(v.hedef); this.mermiler.push({ x0: g.x, y0: g.y, x1: gh.x, y1: gh.y, t: 0, sure: 0.12, renk: '#ffd166', kalin: 6 }); }
          break;
        }
        case 'iyiles': if (!v.sessiz) { const g = this.G(v.h); Kit.yaziUcur(g.x, g.y - 30, '+' + v.m, { renk: '#7dffb0', boyut: 26 }); Kit.parcacik(g.x, g.y, { sayi: 12, renk: ['#7dffb0', '#fff'], hiz: 140, yercekimi: -200 }); Ses.cal('iyiles'); } break;
        case 'kalkan': { const g = this.G(v.h); Kit.halka(g.x, g.y, { renk: '#7fd3ff', r0: 70, r1: 52, omur: 0.4, kalin: 6 }); Ses.cal('kalkan'); break; }
        case 'sersem': this.yaziUst(v.h, 'SERSEM', '#ffe14d', 22); break;
        case 'olum': {
          const g = this.G(v.h);
          Kit.parcacik(g.x, g.y, { sayi: 50, renk: [v.h.def.renk, '#fff', '#555'], hiz: 520, omur: 0.9 });
          Kit.halka(g.x, g.y, { renk: v.h.def.renk, r0: 30, r1: 160, omur: 0.6, kalin: 8 });
          Kit.salla(14, 0.35); Kit.durakla(0.12); Ses.cal('olum');
          break;
        }
        case 'hareket': Ses.cal('hareket'); break;
        case 'savun': { const g = this.G(v.k); Kit.halka(g.x, g.y, { renk: '#7fd3ff', r0: 50, r1: 76, omur: 0.3, kalin: 5 }); Ses.cal('kalkan'); break; }
        case 'iptal': this.yaziUst(v.k, v.neden, RENK.soluk, 18); break;
        case 'ritim': if (v.t === 0) Ses.cal('para'); break;
        case 'yazi': this.yaziUst(v.h, v.metin, v.renk, 34); break;
        case 'sonHizli': this.afis('SON 15 SANİYE', { alt: 'Ritim iki kat hızlı doluyor', renk: '#ff9f43', boyut: 38 }); Ses.cal('dalga'); break;
        case 'raundSonu': {
          const k = v.kazanan;
          const metin = k === 0 ? 'RAUNDU KAZANDIN' : k === 1 ? 'RAUNDU KAYBETTİN' : 'BERABERE';
          this.afis(metin, { alt: v.sureDoldu ? 'Süre doldu: kalan can yüzdesi karar verdi' : '', renk: k === 0 ? '#7dffb0' : k === 1 ? RENK.bot : '#fff', boyut: 54, sure: 2.4, y: 306, bant: true });
          Ses.cal(k === 0 ? 'zafer' : 'yenilgi');
          break;
        }
      }
    }

    // ---------- Oyuncu eylemleri ----------
    sec(k) { if (k && k.taraf === 0) { this.secili = k; this.hedefleme = null; } }
    neden(k, tur) {
      const T = this.S.takimlar[0];
      if (!k || k.olu) return 'Kahraman düştü';
      if (k.sersem > 1) return 'Sersem';
      if ((tur === 'ucuz' || tur === 'agir') && k.telegraf) return 'Hazırlanıyor';
      if (tur === 'ult' && k.ult < 100) return 'Halka dolmadı';
      const m = tur === 'savun' || tur === 'hareket' ? 1 : tur === 'ucuz' ? k.p.ucuz.maliyet : tur === 'agir' ? k.p.agir.maliyet : 0;
      if (T.ritim + (k.bekleyen ? k.bekleyen.maliyet : 0) < m) return 'Ritim yetmiyor';
      return null;
    }
    uyar(metin) { this.uyari = { metin, t: 1.1 }; if (metin === 'Ritim yetmiyor') this.ritimUyari = 0.5; Ses.cal('tikla'); }
    komut(c) {
      const n = this.neden(c.k, c.tur);
      if (n) { this.uyar(n); return false; }
      if (!this.S.komutVer(0, c)) { this.uyar('Olmaz'); return false; }
      Ses.cal('tikla');
      if (c.tur === 'ucuz' || c.tur === 'agir') this.ipucu('sec', 'tamam');
      if ((c.tur === 'hareket' || c.tur === 'savun') && this.S.telegraflar.some(t => t.sahip.taraf === 1)) this.ipucu('kac', 'tamam');
      return true;
    }
    eylem(tur) {
      const k = this.secili;
      if (this.faz !== 'savas') return;
      const n = this.neden(k, tur);
      if (n) { this.uyar(n); return; }
      if (tur === 'savun') { this.komut({ tur, k }); return; }
      const hedef = k.def[tur].hedef;
      if (hedef === 'yok' || hedef === 'onSutun') { this.komut({ tur, k }); return; }
      this.hedefleme = { tur, k, hedef };
    }
    hedefSec(p) {
      const h = this.hedefleme, S = this.S;
      if (h.hedef === 'dost' || h.hedef === 'rakip') {
        const t = h.hedef === 'dost' ? 0 : 1;
        const x = this.kahramanAt(p, t);
        if (!x) return false;
        this.komut({ tur: h.tur, k: h.k, hedef: x });
      } else {
        const q = this.kareAt(p);
        if (!q || q.t !== 1) return false;
        this.komut({ tur: h.tur, k: h.k, secim: { s: q.s, r: q.r } });
      }
      this.hedefleme = null;
      return true;
    }
    kahramanAt(p, t) {
      for (const k of this.S.hepsi()) {
        if (k.olu || (t != null && k.taraf !== t)) continue;
        const g = this.G(k);
        if ((p.x - g.x) ** 2 + (p.y - g.y) ** 2 <= 58 * 58) return k;
      }
      return null;
    }
    kareAt(p) {
      for (let t = 0; t < 2; t++) for (let s = 0; s < 2; s++) for (let r = 0; r < 2; r++) {
        const m = kareXY(t, s, r);
        if (Math.abs(p.x - m.x) <= KARE_W / 2 && Math.abs(p.y - m.y) <= KARE_H / 2) return { t, s, r };
      }
      return null;
    }
    yenidenBaslat() { Kit.sahneDegistir(new Mac(this.secim, this.zorluk)); }

    girdi() {
      const S = this.S, f = Kit.fare;
      for (let i = 0; i < 3; i++) if (Kit.tusBasildi('Digit' + (i + 1))) this.sec(S.takimlar[0].kahramanlar[i]);
      if (Kit.tikAl(UI.secici(0).x, UI.secici(0).y, UI.secici(2).x + UI.secici(2).w - UI.secici(0).x, UI.secici(0).h)) {
        for (let i = 0; i < 3; i++) if (icinde(f, UI.secici(i))) this.sec(S.takimlar[0].kahramanlar[i]);
      }
      if (this.faz !== 'savas') return;
      for (let i = 0; i < 4; i++) {
        const R = UI.dugme(i);
        if (Kit.tusBasildi(EYLEMLER[i].kod) || Kit.tikAl(R.x, R.y, R.w, R.h)) this.eylem(EYLEMLER[i].tur);
      }
      if (f.sagTik) this.hedefleme = null;
      if (Kit.tikVarMi()) {
        const p = { x: f.x, y: f.y };
        if (this.hedefleme) { Kit.tikTuket(); if (!this.hedefSec(p)) this.hedefleme = null; }
        else {
          const k = this.kahramanAt(p, 0);
          if (k) { Kit.tikTuket(); this.sec(k); this.surukle = { k, x0: p.x, y0: p.y }; }
          else {
            const q = this.kareAt(p);
            if (q && q.t === 0 && this.secili && !this.secili.olu && !S.karedeki(0, q.s, q.r)) { Kit.tikTuket(); this.komut({ tur: 'hareket', k: this.secili, kare: { s: q.s, r: q.r } }); }
          }
        }
      }
      if (this.surukle && !f.basili) {
        const sr = this.surukle; this.surukle = null;
        if ((f.x - sr.x0) ** 2 + (f.y - sr.y0) ** 2 > 30 * 30) {
          const q = this.kareAt(f);
          if (q && q.t === 0 && !(q.s === sr.k.kare.s && q.r === sr.k.kare.r)) this.komut({ tur: 'hareket', k: sr.k, kare: { s: q.s, r: q.r } });
        }
      }
    }

    // ---------- Akış ----------
    guncelle(dt, gercekDt) {
      const S = this.S;
      this.gercekSure += gercekDt;
      if ((Kit.tusBasildi('KeyP') || (Kit.tusBasildi('Escape') && !this.hedefleme)) && (this.faz === 'savas' || this.faz === 'geri') && !OYUN.oto) {
        this.duraklat = !this.duraklat; Ses.cal('tikla');
      } else if (Kit.tusBasildi('Escape')) this.hedefleme = null;
      if (Kit.tusBasildi('KeyR') && !OYUN.oto) {
        if (performance.now() - this.rZaman < 1500) { this.yenidenBaslat(); return; }
        this.rZaman = performance.now(); this.uyar('Yeniden başlatmak için R’ye tekrar bas');
      }
      if (this.duraklat) { Kit.zamanOlcegi = 0; return; }
      Kit.zamanOlcegi = OYUN.oto ? OYUN.otoHiz : OYUN.elHiz;

      if (!OYUN.oto) this.girdi();
      if (this.uyari && (this.uyari.t -= gercekDt) <= 0) this.uyari = null;
      if (this.ritimUyari > 0) this.ritimUyari -= gercekDt;
      if (this.secili && this.secili.olu) { const d = S.takimlar[0].kahramanlar.find(k => !k.olu); if (d) this.sec(d); }
      if (S.takimlar[0].kahramanlar.some(k => !k.olu && k.ult >= 100)) this.ipucu('ult', 'aktif');

      this.fazT += dt;
      if (this.faz === 'geri') {
        if (this.fazT >= 2.6) { this.faz = 'savas'; this.fazT = 0; this.acc = 0; this.afis('DÖVÜŞ!', { renk: '#fff', boyut: 64, sure: 0.8, y: 306, bant: true }); Ses.cal('dalga'); }
      } else if (this.faz === 'savas') {
        this.acc += dt;
        while (this.acc >= AYAR.beatSn && S.durum === 'savas') {
          this.acc -= AYAR.beatSn;
          S.beatIlerle();
          this.nabiz = 1;
          for (const g of this.g.values()) g.olcek = 1.05;
          Ses.cal(S.kalanBeat() < AYAR.sonHizliBeat ? 'tikTak' : 'tikTak');
          for (const B of this.botlar) B.dusun();
        }
        if (S.durum === 'raundSonu') { this.faz = 'raundSonu'; this.fazT = 0; this.hedefleme = null; }
      } else if (this.faz === 'raundSonu') {
        if (this.fazT >= 2.4) {
          if (S.macBitti()) { Kit.sahneDegistir(new Bitis(this)); return; }
          this.gelisimHazirla();
        }
      }

      // görsel ara değerler
      this.nabiz = Math.max(0, this.nabiz - gercekDt * 3);
      for (const k of S.hepsi()) {
        const g = this.G(k), p = kareXY(k.taraf, k.kare.s, k.kare.r);
        const a = Math.min(1, gercekDt * 12);
        g.x += (p.x - g.x) * a; g.y += (p.y - g.y) * a;
        g.flas = Math.max(0, g.flas - gercekDt * 6);
        g.olcek += (1 - g.olcek) * Math.min(1, gercekDt * 8);
        const oran = Math.max(0, k.can / k.maxCan);
        g.iz = g.iz > oran ? Math.max(oran, g.iz - gercekDt * 0.6) : oran;
      }
      for (let i = this.mermiler.length - 1; i >= 0; i--) if ((this.mermiler[i].t += gercekDt) >= this.mermiler[i].sure) this.mermiler.splice(i, 1);
      for (let i = this.afisler.length - 1; i >= 0; i--) if ((this.afisler[i].t += gercekDt) >= this.afisler[i].sure) this.afisler.splice(i, 1);
      if (this.faz === 'gelisim') this.gelisimGuncelle();
    }

    // ---------- Raund arası gelişim ----------
    gelisimHazirla() {
      const S = this.S;
      this.faz = 'gelisim'; this.fazT = 0;
      const kaz = S.kazanan;
      this.gel = {
        kaybetti: kaz !== 0,
        secenek: S.takimlar[0].kahramanlar.map(k => S.gelisimSecenekleri(k)),
        secilen: [null, null, null],
        takim: kaz !== 0 ? S.takimSecenekleri() : null, takimSecilen: null,
        bot: S.rastgeleGelisim(1, kaz !== 1),
      };
      if (OYUN.oto) { S.rastgeleGelisim(0, kaz !== 0); this.sonrakiRaund(); }
    }
    gelisimGuncelle() {
      const G = this.gel;
      if (!G) return;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const R = this.gelKart(i, j);
        if (Kit.tikAl(R.x, R.y, R.w, R.h)) { G.secilen[i] = j; Ses.cal('tikla'); }
      }
      if (G.takim) for (let j = 0; j < 2; j++) {
        const R = this.gelTakimKart(j);
        if (Kit.tikAl(R.x, R.y, R.w, R.h)) { G.takimSecilen = j; Ses.cal('tikla'); }
      }
      const hazir = G.secilen.every(x => x !== null) && (!G.takim || G.takimSecilen !== null);
      if (hazir && (Kit.tikAl(540, 640, 200, 52) || Kit.tusBasildi('Enter'))) {
        const S = this.S;
        S.takimlar[0].kahramanlar.forEach((k, i) => S.gelisimUygula(k, G.secenek[i][G.secilen[i]]));
        if (G.takim) S.takimGelisimUygula(0, G.takim[G.takimSecilen]);
        Ses.cal('seviye');
        this.sonrakiRaund();
      }
    }
    sonrakiRaund() {
      this.gel = null;
      this.S.raundBaslat();
      for (const k of this.S.hepsi()) { const g = this.G(k); g.iz = 1; }
      this.faz = 'geri'; this.fazT = 0;
    }
    gelKart(i, j) { return { x: 70 + i * 384, y: 250 + j * 112, w: 372, h: 100 }; }
    gelTakimKart(j) { return { x: 250 + j * 400, y: 498, w: 380, h: 70 }; }

    // ---------- Çizim ----------
    ciz(c) {
      const S = this.S, frac = this.faz === 'savas' ? Math.min(1, this.acc / AYAR.beatSn) : 0;
      // zemin
      const gr = c.createLinearGradient(0, 0, 0, Kit.H);
      gr.addColorStop(0, '#12121f'); gr.addColorStop(1, '#0a0a12');
      c.fillStyle = gr; c.fillRect(0, 0, Kit.W, Kit.H);
      c.fillStyle = 'rgba(76,201,240,0.05)'; c.fillRect(0, 130, 640, 350);
      c.fillStyle = 'rgba(255,77,109,0.05)'; c.fillRect(640, 130, 640, 350);

      // kareler
      for (let t = 0; t < 2; t++) for (let s = 0; s < 2; s++) for (let r = 0; r < 2; r++) {
        const m = kareXY(t, s, r);
        Kit.yd(c, m.x - KARE_W / 2 + 4, m.y - KARE_H / 2 + 4, KARE_W - 8, KARE_H - 8, 14);
        c.fillStyle = t === 0 ? 'rgba(76,201,240,0.07)' : 'rgba(255,77,109,0.07)'; c.fill();
        c.lineWidth = 2 + this.nabiz * 2;
        c.strokeStyle = t === 0 ? `rgba(76,201,240,${0.22 + this.nabiz * 0.25})` : `rgba(255,77,109,${0.22 + this.nabiz * 0.25})`;
        c.stroke();
      }
      Kit.metin(c, 'ARKA', 296, 476, { boyut: 11, renk: 'rgba(255,255,255,0.25)' });
      Kit.metin(c, 'ÖN', 484, 476, { boyut: 11, renk: 'rgba(255,255,255,0.25)' });
      Kit.metin(c, 'ÖN', 796, 476, { boyut: 11, renk: 'rgba(255,255,255,0.25)' });
      Kit.metin(c, 'ARKA', 984, 476, { boyut: 11, renk: 'rgba(255,255,255,0.25)' });

      // kareye kilitli telegraflar
      for (const tel of S.telegraflar) {
        if (tel.kilit !== 'kare') continue;
        const rem = Math.max(0, tel.kalan - frac), prog = 1 - rem / tel.toplam;
        const t = 1 - tel.sahip.taraf, nb = 0.5 + 0.5 * this.nabiz;
        for (const q of tel.kareler) {
          const m = kareXY(t, q.s, q.r);
          Kit.yd(c, m.x - KARE_W / 2 + 4, m.y - KARE_H / 2 + 4, KARE_W - 8, KARE_H - 8, 14);
          c.fillStyle = `rgba(255,${Math.round(110 - 90 * prog)},30,${0.16 + 0.32 * prog * nb})`; c.fill();
          c.lineWidth = 3 + 4 * prog; c.strokeStyle = `rgba(255,${Math.round(120 - 100 * prog)},40,0.95)`; c.stroke();
          // dolan şerit
          c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(m.x - 70, m.y + KARE_H / 2 - 22, 140, 9);
          c.fillStyle = '#ff3b1f'; c.fillRect(m.x - 70, m.y + KARE_H / 2 - 22, 140 * prog, 9);
          this.sayacCiz(c, m.x - KARE_W / 2 + 28, m.y - KARE_H / 2 + 28, tel, prog);
        }
        const m0 = kareXY(t, tel.kareler[0].s, tel.kareler[0].r);
        Kit.metin(c, tel.ad, m0.x, m0.y - KARE_H / 2 + 14, { boyut: 13, renk: '#ffd1b3', kontur: '#000' });
      }

      // hedefleme önizlemesi
      if (this.hedefleme) this.hedeflemeCiz(c);

      // kahramanlar
      for (const k of S.hepsi()) if (k.olu) this.kahramanCiz(c, k, frac);
      for (const k of S.hepsi()) if (!k.olu) this.kahramanCiz(c, k, frac);

      // kahramana kilitli telegraflar
      for (const tel of S.telegraflar) {
        if (tel.kilit !== 'kahraman' || !tel.hedef || tel.hedef.olu) continue;
        const rem = Math.max(0, tel.kalan - frac), prog = 1 - rem / tel.toplam;
        const gs = this.G(tel.sahip), gh = this.G(tel.hedef);
        c.save();
        c.setLineDash([10, 8]); c.lineDashOffset = -Kit.zaman * 40;
        c.strokeStyle = `rgba(255,70,40,${0.4 + 0.5 * prog})`; c.lineWidth = 3;
        c.beginPath(); c.moveTo(gs.x, gs.y); c.lineTo(gh.x, gh.y); c.stroke();
        c.restore();
        const r = 70 - 8 * prog, a = Kit.zaman * 2;
        c.strokeStyle = `rgba(255,${Math.round(90 - 70 * prog)},40,1)`; c.lineWidth = 4 + 3 * prog;
        c.beginPath(); c.arc(gh.x, gh.y, r, 0, Math.PI * 2); c.stroke();
        for (let i = 0; i < 4; i++) {
          const aa = a + i * Math.PI / 2;
          c.beginPath(); c.moveTo(gh.x + Math.cos(aa) * (r - 12), gh.y + Math.sin(aa) * (r - 12)); c.lineTo(gh.x + Math.cos(aa) * (r + 14), gh.y + Math.sin(aa) * (r + 14)); c.stroke();
        }
        this.sayacCiz(c, gh.x + 62, gh.y - 52, tel, prog);
      }

      // mermiler
      for (const m of this.mermiler) {
        const p = m.t / m.sure, x = Kit.lerp(m.x0, m.x1, p), y = Kit.lerp(m.y0, m.y1, p);
        c.strokeStyle = m.renk; c.lineWidth = m.kalin || 4;
        c.beginPath(); c.moveTo(Kit.lerp(m.x0, m.x1, Math.max(0, p - 0.25)), Kit.lerp(m.y0, m.y1, Math.max(0, p - 0.25))); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      }

      // nabız (beat) ve süre
      const kalanSn = Math.ceil(S.kalanBeat() / 2), son = S.kalanBeat() < AYAR.sonHizliBeat;
      c.strokeStyle = son ? `rgba(255,120,60,${0.5 + this.nabiz * 0.5})` : `rgba(255,255,255,${0.35 + this.nabiz * 0.5})`;
      c.lineWidth = 3 + this.nabiz * 4;
      c.beginPath(); c.arc(NABIZ.x, NABIZ.y, 34 + this.nabiz * 12, 0, Math.PI * 2); c.stroke();
      Kit.metin(c, String(Math.max(0, kalanSn)), NABIZ.x, NABIZ.y, { boyut: 30, renk: son ? '#ff9f43' : '#fff' });
      Kit.metin(c, 'sn', NABIZ.x, NABIZ.y + 26, { boyut: 11, renk: RENK.soluk });
    }

    sayacCiz(c, x, y, tel, prog) {
      const kritik = tel.kalan <= 1;
      c.fillStyle = 'rgba(0,0,0,0.75)'; c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = kritik ? '#ff2e2e' : '#ff8c42'; c.lineWidth = 5;
      c.beginPath(); c.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); c.stroke();
      Kit.metin(c, String(tel.kalan), x, y + 1, { boyut: kritik ? 28 + this.nabiz * 6 : 24, renk: kritik ? '#ff4d4d' : '#ffd1b3' });
    }

    hedeflemeCiz(c) {
      const h = this.hedefleme, S = this.S, f = Kit.fare, nb = 0.5 + 0.5 * Math.sin(Kit.zaman * 10);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 130, Kit.W, 350);
      if (h.hedef === 'dost' || h.hedef === 'rakip') {
        const t = h.hedef === 'dost' ? 0 : 1;
        for (const k of S.takimlar[t].kahramanlar) {
          if (k.olu) continue;
          const g = this.G(k);
          c.strokeStyle = t === 0 ? `rgba(125,255,176,${0.5 + 0.5 * nb})` : `rgba(255,90,90,${0.5 + 0.5 * nb})`;
          c.lineWidth = 5; c.beginPath(); c.arc(g.x, g.y, 64, 0, Math.PI * 2); c.stroke();
        }
      } else {
        const q = this.kareAt(f);
        for (let s = 0; s < 2; s++) for (let r = 0; r < 2; r++) {
          let on = false;
          if (q && q.t === 1) on = h.hedef === 'sira' ? (r === q.r || (h.k.p.agir.genis && s === 0)) : s === q.s;
          const m = kareXY(1, s, r);
          Kit.yd(c, m.x - KARE_W / 2 + 4, m.y - KARE_H / 2 + 4, KARE_W - 8, KARE_H - 8, 14);
          c.fillStyle = on ? 'rgba(255,90,40,0.35)' : 'rgba(255,90,40,0.08)'; c.fill();
          c.strokeStyle = on ? '#ff7b39' : 'rgba(255,123,57,0.4)'; c.lineWidth = on ? 4 : 2; c.stroke();
        }
      }
    }

    kahramanCiz(c, k, frac) {
      const g = this.G(k), x = g.x + g.ox, y = g.y + g.oy;
      const tr = k.taraf === 0 ? RENK.oyuncu : RENK.bot;
      const R = 46 * g.olcek;
      c.save();
      if (k.olu) {
        c.globalAlpha = 0.28;
        Kit.portre(c, Kit.gorsel('portre_' + k.id), x, y, R, { kenar: '#555', kalin: 3 });
        c.globalAlpha = 0.7; c.strokeStyle = '#000'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(x - 24, y - 24); c.lineTo(x + 24, y + 24); c.moveTo(x + 24, y - 24); c.lineTo(x - 24, y + 24); c.stroke();
        c.restore(); return;
      }
      // seçili
      if (k === this.secili) {
        c.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(Kit.zaman * 6)})`; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, R + 22, 0, Math.PI * 2); c.stroke();
      }
      // ultimate halkası
      const hazir = k.ult >= 100;
      c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.beginPath(); c.arc(x, y, R + 11, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = hazir ? `rgba(255,209,102,${0.7 + 0.3 * Math.sin(Kit.zaman * 8)})` : 'rgba(255,209,102,0.75)';
      c.beginPath(); c.arc(x, y, R + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k.ult / 100)); c.stroke();
      if (hazir) {
        c.shadowColor = RENK.altin; c.shadowBlur = 18 + 10 * Math.sin(Kit.zaman * 8);
        c.beginPath(); c.arc(x, y, R + 4, 0, Math.PI * 2); c.strokeStyle = RENK.altin; c.lineWidth = 3; c.stroke();
        c.shadowBlur = 0;
      }
      // hazırlık halkası (telegraf sahibi)
      if (k.telegraf) {
        const tel = k.telegraf, prog = 1 - Math.max(0, tel.kalan - frac) / tel.toplam;
        c.strokeStyle = '#ff8c42'; c.lineWidth = 7;
        c.beginPath(); c.arc(x, y, R + 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); c.stroke();
        c.strokeStyle = 'rgba(255,140,66,0.35)'; c.lineWidth = 2;
        c.beginPath(); c.arc(x, y, R + 21, 0, Math.PI * 2); c.stroke();
      }
      // kalkan balonu
      if (k.kalkan > 0) { c.fillStyle = 'rgba(127,211,255,0.22)'; c.beginPath(); c.arc(x, y, R + 6, 0, Math.PI * 2); c.fill(); }
      Kit.portre(c, Kit.gorsel('portre_' + k.id), x, y, R, { kenar: tr, kalin: 4, yedek: k.def.renk });
      if (g.flas > 0) { c.globalAlpha = g.flas * 0.8; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      if (k.sersem > 0) {
        c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { const a = Kit.zaman * 4 + i * 2.09; Kit.metin(c, '★', x + Math.cos(a) * 30, y - 44 + Math.sin(a) * 8, { boyut: 18, renk: '#ffe14d', kontur: '#000' }); }
      }
      if (k.savun > 0) {
        const yon = k.taraf === 0 ? 0 : Math.PI;
        c.strokeStyle = '#7fd3ff'; c.lineWidth = 8; c.shadowColor = '#7fd3ff'; c.shadowBlur = 12;
        c.beginPath(); c.arc(x, y, R + 8, yon - 1.1, yon + 1.1); c.stroke(); c.shadowBlur = 0;
      }
      // can barı
      const bw = 112, bx = x - bw / 2, by = y + R + 18;
      const oran = Math.max(0, k.can / k.maxCan);
      const renk = oran > 0.5 ? '#5ee07a' : oran > 0.25 ? '#ffd166' : '#ff4d4d';
      Kit.bar(c, bx, by, bw, 11, oran, renk, { iz: g.iz, kenar: 'rgba(0,0,0,0.8)' });
      Kit.metin(c, String(Math.ceil(k.can)), x, by + 22, { boyut: 13, renk: '#ddd', kontur: '#000' });
      if (k.kalkan > 0) Kit.metin(c, '+' + Math.ceil(k.kalkan), x + bw / 2 + 4, by + 5, { boyut: 13, renk: '#7fd3ff', hiza: 'left', kontur: '#000' });
      // kesme barı
      if (k.telegraf) {
        const tel = k.telegraf, ko = Math.min(1, tel.alinan / tel.esik);
        Kit.metin(c, 'KES', bx - 4, by + 36, { boyut: 11, renk: '#fff', hiza: 'right', kontur: '#000' });
        Kit.bar(c, bx, by + 31, bw, 8, ko, '#ffffff', { kenar: '#ff8c42' });
        Kit.metin(c, tel.ad, x, y - R - 34, { boyut: 15, renk: '#ffb36b', kontur: '#000' });
      }
      // durumlar
      const durum = [];
      if (k.yanma) durum.push(['Yanma', '#ff8c42']);
      if (k.kanama) durum.push(['Kanama', '#ff4d6d']);
      if (k.hiz > 0) durum.push(['Hız', '#7dffb0']);
      if (k.savun > 0) durum.push(['Savun', '#7fd3ff']);
      let dx = x - (durum.length - 1) * 30;
      for (const [ad, rk] of durum) { Kit.metin(c, ad, dx, y - R - 16, { boyut: 12, renk: rk, kontur: '#000' }); dx += 60; }
      // gelişim işaretleri
      for (let i = 0; i < k.gelisimler.length; i++) {
        const px = x + R - 4 - i * 12, py = y + R - 2;
        c.fillStyle = RENK.altin; c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke();
      }
      // sıradaki komut
      if (k.bekleyen) {
        const ad = { hareket: 'Hareket', savun: 'Savun', ucuz: k.def.ucuz.ad, agir: k.def.agir.ad, ult: 'ULT' }[k.bekleyen.tur];
        Kit.panel(c, x - 50, y - R - 4 - 18, 100, 18, { r: 9, renk: 'rgba(255,255,255,0.9)', kenar: null });
        Kit.metin(c, '▶ ' + ad, x, y - R - 13, { boyut: 11, renk: '#111' });
      }
      // ŞİMDİ SAVUN uyarısı (oyuncunun kahramanı, büyük vuruş bir sonraki beat'te)
      if (k.taraf === 0 && this.faz === 'savas' && this.S.telegraflar.some(t => t.sahip.taraf === 1 && t.kalan === 1 &&
        (t.kilit === 'kahraman' ? t.hedef === k : t.kareler.some(q => q.s === k.kare.s && q.r === k.kare.r)))) {
        if (Math.sin(Kit.zaman * 20) > -0.3) Kit.metin(c, 'ŞİMDİ SAVUN!', x, y - R - 52, { boyut: 22, renk: RENK.altin, kontur: '#000' });
      }
      c.restore();
    }

    ustCiz(c) {
      const S = this.S, T0 = S.takimlar[0], T1 = S.takimlar[1];
      // üst bilgi
      Kit.metin(c, 'SEN', 560, 38, { boyut: 22, renk: RENK.oyuncu, hiza: 'right' });
      Kit.metin(c, T0.skor + '  :  ' + T1.skor, 640, 38, { boyut: 40, renk: '#fff', kontur: '#000' });
      Kit.metin(c, 'RAKİP', 720, 38, { boyut: 22, renk: RENK.bot, hiza: 'left' });
      Kit.metin(c, `Raund ${S.raund} · 3 kazanan alır · Bot: ${{ kolay: 'Kolay', normal: 'Normal', zor: 'Zor' }[this.zorluk]}`, 640, 74, { boyut: 14, renk: RENK.soluk });
      for (let i = 0; i < AYAR.kazanmaRaund; i++) {
        c.fillStyle = i < T0.skor ? RENK.oyuncu : 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(420 + i * 26, 38, 8, 0, Math.PI * 2); c.fill();
        c.fillStyle = i < T1.skor ? RENK.bot : 'rgba(255,255,255,0.12)'; c.beginPath(); c.arc(860 - i * 26, 38, 8, 0, Math.PI * 2); c.fill();
      }
      // rakip Ritim (küçük)
      Kit.metin(c, 'Rakip Ritim ' + T1.ritim, 712, 112, { boyut: 13, renk: RENK.bot, hiza: 'left' });
      for (let i = 0; i < AYAR.ritimTavan; i++) {
        Kit.yd(c, 830 + i * 24, 104, 20, 14, 4);
        c.fillStyle = i < T1.ritim ? '#ff8fa3' : 'rgba(255,255,255,0.1)'; c.fill();
      }
      Kit.metin(c, 'Takımın', 208, 112, { boyut: 13, renk: RENK.oyuncu, hiza: 'left' });

      this.ipucuCiz(c);
      this.ritimCiz(c);
      this.seciciCiz(c);
      this.dugmelerCiz(c);
      this.bilgiCiz(c);

      // afişler
      for (const a of this.afisler) {
        const p = a.t / a.sure, al = p < 0.12 ? p / 0.12 : p > 0.75 ? (1 - p) / 0.25 : 1;
        const s = p < 0.12 ? 1.3 - 0.3 * (p / 0.12) : 1;
        c.globalAlpha = Math.max(0, al);
        if (a.bant) { c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, a.y - 50, Kit.W, 100); }
        Kit.metin(c, a.metin, 640, a.y - (a.alt ? 8 : 0), { boyut: a.boyut * s, renk: a.renk, kontur: '#000' });
        if (a.alt) Kit.metin(c, a.alt, 640, a.y + a.boyut * 0.55, { boyut: 18, renk: '#ddd', kontur: '#000' });
        c.globalAlpha = 1;
      }
      // geri sayım
      if (this.faz === 'geri') {
        const t = this.fazT;
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, 256, Kit.W, 100);
        if (t < 1.1) Kit.metin(c, 'RAUND ' + S.raund, 640, 306, { boyut: 58, renk: '#fff', kontur: '#000' });
        else Kit.metin(c, String(3 - Math.min(2, Math.floor((t - 1.1) / 0.5))), 640, 306, { boyut: 70 + 20 * (1 - ((t - 1.1) % 0.5) / 0.5), renk: RENK.altin, kontur: '#000' });
        if (S.raund === 1) Kit.metin(c, 'Kahramanını seç (1-2-3). Ritim dolunca harca, kırmızıdan kaç, turuncuyu kes!', 640, 372, { boyut: 18, renk: '#ddd', kontur: '#000' });
      }
      if (this.faz === 'gelisim') this.gelisimCiz(c);
      if (this.duraklat) this.duraklatCiz(c);
    }

    ipucuCiz(c) {
      const R = UI.ipucu;
      let metin = null, renk = '#ffe08a';
      if (this.uyari) { metin = this.uyari.metin; renk = '#ff8f8f'; }
      else if (this.hedefleme) {
        const h = this.hedefleme.hedef;
        metin = h === 'dost' ? 'Hedef: dost kahramana tıkla · sağ tık / Esc iptal' : h === 'rakip' ? 'Hedef: rakip kahramana tıkla · sağ tık / Esc iptal'
          : h === 'sira' ? 'Hedef: rakip sırasına (üst/alt) tıkla · sağ tık / Esc iptal' : 'Hedef: rakip sütununa (ön/arka) tıkla · sağ tık / Esc iptal';
        renk = '#ffb36b';
      } else {
        const i = this.ipuclari.find(x => x.aktif && !x.tamam);
        if (i && this.faz !== 'gelisim') metin = i.metin;
      }
      if (!metin) { metin = 'Sürükle: hareket/takas (1) · Q W Boşluk E · Esc duraklat · M ses'; renk = 'rgba(255,255,255,0.4)'; }
      Kit.panel(c, R.x, R.y, R.w, R.h, { r: 10, renk: 'rgba(0,0,0,0.55)', kenar: 'rgba(255,255,255,0.08)' });
      Kit.metin(c, metin, R.x + R.w / 2, R.y + R.h / 2 + 1, { boyut: 15, renk, kalin: true });
    }

    ritimCiz(c) {
      const R = UI.ritim, T = this.S.takimlar[0], n = AYAR.ritimTavan, w = (R.w - 70 - (n - 1) * 4) / n;
      Kit.metin(c, 'RİTİM', R.x + 30, R.y + R.h / 2 - 6, { boyut: 14, renk: RENK.ritim });
      Kit.metin(c, T.ritim + '/' + n, R.x + 30, R.y + R.h / 2 + 10, { boyut: 13, renk: '#fff' });
      const bekleyen = T.kahramanlar.reduce((a, k) => a + (k.bekleyen ? k.bekleyen.maliyet : 0), 0);
      for (let i = 0; i < n; i++) {
        const x = R.x + 70 + i * (w + 4);
        Kit.yd(c, x, R.y, w, R.h, 6);
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill();
        if (i < T.ritim) {
          Kit.yd(c, x, R.y, w, R.h, 6);
          c.fillStyle = T.ritim >= n ? `rgba(255,209,102,${0.8 + 0.2 * Math.sin(Kit.zaman * 8)})` : RENK.ritim; c.fill();
        } else if (i < T.ritim + bekleyen) {
          Kit.yd(c, x, R.y, w, R.h, 6); c.strokeStyle = 'rgba(255,209,102,0.6)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]);
        } else if (i === T.ritim) {
          Kit.yd(c, x, R.y + R.h * (1 - T.birikim), w, R.h * T.birikim, 6); c.fillStyle = 'rgba(255,209,102,0.35)'; c.fill();
        }
      }
      if (this.ritimUyari > 0) { Kit.yd(c, R.x + 66, R.y - 3, R.w - 66, R.h + 6, 8); c.strokeStyle = '#ff4d4d'; c.lineWidth = 3; c.stroke(); }
    }

    seciciCiz(c) {
      this.S.takimlar[0].kahramanlar.forEach((k, i) => {
        const R = UI.secici(i), sec = k === this.secili;
        Kit.panel(c, R.x, R.y, R.w, R.h, { renk: sec ? 'rgba(76,201,240,0.18)' : 'rgba(15,15,25,0.85)', kenar: sec ? '#fff' : 'rgba(255,255,255,0.15)', kalin: sec ? 3 : 2 });
        c.globalAlpha = k.olu ? 0.35 : 1;
        Kit.portre(c, Kit.gorsel('portre_' + k.id), R.x + R.w / 2, R.y + 40, 30, { kenar: k.ult >= 100 ? RENK.altin : RENK.oyuncu, kalin: 3 });
        Kit.metin(c, String(i + 1), R.x + 14, R.y + 14, { boyut: 16, renk: '#fff', kontur: '#000' });
        Kit.metin(c, k.def.ad, R.x + R.w / 2, R.y + 84, { boyut: 11, renk: '#ddd' });
        Kit.bar(c, R.x + 8, R.y + 96, R.w - 16, 8, k.can / k.maxCan, '#5ee07a');
        Kit.bar(c, R.x + 8, R.y + 108, R.w - 16, 5, k.ult / 100, RENK.altin);
        const d = k.olu ? 'Düştü' : k.sersem > 0 ? 'Sersem' : k.telegraf ? 'Hazırlanıyor' : k.ult >= 100 ? 'ULT hazır (E)' : '';
        Kit.metin(c, d, R.x + R.w / 2, R.y + 127, { boyut: 11, renk: k.ult >= 100 && !k.olu ? RENK.altin : '#ff9f9f' });
        c.globalAlpha = 1;
      });
    }

    dugmelerCiz(c) {
      const k = this.secili, T = this.S.takimlar[0];
      if (!k) return;
      EYLEMLER.forEach((e, i) => {
        const R = UI.dugme(i);
        let ad, maliyet, tip, aciklama;
        if (e.tur === 'savun') { ad = 'Savun'; maliyet = 1; tip = 'Anlık · 2 beat'; aciklama = 'Hasarın %60’ı engellenir. Sayaç 1’deyken basarsan MÜKEMMEL: %100 + Ritim geri.'; }
        else if (e.tur === 'ult') { ad = k.def.ult.ad; maliyet = 0; tip = 'Ultimate · halka ' + Math.floor(k.ult) + '%'; aciklama = k.def.ult.metin(k.p); }
        else {
          const d = k.def[e.tur];
          ad = d.ad; maliyet = k.p[e.tur].maliyet;
          tip = e.tur === 'ucuz' ? 'Anlık' : `Telegraf · ${k.p.agir.beat + AYAR.telegrafEk} beat · ${d.kilit === 'kare' ? 'kareye' : 'kahramana'}`;
          aciklama = d.metin(k.p);
        }
        const yok = this.faz !== 'savas' || !!this.neden(k, e.tur);
        const ust = icinde(Kit.fare, R), aktif = this.hedefleme && this.hedefleme.tur === e.tur && this.hedefleme.k === k;
        const ultHazir = e.tur === 'ult' && !yok;
        Kit.panel(c, R.x, R.y, R.w, R.h, {
          renk: aktif ? 'rgba(255,140,66,0.3)' : ultHazir ? `rgba(255,209,102,${0.18 + 0.12 * Math.sin(Kit.zaman * 6)})` : yok ? 'rgba(20,20,28,0.85)' : ust ? 'rgba(60,60,85,0.95)' : 'rgba(30,30,46,0.95)',
          kenar: aktif ? '#ff8c42' : ultHazir ? RENK.altin : yok ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
        });
        c.globalAlpha = yok ? 0.5 : 1;
        Kit.panel(c, R.x + 6, R.y + 6, e.tus.length > 1 ? 54 : 24, 20, { r: 5, renk: '#ece8df', kenar: null });
        Kit.metin(c, e.tus, R.x + 6 + (e.tus.length > 1 ? 27 : 12), R.y + 17, { boyut: 12, renk: '#111' });
        for (let j = 0; j < maliyet; j++) { c.fillStyle = j < T.ritim ? RENK.ritim : 'rgba(255,209,102,0.25)'; c.beginPath(); c.arc(R.x + R.w - 12 - j * 13, R.y + 16, 5, 0, Math.PI * 2); c.fill(); }
        if (e.tur === 'ult') { Kit.bar(c, R.x + R.w - 52, R.y + 12, 42, 8, k.ult / 100, RENK.altin); }
        Kit.metin(c, ad, R.x + R.w / 2, R.y + 40, { boyut: 16, renk: '#fff' });
        Kit.metin(c, tip, R.x + R.w / 2, R.y + 58, { boyut: 11, renk: e.tur === 'agir' ? '#ffb36b' : e.tur === 'ult' ? RENK.altin : '#9ad' });
        Kit.metinKutu(c, aciklama, R.x + 8, R.y + 70, R.w - 16, { boyut: 11, satir: 13, renk: '#ccc' });
        c.globalAlpha = 1;
      });
    }

    bilgiCiz(c) {
      const R = UI.bilgi, k = this.secili;
      Kit.panel(c, R.x, R.y, R.w, R.h, {});
      if (!k) return;
      Kit.metin(c, k.def.ad, R.x + 12, R.y + 18, { boyut: 17, renk: k.def.renk, hiza: 'left' });
      Kit.metin(c, k.def.rol, R.x + 12, R.y + 38, { boyut: 12, renk: RENK.soluk, hiza: 'left', kalin: false });
      const v = k.p.vurus, tur = { yakin: 'yakın (önü vurur)', uzak: 'uzak (aynı sıra)', arka: 'arka sırayı vurur' }[v.tur];
      Kit.metin(c, `Düz vuruş: ${Math.round(v.hasar * AYAR.vurusCarpan)} / ${sn(v.periyot)} sn · ${tur}`, R.x + 12, R.y + 58, { boyut: 12, renk: '#ccc', hiza: 'left', kalin: false });
      Kit.metin(c, 'Sürükle ya da boş kareye tıkla: hareket/takas (1 Ritim)', R.x + 12, R.y + 76, { boyut: 11, renk: '#9ad', hiza: 'left', kalin: false });
      const g = k.gelisimler.length ? 'Gelişim: ' + k.gelisimler.join(', ') : 'Gelişim: henüz yok';
      Kit.metinKutu(c, g, R.x + 12, R.y + 90, R.w - 24, { boyut: 12, satir: 14, renk: RENK.altin });
      const tg = this.S.takimlar[0].takimGelisim;
      if (tg.length) Kit.metinKutu(c, 'Takım: ' + tg.join(', '), R.x + 12, R.y + 120, R.w - 24, { boyut: 11, satir: 13, renk: '#7dffb0' });
    }

    gelisimCiz(c) {
      const G = this.gel, S = this.S;
      if (!G) return;
      c.fillStyle = 'rgba(5,5,10,0.88)'; c.fillRect(0, 0, Kit.W, Kit.H);
      const k = S.kazanan;
      Kit.metin(c, k === 0 ? 'RAUNDU KAZANDIN' : k === 1 ? 'RAUNDU KAYBETTİN' : 'BERABERE', 640, 56, { boyut: 40, renk: k === 0 ? '#7dffb0' : k === 1 ? RENK.bot : '#fff', kontur: '#000' });
      Kit.metin(c, `Skor ${S.takimlar[0].skor} : ${S.takimlar[1].skor} · sıradaki raund ${S.raund + 1}`, 640, 96, { boyut: 18, renk: '#ddd' });
      Kit.metin(c, 'Güçlen: her kahraman için bir dal seç', 640, 140, { boyut: 22, renk: RENK.altin });
      S.takimlar[0].kahramanlar.forEach((h, i) => {
        const x = 70 + i * 384;
        Kit.portre(c, Kit.gorsel('portre_' + h.id), x + 34, 200, 30, { kenar: RENK.oyuncu, kalin: 3 });
        Kit.metin(c, h.def.ad, x + 76, 192, { boyut: 18, renk: h.def.renk, hiza: 'left' });
        Kit.metin(c, h.gelisimler.length ? 'Önceki: ' + h.gelisimler.join(', ') : 'İlk gelişim', x + 76, 214, { boyut: 12, renk: RENK.soluk, hiza: 'left', kalin: false });
        for (let j = 0; j < 2; j++) {
          const R = this.gelKart(i, j), d = G.secenek[i][j], sec = G.secilen[i] === j, ust = icinde(Kit.fare, R);
          Kit.panel(c, R.x, R.y, R.w, R.h, { renk: sec ? 'rgba(255,209,102,0.2)' : ust ? 'rgba(60,60,85,0.95)' : 'rgba(25,25,38,0.95)', kenar: sec ? RENK.altin : 'rgba(255,255,255,0.2)', kalin: sec ? 3 : 2 });
          Kit.metin(c, (sec ? '✓ ' : '') + d.ad, R.x + 16, R.y + 30, { boyut: 20, renk: sec ? RENK.altin : '#fff', hiza: 'left' });
          Kit.metinKutu(c, typeof d.metin === 'function' ? d.metin() : d.metin, R.x + 16, R.y + 50, R.w - 32, { boyut: 15, renk: '#ccc' });
        }
      });
      if (G.takim) {
        Kit.metin(c, 'Kaybedene ek seçim (bütün takım):', 640, 482, { boyut: 16, renk: '#7dffb0' });
        for (let j = 0; j < 2; j++) {
          const R = this.gelTakimKart(j), d = G.takim[j], sec = G.takimSecilen === j, ust = icinde(Kit.fare, R);
          Kit.panel(c, R.x, R.y, R.w, R.h, { renk: sec ? 'rgba(125,255,176,0.18)' : ust ? 'rgba(60,60,85,0.95)' : 'rgba(25,25,38,0.95)', kenar: sec ? '#7dffb0' : 'rgba(255,255,255,0.2)', kalin: sec ? 3 : 2 });
          Kit.metin(c, (sec ? '✓ ' : '') + d.ad, R.x + R.w / 2, R.y + 24, { boyut: 18, renk: sec ? '#7dffb0' : '#fff' });
          Kit.metin(c, d.metin, R.x + R.w / 2, R.y + 50, { boyut: 14, renk: '#ccc', kalin: false });
        }
      }
      Kit.metinKutu(c, 'Rakip de güçlendi: ' + G.bot.join(' · '), 140, 590, 1000, { boyut: 13, renk: '#ff9fb0', hiza: 'left' });
      const hazir = G.secilen.every(x => x !== null) && (!G.takim || G.takimSecilen !== null);
      const R = { x: 540, y: 640, w: 200, h: 52 }, ust = hazir && icinde(Kit.fare, R);
      Kit.yd(c, R.x, R.y, R.w, R.h, 10); c.fillStyle = hazir ? (ust ? '#f2c14e' : '#d9a521') : '#2a2a33'; c.fill();
      Kit.metin(c, hazir ? 'Devam (Enter)' : 'Seçimleri yap', 640, 666, { boyut: 20, renk: hazir ? '#1a1206' : '#777' });
    }

    duraklatCiz(c) {
      c.fillStyle = 'rgba(0,0,0,0.88)'; c.fillRect(0, 0, Kit.W, Kit.H);
      Kit.metin(c, 'DURAKLATILDI', 640, 170, { boyut: 48, renk: '#fff' });
      const satir = ['Esc / P: devam', 'R R: yeniden başlat', 'M: ses aç/kapat', '1-2-3: kahraman seç · Q ucuz · W ağır · Boşluk savun · E ultimate',
        'Sürükle-bırak ya da boş kareye tıkla: hareket/takas (1 Ritim)', 'Sağ tık / Esc: hedef seçimini iptal'];
      satir.forEach((s, i) => Kit.metin(c, s, 640, 230 + i * 28, { boyut: 17, renk: '#ccc', kalin: false }));
      if (Kit.dugme(c, 540, 420, 200, 50, 'Devam')) this.duraklat = false;
      if (Kit.dugme(c, 540, 480, 200, 50, 'Yeniden başlat')) this.yenidenBaslat();
      if (Kit.dugme(c, 540, 540, 200, 50, 'Kahraman seç')) Kit.sahneDegistir(new Secim());
      if (Kit.dugme(c, 540, 600, 200, 50, 'Başlığa dön')) Kit.sahneDegistir(new Baslik());
    }
  }

  window.Mac = Mac;
})();
