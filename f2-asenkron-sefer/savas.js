// F2 Asenkron Sefer — otomatik savaş simülasyonu.
// Sabit adımla ilerler (ADIM sn); görsel sahne ve başsız (headless) koşu aynı kodu kullanır.
// Ekrana bir şey çizmez; olup biteni `olaylar` dizisine yazar, sahne oradan efekt üretir.
(function (G) {
  'use strict';
  const F2 = G.F2;
  F2.ADIM = 0.05;

  F2.rng = function (tohum) {
    let a = tohum >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };

  // Takımdaki etiket sayıları (aynı kahramanın iki kopyası bir sayılır)
  F2.etiketSay = function (takim) {
    const say = {}, gorulen = {};
    for (const k of takim) {
      if (!k || gorulen[k.id]) continue;
      gorulen[k.id] = true;
      const d = F2.KAHRAMAN[k.id];
      say[d.rol] = (say[d.rol] || 0) + 1;
      say[d.koken] = (say[d.koken] || 0) + 1;
    }
    return say;
  };
  // Etkin bonus kademeleri: { kum: 1 (2'li), gece: 2 (3'lü), ... }
  F2.etiketKademe = function (say) {
    const sonuc = {};
    const tablolar = [F2.ROLLER, F2.KOKENLER];
    for (const tablo of tablolar) for (const k in tablo) {
      const n = say[k] || 0; let kd = 0;
      tablo[k].esik.forEach((e, i) => { if (n >= e) kd = i + 1; });
      if (kd) sonuc[k] = kd;
    }
    return sonuc;
  };

  // takim: [{id, lvl, dal, esyalar, kol, sira, kuid}]
  F2.Savas = function (takimA, takimB, tohum) {
    const sim = this;
    const rnd = F2.rng(tohum || 1);
    sim.zaman = 0; sim.bitti = false; sim.kazanan = null; sim.olaylar = [];
    sim.birimler = []; sim.zamanli = [];
    sim.firtinaSayac = 0; sim.firtinaIlan = false;
    sim.diriltmeKullanildi = [false, false];
    let uidSay = 1;

    function olay(o) { o.t = sim.zaman; sim.olaylar.push(o); }

    function birimYap(k, takim) {
      const d = F2.KAHRAMAN[k.id];
      const kat = F2.SEVIYE_KAT[k.lvl];
      const u = {
        uid: uidSay++, kuid: k.kuid, id: k.id, d, takim, kol: k.kol, sira: k.sira, lvl: k.lvl,
        dal: k.dal == null ? null : k.dal, pasif: k.lvl >= 3, esyalar: (k.esyalar || []).slice(),
        kat, maxCan: d.can * kat, can: 0, kalkan: 0, atk: d.atk * kat,
        hasarCarpan: 1, hizCarpan: 1, dolumCarpan: 1, skillCarpan: 1, alinanCarpan: 1,
        kritik: 0, ilkKritik: false, yakar: null, diken: 0, cal: 0, muhur: false,
        aralik: d.hiz, sayac: d.hiz * (0.35 + rnd() * 0.4), dolum: rnd() * 0.12, tel: null,
        sersem: 0, hizBuff: 0, hizBuffKat: 1, dotlar: [], vurusSayisi: 0, olu: false,
        toplamHasar: 0, oldurme: 0, alinanHasar: 0,
      };
      for (const e of u.esyalar) {
        if (e === 'kalkan') u.kalkan += 30;
        else if (e === 'tuy') { u.ilkKritik = true; u.kritik += 0.1; }
        else if (e === 'eldiven') u.hasarCarpan *= 1.25;
        else if (e === 'kortasi') u.yakar = { dps: 3, sure: 3 };
        else if (e === 'kumsaati') u.dolumCarpan *= 1.25;
        else if (e === 'muhur') u.muhur = true;
        else if (e === 'cizme') u.hizCarpan *= 1.25;
        else if (e === 'kemer') u.maxCan += 50;
        else if (e === 'diken') { u.maxCan += 30; u.diken = 6; }
        else if (e === 'aytasi') u.skillCarpan *= 1.4;
        else if (e === 'kadeh') u.cal += 0.2;
      }
      if (u.pasif) {
        if (u.id === 'muhafiz') u.alinanCarpan *= 0.75;
        if (u.id === 'duellocu') u.cal += 0.2;
        if (u.id === 'nisanci') u.kritik += 0.25;
      }
      return u;
    }

    function takimKur(takim, t) {
      const birimler = takim.filter(Boolean).map(k => birimYap(k, t));
      const kd = F2.etiketKademe(F2.etiketSay(takim.filter(Boolean)));
      for (const u of birimler) {
        if (kd.tank && u.kol === 0) u.maxCan *= 1.25;
        if (kd.savasci && u.d.rol === 'savasci') u.hasarCarpan *= 1.2;
        if (kd.nisanci && u.d.rol === 'nisanci') u.hizCarpan *= 1.3;
        if (kd.buyucu) u.dolumCarpan *= 1.25;
        if (kd.kum) u.kalkan += kd.kum >= 2 ? 35 : 15;
        if (kd.kor && (kd.kor >= 2 || u.d.koken === 'kor')) u.yakar = u.yakar ? { dps: u.yakar.dps + 2, sure: 3 } : { dps: 2, sure: 3 };
        if (kd.gece) u.kritik += kd.gece >= 2 ? 0.3 : 0.15;
      }
      for (const u of birimler) if (u.pasif && u.id === 'oncu') for (const v of birimler) v.kalkan += 30;
      for (const u of birimler) u.can = u.maxCan;
      return { birimler, kademe: kd };
    }

    const a = takimKur(takimA, 0), b = takimKur(takimB, 1);
    sim.birimler = a.birimler.concat(b.birimler);
    sim.kademeler = [a.kademe, b.kademe];

    // ---------- yardımcılar ----------
    const canli = t => sim.birimler.filter(u => !u.olu && u.takim === t);
    const hucredeki = (t, kol, sira) => sim.birimler.find(u => !u.olu && u.takim === t && u.kol === kol && u.sira === sira);
    sim.uid = id => sim.birimler.find(u => u.uid === id);

    function hedefSec(u) {
      const r = 1 - u.takim;
      const sira = [[0, u.sira], [0, 1 - u.sira], [1, u.sira], [1, 1 - u.sira]];
      if (u.d.menzil === 'atlar') sira.unshift([1, u.sira], [1, 1 - u.sira]);
      for (const [kol, s] of sira) { const h = hucredeki(r, kol, s); if (h) return h; }
      return null;
    }
    // Rakibin en kalabalık sırası (eşitse toplam canı az olan)
    function enIyiSira(r) {
      let en = 0, enPuan = -1;
      for (let s = 0; s < 2; s++) {
        const us = [hucredeki(r, 0, s), hucredeki(r, 1, s)].filter(Boolean);
        const puan = us.length * 1000 - us.reduce((t, u) => t + u.can, 0) / 10;
        if (puan > enPuan) { enPuan = puan; en = s; }
      }
      return en;
    }
    function sutunDolu(r, kol) { return [hucredeki(r, kol, 0), hucredeki(r, kol, 1)].filter(Boolean).length; }

    function iyiles(u, miktar, kaynak) {
      if (u.olu || miktar <= 0) return;
      const once = u.can;
      u.can = Math.min(u.maxCan, u.can + miktar);
      const m = u.can - once;
      if (m >= 1) olay({ tip: 'iyiles', hedef: u.uid, miktar: Math.round(m), kaynak: kaynak && kaynak.uid });
    }
    function kalkanVer(u, miktar, kaynak) {
      if (u.olu) return;
      u.kalkan += miktar;
      olay({ tip: 'kalkan', hedef: u.uid, miktar: Math.round(miktar), kaynak: kaynak && kaynak.uid });
    }
    function sersemlet(u, sure) {
      if (u.olu) return;
      u.sersem = Math.max(u.sersem, sure);
      olay({ tip: 'sersem', hedef: u.uid, sure });
      if (u.tel) { olay({ tip: 'kesildi', kaynak: u.uid, ad: u.tel.ad }); u.tel = null; }
    }
    function dotEkle(u, tur, dps, sure, kaynak) {
      if (u.olu) return;
      const var_ = u.dotlar.find(d => d.tur === tur);
      if (var_) { var_.dps = Math.max(var_.dps, dps); var_.kalan = Math.max(var_.kalan, sure); var_.kaynak = kaynak; }
      else u.dotlar.push({ tur, dps, kalan: sure, tik: 0, kaynak });
    }

    function hasar(kaynak, hedef, miktar, tur, kritik) {
      if (!hedef || hedef.olu || miktar <= 0) return 0;
      let m = miktar * hedef.alinanCarpan;
      let emilen = 0;
      if (hedef.kalkan > 0) { emilen = Math.min(hedef.kalkan, m); hedef.kalkan -= emilen; }
      const kalan = m - emilen;
      hedef.can -= kalan;
      hedef.alinanHasar += m;
      if (kaynak) kaynak.toplamHasar += m;
      olay({ tip: 'hasar', hedef: hedef.uid, kaynak: kaynak && kaynak.uid, miktar: Math.round(m), emilen: Math.round(emilen), tur, kritik: !!kritik });
      if (kaynak && !kaynak.olu && kaynak.cal > 0 && (tur === 'duz' || tur === 'skill')) iyiles(kaynak, m * kaynak.cal);
      if (hedef.can > 0 && hedef.muhur && hedef.can < hedef.maxCan * 0.3) {
        hedef.muhur = false; iyiles(hedef, 50); olay({ tip: 'yazi', hedef: hedef.uid, metin: 'Yemin Mührü!', renk: '#ff8080' });
      }
      if (hedef.can <= 0) olum(hedef, kaynak);
      return m;
    }

    function olum(h, kaynak) {
      // Kum Saati Cini seviye 3: savaşta bir kez ilk ölen dost geri döner
      if (!sim.diriltmeKullanildi[h.takim]) {
        const cin = canli(h.takim).find(u => u.pasif && u.id === 'zaman_ustasi' && u !== h);
        if (cin) {
          sim.diriltmeKullanildi[h.takim] = true;
          h.can = h.maxCan * 0.5; h.dotlar = [];
          olay({ tip: 'diril', hedef: h.uid, kaynak: cin.uid });
          return;
        }
      }
      h.olu = true; h.can = 0;
      if (h.tel) h.tel = null;
      olay({ tip: 'olum', hedef: h.uid, kaynak: kaynak && kaynak.uid });
      if (kaynak) kaynak.oldurme++;
      if (h.esyalar.includes('fici')) {
        const r = 1 - h.takim;
        sim.zamanli.push({ t: sim.zaman + 0.3, f: () => {
          const hedefler = [hucredeki(r, 0, 0), hucredeki(r, 0, 1)].filter(Boolean);
          olay({ tip: 'patlama', takim: r, hucreler: [[0, 0], [0, 1]], renk: '#ffb347', ad: 'Barut Fıçısı' });
          for (const t of hedefler) hasar(h, t, 30, 'esya');
        } });
      }
      for (const u of canli(1 - h.takim)) {
        if (!u.pasif) continue;
        if (u.id === 'kor_ustasi' && !u.tel) u.dolum = Math.min(1, u.dolum + 0.35);
        if (u.id === 'infazci') { iyiles(u, 25 * 1); u.hasarCarpan *= 1.1; }
      }
    }

    // ---------- skiller ----------
    function skillBasla(u) {
      const d = u.d, r = 1 - u.takim, k = u.kat * u.skillCarpan;
      const tel = { ad: d.skill.ad, toplam: d.skill.tel, kalan: d.skill.tel, hucreler: null, hedefUid: null };
      const id = u.id;
      if (id === 'muhafiz') {
        const dostlar = canli(u.takim).sort((x, y) => x.can / x.maxCan - y.can / y.maxCan);
        olay({ tip: 'skill', kaynak: u.uid, ad: d.skill.ad });
        if (u.dal === 0) dostlar.slice(0, 2).forEach(x => kalkanVer(x, 30 * k, u));
        else if (u.dal === 1) { if (dostlar[0]) kalkanVer(dostlar[0], 55 * k, u); kalkanVer(u, 25 * k, u); }
        else if (dostlar[0]) kalkanVer(dostlar[0], 30 * k, u);
        return;
      }
      if (id === 'zaman_ustasi') {
        const dostlar = canli(u.takim).sort((x, y) => x.can / x.maxCan - y.can / y.maxCan);
        olay({ tip: 'skill', kaynak: u.uid, ad: d.skill.ad });
        if (u.dal === 0) dostlar.forEach(x => iyiles(x, 18 * k, u));
        else if (dostlar[0]) {
          iyiles(dostlar[0], 30 * k, u);
          if (u.dal === 1) { const x = dostlar[0]; x.hizBuff = 3; x.hizBuffKat = 1.6; if (!x.tel) x.dolum = Math.min(1, x.dolum + 0.4); olay({ tip: 'yazi', hedef: x.uid, metin: 'Hızlandı!', renk: '#ffe08a' }); }
        }
        return;
      }
      if (id === 'duellocu') {
        const h = hedefSec(u); if (!h) return;
        if (u.dal === 1) tel.hucreler = [[0, h.sira], [1, h.sira]];
        else tel.hedefUid = h.uid;
      } else if (id === 'nisanci') {
        const rs = canli(r); if (!rs.length) return;
        if (u.dal === 0) { tel.hucreler = [[0, 0], [0, 1], [1, 0], [1, 1]]; tel.ad = 'Yıldız Yağmuru'; }
        else {
          const h = rs.sort((x, y) => y.can - x.can)[0];
          tel.hedefUid = h.uid;
          if (u.dal === 1 && h.kol === 0) tel.hucreler = [[1, h.sira]];
        }
      } else if (id === 'akinci' || id === 'kor_ustasi') {
        if (!canli(r).length) return;
        if (id === 'kor_ustasi' && u.dal === 0) tel.hucreler = [[0, 0], [1, 0], [0, 1], [1, 1]];
        else { const s = enIyiSira(r); tel.hucreler = [[0, s], [1, s]]; }
      } else if (id === 'avci') {
        if (!canli(r).length) return;
        const kol = sutunDolu(r, 1) >= sutunDolu(r, 0) ? 1 : 0;
        tel.hucreler = [[kol, 0], [kol, 1]]; tel.kol = kol;
      } else if (id === 'oncu') {
        if (!canli(r).length) return;
        if (u.dal === 1) { tel.hucreler = [[0, 0], [0, 1], [1, 0], [1, 1]]; tel.ad = 'Dolunay'; }
        else { const kol = sutunDolu(r, 0) ? 0 : 1; tel.hucreler = [[kol, 0], [kol, 1]]; }
      } else if (id === 'infazci') {
        const rs = canli(r); if (!rs.length) return;
        tel.hedefUid = rs.sort((x, y) => x.can - y.can)[0].uid;
      }
      u.tel = tel;
      olay({ tip: 'telBasla', kaynak: u.uid, ad: tel.ad, sure: tel.toplam, hucreler: tel.hucreler, hedef: tel.hedefUid, takim: r });
    }

    function hucredekiler(r, hucreler) { return hucreler.map(([kol, s]) => hucredeki(r, kol, s)).filter(Boolean); }

    function skillCoz(u) {
      const tel = u.tel; u.tel = null;
      const r = 1 - u.takim, k = u.kat * u.skillCarpan, id = u.id;
      olay({ tip: 'skill', kaynak: u.uid, ad: tel.ad, hucreler: tel.hucreler, hedef: tel.hedefUid, takim: r, renk: u.d && F2.KAHRAMAN_RENK(u.id) });
      if (id === 'duellocu') {
        const hedefler = tel.hucreler ? hucredekiler(r, tel.hucreler) : [sim.uid(tel.hedefUid)].filter(x => x && !x.olu);
        let oldurdu = false;
        for (const h of hedefler) { hasar(u, h, 45 * k, 'skill'); if (h.olu) oldurdu = true; }
        if (!hedefler.length) olay({ tip: 'yazi', hedef: u.uid, metin: 'Iska', renk: '#aaa' });
        if (oldurdu && u.dal === 0) { u.dolum = 0.97; olay({ tip: 'yazi', hedef: u.uid, metin: 'Yemin tazelendi!', renk: '#ffd166' }); }
      } else if (id === 'nisanci') {
        if (u.dal === 0) {
          for (let dalga = 0; dalga < 3; dalga++) sim.zamanli.push({ t: sim.zaman + dalga * 0.22, f: () => {
            if (u.olu) return;
            olay({ tip: 'patlama', takim: r, hucreler: [[0, 0], [0, 1], [1, 0], [1, 1]], renk: '#9fd0ff', kucuk: true });
            for (const h of canli(r)) hasar(u, h, 12 * k, 'skill');
          } });
        } else {
          const h = sim.uid(tel.hedefUid);
          if (h && !h.olu) hasar(u, h, 60 * k, 'skill', true); else olay({ tip: 'yazi', hedef: u.uid, metin: 'Iska', renk: '#aaa' });
          if (tel.hucreler) for (const x of hucredekiler(r, tel.hucreler)) hasar(u, x, 60 * k, 'skill');
        }
      } else if (id === 'akinci') {
        const hedefler = hucredekiler(r, tel.hucreler);
        for (const h of hedefler) { hasar(u, h, 28 * k, 'skill'); if (u.dal === 1) sersemlet(h, 1); }
        if (u.dal === 0) { u.hizBuff = 4; u.hizBuffKat = 1.6; olay({ tip: 'yazi', hedef: u.uid, metin: 'Akın Coşkusu!', renk: '#ffe08a' }); }
      } else if (id === 'kor_ustasi') {
        for (const h of hucredekiler(r, tel.hucreler)) {
          hasar(u, h, 32 * k, 'skill');
          if (u.dal === 1) dotEkle(h, 'yanma', 10 * k, 4, u); else dotEkle(h, 'yanma', 4 * k, 3, u);
        }
      } else if (id === 'avci') {
        for (const h of hucredekiler(r, tel.hucreler)) { hasar(u, h, 34 * k, 'skill'); if (u.dal === 1) sersemlet(h, 1.5); }
        if (u.dal === 0) {
          const diger = 1 - tel.kol;
          olay({ tip: 'patlama', takim: r, hucreler: [[diger, 0], [diger, 1]], renk: '#ffb347', kucuk: true });
          for (const h of hucredekiler(r, [[diger, 0], [diger, 1]])) hasar(u, h, 20 * k, 'skill');
        }
      } else if (id === 'oncu') {
        const sure = u.dal === 0 ? 3 : u.dal === 1 ? 1 : 1.5;
        for (const h of hucredekiler(r, tel.hucreler)) { hasar(u, h, 30 * k, 'skill'); if (!h.olu) sersemlet(h, sure); }
      } else if (id === 'infazci') {
        const h = sim.uid(tel.hedefUid);
        if (h && !h.olu) {
          const iki = h.can < h.maxCan * 0.4;
          if (iki) olay({ tip: 'yazi', hedef: h.uid, metin: 'İNFAZ!', renk: '#ff4060', buyuk: true });
          hasar(u, h, 40 * k * (iki ? 2 : 1), 'skill', iki);
          if (h.olu && u.dal === 0) { u.dolum = 0.97; olay({ tip: 'yazi', hedef: u.uid, metin: 'Kanlı Av!', renk: '#ff6080' }); }
          if (!h.olu && u.dal === 1) dotEkle(h, 'kanama', 8 * k, 4, u);
        } else olay({ tip: 'yazi', hedef: u.uid, metin: 'Iska', renk: '#aaa' });
      }
    }

    function duzVurus(u, h) {
      u.vurusSayisi++;
      let m = u.atk * u.hasarCarpan;
      let kritik = false;
      if (u.ilkKritik) { kritik = true; u.ilkKritik = false; }
      else if (u.kritik > 0 && rnd() < u.kritik) kritik = true;
      if (kritik) m *= 1.8;
      if (u.pasif && u.id === 'avci' && u.vurusSayisi % 4 === 0) { m *= 3; kritik = true; }
      olay({ tip: 'vurus', kaynak: u.uid, hedef: h.uid, menzil: u.d.menzil });
      hasar(u, h, m, 'duz', kritik);
      if (u.yakar && !h.olu) dotEkle(h, 'yanma', u.yakar.dps * Math.sqrt(u.kat), u.yakar.sure, u);
      if (h.diken && u.d.menzil !== 'uzak' && !u.olu) hasar(h, u, h.diken, 'diken');
      if (u.pasif && u.id === 'akinci') {
        const arka = h.kol === 0 ? hucredeki(h.takim, 1, h.sira) : null;
        if (arka) hasar(u, arka, m * 0.5, 'duz');
      }
    }

    // ---------- ana adım ----------
    sim.adim = function (dt) {
      if (sim.bitti) return;
      sim.zaman += dt;
      for (let i = sim.zamanli.length - 1; i >= 0; i--) {
        if (sim.zamanli[i].t <= sim.zaman) { const z = sim.zamanli.splice(i, 1)[0]; z.f(); }
      }
      for (const u of sim.birimler) {
        if (u.olu) continue;
        // süreli etkiler
        for (let i = u.dotlar.length - 1; i >= 0; i--) {
          const d = u.dotlar[i];
          d.kalan -= dt; d.tik += dt;
          if (d.tik >= 0.5) { d.tik -= 0.5; hasar(d.kaynak && !d.kaynak.olu ? d.kaynak : null, u, d.dps * 0.5, d.tur); }
          if (d.kalan <= 0 || u.olu) u.dotlar.splice(i, 1);
        }
        if (u.olu) continue;
        if (u.hizBuff > 0) { u.hizBuff -= dt; if (u.hizBuff <= 0) u.hizBuffKat = 1; }
        if (u.sersem > 0) { u.sersem -= dt; continue; }
        // yakın dövüşçü arkadaysa ve önü boşalırsa öne çıkar
        if (u.d.menzil === 'yakin' && u.kol === 1 && !hucredeki(u.takim, 0, u.sira)) {
          u.kol = 0; olay({ tip: 'ilerle', kaynak: u.uid });
        }
        // telegraf
        if (u.tel) {
          u.tel.kalan -= dt;
          if (u.tel.kalan <= 0) skillCoz(u);
          continue;
        }
        u.dolum += dt * u.dolumCarpan / u.d.cd;
        if (u.dolum >= 1) {
          u.dolum = 0;
          skillBasla(u);
          if (u.tel && u.tel.toplam <= 0) skillCoz(u);
          if (u.tel) continue;
        }
        // düz vuruş
        const bekliyor = u.d.menzil === 'yakin' && u.kol === 1;
        u.bekliyor = bekliyor;
        if (bekliyor) continue;
        u.sayac -= dt * u.hizCarpan * u.hizBuffKat;
        if (u.sayac <= 0) {
          const h = hedefSec(u);
          if (h) { u.sayac += u.aralik; duzVurus(u, h); }
          else u.sayac = 0;
        }
      }
      // kum fırtınası: uzayan savaşı bitirir
      if (sim.zaman >= F2.AYAR.firtinaBaslangic) {
        if (!sim.firtinaIlan) { sim.firtinaIlan = true; olay({ tip: 'firtina' }); }
        sim.firtinaSayac += dt;
        if (sim.firtinaSayac >= 1) {
          sim.firtinaSayac -= 1;
          const m = (sim.zaman - F2.AYAR.firtinaBaslangic) * 4 + 4;
          for (const u of sim.birimler.filter(x => !x.olu)) hasar(null, u, m, 'firtina');
        }
      }
      const a0 = canli(0).length, b0 = canli(1).length;
      if (!a0 || !b0 || sim.zaman >= F2.AYAR.savasTavan) {
        sim.bitti = true;
        sim.kazanan = (!a0 && !b0) || (a0 && b0) ? 'berabere' : (a0 ? 0 : 1);
        olay({ tip: 'bitti', kazanan: sim.kazanan });
      }
    };

    // Sonuna kadar hızlı oynat (Atla düğmesi ve başsız koşu için)
    sim.sonaKadar = function () {
      let guvenlik = 0;
      while (!sim.bitti && guvenlik++ < 5000) sim.adim(F2.ADIM);
      return sim.kazanan;
    };
  };

  F2.KAHRAMAN_RENK = id => {
    const k = (G.Karakterler || []).find(x => x.id === id);
    return k ? k.renk : '#ffffff';
  };
})(typeof window !== 'undefined' ? window : globalThis);
