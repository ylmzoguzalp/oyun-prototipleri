// F1 kahraman verisi: sayılar (p0), skill etkileri ve raund arası gelişim dalları.
// p0 yalnız sayı tutar (her maçta kopyalanır, gelişimler kopyayı değiştirir); etkiler S (Savas) yardımcılarını çağırır.
// Skill sayıları brief'teki başlangıç değerleridir; genel çarpanlar savas.js AYAR'da.
(function () {
  const sk = x => window.sk(x);
  const sn = beat => (beat / 2).toString().replace('.', ',');
  // Dal metinlerinde oyundaki gerçek (çarpanlı) değerler görünsün
  const v = x => Math.round(x * AYAR.vurusCarpan), c = x => Math.round(x * AYAR.canCarpan);

  window.KAHRAMAN_VERI = {
    muhafiz: {
      id: 'muhafiz', ad: 'Kum Devi', onde: true, rol: 'Ön saf · kalkan · sersem', renk: '#d9772b',
      p0: { can: 150, zirh: 0.2, diken: 0, canCal: 0,
        vurus: { hasar: 6, periyot: 2, tur: 'yakin' },
        ucuz: { maliyet: 2, kalkan: 30, sure: 8 },
        agir: { maliyet: 4, beat: 3, hasar: 18, sersem: 2 },
        ult: { hasar: 25, sersem: 3 } },
      ucuz: { ad: 'Kum Kalkanı', hedef: 'dost', ses: 'kalkan',
        metin: p => `Bir dosta ${sk(p.ucuz.kalkan)} kalkan (${sn(p.ucuz.sure)} sn).`,
        calis(S, k, h) { S.kalkanVer(h, sk(k.p.ucuz.kalkan), k.p.ucuz.sure); } },
      agir: { ad: 'Kum Seli', kilit: 'kare', hedef: 'onSutun',
        metin: p => `Kare: rakip ön sütuna ${sk(p.agir.hasar)} + ${p.agir.sersem} beat sersem.`,
        kareler: () => [{ s: 0, r: 0 }, { s: 0, r: 1 }],
        patla(S, k, tel) {
          for (const h of S.karelerdekiler(1 - k.taraf, tel.kareler))
            if (S.hasar(k, h, sk(k.p.agir.hasar), { tur: 'skill', buyuk: true }) !== null) S.sersemlet(k, h, k.p.agir.sersem);
        } },
      ult: { ad: 'Devin Yumruğu', hedef: 'yok',
        metin: p => `Rakip ön sütuna ${sk(p.ult.hasar)} + ${p.ult.sersem} beat sersem.`,
        calis(S, k) {
          for (const h of S.sutundakiler(1 - k.taraf, 0)) { S.hasar(k, h, sk(k.p.ult.hasar), { tur: 'ult' }); S.sersemlet(k, h, k.p.ult.sersem); }
        } },
      dallar: [
        [{ ad: 'Hafif Kalkan', metin: 'Kum Kalkanı 1 Ritim’e iner', f: p => { p.ucuz.maliyet = 1; } },
         { ad: 'Kaya Kalkan', metin: () => `Kum Kalkanı ${sk(30)} → ${sk(45)}`, f: p => { p.ucuz.kalkan = 45; } }],
        [{ ad: 'Bataklık', metin: 'Kum Seli sersemi 2 → 3 beat', f: p => { p.agir.sersem = 3; } },
         { ad: 'Ani Sel', metin: 'Kum Seli sayacı 1 beat kısalır', f: p => { p.agir.beat = 2; } }],
        [{ ad: 'Kale', metin: () => `+${c(30)} can`, f: p => { p.can += 30; } },
         { ad: 'Diken Zırh', metin: 'Ona düz vuran 5 hasar alır', f: p => { p.diken = 5; } }],
      ],
    },

    duellocu: {
      id: 'duellocu', ad: 'Yemin Şövalyesi', onde: true, rol: 'Düellocu · kesme ustası', renk: '#c23b3b',
      p0: { can: 115, zirh: 0, diken: 0, canCal: 0,
        vurus: { hasar: 9, periyot: 2, tur: 'yakin' },
        ucuz: { maliyet: 2, hasar: 14, sersem: 1 },
        agir: { maliyet: 3, beat: 2, hasar: 34 },
        ult: { hasar: 16, adet: 3 } },
      ucuz: { ad: 'Atılım', hedef: 'rakip', ses: 'vurus',
        metin: p => `Hedefe ${sk(p.ucuz.hasar)} + ${p.ucuz.sersem} beat sersem. KESER.`,
        calis(S, k, h) { if (S.hasar(k, h, sk(k.p.ucuz.hasar), { tur: 'skill' }) !== null) S.sersemlet(k, h, k.p.ucuz.sersem); } },
      agir: { ad: 'Yemin Kesiği', kilit: 'kahraman', hedef: 'rakip',
        metin: p => `Kahramana kilitli: ${sk(p.agir.hasar)} hasar.`,
        patla(S, k, tel) { S.hasar(k, tel.hedef, sk(k.p.agir.hasar), { tur: 'skill', buyuk: true }); } },
      ult: { ad: 'Kılıç Yemini', hedef: 'rakip',
        metin: p => `Hedefe ${p.ult.adet} × ${sk(p.ult.hasar)} hasar.`,
        calis(S, k, h) {
          for (let i = 0; i < k.p.ult.adet; i++) {
            const t = h && !h.olu ? h : S.enZayif(1 - k.taraf);
            if (t) S.hasar(k, t, sk(k.p.ult.hasar), { tur: 'ult' });
          }
        } },
      dallar: [
        [{ ad: 'Çevik Atılım', metin: 'Atılım 1 Ritim’e iner', f: p => { p.ucuz.maliyet = 1; } },
         { ad: 'Sarsıcı Atılım', metin: 'Atılım sersemi 1 → 2 beat', f: p => { p.ucuz.sersem = 2; } }],
        [{ ad: 'Ağır Yemin', metin: () => `Yemin Kesiği ${sk(34)} → ${sk(46)}`, f: p => { p.agir.hasar = 46; } },
         { ad: 'Çabuk Yemin', metin: 'Yemin Kesiği sayacı 1 beat kısalır', f: p => { p.agir.beat = 1; } }],
        [{ ad: 'Kan Hırsı', metin: 'Düz vuruşun %35’i can olur', f: p => { p.canCal = 0.35; } },
         { ad: 'Keskin Kılıç', metin: () => `Düz vuruş ${v(9)} → ${v(12)}`, f: p => { p.vurus.hasar = 12; } }],
      ],
    },

    kor_ustasi: {
      id: 'kor_ustasi', ad: 'Kor Ustası', onde: false, rol: 'Büyücü · alan · yanma', renk: '#ff5a1f',
      p0: { can: 85, zirh: 0, diken: 0, canCal: 0,
        vurus: { hasar: 7, periyot: 2, tur: 'uzak' },
        ucuz: { maliyet: 1, hasar: 8, yanma: 3, sure: 4, iki: 0 },
        agir: { maliyet: 4, beat: 3, hasar: 30, genis: 0, yanma: 0 },
        ult: { hasar: 18, yanma: 3, sure: 4 } },
      ucuz: { ad: 'Kıvılcım', hedef: 'rakip', ses: 'ates',
        metin: p => `${sk(p.ucuz.hasar)} + yanma ${p.ucuz.yanma}/beat (${p.ucuz.sure} beat)${p.ucuz.iki ? ', iki hedefe' : ''}.`,
        calis(S, k, h) {
          const u = k.p.ucuz;
          const hedefler = [h];
          if (u.iki) { const d = S.rakipler(k).filter(x => x !== h); if (d.length) hedefler.push(d[Math.floor(Math.random() * d.length)]); }
          for (const t of hedefler) if (S.hasar(k, t, sk(u.hasar), { tur: 'skill' }) !== null) S.yanmaVer(k, t, u.yanma, u.sure);
        } },
      agir: { ad: 'Alev Topu', kilit: 'kare', hedef: 'sira',
        metin: p => `Kare: seçilen rakip sırasına ${sk(p.agir.hasar)}${p.agir.genis ? ' (+ öbür ön kare)' : ''}${p.agir.yanma ? ' + yanma' : ''}.`,
        kareler(S, k, secim) {
          const r = secim ? secim.r : 0;
          const d = [{ s: 0, r }, { s: 1, r }];
          if (k.p.agir.genis) d.push({ s: 0, r: 1 - r });
          return d;
        },
        patla(S, k, tel) {
          for (const h of S.karelerdekiler(1 - k.taraf, tel.kareler))
            if (S.hasar(k, h, sk(k.p.agir.hasar), { tur: 'skill', buyuk: true }) !== null && k.p.agir.yanma) S.yanmaVer(k, h, k.p.agir.yanma, 4);
        } },
      ult: { ad: 'Kor Fırtınası', hedef: 'yok',
        metin: p => `Bütün rakiplere ${sk(p.ult.hasar)} + yanma ${p.ult.yanma}/beat.`,
        calis(S, k) {
          for (const h of S.rakipler(k)) if (S.hasar(k, h, sk(k.p.ult.hasar), { tur: 'ult' }) !== null) S.yanmaVer(k, h, k.p.ult.yanma, k.p.ult.sure);
        } },
      dallar: [
        [{ ad: 'Geniş Alev', metin: 'Alev Topu öbür ön kareye de taşar (3 kare)', f: p => { p.agir.genis = 1; } },
         { ad: 'Kor Yatağı', metin: 'Alev Topu yanma bırakır (4/beat)', f: p => { p.agir.yanma = 4; } }],
        [{ ad: 'Kızgın Kıvılcım', metin: 'Kıvılcım yanması 3 → 5', f: p => { p.ucuz.yanma = 5; } },
         { ad: 'Çatal Kıvılcım', metin: 'Kıvılcım ikinci bir rakibe de sıçrar', f: p => { p.ucuz.iki = 1; } }],
        [{ ad: 'Kor Kalbi', metin: () => `+${c(25)} can`, f: p => { p.can += 25; } },
         { ad: 'Isı Dalgası', metin: 'Kor Fırtınası yanması 3 → 6', f: p => { p.ult.yanma = 6; } }],
      ],
    },

    nisanci: {
      id: 'nisanci', ad: 'Yıldız Okçusu', onde: false, rol: 'Nişancı · tek hedef', renk: '#7fb8ff',
      p0: { can: 80, zirh: 0, diken: 0, canCal: 0,
        vurus: { hasar: 11, periyot: 3, tur: 'uzak' },
        ucuz: { maliyet: 1, hasar: 8, adet: 2, sersem: 0 },
        agir: { maliyet: 3, beat: 3, hasar: 42 },
        ult: { hasar: 10, dalga: 3 } },
      ucuz: { ad: 'Çift Ok', hedef: 'rakip', ses: 'ok',
        metin: p => `Hedefe ${p.ucuz.adet} × ${sk(p.ucuz.hasar)}${p.ucuz.sersem ? ' + 1 beat sersem' : ''}.`,
        calis(S, k, h) {
          let vurdu = false;
          for (let i = 0; i < k.p.ucuz.adet; i++) if (S.hasar(k, h, sk(k.p.ucuz.hasar), { tur: 'skill' }) !== null) vurdu = true;
          if (vurdu && k.p.ucuz.sersem) S.sersemlet(k, h, k.p.ucuz.sersem);
        } },
      agir: { ad: 'Keskin Nişan', kilit: 'kahraman', hedef: 'rakip',
        metin: p => `Kahramana kilitli: ${sk(p.agir.hasar)} hasar.`,
        patla(S, k, tel) { S.hasar(k, tel.hedef, sk(k.p.agir.hasar), { tur: 'skill', buyuk: true }); } },
      ult: { ad: 'Yıldız Yağmuru', hedef: 'yok',
        metin: p => `Bütün rakip karelere ${p.ult.dalga} dalga × ${sk(p.ult.hasar)}.`,
        calis(S, k) {
          for (let i = 0; i < k.p.ult.dalga; i++)
            S.zamanla(i, () => { for (const h of S.rakipler(k)) S.hasar(k, h, sk(k.p.ult.hasar), { tur: 'ult' }); S.olay('dalga', { k }); });
        } },
      dallar: [
        [{ ad: 'Hızlı Nişan', metin: 'Keskin Nişan sayacı 1 beat kısalır', f: p => { p.agir.beat = 2; } },
         { ad: 'Delici Nişan', metin: () => `Keskin Nişan ${sk(42)} → ${sk(55)}`, f: p => { p.agir.hasar = 55; } }],
        [{ ad: 'Üçlü Ok', metin: 'Çift Ok üç ok atar', f: p => { p.ucuz.adet = 3; } },
         { ad: 'Sersemletici Ok', metin: 'Çift Ok 1 beat sersemletir (KESER)', f: p => { p.ucuz.sersem = 1; } }],
        [{ ad: 'Hızlı Yay', metin: 'Düz vuruş 3 → 2 beat’te bir', f: p => { p.vurus.periyot = 2; } },
         { ad: 'Yıldız Seli', metin: 'Yıldız Yağmuru 4 dalga', f: p => { p.ult.dalga = 4; } }],
      ],
    },

    zaman_ustasi: {
      id: 'zaman_ustasi', ad: 'Kum Saati Cini', onde: false, rol: 'Destek · iyileştirme · sersem', renk: '#e0b24a',
      p0: { can: 90, zirh: 0, diken: 0, canCal: 0,
        vurus: { hasar: 5, periyot: 2, tur: 'uzak' },
        ucuz: { maliyet: 2, iyiles: 28, takim: 0 },
        agir: { maliyet: 3, beat: 2, sersem: 4 },
        ult: { ritim: 3, hiz: 6 } },
      ucuz: { ad: 'Geri Sar', hedef: 'dost', ses: 'iyiles',
        metin: p => p.ucuz.takim ? `Bütün takıma ${sk(16)} can.` : `Bir dosta ${sk(p.ucuz.iyiles)} can.`,
        calis(S, k, h) {
          if (k.p.ucuz.takim) for (const d of S.dostlar(k)) S.iyiles(k, d, sk(16));
          else S.iyiles(k, h, sk(k.p.ucuz.iyiles));
        } },
      agir: { ad: 'Zamanı Dondur', kilit: 'kare', hedef: 'sutun',
        metin: p => `Kare: seçilen rakip sütunu ${p.agir.sersem} beat sersem (hasarsız).`,
        kareler: (S, k, secim) => { const s = secim ? secim.s : 0; return [{ s, r: 0 }, { s, r: 1 }]; },
        patla(S, k, tel) {
          for (const h of S.karelerdekiler(1 - k.taraf, tel.kareler))
            if (S.hasar(k, h, 0, { tur: 'skill', buyuk: true }) !== null) S.sersemlet(k, h, k.p.agir.sersem);
        } },
      ult: { ad: 'Kum Akışı', hedef: 'yok',
        metin: p => `Takıma +${p.ult.ritim} Ritim; ${p.ult.hiz} beat düz vuruşlar iki kat hızlı.`,
        calis(S, k) {
          S.ritimEkle(k.taraf, k.p.ult.ritim);
          for (const d of S.dostlar(k)) d.hiz = Math.max(d.hiz, k.p.ult.hiz);
        } },
      dallar: [
        [{ ad: 'Derin Geri Sar', metin: () => `Geri Sar ${sk(28)} → ${sk(40)}`, f: p => { p.ucuz.iyiles = 40; } },
         { ad: 'Toplu Geri Sar', metin: () => `Geri Sar bütün takıma ${sk(16)}`, f: p => { p.ucuz.takim = 1; } }],
        [{ ad: 'Anlık Donma', metin: 'Zamanı Dondur sayacı 1 beat kısalır', f: p => { p.agir.beat = 1; } },
         { ad: 'Uzun Donma', metin: 'Zamanı Dondur sersemi 4 → 6 beat', f: p => { p.agir.sersem = 6; } }],
        [{ ad: 'Bol Kum', metin: 'Kum Akışı +3 → +5 Ritim', f: p => { p.ult.ritim = 5; } },
         { ad: 'Uzun Akış', metin: 'Kum Akışı hızı 6 → 10 beat', f: p => { p.ult.hiz = 10; } }],
      ],
    },

    infazci: {
      id: 'infazci', ad: 'Kuzgun', onde: true, rol: 'Suikastçı · arka sırayı vurur', renk: '#9b2335',
      p0: { can: 90, zirh: 0, diken: 0, canCal: 0,
        vurus: { hasar: 8, periyot: 2, tur: 'arka' },
        ucuz: { maliyet: 2, hasar: 12, kanama: 0 },
        agir: { maliyet: 4, beat: 2, hasar: 26, esik: 0.4, iade: 0 },
        ult: { hasar: 15, kanama: 2, sure: 5 } },
      ucuz: { ad: 'Gölge Adımı', hedef: 'rakip', ses: 'vurus',
        metin: p => `Herhangi bir rakibe ${sk(p.ucuz.hasar)}${p.ucuz.kanama ? ' + kanama 3/beat' : ''}.`,
        calis(S, k, h) { if (S.hasar(k, h, sk(k.p.ucuz.hasar), { tur: 'skill' }) !== null && k.p.ucuz.kanama) S.kanamaVer(k, h, 3, 4); } },
      agir: { ad: 'İnfaz', kilit: 'kahraman', hedef: 'rakip',
        metin: p => `Kahramana kilitli: ${sk(p.agir.hasar)}; hedefin canı %${Math.round(p.agir.esik * 100)} altındaysa ×2.`,
        patla(S, k, tel) {
          const h = tel.hedef, a = k.p.agir;
          const kat = h.can / h.maxCan < a.esik ? 2 : 1;
          if (kat === 2) S.olay('yazi', { h, metin: 'İNFAZ ×2', renk: '#ff2e4d' });
          S.hasar(k, h, sk(a.hasar) * kat, { tur: 'skill', buyuk: true });
          if (h.olu && a.iade) S.ritimEkle(k.taraf, a.iade);
        } },
      ult: { ad: 'Kuzgun Sürüsü', hedef: 'yok',
        metin: p => `Bütün rakiplere ${sk(p.ult.hasar)} + kanama ${p.ult.kanama}/beat (${p.ult.sure} beat).`,
        calis(S, k) {
          for (const h of S.rakipler(k)) if (S.hasar(k, h, sk(k.p.ult.hasar), { tur: 'ult' }) !== null) S.kanamaVer(k, h, k.p.ult.kanama, k.p.ult.sure);
        } },
      dallar: [
        [{ ad: 'Sessiz Adım', metin: 'Gölge Adımı 1 Ritim’e iner', f: p => { p.ucuz.maliyet = 1; } },
         { ad: 'Kanlı Adım', metin: 'Gölge Adımı kanatır (3/beat, 4 beat)', f: p => { p.ucuz.kanama = 1; } }],
        [{ ad: 'Kan Kokusu', metin: 'İnfaz eşiği %40 → %55', f: p => { p.agir.esik = 0.55; } },
         { ad: 'Hasat', metin: 'İnfaz öldürürse 2 Ritim geri', f: p => { p.agir.iade = 2; } }],
        [{ ad: 'Kuzgun Gözü', metin: () => `Düz vuruş ${v(8)} → ${v(11)}`, f: p => { p.vurus.hasar = 11; } },
         { ad: 'Kara Sürü', metin: 'Kuzgun Sürüsü kanaması 2 → 4', f: p => { p.ult.kanama = 4; } }],
      ],
    },
  };

  // Bir kahramanın dalları bitince (4. raund arası) gelen genel seçim
  window.GENEL_DAL = [
    { ad: 'Güç', metin: 'Düz vuruş +%20', f: p => { p.vurus.hasar *= 1.2; } },
    { ad: 'Dayanıklılık', metin: '+%15 can', f: p => { p.can *= 1.15; } },
  ];

  // Raundu kaybedenin ek takım seçimi (ikisi rastgele sunulur)
  window.TAKIM_GELISIM = [
    { ad: 'Erken Ritim', metin: 'Raund başında +1 Ritim', f: b => { b.ritimBas += 1; } },
    { ad: 'Sağlam Saf', metin: 'Takıma +%12 can', f: b => { b.can *= 1.12; } },
    { ad: 'Hızlı Nabız', metin: 'Ritim %20 hızlı dolar', f: b => { b.ritimHiz *= 1.2; } },
    { ad: 'Öfke', metin: 'Ultimate halkaları %30 hızlı dolar', f: b => { b.ultHiz *= 1.3; } },
    { ad: 'Keskin Takım', metin: 'Düz vuruşlar +%15', f: b => { b.vurus *= 1.15; } },
  ];

  window.KAHRAMAN_SIRASI = ['muhafiz', 'duellocu', 'kor_ustasi', 'nisanci', 'zaman_ustasi', 'infazci'];
})();
