// F2 Asenkron Sefer — koşu durumu: dükkân, satın alma, birleşme, dizilim, alışveriş botu, hayalet takımlar.
// DOM'a bağlı değil (kayıt için yalnız localStorage, yoksa sessizce geçer).
(function (G) {
  'use strict';
  const F2 = G.F2;
  const A = F2.AYAR;

  // Alan hücresi i: kol = i % 2 (0 ön, 1 arka), sira = floor(i / 2) (0 üst, 1 alt)
  F2.hucreKol = i => i % 2;
  F2.hucreSira = i => Math.floor(i / 2);

  let kuidSay = 1;
  F2.yeniKahraman = (id, lvl) => ({ kuid: kuidSay++, id, lvl: lvl || 1, dal: null, esyalar: [] });

  F2.yeniKosu = function (tohum, zorluk) {
    const k = {
      tohum, rnd: F2.rng(tohum), zorluk: zorluk || 'normal',
      tur: 1, altin: A.altin, can: A.can, galibiyet: 0, maglubiyet: 0, berabere: 0, seri: 0, enUzunSeri: 0,
      alan: [null, null, null, null], yedek: [null, null, null],
      dukkan: [], donuk: [false, false, false, false, false],
      bitti: false, kazandi: false,
      hasarKaydi: {}, gecmisSavaslar: [], dalBekleyen: [],
      yenilenGecmis: 0, karsilasilanGecmis: 0,
    };
    F2.dukkanDoldur(k, true);
    return k;
  };

  // ---------- dükkân ----------
  function katmanSec(k) {
    const o = F2.KATMAN_OLASILIK[F2.kademe(k.tur)];
    let r = k.rnd();
    for (let i = 0; i < 3; i++) { if (r < o[i]) return i + 1; r -= o[i]; }
    return 1;
  }
  function kahramanTeklifi(k) {
    const kt = katmanSec(k);
    const liste = F2.KAHRAMANLAR.filter(h => h.katman === kt);
    return { tur: 'kahraman', id: liste[Math.floor(k.rnd() * liste.length)].id };
  }
  function esyaTeklifi(k) {
    const kt = katmanSec(k);
    const liste = F2.ESYALAR.filter(e => e.katman <= kt);
    return { tur: 'esya', id: liste[Math.floor(k.rnd() * liste.length)].id };
  }
  // yeniTur true ise donmuşlar kalır ve çözülür
  F2.dukkanDoldur = function (k, yeniTur) {
    for (let i = 0; i < A.teklifSayisi; i++) {
      if (k.donuk[i] && k.dukkan[i]) { if (yeniTur) k.donuk[i] = false; continue; }
      k.dukkan[i] = i < 4 ? kahramanTeklifi(k) : esyaTeklifi(k);
      k.donuk[i] = false;
    }
  };
  F2.yenile = function (k) {
    if (k.altin < A.yenile) return false;
    k.altin -= A.yenile;
    F2.dukkanDoldur(k, false);
    return true;
  };
  F2.dondur = function (k, i) { if (k.dukkan[i]) k.donuk[i] = !k.donuk[i]; };

  // ---------- sahiplik yardımcıları ----------
  F2.tumKahramanlar = k => k.alan.concat(k.yedek).filter(Boolean);
  F2.konumBul = function (k, kuid) {
    let i = k.alan.findIndex(h => h && h.kuid === kuid); if (i >= 0) return { yer: 'alan', i };
    i = k.yedek.findIndex(h => h && h.kuid === kuid); if (i >= 0) return { yer: 'yedek', i };
    return null;
  };
  F2.konumdaki = (k, kon) => (kon.yer === 'alan' ? k.alan : k.yedek)[kon.i];
  F2.konumaKoy = (k, kon, h) => { (kon.yer === 'alan' ? k.alan : k.yedek)[kon.i] = h; };
  F2.kopyaSay = (k, id, lvl) => F2.tumKahramanlar(k).filter(h => h.id === id && h.lvl === lvl).length;
  F2.bosYer = function (k, oncelik) {
    const sira = oncelik === 'alan' ? ['alan', 'yedek'] : ['yedek', 'alan'];
    for (const yer of sira) { const d = yer === 'alan' ? k.alan : k.yedek; const i = d.findIndex(x => !x); if (i >= 0) return { yer, i }; }
    return null;
  };
  // Bu teklifi almak birleşme yapar mı?
  F2.birlesirMi = (k, id) => F2.kopyaSay(k, id, 1) >= 2;

  // ---------- satın alma ----------
  // hedef: {yer, i} ya da null (otomatik yer). Döner: {ok, birlesmeler:[...], neden}
  F2.kahramanAl = function (k, teklifI, hedef) {
    const t = k.dukkan[teklifI];
    if (!t || t.tur !== 'kahraman') return { ok: false, neden: 'yok' };
    if (k.altin < A.kahramanFiyat) return { ok: false, neden: 'altin' };
    const birlesir = F2.birlesirMi(k, t.id);
    let yer = null;
    if (hedef && !F2.konumdaki(k, hedef)) yer = hedef;
    if (!yer) yer = F2.bosYer(k, 'yedek');
    if (!yer && !birlesir) return { ok: false, neden: 'yer' };
    k.altin -= A.kahramanFiyat;
    k.dukkan[teklifI] = null; k.donuk[teklifI] = false;
    const yeni = F2.yeniKahraman(t.id, 1);
    if (yer) F2.konumaKoy(k, yer, yeni);
    else k.gecici = yeni; // yer yok ama birleşecek
    const birlesmeler = F2.birlesmeKontrol(k, yeni);
    k.gecici = null;
    return { ok: true, kahraman: yeni, birlesmeler };
  };

  // Aynı kahramandan 3 kopya varsa birleştir (zincirleme). Yeni kahramanın yeri: alandaki ilk kopya, yoksa ilk kopya.
  F2.birlesmeKontrol = function (k, sonEklenen) {
    const sonuc = [];
    let degisti = true;
    while (degisti) {
      degisti = false;
      const hepsi = F2.tumKahramanlar(k).concat(k.gecici ? [k.gecici] : []);
      const gruplar = {};
      for (const h of hepsi) { if (h.lvl >= 3) continue; const a = h.id + '|' + h.lvl; (gruplar[a] = gruplar[a] || []).push(h); }
      for (const a in gruplar) {
        const g = gruplar[a];
        if (g.length < 3) continue;
        // alandakiler önce, sonra yedek, en son geçici
        const sirali = g.map(h => ({ h, kon: F2.konumBul(k, h.kuid) }))
          .sort((x, y) => puanKon(x.kon) - puanKon(y.kon)).slice(0, 3);
        const hedefKon = sirali.find(x => x.kon) ? sirali.find(x => x.kon).kon : null;
        const esyalar = [];
        let dal = null;
        for (const x of sirali) { for (const e of x.h.esyalar) esyalar.push(e); if (x.h.dal != null && dal == null) dal = x.h.dal; }
        const kaynaklar = sirali.map(x => x.kon);
        for (const x of sirali) { if (x.kon) F2.konumaKoy(k, x.kon, null); else k.gecici = null; }
        const yeni = F2.yeniKahraman(g[0].id, g[0].lvl + 1);
        yeni.esyalar = esyalar.slice(0, A.esyaMaks);
        yeni.dal = dal;
        const geriEsya = esyalar.slice(A.esyaMaks);
        F2.konumaKoy(k, hedefKon, yeni);
        sonuc.push({ kahraman: yeni, kon: hedefKon, kaynaklar, geriEsya });
        if (yeni.lvl === 2 && yeni.dal == null) k.dalBekleyen.push(yeni.kuid);
        degisti = true;
        break;
      }
    }
    return sonuc;
    function puanKon(kon) { return !kon ? 9 : kon.yer === 'alan' ? kon.i : 4 + kon.i; }
  };

  F2.esyaAl = function (k, teklifI, kuid) {
    const t = k.dukkan[teklifI];
    if (!t || t.tur !== 'esya') return { ok: false, neden: 'yok' };
    const e = F2.ESYA[t.id];
    if (k.altin < e.fiyat) return { ok: false, neden: 'altin' };
    const kon = F2.konumBul(k, kuid); if (!kon) return { ok: false, neden: 'hedef' };
    const h = F2.konumdaki(k, kon);
    if (h.esyalar.length >= A.esyaMaks) return { ok: false, neden: 'dolu' };
    k.altin -= e.fiyat;
    k.dukkan[teklifI] = null; k.donuk[teklifI] = false;
    h.esyalar.push(t.id);
    return { ok: true, kahraman: h, esya: e };
  };

  F2.sat = function (k, kon) {
    const h = F2.konumdaki(k, kon); if (!h) return 0;
    F2.konumaKoy(k, kon, null);
    const para = A.satis * (h.lvl === 1 ? 1 : h.lvl === 2 ? 3 : 6);
    k.altin += para;
    return para;
  };

  // Yer değiştir (dolu ise takas)
  F2.tasi = function (k, a, b) {
    const ha = F2.konumdaki(k, a), hb = F2.konumdaki(k, b);
    F2.konumaKoy(k, a, hb); F2.konumaKoy(k, b, ha);
  };

  F2.dalSec = function (k, kuid, dal) {
    const kon = F2.konumBul(k, kuid); if (!kon) return;
    F2.konumdaki(k, kon).dal = dal;
    k.dalBekleyen = k.dalBekleyen.filter(x => x !== kuid);
  };

  // Savaşa giden takım (alandaki)
  F2.takimAnlik = function (k) {
    const t = [];
    k.alan.forEach((h, i) => { if (h) t.push({ kuid: h.kuid, id: h.id, lvl: h.lvl, dal: h.dal, esyalar: h.esyalar.slice(), kol: F2.hucreKol(i), sira: F2.hucreSira(i) }); });
    return t;
  };

  // Savaş sonucunu işle. sonuc: 0 kazandı, 1 kaybetti, 'berabere'
  F2.turBitir = function (k, sonuc, rakip) {
    let canKaybi = 0;
    if (sonuc === 0) { k.galibiyet++; k.seri++; k.enUzunSeri = Math.max(k.enUzunSeri, k.seri); if (rakip && rakip.kaynak === 'oyuncu') k.yenilenGecmis++; }
    else if (sonuc === 1) { canKaybi = k.tur >= A.agirKayipTuru ? 2 : 1; k.can = Math.max(0, k.can - canKaybi); k.maglubiyet++; k.seri = 0; }
    else { k.berabere++; }
    k.gecmisSavaslar.push({ tur: k.tur, sonuc, rakip: rakip ? rakip.ad : '?' });
    if (k.galibiyet >= A.hedefGalibiyet) { k.bitti = true; k.kazandi = true; }
    else if (k.can <= 0) { k.bitti = true; }
    else if (k.tur >= A.maksTur) { k.bitti = true; }
    if (!k.bitti) {
      k.tur++;
      k.altin = A.altin;
      F2.dukkanDoldur(k, true);
    }
    return canKaybi;
  };

  // ---------- alışveriş botu (hayaletler ve ?oto=1 için) ----------
  // zeka 0..1: yüksekse birleşmeye, etiket bonusuna ve dizilime dikkat eder; düşükse rastgeleye yakın.
  const ON_ROLLER = { tank: 3, savasci: 2, nisanci: 0, buyucu: 0 };
  function guc(h) { return h.lvl * h.lvl * 10 + F2.KAHRAMAN[h.id].katman * 2 + h.esyalar.length * 2; }

  F2.botAlisveris = function (k, zeka, rnd) {
    rnd = rnd || k.rnd;
    let guvenlik = 0, yenilemeler = 0;
    const azami = 1 + Math.floor(zeka * 3);
    while (guvenlik++ < 40) {
      // 1) kahraman al
      let enI = -1, enPuan = -Infinity;
      k.dukkan.forEach((t, i) => {
        if (!t || t.tur !== 'kahraman') return;
        let p = 0;
        const c1 = F2.kopyaSay(k, t.id, 1), c2 = F2.kopyaSay(k, t.id, 2);
        p += zeka * (c1 * 12 + c2 * 5);
        if (k.alan.filter(Boolean).length < 4) p += 6;
        const d = F2.KAHRAMAN[t.id];
        const alandakiler = k.alan.filter(Boolean).map(h => F2.KAHRAMAN[h.id]);
        if (!alandakiler.some(x => x.id === d.id)) {
          if (alandakiler.some(x => x.rol === d.rol)) p += zeka * 4;
          if (alandakiler.some(x => x.koken === d.koken)) p += zeka * 4;
        }
        p += d.katman * 2;
        p += rnd() * (2 + (1 - zeka) * 12);
        if (p > enPuan) { enPuan = p; enI = i; }
      });
      const yerVar = !!F2.bosYer(k, 'alan');
      if (enI >= 0 && k.altin >= A.kahramanFiyat) {
        const t = k.dukkan[enI];
        const birlesir = F2.birlesirMi(k, t.id);
        if (!yerVar && !birlesir) {
          // yer aç: yedekteki en zayıf ve birleşme adayı olmayanı sat (yeni gelen daha iyiyse)
          const yedekler = k.yedek.map((h, i) => ({ h, i })).filter(x => x.h);
          yedekler.sort((x, y) => guc(x.h) + F2.kopyaSay(k, x.h.id, x.h.lvl) * 15 - (guc(y.h) + F2.kopyaSay(k, y.h.id, y.h.lvl) * 15));
          const en = yedekler[0];
          if (en && enPuan > 8 && guc(en.h) <= 14 && F2.kopyaSay(k, en.h.id, en.h.lvl) < 2) F2.sat(k, { yer: 'yedek', i: en.i });
        }
        if (F2.bosYer(k, 'alan') || birlesir) {
          if (enPuan > 4 || zeka < 0.3) {
            const r = F2.kahramanAl(k, enI, null);
            if (r.ok) { for (const b of r.birlesmeler) if (b.kahraman.dal == null && b.kahraman.lvl >= 2) F2.dalSec(k, b.kahraman.kuid, botDal(b.kahraman, zeka, rnd)); diz(k, zeka, rnd); continue; }
          }
        }
      }
      // 2) eşya al
      const esyaI = k.dukkan.findIndex(t => t && t.tur === 'esya');
      if (esyaI >= 0) {
        const e = F2.ESYA[k.dukkan[esyaI].id];
        const adaylar = k.alan.filter(h => h && h.esyalar.length < A.esyaMaks).sort((x, y) => guc(y) - guc(x));
        const parasi = k.altin >= e.fiyat && (k.altin - e.fiyat < A.kahramanFiyat || zeka < 0.5 || k.alan.filter(Boolean).length >= 4);
        if (adaylar.length && parasi && rnd() < 0.5 + zeka * 0.5) {
          const hedef = zeka > 0.5 ? esyaHedefi(adaylar, e) : adaylar[Math.floor(rnd() * adaylar.length)];
          if (F2.esyaAl(k, esyaI, hedef.kuid).ok) continue;
        }
      }
      // 3) yenile
      if (k.altin >= A.yenile && yenilemeler < azami && (k.altin >= A.kahramanFiyat + A.yenile || k.altin === A.yenile)) {
        if (rnd() < 0.4 + zeka * 0.5) { F2.yenile(k); yenilemeler++; continue; }
      }
      break;
    }
    // yerde kalmış dal seçimleri
    for (const kuid of k.dalBekleyen.slice()) {
      const kon = F2.konumBul(k, kuid);
      if (kon) F2.dalSec(k, kuid, botDal(F2.konumdaki(k, kon), zeka, rnd)); else k.dalBekleyen = k.dalBekleyen.filter(x => x !== kuid);
    }
    diz(k, zeka, rnd);
  };

  function esyaHedefi(adaylar, e) {
    const skillci = h => ['kor_ustasi', 'zaman_ustasi', 'oncu', 'avci', 'nisanci', 'muhafiz'].includes(h.id);
    if (e.id === 'kumsaati' || e.id === 'aytasi') return adaylar.find(skillci) || adaylar[0];
    if (e.id === 'kemer' || e.id === 'diken' || e.id === 'muhur') return adaylar.find(h => F2.KAHRAMAN[h.id].rol === 'tank') || adaylar[0];
    return adaylar[0];
  }
  function botDal(h, zeka, rnd) { return rnd() < 0.5 ? 0 : 1; }

  // En güçlü dördü alana, tank/savaşçı öne; kalanlar yedeğe
  function diz(k, zeka, rnd) {
    const hepsi = F2.tumKahramanlar(k).sort((x, y) => guc(y) - guc(x));
    const alana = hepsi.slice(0, 4), yedege = hepsi.slice(4);
    k.alan = [null, null, null, null]; k.yedek = [null, null, null];
    let sirali;
    if (rnd() < zeka) sirali = alana.slice().sort((x, y) => (ON_ROLLER[F2.KAHRAMAN[y.id].rol] - ON_ROLLER[F2.KAHRAMAN[x.id].rol]) || (F2.KAHRAMAN[y.id].can * y.lvl - F2.KAHRAMAN[x.id].can * x.lvl));
    else sirali = alana.slice().sort(() => rnd() - 0.5);
    // ön sütun: 0 ve 2, arka: 1 ve 3
    const yerler = [0, 2, 1, 3];
    sirali.forEach((h, i) => { k.alan[yerler[i]] = h; });
    // yalnız biri ön sütunda kalırsa ve yakın dövüşçüyse sorun yok; uzakları öne koyma
    yedege.slice(0, 3).forEach((h, i) => { k.yedek[i] = h; });
    for (const h of yedege.slice(3)) k.altin += A.satis;
  }
  F2.botDiz = diz;

  // ---------- hayalet havuzu ----------
  // Açılışta tohumlu bot koşuları: her bot her tur aynı dükkân kurallarıyla alışveriş yapar; tur sonu takımı havuza girer.
  F2.hayaletHavuzu = function (tohum, botSayisi) {
    botSayisi = botSayisi || 14;
    const r = F2.rng(tohum ^ 0x5eed);
    const havuz = {};
    const adlar = F2.HAYALET_ADLARI.slice().sort(() => r() - 0.5);
    for (let b = 0; b < botSayisi; b++) {
      const zeka = 0.15 + 0.8 * (b / (botSayisi - 1));
      const kos = F2.yeniKosu(Math.floor(r() * 1e9), 'normal');
      const ad = adlar[b % adlar.length];
      for (let tur = 1; tur <= A.maksTur; tur++) {
        kos.tur = tur; kos.altin = A.altin;
        if (tur > 1) F2.dukkanDoldur(kos, true);
        F2.botAlisveris(kos, zeka, kos.rnd);
        (havuz[tur] = havuz[tur] || []).push({ ad, tur, zeka, kaynak: 'bot', takim: F2.takimAnlik(kos) });
      }
    }
    return havuz;
  };

  // ---------- oyuncunun kayıtlı takımları (localStorage) ----------
  F2.KAYIT_ANAHTARI = 'f2_sefer_takimlar';
  F2.kayitOku = function (anahtar) {
    try { const v = G.localStorage && G.localStorage.getItem(anahtar || F2.KAYIT_ANAHTARI); return v ? JSON.parse(v) : []; } catch (e) { return []; }
  };
  F2.kayitYaz = function (liste, anahtar) {
    try { G.localStorage && G.localStorage.setItem(anahtar || F2.KAYIT_ANAHTARI, JSON.stringify(liste.slice(-300))); } catch (e) { /* yok say */ }
  };
  F2.kosuNoAl = function (anahtar) {
    try {
      const a = (anahtar || F2.KAYIT_ANAHTARI) + '_no';
      const n = (parseInt(G.localStorage.getItem(a), 10) || 0) + 1;
      G.localStorage.setItem(a, String(n));
      return n;
    } catch (e) { return 1; }
  };
  F2.takimKaydet = function (k, anahtar) {
    const takim = F2.takimAnlik(k);
    if (!takim.length) return;
    const liste = F2.kayitOku(anahtar);
    liste.push({ ad: 'Geçmiş koşun #' + k.kosuNo, kosuNo: k.kosuNo, tur: k.tur, takim, tarih: Date.now() });
    F2.kayitYaz(liste, anahtar);
  };

  // Rakip seç: aynı turun havuzundan. Geçmiş koşudan kayıtlı takım varsa o gelebilir:
  // bu koşuda henüz geçmiş takımla karşılaşılmadıysa %75, sonra %40 (asenkron his fark edilsin diye).
  F2.rakipSec = function (k, havuz, kayitlar) {
    const r = k.rnd;
    const tur = Math.min(k.tur, A.maksTur);
    const eski = (kayitlar || []).filter(x => x.tur === tur && x.kosuNo !== k.kosuNo);
    if (eski.length && r() < (k.karsilasilanGecmis ? 0.4 : 0.75)) {
      const s = eski[Math.floor(r() * eski.length)];
      return { ad: s.ad, tur: s.tur, kaynak: 'oyuncu', takim: s.takim };
    }
    const adaylar = havuz[tur] || [];
    const aralik = { kolay: [0, 0.4], normal: [0.15, 0.65], zor: [0.55, 1.01] }[k.zorluk] || [0, 1.01];
    let uygun = adaylar.filter(x => x.zeka >= aralik[0] && x.zeka < aralik[1] && x.takim.length);
    if (!uygun.length) uygun = adaylar.filter(x => x.takim.length);
    const s = uygun[Math.floor(r() * uygun.length)];
    return { ad: s.ad, tur: s.tur, kaynak: 'bot', takim: s.takim };
  };
})(typeof window !== 'undefined' ? window : globalThis);
