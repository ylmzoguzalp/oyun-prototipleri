// F1 botu: fayda tabanlı, her beat sonunda düşünür, komutu oyuncu gibi bir sonraki beat'te çözülür.
// Zorluk: tepki gecikmesi (telegrafı kaç beat sonra fark eder), kaçma / kesme / mükemmel savunma olasılığı, eylem sıklığı.
(function () {
  const BOT_AYAR = {
    kolay: { tepki: [3, 4], kacis: 0.3, kesme: 0.25, mukemmel: 0.1, aralik: 3, rezerv: 0, gurultu: 40, ultBekle: 0.5, atla: 0.3 },
    normal: { tepki: [2, 2], kacis: 0.6, kesme: 0.6, mukemmel: 0.35, aralik: 2, rezerv: 0, gurultu: 15, ultBekle: 0.2, atla: 0 },
    zor: { tepki: [1, 1], kacis: 0.85, kesme: 0.9, mukemmel: 0.75, aralik: 1, rezerv: 1, gurultu: 6, ultBekle: 0, atla: 0 },
  };
  window.BOT_AYAR = BOT_AYAR;

  const canYuzde = k => k.can / k.maxCan;

  class Bot {
    constructor(S, taraf, zorluk) {
      this.S = S; this.t = taraf; this.zorluk = zorluk; this.a = BOT_AYAR[zorluk] || BOT_AYAR.normal;
      this.kararlar = new WeakMap(); this.sonEylem = -99;
    }

    karar(tel) {
      let kr = this.kararlar.get(tel);
      if (!kr) {
        const a = this.a, r = Math.random;
        kr = { tepki: a.tepki[0] + Math.floor(r() * (a.tepki[1] - a.tepki[0] + 1)), kac: r() < a.kacis, kes: r() < a.kesme, muk: r() < a.mukemmel };
        this.kararlar.set(tel, kr);
      }
      return kr;
    }

    // Hiçbir rakip telegrafının hedeflemediği boş kendi karesi
    guvenliKare(haric) {
      const S = this.S, tehlike = new Set();
      for (const tel of S.telegraflar) if (tel.sahip.taraf !== this.t && tel.kilit === 'kare') for (const q of tel.kareler) tehlike.add(q.s * 2 + q.r);
      for (const q of haric) tehlike.add(q.s * 2 + q.r);
      for (const a of [1, 3, 0, 2]) {
        const s = a >> 1, r = a & 1;
        if (!tehlike.has(a) && !S.karedeki(this.t, s, r)) return { s, r };
      }
      return null;
    }

    // Telegrafı kesmeye yeten bir araç (ucuz skill ya da ultimate) varsa komutunu döndürür
    kesmeKomutu(k, tel, ritim) {
      const hedef = tel.sahip, gerek = tel.esik - tel.alinan, zirh = 1 - (hedef.p.zirh || 0);
      const u = k.p.ucuz;
      if (!k.telegraf && k.def.ucuz.hedef === 'rakip' && ritim >= u.maliyet) {
        const dmg = (sk(u.hasar || 0) * (u.adet || 1)) * zirh;
        if ((u.sersem || 0) > 0 || dmg >= gerek) return { tur: 'ucuz', k, hedef };
      }
      if (k.ult >= 100) {
        const id = k.id, ul = k.p.ult;
        if (id === 'muhafiz' && hedef.kare.s === 0) return { tur: 'ult', k };
        const dmg = id === 'duellocu' ? sk(ul.hasar) * ul.adet : id === 'nisanci' ? sk(ul.hasar) : (id === 'kor_ustasi' || id === 'infazci') ? sk(ul.hasar) : 0;
        if (dmg * zirh >= gerek) return { tur: 'ult', k, hedef };
      }
      return null;
    }

    telegrafDegeri(tel) {
      const p = tel.sahip.p.agir;
      return p.hasar ? sk(p.hasar) : 25;
    }

    // Ağır skill için hedef seçimi
    agirHedef(k) {
      const S = this.S, R = S.rakipler(k), a = k.def.agir;
      if (!R.length) return null;
      if (a.hedef === 'rakip') {
        let liste = R.slice();
        if (k.id === 'infazci') liste.sort((x, y) => canYuzde(x) - canYuzde(y));
        else liste.sort((x, y) => (x.can + (x.savun ? 40 : 0)) - (y.can + (y.savun ? 40 : 0)));
        return { hedef: liste[0], deger: 40 };
      }
      if (a.hedef === 'onSutun') { const n = S.sutundakiler(1 - this.t, 0).length; return n ? { deger: 25 * n } : null; }
      if (a.hedef === 'sira') {
        const sayi = [0, 1].map(r => R.filter(x => x.kare.r === r).length);
        const r = sayi[0] === sayi[1] ? (Math.random() < 0.5 ? 0 : 1) : (sayi[0] > sayi[1] ? 0 : 1);
        return { secim: { s: 0, r }, deger: 22 * sayi[r] };
      }
      if (a.hedef === 'sutun') {
        let s = R.some(x => x.telegraf && x.kare.s === 1) ? 1 : R.some(x => x.telegraf && x.kare.s === 0) ? 0 : null;
        if (s === null) { const n = [0, 1].map(c => R.filter(x => x.kare.s === c).length); s = n[1] > n[0] ? 1 : 0; }
        return { secim: { s, r: 0 }, deger: 20 * R.filter(x => x.kare.s === s).length + (R.some(x => x.telegraf && x.kare.s === s) ? 30 : 0) };
      }
      return { deger: 30 };
    }

    dusun() {
      const S = this.S;
      if (S.durum !== 'savas') return;
      if (S.raund !== this.raund) { this.raund = S.raund; this.sonEylem = -99; }
      if (S.beat - this.sonEylem < this.a.aralik) return;
      if (this.a.atla && Math.random() < this.a.atla) return;
      const T = S.takimlar[this.t], a = this.a;
      const ben = T.kahramanlar.filter(k => !k.olu);
      const musait = k => !k.olu && k.sersem <= 1 && !k.bekleyen;
      const aday = [];
      const ekle = (puan, c) => aday.push({ puan: puan + Math.random() * a.gurultu, c });

      // 1) Rakip telegraflarına cevap: kaç, savun, kalkan, kes
      for (const tel of S.telegraflar) {
        if (tel.sahip.taraf === this.t) continue;
        const kr = this.karar(tel);
        if (S.beat - tel.bas < kr.tepki) continue;
        const deger = this.telegrafDegeri(tel);
        const hedefler = tel.kilit === 'kare' ? S.karelerdekiler(this.t, tel.kareler)
          : (tel.hedef && !tel.hedef.olu && tel.hedef.taraf === this.t ? [tel.hedef] : []);
        if (kr.kes) for (const k of ben) {
          if (!musait(k)) continue;
          const c = this.kesmeKomutu(k, tel, T.ritim);
          if (c) ekle(80 + deger * 0.5, c);
        }
        for (const h of hedefler) {
          if (!musait(h)) continue;
          if (tel.kilit === 'kare' && kr.kac) {
            const q = this.guvenliKare(tel.kareler);
            if (q) { ekle(90 + deger * 0.3, { tur: 'hareket', k: h, kare: q }); continue; }
          }
          if ((kr.kac || kr.muk) && h.savun === 0) {
            if (kr.muk ? tel.kalan === 1 : tel.kalan <= 2) ekle(85 + deger * 0.3, { tur: 'savun', k: h });
          }
          if (tel.kilit === 'kahraman') for (const k of ben) {
            if (k.id === 'muhafiz' && musait(k) && !k.telegraf && h.kalkan === 0) ekle(70, { tur: 'ucuz', k, hedef: h });
          }
        }
      }

      // 2) Ultimate
      for (const k of ben) {
        if (!musait(k) || k.ult < 100) continue;
        if (Math.random() < a.ultBekle) continue;
        let puan = 55, hedef = null;
        if (k.id === 'muhafiz') puan += S.sutundakiler(1 - this.t, 0).some(x => x.telegraf) ? 30 : 0;
        if (k.def.ult.hedef === 'rakip') hedef = S.enZayif(1 - this.t);
        ekle(puan, { tur: 'ult', k, hedef });
      }

      // 3) Ağır skill (telegraf)
      for (const k of ben) {
        if (!musait(k) || k.telegraf) continue;
        if (T.ritim < k.p.agir.maliyet + a.rezerv) continue;
        const h = this.agirHedef(k);
        if (!h) continue;
        ekle(50 + h.deger * 0.5 + (T.ritim >= 9 ? 20 : 0), { tur: 'agir', k, hedef: h.hedef, secim: h.secim });
      }

      // 4) Ucuz skill
      for (const k of ben) {
        if (!musait(k) || k.telegraf) continue;
        const u = k.def.ucuz;
        if (T.ritim < k.p.ucuz.maliyet + a.rezerv) continue;
        const bolluk = T.ritim >= 9 ? 20 : 0;
        if (u.hedef === 'dost') {
          const dost = ben.slice().sort((x, y) => canYuzde(x) - canYuzde(y))[0];
          if (k.id === 'zaman_ustasi' && canYuzde(dost) < 0.5) ekle(45 + (1 - canYuzde(dost)) * 40, { tur: 'ucuz', k, hedef: dost });
          if (k.id === 'muhafiz' && canYuzde(dost) < 0.45 && dost.kalkan === 0) ekle(42 + bolluk, { tur: 'ucuz', k, hedef: dost });
        } else {
          const hedef = S.enZayif(1 - this.t);
          if (hedef && T.ritim >= 6) ekle(30 + bolluk + (canYuzde(hedef) < 0.3 ? 20 : 0), { tur: 'ucuz', k, hedef });
        }
      }

      aday.sort((x, y) => y.puan - x.puan);
      for (const d of aday) {
        if (d.puan < 30) break;
        if (S.komutVer(this.t, d.c)) { this.sonEylem = S.beat; return d.c; }
      }
      return null;
    }
  }

  window.Bot = Bot;
})();
