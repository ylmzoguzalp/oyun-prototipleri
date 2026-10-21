// F1 başlık, kahraman seçimi ve bitiş sahneleri; açılış ve ?oto=1 otomatik doğrulama.
(function () {
  const P = new URLSearchParams(location.search);
  const OYUN = window.OYUN = {
    secim: null, zorluk: 'normal',
    oto: P.get('oto') === '1', otoHiz: Math.max(1, +P.get('hiz') || 8), elHiz: Math.max(0.25, +P.get('hiz') || 1), otoN: Math.max(1, +P.get('n') || 3),
    otoZorluk: P.get('za') || 'normal', otoRakip: P.get('zb') || 'normal', otoHizli: P.get('hizli') === '1',
    otoSonuclar: [], otoHata: 0,
  };
  const ZORLUK_AD = { kolay: 'Kolay', normal: 'Normal', zor: 'Zor' };
  const R = () => window.RENK;

  function p0Kopya(id) { return JSON.parse(JSON.stringify(KAHRAMAN_VERI[id].p0)); }

  // ---------- Başlık ----------
  class Baslik {
    gir() { Kit.zamanOlcegi = 1; if (OYUN.oto) { OYUN.zorluk = OYUN.otoRakip; Kit.sahneDegistir(new Secim()); } }
    guncelle() { if (Kit.tusBasildi('Enter') || Kit.tusBasildi('Space')) Kit.sahneDegistir(new Secim()); }
    ciz(c) {
      const gr = c.createLinearGradient(0, 0, 0, Kit.H);
      gr.addColorStop(0, '#191428'); gr.addColorStop(1, '#08080e');
      c.fillStyle = gr; c.fillRect(0, 0, Kit.W, Kit.H);
      const nb = 1 - ((Kit.zaman % 0.5) / 0.5);
      c.strokeStyle = `rgba(255,209,102,${0.1 + 0.25 * nb})`; c.lineWidth = 3;
      c.beginPath(); c.arc(640, 250, 120 + 20 * nb, 0, Math.PI * 2); c.stroke();
      Kit.metin(c, 'ORTAK RİTİM DÜELLOSU', 640, 92, { boyut: 64, renk: R().altin, kontur: '#000', konturKalin: 8 });
      Kit.metin(c, 'F1 prototipi · 3’e 3 · zaman akar, Ritim dolar, büyük vuruşlar kesilir', 640, 146, { boyut: 20, renk: '#ccc', kalin: false });
      KAHRAMAN_SIRASI.forEach((id, i) => {
        const x = 640 + (i - 2.5) * 120, y = 250 + (i % 2 ? 1 : -1) * 6 * nb;
        Kit.portre(c, Kit.gorsel('portre_' + id), x, y, 46, { kenar: KAHRAMAN_VERI[id].renk, kalin: 4 });
      });
      Kit.panel(c, 200, 318, 880, 214, {});
      const satir = [
        ['Zaman 0,5 sn’lik vuruşlarla (beat) akar; üç kahramanın kendiliğinden vurur.', '#fff'],
        ['Takımın ortak RİTİM göstergesi dolar: hareket, savunma ya da bir kahramanın skilline harca.', R().altin],
        ['KIRMIZI kare ya da nişangâh = büyük saldırı geliyor: kaç, savun ya da sahibini vurup KES.', '#ff8c6b'],
        ['Sayaç 1’deyken Savun = MÜKEMMEL. Altın halka dolunca ultimate bedava.', '#7fd3ff'],
        ['3 raund kazanan alır. Her raund arası kahramanların güçlenir; kaybeden ek seçim alır.', '#7dffb0'],
      ];
      satir.forEach(([s, rk], i) => Kit.metin(c, s, 640, 348 + i * 38, { boyut: 19, renk: rk, kalin: false }));
      Kit.metin(c, 'Fare: tıkla / sürükle · 1-2-3 kahraman · Q ucuz · W ağır · Boşluk savun · E ultimate · Esc duraklat · R R yeniden · M ses', 640, 560, { boyut: 15, renk: '#9a96a8', kalin: false });
      if (Kit.dugme(c, 540, 600, 200, 60, 'Başla', { boyut: 26 })) Kit.sahneDegistir(new Secim());
    }
  }

  // ---------- Kahraman seçimi ----------
  class Secim {
    constructor() { this.secilen = OYUN.secim ? OYUN.secim.slice() : []; }
    gir() {
      Kit.zamanOlcegi = 1;
      if (OYUN.oto) { OYUN.secim = Kit.karistir(KAHRAMAN_SIRASI).slice(0, 3); Kit.sahneDegistir(new Mac(OYUN.secim, OYUN.zorluk)); }
    }
    kart(i) { return { x: 24 + i * 206, y: 84, w: 196, h: 430 }; }
    guncelle() {
      for (let i = 0; i < 6; i++) {
        const K = this.kart(i), id = KAHRAMAN_SIRASI[i];
        if (Kit.tikAl(K.x, K.y, K.w, K.h)) {
          const j = this.secilen.indexOf(id);
          if (j >= 0) this.secilen.splice(j, 1);
          else if (this.secilen.length < 3) this.secilen.push(id);
          Ses.cal('tikla');
        }
      }
      if (Kit.tusBasildi('Escape')) Kit.sahneDegistir(new Baslik());
      if (Kit.tusBasildi('Enter') && this.secilen.length === 3) this.basla();
    }
    basla() { OYUN.secim = this.secilen.slice(); Ses.cal('satin'); Kit.sahneDegistir(new Mac(OYUN.secim, OYUN.zorluk)); }
    ciz(c) {
      c.fillStyle = '#0d0d16'; c.fillRect(0, 0, Kit.W, Kit.H);
      Kit.metin(c, 'Takımını seç: 3 kahraman', 640, 42, { boyut: 32, renk: '#fff' });
      Kit.metin(c, 'Sıra 1-2-3 tuşlarını belirler. Bot da 6 kahramandan rastgele 3 alır (aynısı çıkabilir).', 640, 70, { boyut: 14, renk: '#9a96a8', kalin: false });
      KAHRAMAN_SIRASI.forEach((id, i) => {
        const K = this.kart(i), d = KAHRAMAN_VERI[id], p = p0Kopya(id), j = this.secilen.indexOf(id), ust = Kit.icinde(K.x, K.y, K.w, K.h);
        Kit.panel(c, K.x, K.y, K.w, K.h, { renk: j >= 0 ? 'rgba(76,201,240,0.16)' : ust ? 'rgba(40,40,60,0.95)' : 'rgba(20,20,32,0.95)', kenar: j >= 0 ? R().oyuncu : 'rgba(255,255,255,0.15)', kalin: j >= 0 ? 4 : 2 });
        Kit.portre(c, Kit.gorsel('portre_' + id), K.x + K.w / 2, K.y + 62, 50, { kenar: d.renk, kalin: 4 });
        if (j >= 0) { c.fillStyle = R().oyuncu; c.beginPath(); c.arc(K.x + 26, K.y + 26, 16, 0, Math.PI * 2); c.fill(); Kit.metin(c, String(j + 1), K.x + 26, K.y + 27, { boyut: 18, renk: '#000' }); }
        Kit.metin(c, d.ad, K.x + K.w / 2, K.y + 132, { boyut: 18, renk: d.renk });
        Kit.metin(c, d.rol, K.x + K.w / 2, K.y + 152, { boyut: 11, renk: '#9a96a8', kalin: false });
        const tur = { yakin: 'yakın', uzak: 'uzak', arka: 'arka sıraya' }[p.vurus.tur];
        Kit.metin(c, `Can ${Math.round(p.can * AYAR.canCarpan)}${p.zirh ? ' · zırh %' + Math.round(p.zirh * 100) : ''} · vuruş ${Math.round(p.vurus.hasar * AYAR.vurusCarpan)} ${tur}`, K.x + K.w / 2, K.y + 172, { boyut: 11, renk: '#ddd', kalin: false });
        let y = K.y + 190;
        const blok = (tus, ad, alt, metin, rk) => {
          Kit.metin(c, tus + ' ' + ad, K.x + 10, y + 8, { boyut: 13, renk: rk, hiza: 'left' });
          Kit.metin(c, alt, K.x + K.w - 10, y + 8, { boyut: 11, renk: '#9a96a8', hiza: 'right', kalin: false });
          y += 18;
          y += Kit.metinKutu(c, metin, K.x + 10, y, K.w - 20, { boyut: 11, satir: 13, renk: '#bbb' }) + 8;
        };
        blok('Q', d.ucuz.ad, p.ucuz.maliyet + ' Ritim', d.ucuz.metin(p), '#9ad');
        blok('W', d.agir.ad, p.agir.maliyet + ' Ritim', `Telegraf ${p.agir.beat + AYAR.telegrafEk} beat. ` + d.agir.metin(p), '#ffb36b');
        blok('E', d.ult.ad, 'ultimate', d.ult.metin(p), R().altin);
      });
      Kit.metin(c, 'Bot zorluğu', 640, 540, { boyut: 15, renk: '#ccc' });
      ['kolay', 'normal', 'zor'].forEach((z, i) => {
        const sec = OYUN.zorluk === z;
        if (Kit.dugme(c, 430 + i * 145, 556, 130, 44, ZORLUK_AD[z], { renk: sec ? '#d9a521' : '#3a3a4a', yaziRenk: sec ? '#1a1206' : '#ddd', ustRenk: sec ? '#f2c14e' : '#55556a', boyut: 18 })) OYUN.zorluk = z;
      });
      if (Kit.dugme(c, 330, 630, 180, 54, 'Geri', { renk: '#3a3a4a', yaziRenk: '#ddd', ustRenk: '#55556a' })) Kit.sahneDegistir(new Baslik());
      if (Kit.dugme(c, 550, 630, 180, 54, 'Rastgele', { renk: '#3a3a4a', yaziRenk: '#ddd', ustRenk: '#55556a' })) this.secilen = Kit.karistir(KAHRAMAN_SIRASI).slice(0, 3);
      if (Kit.dugme(c, 770, 630, 180, 54, this.secilen.length === 3 ? 'Başla' : `${this.secilen.length}/3`, { pasif: this.secilen.length !== 3, boyut: 24 })) this.basla();
    }
  }

  // ---------- Bitiş ----------
  class Bitis {
    constructor(mac) {
      this.mac = mac; this.S = mac.S; this.kazanan = this.S.macKazanani();
    }
    gir() {
      Kit.zamanOlcegi = 1;
      Ses.cal(this.kazanan === 0 ? 'zafer' : 'yenilgi');
      if (this.kazanan === 0) for (let i = 0; i < 6; i++) Kit.parcacik(200 + i * 176, 120, { sayi: 30, renk: [R().altin, '#fff', R().oyuncu], hiz: 420, yercekimi: 300 });
      if (OYUN.oto) otoMacBitti(this.S, this.mac.gercekSure);
    }
    guncelle() {
      if (OYUN.oto) return;
      if (Kit.tusBasildi('Enter') || Kit.tusBasildi('KeyR')) Kit.sahneDegistir(new Mac(OYUN.secim, OYUN.zorluk));
    }
    ciz(c) {
      const S = this.S, k = this.kazanan, [A, B] = S.takimlar;
      c.fillStyle = '#0d0d16'; c.fillRect(0, 0, Kit.W, Kit.H);
      Kit.metin(c, k === 0 ? 'ZAFER' : k === 1 ? 'YENİLGİ' : 'BERABERE', 640, 70, { boyut: 72, renk: k === 0 ? R().altin : k === 1 ? R().bot : '#fff', kontur: '#000', konturKalin: 8 });
      const dk = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      Kit.metin(c, `Skor ${A.skor} : ${B.skor} · ${S.raund} raund · savaş süresi ${dk(S.toplamBeat * AYAR.beatSn)} · toplam ${dk(this.mac.gercekSure)} · bot ${ZORLUK_AD[this.mac.zorluk]}`, 640, 130, { boyut: 17, renk: '#ccc', kalin: false });
      const satir = [
        ['Toplam hasar', 'hasar'], ['Kesme (rakibin büyük skilini kestin)', 'kesme'], ['Kesildi (senin büyük skilin kesildi)', 'kesildi'],
        ['Mükemmel savunma', 'mukemmel'], ['Kırmızı kareden kaçış', 'kacis'], ['Ultimate', 'ult'], ['Büyük skill (telegraf)', 'telegraf'],
        ['İyileştirme', 'iyiles'], ['Düşen kahraman', 'olum'],
      ];
      Kit.panel(c, 300, 158, 680, 32 + satir.length * 28, {});
      Kit.metin(c, 'SEN', 790, 176, { boyut: 15, renk: R().oyuncu }); Kit.metin(c, 'RAKİP', 900, 176, { boyut: 15, renk: R().bot });
      satir.forEach(([ad, a], i) => {
        const y = 204 + i * 28;
        Kit.metin(c, ad, 320, y, { boyut: 15, renk: '#ddd', hiza: 'left', kalin: false });
        Kit.metin(c, String(Math.round(A.ist[a])), 790, y, { boyut: 16, renk: A.ist[a] > B.ist[a] ? '#fff' : '#aaa' });
        Kit.metin(c, String(Math.round(B.ist[a])), 900, y, { boyut: 16, renk: B.ist[a] > A.ist[a] ? '#fff' : '#aaa' });
      });
      [A, B].forEach((T, t) => {
        const x0 = t === 0 ? 40 : 660;
        Kit.metin(c, t === 0 ? 'Senin takımın' : 'Rakip takım', x0, 482, { boyut: 15, renk: t === 0 ? R().oyuncu : R().bot, hiza: 'left' });
        T.kahramanlar.forEach((h, i) => {
          const y = 516 + i * 34;
          Kit.portre(c, Kit.gorsel('portre_' + h.id), x0 + 14, y, 14, { kenar: h.def.renk, kalin: 2 });
          Kit.metin(c, `${h.def.ad} (ult ${h.ist.ult}, hasar ${Math.round(h.ist.hasar)}): ${h.gelisimler.join(', ') || '—'}`, x0 + 36, y, { boyut: 13, renk: '#ccc', hiza: 'left', kalin: false });
        });
        if (T.takimGelisim.length) Kit.metin(c, 'Takım: ' + T.takimGelisim.join(', '), x0 + 36, 516 + 3 * 34, { boyut: 13, renk: '#7dffb0', hiza: 'left', kalin: false });
      });
      if (Kit.dugme(c, 330, 650, 190, 54, 'Tekrar', { boyut: 24 })) Kit.sahneDegistir(new Mac(OYUN.secim, OYUN.zorluk));
      if (Kit.dugme(c, 545, 650, 190, 54, 'Kahraman seç', { renk: '#3a3a4a', yaziRenk: '#ddd', ustRenk: '#55556a' })) Kit.sahneDegistir(new Secim());
      if (Kit.dugme(c, 760, 650, 190, 54, 'Başlığa dön', { renk: '#3a3a4a', yaziRenk: '#ddd', ustRenk: '#55556a' })) Kit.sahneDegistir(new Baslik());
    }
  }

  window.Baslik = Baslik; window.Secim = Secim; window.Bitis = Bitis;

  // ---------- ?oto=1 otomatik doğrulama ----------
  function otoKayit(S, gercekSn) {
    const [A, B] = S.takimlar, w = S.macKazanani();
    const r = { kazanan: w, skor: A.skor + '-' + B.skor, raund: S.raund, savasSn: S.toplamBeat * AYAR.beatSn, gercekSn,
      kesme: A.ist.kesme + B.ist.kesme, mukemmel: A.ist.mukemmel + B.ist.mukemmel, ult: A.ist.ult + B.ist.ult, kacis: A.ist.kacis + B.ist.kacis,
      takimA: A.kahramanlar.map(k => k.id).join(','), takimB: B.kahramanlar.map(k => k.id).join(',') };
    OYUN.otoSonuclar.push(r);
    console.log(`[OTO] maç ${OYUN.otoSonuclar.length}/${OYUN.otoN}: kazanan ${w === 0 ? 'A (' + OYUN.otoZorluk + ')' : w === 1 ? 'B (' + OYUN.otoRakip + ')' : 'berabere'} · skor ${r.skor} · ${r.raund} raund · savaş ${r.savasSn.toFixed(0)} sn` +
      (gercekSn != null ? ` (gerçek ${gercekSn.toFixed(1)} sn)` : '') + ` · kesme ${r.kesme} · mükemmel ${r.mukemmel} · ult ${r.ult} · kaçış ${r.kacis} · A[${r.takimA}] B[${r.takimB}]`);
  }
  function otoOzet() {
    const L = OYUN.otoSonuclar, n = L.length, say = v => L.filter(r => r.kazanan === v).length;
    const ort = a => (L.reduce((s, r) => s + r[a], 0) / n);
    const raundSn = L.reduce((s, r) => s + r.savasSn, 0) / L.reduce((s, r) => s + r.raund, 0);
    const ozet = `[OTO] ÖZET ${n} maç · A(${OYUN.otoZorluk}) ${say(0)} · B(${OYUN.otoRakip}) ${say(1)} · berabere ${say(-1)} · ort. raund ${ort('raund').toFixed(2)} · ort. savaş ${ort('savasSn').toFixed(0)} sn · ort. raund ${raundSn.toFixed(1)} sn · maç başı kesme ${ort('kesme').toFixed(1)}, mükemmel ${ort('mukemmel').toFixed(1)}, ult ${ort('ult').toFixed(1)} · hata ${OYUN.otoHata}`;
    console.log(ozet);
    window.OTO_OZET = ozet; window.OTO_BITTI = true;
  }
  function otoMacBitti(S, gercekSn) {
    otoKayit(S, gercekSn);
    if (OYUN.otoSonuclar.length >= OYUN.otoN) { otoOzet(); return; }
    setTimeout(() => Kit.sahneDegistir(new Secim()), 50);
  }

  // Görüntüsüz hızlı koşu (?oto=1&hizli=1): aynı kurallar, ekran yok
  function otoHizliKos() {
    let i = 0;
    const adim = () => {
      const bas = performance.now();
      while (i < OYUN.otoN && performance.now() - bas < 30) {
        const S = new Savas(Kit.karistir(KAHRAMAN_SIRASI).slice(0, 3), Kit.karistir(KAHRAMAN_SIRASI).slice(0, 3));
        const botlar = [new Bot(S, 0, OYUN.otoZorluk), new Bot(S, 1, OYUN.otoRakip)];
        let koruma = 0;
        for (;;) {
          S.raundBaslat();
          while (S.durum === 'savas') { S.beatIlerle(); for (const B of botlar) B.dusun(); if (++koruma > 20000) throw new Error('bitmeyen maç'); }
          if (S.macBitti()) break;
          S.rastgeleGelisim(0, S.kazanan !== 0); S.rastgeleGelisim(1, S.kazanan !== 1);
        }
        otoKayit(S, null); i++;
      }
      if (i < OYUN.otoN) setTimeout(adim, 0); else otoOzet();
    };
    adim();
  }
  const Bekle = { ciz(c) { c.fillStyle = '#0d0d16'; c.fillRect(0, 0, Kit.W, Kit.H); Kit.metin(c, `[OTO] hızlı koşu: ${OYUN.otoSonuclar.length}/${OYUN.otoN} maç`, 640, 340, { boyut: 30 }); if (window.OTO_OZET) Kit.metinKutu(c, window.OTO_OZET, 140, 390, 1000, { boyut: 16, renk: '#ccc' }); } };

  window.addEventListener('error', e => { if (OYUN.oto) { OYUN.otoHata++; console.error('[OTO] HATA', e.message, e.filename, e.lineno); } });

  // Test kancası (?elle=1): tarayıcı sekmesi arka plandayken kare döngüsü durur; kareler konsoldan F1_KARE(n) ile ilerletilir
  if (P.get('elle') === '1') {
    let t = 0;
    window.requestAnimationFrame = cb => { window.__kare = cb; return 1; };
    window.F1_KARE = (n, ms) => { for (let i = 0; i < (n || 1); i++) { const cb = window.__kare; window.__kare = null; if (cb) cb(t += (ms || 1000 / 60)); } return t; };
  }

  window.addEventListener('load', () => {
    KarakterGorselleriYukle('../ortak/');
    if (OYUN.oto && OYUN.otoHizli) { Kit.baslat(Bekle); otoHizliKos(); return; }
    if (OYUN.oto) console.log(`[OTO] görsel otomatik maç başlıyor: ${OYUN.otoN} maç, hız ×${OYUN.otoHiz}, A ${OYUN.otoZorluk} / B ${OYUN.otoRakip}`);
    Kit.baslat(new Baslik());
  });
})();
