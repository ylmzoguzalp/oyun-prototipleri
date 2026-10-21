// F1 savaş simülasyonu: beat tabanlı kurallar, görüntüden bağımsız.
// Her şey beat anında olur (komutlar, telegraflar, düz vuruşlar, süreli hasar). Görsel taraf olayFn(tur, veri) ile haberdar olur;
// ?oto=1&hizli=1 modunda olayFn yoktur ve maçlar görüntüsüz koşar.
(function () {
  const AYAR = {
    beatSn: 0.5,
    raundBeat: 90,          // 45 sn
    sonHizliBeat: 30,       // son 15 sn Ritim iki kat hızlı
    ritimBas: 3, ritimTavan: 10, ritimHiz: 1 / 3,
    // Brief sayılarıyla raundlar ~12 sn sürüyordu; can ve vuruş çarpanları raundu 25–40 sn'ye çeker (STATUS'ta gerekçe).
    canCarpan: 2.0, vurusCarpan: 0.9, skillCarpan: 1.25,
    kesmeEsik: 0.2,         // sayaç süresince taban canın %20'si (skill çarpanıyla) kadar hasar → KESİLDİ
    telegrafEk: 1,          // her telegrafa +1 beat: insan tepkisi için (STATUS'ta gerekçe)
    savunOran: 0.6, savunBeat: 2,
    ultKazanVuran: 0.15, ultKazanAlan: 0.14, ultPasif: 0.2, // halka: verilen + alınan hasar + beat başına küçük pay
    kazanmaRaund: 3, enCokRaund: 5,
  };
  window.AYAR = AYAR;
  window.sk = x => Math.round(x * AYAR.skillCarpan);

  function kahramanYap(id, taraf) {
    const def = KAHRAMAN_VERI[id];
    return {
      id, def, taraf, p: JSON.parse(JSON.stringify(def.p0)),
      can: 1, maxCan: 1, ult: 0, kare: { s: 0, r: 0 }, olu: false,
      sersem: 0, savun: 0, savunBas: -99, kalkan: 0, kalkanSure: 0, yanma: null, kanama: null, hiz: 0,
      vurusSayac: 1, telegraf: null, bekleyen: null, gelisimler: [],
      ist: { hasar: 0, ult: 0 },
    };
  }

  // Ön sütunu sevenler öne, öbürleri arkaya; taşan boş kareye
  function dizilimYap(liste) {
    const bos = [{ s: 0, r: 0 }, { s: 0, r: 1 }, { s: 1, r: 0 }, { s: 1, r: 1 }];
    const al = s => { const i = bos.findIndex(q => s == null || q.s === s); return i < 0 ? null : bos.splice(i, 1)[0]; };
    for (const k of liste.filter(k => k.def.onde)) k.kare = al(0) || al(1);
    for (const k of liste.filter(k => !k.def.onde)) k.kare = al(1) || al(0);
  }

  class Savas {
    constructor(idler0, idler1) {
      this.takimlar = [idler0, idler1].map((ids, t) => {
        const T = {
          taraf: t, kahramanlar: ids.map(id => kahramanYap(id, t)), ritim: 0, birikim: 0, skor: 0,
          bonus: { ritimBas: 0, can: 1, ritimHiz: 1, ultHiz: 1, vurus: 1 }, takimGelisim: [],
          ist: { hasar: 0, kesme: 0, kesildi: 0, mukemmel: 0, kacis: 0, ult: 0, telegraf: 0, olum: 0, iyiles: 0, savun: 0, hareket: 0, skill: 0 },
        };
        dizilimYap(T.kahramanlar);
        return T;
      });
      this.raund = 0; this.beat = 0; this.toplamBeat = 0; this.durum = 'bekle';
      this.kazananlar = []; this.olayFn = null;
      this.telegraflar = []; this.kuyruk = []; this.zamanli = [];
    }

    olay(tur, veri) { if (this.olayFn) this.olayFn(tur, veri || {}); }
    hepsi() { return this.takimlar[0].kahramanlar.concat(this.takimlar[1].kahramanlar); }

    // ---------- Raund ----------
    raundBaslat() {
      this.raund++; this.beat = 0; this.durum = 'savas'; this.kazanan = null; this.sureDoldu = false;
      this.telegraflar = []; this.kuyruk = []; this.zamanli = [];
      for (const T of this.takimlar) {
        T.ritim = Math.min(AYAR.ritimTavan, AYAR.ritimBas + T.bonus.ritimBas); T.birikim = 0;
        const dolu = new Set();
        T.kahramanlar.forEach((k, i) => {
          k.maxCan = Math.round(k.p.can * AYAR.canCarpan * T.bonus.can); k.can = k.maxCan; k.olu = false;
          k.sersem = 0; k.savun = 0; k.savunBas = -99; k.kalkan = 0; k.kalkanSure = 0; k.yanma = null; k.kanama = null; k.hiz = 0;
          k.telegraf = null; k.bekleyen = null; k.vurusSayac = 1 + (i % 2);
          // ölen kahramanın karesine dost geçmiş olabilir: çakışırsa ilk boş kareye
          let a = k.kare.s * 2 + k.kare.r;
          if (dolu.has(a)) { a = [0, 1, 2, 3].find(x => !dolu.has(x)); k.kare = { s: a >> 1, r: a & 1 }; }
          dolu.add(a);
        });
      }
      this.olay('raundBasladi', { raund: this.raund });
    }

    macBitti() {
      const [a, b] = this.takimlar.map(T => T.skor);
      return a >= AYAR.kazanmaRaund || b >= AYAR.kazanmaRaund || this.raund >= AYAR.enCokRaund;
    }
    macKazanani() { const [a, b] = this.takimlar.map(T => T.skor); return a > b ? 0 : b > a ? 1 : -1; }
    canOrani(T) {
      let c = 0, m = 0;
      for (const k of T.kahramanlar) { c += Math.max(0, k.can); m += k.maxCan; }
      return m ? c / m : 0;
    }
    kalanBeat() { return AYAR.raundBeat - this.beat; }

    // ---------- Kare yardımcıları ----------
    karedeki(t, s, r) { return this.takimlar[t].kahramanlar.find(k => !k.olu && k.kare.s === s && k.kare.r === r) || null; }
    karelerdekiler(t, kareler) { return kareler.map(q => this.karedeki(t, q.s, q.r)).filter(Boolean); }
    sutundakiler(t, s) { return this.takimlar[t].kahramanlar.filter(k => !k.olu && k.kare.s === s); }
    rakipler(k) { return this.takimlar[1 - k.taraf].kahramanlar.filter(x => !x.olu); }
    dostlar(k) { return this.takimlar[k.taraf].kahramanlar.filter(x => !x.olu); }
    enZayif(t) {
      const d = this.takimlar[t].kahramanlar.filter(x => !x.olu);
      return d.sort((a, b) => a.can - b.can)[0] || null;
    }
    zamanla(n, fn) { this.zamanli.push({ beat: this.beat + n, fn }); }
    ritimEkle(t, n) { const T = this.takimlar[t]; T.ritim = Math.min(AYAR.ritimTavan, T.ritim + n); this.olay('ritim', { t, n }); }

    // ---------- Komutlar (bir sonraki beat'te çözülür) ----------
    maliyet(c) {
      const k = c.k;
      if (c.tur === 'hareket' || c.tur === 'savun') return 1;
      if (c.tur === 'ucuz') return k.p.ucuz.maliyet;
      if (c.tur === 'agir') return k.p.agir.maliyet;
      return 0;
    }
    hedefGecerli(k, tur, c) {
      if (tur === 'dost') return !!(c.hedef && !c.hedef.olu && c.hedef.taraf === k.taraf);
      if (tur === 'rakip') return !!(c.hedef && !c.hedef.olu && c.hedef.taraf !== k.taraf);
      if (tur === 'sira' || tur === 'sutun') return !!c.secim;
      return true;
    }
    uygunMu(c, coz) {
      const k = c.k;
      if (!k || k.olu) return false;
      if (coz ? k.sersem > 0 : k.sersem > 1) return false;
      switch (c.tur) {
        case 'hareket': return !!c.kare && !(c.kare.s === k.kare.s && c.kare.r === k.kare.r);
        case 'savun': return true;
        case 'ucuz': return !k.telegraf && this.hedefGecerli(k, k.def.ucuz.hedef, c);
        case 'agir': return !k.telegraf && this.hedefGecerli(k, k.def.agir.hedef, c);
        case 'ult': return k.ult >= 100 && this.hedefGecerli(k, k.def.ult.hedef, c);
      }
      return false;
    }
    // Ritim kuyruğa girerken düşer; çözülemezse geri verilir. Aynı kahramanın bekleyen komutu yenisiyle değişir.
    komutVer(t, c) {
      if (this.durum !== 'savas' || !c.k || c.k.taraf !== t) return false;
      const T = this.takimlar[t], k = c.k;
      c.maliyet = this.maliyet(c);
      if (!this.uygunMu(c, false)) return false;
      const eski = k.bekleyen ? k.bekleyen.maliyet : 0;
      if (T.ritim + eski < c.maliyet) return false;
      if (k.bekleyen) this.kuyruk = this.kuyruk.filter(x => x !== k.bekleyen);
      T.ritim = T.ritim + eski - c.maliyet;
      k.bekleyen = c;
      this.kuyruk.push(c);
      return true;
    }
    komutIptal(k) {
      if (!k.bekleyen) return;
      const T = this.takimlar[k.taraf];
      T.ritim = Math.min(AYAR.ritimTavan, T.ritim + k.bekleyen.maliyet);
      this.kuyruk = this.kuyruk.filter(x => x !== k.bekleyen);
      k.bekleyen = null;
    }
    komutCoz(c) {
      const k = c.k, T = this.takimlar[k.taraf];
      k.bekleyen = null;
      if (!this.uygunMu(c, true)) {
        T.ritim = Math.min(AYAR.ritimTavan, T.ritim + c.maliyet);
        this.olay('iptal', { k, neden: k.sersem > 0 ? 'Sersem!' : 'İptal' });
        return;
      }
      if (c.tur === 'hareket') {
        const diger = this.karedeki(k.taraf, c.kare.s, c.kare.r);
        const eski = { s: k.kare.s, r: k.kare.r };
        k.kare = { s: c.kare.s, r: c.kare.r };
        if (diger) diger.kare = eski;
        T.ist.hareket++;
        this.olay('hareket', { k, diger });
      } else if (c.tur === 'savun') {
        k.savun = AYAR.savunBeat; k.savunBas = this.beat;
        T.ist.savun++;
        this.olay('savun', { k });
      } else if (c.tur === 'ucuz') {
        T.ist.skill++;
        this.olay('skill', { k, ad: k.def.ucuz.ad, hedef: c.hedef, ses: k.def.ucuz.ses });
        k.def.ucuz.calis(this, k, c.hedef);
      } else if (c.tur === 'agir') {
        this.telegrafKur(k, c);
      } else if (c.tur === 'ult') {
        k.ult = 0; k.ist.ult++; T.ist.ult++;
        this.olay('ult', { k, ad: k.def.ult.ad });
        k.def.ult.calis(this, k, c.hedef);
      }
    }

    // ---------- Telegraf ----------
    telegrafKur(k, c) {
      const a = k.def.agir, n = k.p.agir.beat + AYAR.telegrafEk;
      const tel = {
        sahip: k, ad: a.ad, kilit: a.kilit, kareler: [], hedef: null, kalan: n, toplam: n, bas: this.beat, alinan: 0,
        esik: Math.round(AYAR.kesmeEsik * k.def.p0.can * AYAR.skillCarpan), ilkHedefler: [],
      };
      if (a.kilit === 'kare') {
        tel.kareler = a.kareler(this, k, c.secim);
        tel.ilkHedefler = this.karelerdekiler(1 - k.taraf, tel.kareler);
      } else tel.hedef = c.hedef;
      k.telegraf = tel;
      this.telegraflar.push(tel);
      this.takimlar[k.taraf].ist.telegraf++;
      this.olay('telegraf', { tel });
    }
    telegrafKaldir(tel) {
      const i = this.telegraflar.indexOf(tel);
      if (i >= 0) this.telegraflar.splice(i, 1);
      if (tel.sahip.telegraf === tel) tel.sahip.telegraf = null;
    }
    kes(h, kaynak, neden) {
      const tel = h.telegraf;
      if (!tel) return;
      this.telegrafKaldir(tel); tel.iptal = true;
      this.takimlar[h.taraf].ist.kesildi++;
      if (kaynak && kaynak.taraf !== h.taraf) this.takimlar[kaynak.taraf].ist.kesme++;
      this.olay('kesme', { h, kaynak, tel, neden });
    }
    patla(tel) {
      this.telegrafKaldir(tel);
      const k = tel.sahip;
      if (k.olu) return;
      if (tel.kilit === 'kahraman' && (!tel.hedef || tel.hedef.olu)) { this.olay('bosa', { tel }); return; }
      this.olay('patla', { tel });
      k.def.agir.patla(this, k, tel);
      if (tel.kilit === 'kare') {
        for (const x of tel.ilkHedefler) {
          if (x.olu || tel.kareler.some(q => q.s === x.kare.s && q.r === x.kare.r)) continue;
          this.takimlar[x.taraf].ist.kacis++;
          this.olay('kacis', { h: x });
        }
      }
    }

    // ---------- Hasar ve durumlar ----------
    // Dönüş: verilen hasar; mükemmel savunmayla tamamen engellendiyse null (ek etkiler de işlemez).
    hasar(kaynak, h, miktar, o) {
      o = o || {};
      if (!h || h.olu || this.durum !== 'savas') return 0;
      const dot = o.tur === 'yanma' || o.tur === 'kanama';
      let m = miktar;
      if (!dot) m *= 1 - (h.p.zirh || 0);
      if (h.savun > 0 && !dot) {
        if (o.buyuk && h.savunBas === this.beat) {
          const T = this.takimlar[h.taraf];
          T.ritim = Math.min(AYAR.ritimTavan, T.ritim + 1);
          T.ist.mukemmel++;
          this.olay('mukemmel', { h, kaynak });
          return null;
        }
        m *= 1 - AYAR.savunOran;
      }
      if (miktar <= 0) return 0;
      m = Math.max(1, Math.round(m));
      let emilen = 0;
      if (h.kalkan > 0) { emilen = Math.min(h.kalkan, m); h.kalkan -= emilen; m -= emilen; }
      h.can -= m;
      const tum = m + emilen;
      if (kaynak && kaynak.taraf !== h.taraf) {
        const Tk = this.takimlar[kaynak.taraf];
        if (o.tur !== 'ult') kaynak.ult = Math.min(100, kaynak.ult + tum * AYAR.ultKazanVuran * Tk.bonus.ultHiz);
        Tk.ist.hasar += m; kaynak.ist.hasar += m;
      }
      h.ult = Math.min(100, h.ult + tum * AYAR.ultKazanAlan * this.takimlar[h.taraf].bonus.ultHiz);
      this.olay('hasar', { h, kaynak, m, emilen, tur: o.tur, buyuk: o.buyuk });
      if (h.telegraf && m > 0) {
        h.telegraf.alinan += m;
        if (h.telegraf.alinan >= h.telegraf.esik) this.kes(h, kaynak, 'hasar');
      }
      if (h.can <= 0) this.olum(h, kaynak);
      if (o.tur === 'vurus' && kaynak && !kaynak.olu) {
        if (h.p.diken) this.hasar(h, kaynak, h.p.diken, { tur: 'diken' });
        if (kaynak.p.canCal && m > 0) this.iyiles(kaynak, kaynak, m * kaynak.p.canCal, true);
      }
      return m;
    }
    olum(h, kaynak) {
      if (h.olu) return;
      h.olu = true; h.can = 0; h.yanma = null; h.kanama = null; h.kalkan = 0;
      if (h.telegraf) { const tel = h.telegraf; this.telegrafKaldir(tel); this.olay('telegrafSondu', { tel }); }
      if (h.bekleyen) this.komutIptal(h);
      this.takimlar[h.taraf].ist.olum++;
      this.olay('olum', { h, kaynak });
    }
    iyiles(kaynak, h, miktar, sessiz) {
      if (!h || h.olu) return;
      const m = Math.round(Math.min(miktar, h.maxCan - h.can));
      if (m <= 0) return;
      h.can += m;
      this.takimlar[h.taraf].ist.iyiles += m;
      this.olay('iyiles', { h, m, sessiz });
    }
    kalkanVer(h, miktar, sure) {
      if (!h || h.olu) return;
      h.kalkan = Math.max(h.kalkan, miktar); h.kalkanSure = Math.max(h.kalkanSure, sure);
      this.olay('kalkan', { h, m: miktar });
    }
    sersemlet(kaynak, h, n) {
      if (!h || h.olu || n <= 0) return;
      h.sersem = Math.max(h.sersem, n);
      this.olay('sersem', { h, n });
      if (h.telegraf) this.kes(h, kaynak, 'sersem');
    }
    yanmaVer(kaynak, h, dps, sure) {
      if (!h || h.olu) return;
      h.yanma = { h: Math.max(dps, h.yanma ? h.yanma.h : 0), s: sure, kaynak };
    }
    kanamaVer(kaynak, h, dps, sure) {
      if (!h || h.olu) return;
      h.kanama = { h: Math.max(dps, h.kanama ? h.kanama.h : 0), s: sure, kaynak };
    }

    // ---------- Düz vuruş ----------
    vurusHedefi(k) {
      const R = this.rakipler(k);
      if (!R.length) return null;
      const r = k.kare.r, b = (s, rr) => R.find(x => x.kare.s === s && x.kare.r === rr);
      const tur = k.p.vurus.tur;
      if (tur === 'yakin') return b(0, r) || b(0, 1 - r) || b(1, r) || b(1, 1 - r);
      if (tur === 'arka') return b(1, r) || b(0, r) || b(1, 1 - r) || b(0, 1 - r);
      return b(0, r) || b(1, r) || b(0, 1 - r) || b(1, 1 - r);
    }
    duzVurus(k) {
      const h = this.vurusHedefi(k);
      if (!h) return;
      this.olay('vurus', { k, h });
      this.hasar(k, h, k.p.vurus.hasar * AYAR.vurusCarpan * this.takimlar[k.taraf].bonus.vurus, { tur: 'vurus' });
    }

    // ---------- Beat ----------
    beatIlerle() {
      if (this.durum !== 'savas') return;
      this.beat++; this.toplamBeat++;
      // 1) kuyruktaki komutlar (iki tarafın sırası her beat karışık)
      const kom = this.kuyruk; this.kuyruk = [];
      if (Math.random() < 0.5) kom.reverse();
      for (const c of kom) { if (this.durum !== 'savas') break; this.komutCoz(c); }
      // 2) zamanlanmış işler (ör. Yıldız Yağmuru dalgaları)
      const zl = this.zamanli; this.zamanli = [];
      for (const z of zl) { if (z.beat <= this.beat) { if (this.durum === 'savas') z.fn(); } else this.zamanli.push(z); }
      // 3) telegraf sayaçları (bu beat kurulanlar saymaz)
      for (const tel of this.telegraflar.slice()) {
        if (this.durum !== 'savas') break;
        if (tel.bas === this.beat || !this.telegraflar.includes(tel)) continue;
        tel.kalan--;
        if (tel.kalan <= 0) this.patla(tel);
      }
      // 4) düz vuruşlar (sersem ve hazırlanan vurmaz)
      for (const k of this.hepsi()) {
        if (this.durum !== 'savas') break;
        if (k.olu || k.sersem > 0 || k.telegraf) continue;
        k.vurusSayac -= k.hiz > 0 ? 2 : 1;
        if (k.vurusSayac <= 0) { this.duzVurus(k); k.vurusSayac += k.p.vurus.periyot; }
      }
      // 5) süreli hasarlar
      for (const k of this.hepsi()) {
        if (k.olu) continue;
        if (k.yanma) { const y = k.yanma; this.hasar(y.kaynak, k, y.h, { tur: 'yanma' }); if (--y.s <= 0 && k.yanma === y) k.yanma = null; }
        if (!k.olu && k.kanama) { const y = k.kanama; this.hasar(y.kaynak, k, y.h, { tur: 'kanama' }); if (--y.s <= 0 && k.kanama === y) k.kanama = null; }
      }
      // 6) durum süreleri
      for (const k of this.hepsi()) {
        if (k.sersem > 0) k.sersem--;
        if (k.savun > 0) k.savun--;
        if (k.kalkanSure > 0 && --k.kalkanSure === 0) k.kalkan = 0;
        if (k.hiz > 0) k.hiz--;
        if (!k.olu) k.ult = Math.min(100, k.ult + AYAR.ultPasif * this.takimlar[k.taraf].bonus.ultHiz);
      }
      // 7) Ritim
      const kalan = this.kalanBeat();
      for (const T of this.takimlar) {
        T.birikim += AYAR.ritimHiz * T.bonus.ritimHiz * (kalan < AYAR.sonHizliBeat ? 2 : 1);
        while (T.birikim >= 1) { T.birikim -= 1; if (T.ritim < AYAR.ritimTavan) T.ritim++; }
      }
      if (kalan === AYAR.sonHizliBeat) this.olay('sonHizli');
      this.bitisKontrol();
    }

    bitisKontrol() {
      if (this.durum !== 'savas') return;
      const canli = this.takimlar.map(T => T.kahramanlar.some(k => !k.olu));
      let kazanan = null;
      if (!canli[0] && !canli[1]) kazanan = -1;
      else if (!canli[0]) kazanan = 1;
      else if (!canli[1]) kazanan = 0;
      else if (this.beat >= AYAR.raundBeat) {
        const o = this.takimlar.map(T => this.canOrani(T));
        kazanan = o[0] > o[1] ? 0 : o[1] > o[0] ? 1 : -1;
        this.sureDoldu = true;
      }
      if (kazanan === null) return;
      this.durum = 'raundSonu'; this.kazanan = kazanan;
      if (kazanan >= 0) this.takimlar[kazanan].skor++;
      this.kazananlar.push(kazanan);
      this.olay('raundSonu', { kazanan, sureDoldu: this.sureDoldu });
    }

    // ---------- Raund arası gelişim ----------
    gelisimSecenekleri(k) { return k.def.dallar[k.gelisimler.length] || GENEL_DAL; }
    gelisimUygula(k, dal) { dal.f(k.p); k.gelisimler.push(dal.ad); }
    takimSecenekleri() {
      const d = TAKIM_GELISIM.slice();
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      return d.slice(0, 2);
    }
    takimGelisimUygula(t, g) { const T = this.takimlar[t]; g.f(T.bonus); T.takimGelisim.push(g.ad); }
    // Bot (ya da oto) için rastgele seçim; kaybedense takım seçimi de
    rastgeleGelisim(t, kaybetti) {
      const T = this.takimlar[t], secilen = [];
      for (const k of T.kahramanlar) {
        const sec = this.gelisimSecenekleri(k), d = sec[Math.floor(Math.random() * sec.length)];
        this.gelisimUygula(k, d); secilen.push(k.def.ad + ': ' + d.ad);
      }
      if (kaybetti) { const g = this.takimSecenekleri()[0]; this.takimGelisimUygula(t, g); secilen.push('Takım: ' + g.ad); }
      return secilen;
    }
  }

  window.Savas = Savas;
})();
