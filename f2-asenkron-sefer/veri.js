// F2 Asenkron Sefer — oyun verisi (kahramanlar, eşyalar, etiketler, sayılar).
// Sayılar başlangıç değeridir; ayar gerekçeleri docs/prototype-progress/F2-STATUS.md'de.
// DOM'a bağlı değil: tarayıcıda da node'da da yüklenir (denge denemesi için).
(function (G) {
  'use strict';
  const F2 = G.F2 = G.F2 || {};

  F2.AYAR = {
    altin: 10,            // her tur (birikmez)
    kahramanFiyat: 3,
    yenile: 1,
    satis: 1,             // seviye başına
    can: 5,
    hedefGalibiyet: 10,
    yedek: 3,
    esyaMaks: 2,
    maksTur: 25,
    agirKayipTuru: 7,     // bu turdan itibaren yenilgi −2 can
    teklifSayisi: 5,      // 4 kahraman + 1 eşya
    firtinaBaslangic: 25, // sn; sonra iki takım da artan hasar alır
    savasTavan: 60,       // sn; hâlâ biten yoksa berabere
  };

  // Seviye çarpanı (can ve saldırı). Seviye 3 = 9 kopya, o yüzden büyük.
  F2.SEVIYE_KAT = [0, 1, 1.9, 3.3];

  // Dükkân kademesi tura göre
  F2.kademe = tur => (tur <= 2 ? 1 : tur <= 5 ? 2 : 3);
  // Kademeye göre kahraman/eşya katmanı olasılıkları [k1, k2, k3]
  F2.KATMAN_OLASILIK = { 1: [1, 0, 0], 2: [0.6, 0.4, 0], 3: [0.35, 0.4, 0.25] };

  F2.ROLLER = {
    tank: { ad: 'Tank', renk: '#d9a35b', esik: [2], acik: ['Ön sütundakiler +%25 can'] },
    savasci: { ad: 'Savaşçı', renk: '#e05a4f', esik: [2], acik: ['Savaşçılar +%20 hasar'] },
    nisanci: { ad: 'Nişancı', renk: '#7fb8ff', esik: [2], acik: ['Nişancılar +%30 saldırı hızı'] },
    buyucu: { ad: 'Büyücü', renk: '#c58bff', esik: [2], acik: ['Takımın skill dolumu %25 hızlı'] },
  };
  F2.KOKENLER = {
    kum: { ad: 'Kum', renk: '#e0b24a', esik: [2, 3], acik: ['Herkese savaş başında 15 kalkan', 'Herkese savaş başında 35 kalkan'] },
    kor: { ad: 'Kor', renk: '#ff6a2b', esik: [2, 3], acik: ['Kor kahramanların vuruşu yakar', 'Herkesin vuruşu yanma bırakır'] },
    gece: { ad: 'Gece', renk: '#8a8cff', esik: [2, 3], acik: ['Takıma +%15 kritik şansı', 'Takıma +%30 kritik şansı'] },
  };

  // tel: telegraf süresi (sn). 0 = anlık. hedef türü savas.js'deki skill kodunda.
  F2.KAHRAMANLAR = [
    {
      id: 'muhafiz', katman: 1, rol: 'tank', koken: 'kum', can: 190, atk: 8, hiz: 1.3, menzil: 'yakin', cd: 6,
      skill: { ad: 'Kum Kalkanı', tel: 0, acik: 'Canı en düşük dosta 30 kalkan.' },
      dallar: [
        { ad: 'Çifte Kalkan', acik: 'Kalkan canı en düşük iki dosta gider.' },
        { ad: 'Kum Zırhı', acik: 'Kalkan 55 olur, kendine de 25 kalkan.' },
      ],
      pasif: { ad: 'Taş Deri', acik: 'Aldığı bütün hasar −%25.' },
    },
    {
      id: 'duellocu', katman: 1, rol: 'savasci', koken: 'kor', can: 140, atk: 13, hiz: 1.0, menzil: 'yakin', cd: 6,
      skill: { ad: 'Yemin Kesiği', tel: 0.8, acik: 'Kısa hazırlık, sonra vurduğu rakibe 45 hasar.' },
      dallar: [
        { ad: 'Zincirleme Yemin', acik: 'Kesik öldürürse skill hemen yeniden dolar.' },
        { ad: 'Çift Kesik', acik: 'Kesik aynı sıradaki iki rakibe (ön ve arka) iner.' },
      ],
      pasif: { ad: 'Yemin Kanı', acik: 'Verdiği hasarın %20\'si kadar iyileşir.' },
    },
    {
      id: 'nisanci', katman: 1, rol: 'nisanci', koken: 'gece', can: 95, atk: 14, hiz: 1.3, menzil: 'uzak', cd: 7,
      skill: { ad: 'Keskin Nişan', tel: 1.2, acik: 'Canı en yüksek rakibe nişan alır: 60 hasar.' },
      dallar: [
        { ad: 'Yıldız Yağmuru', acik: 'Nişan yerine bütün rakiplere 3 dalga × 12 hasar.' },
        { ad: 'Delici Nişan', acik: 'Nişan hedefin arkasındaki rakibe de 60 vurur.' },
      ],
      pasif: { ad: 'Yıldız Gözü', acik: 'Kritik şansı +%25.' },
    },
    {
      id: 'zaman_ustasi', katman: 1, rol: 'buyucu', koken: 'kum', can: 110, atk: 7, hiz: 1.2, menzil: 'uzak', cd: 6,
      skill: { ad: 'Geri Sar', tel: 0, acik: 'Canı en düşük dosta 30 can.' },
      dallar: [
        { ad: 'Zaman Dalgası', acik: 'Bütün dostlara 18 can.' },
        { ad: 'Hızlandır', acik: '30 can + hedef 3 sn %60 hızlı vurur, skill dolumu +%40.' },
      ],
      pasif: { ad: 'Kum Döngüsü', acik: 'Savaşta bir kez, ölen ilk dost yarı canla geri döner.' },
    },
    {
      id: 'akinci', katman: 2, rol: 'savasci', koken: 'kum', can: 150, atk: 10, hiz: 0.9, menzil: 'yakin', cd: 7,
      skill: { ad: 'Süvari Hücumu', tel: 0.8, acik: 'Rakibin en kalabalık sırasını (ön+arka) çiğner: ikisine 28.' },
      dallar: [
        { ad: 'Akın Coşkusu', acik: 'Hücumdan sonra 4 sn %60 hızlı vurur.' },
        { ad: 'Çiğneme', acik: 'Hücum vurduklarını 1 sn sersemletir.' },
      ],
      pasif: { ad: 'Mızrak Ucu', acik: 'Düz vuruşu arkadaki rakibe de %50 sıçrar.' },
    },
    {
      id: 'kor_ustasi', katman: 2, rol: 'buyucu', koken: 'kor', can: 95, atk: 9, hiz: 1.3, menzil: 'uzak', cd: 7,
      skill: { ad: 'Alev Topu', tel: 1.2, acik: 'Rakibin bir sırasına (ön+arka) düşer: 32 + yanma.' },
      dallar: [
        { ad: 'İkiz Alev', acik: 'Alev Topu iki sıraya da düşer.' },
        { ad: 'Kor Yağmuru', acik: 'Yanma çok güçlenir: 4 sn boyunca saniyede 10.' },
      ],
      pasif: { ad: 'Kül Kalbi', acik: 'Bir rakip öldükçe skill dolumu %35 ilerler.' },
    },
    {
      id: 'avci', katman: 2, rol: 'nisanci', koken: 'kor', can: 100, atk: 10, hiz: 1.1, menzil: 'uzak', cd: 8,
      skill: { ad: 'Barut Fıçısı', tel: 1.5, acik: 'Rakibin arka sütununa fıçı atar: ikisine 34.' },
      dallar: [
        { ad: 'Büyük Fıçı', acik: 'Patlama ön sütuna da 20 vurur.' },
        { ad: 'Sersemletici Barut', acik: 'Vurduklarını 1,5 sn sersemletir (hazırlıklarını keser).' },
      ],
      pasif: { ad: 'Seri Atış', acik: 'Her 4. düz vuruşu üç kat.' },
    },
    {
      id: 'oncu', katman: 3, rol: 'tank', koken: 'gece', can: 200, atk: 9, hiz: 1.2, menzil: 'yakin', cd: 8,
      skill: { ad: 'Ay Işığı', tel: 1.0, acik: 'Rakibin ön sütununa 30 + 1,5 sn sersem (hazırlıkları keser).' },
      dallar: [
        { ad: 'Uzun Gece', acik: 'Sersem 3 sn sürer.' },
        { ad: 'Dolunay', acik: 'Bütün rakiplere iner (sersem 1 sn).' },
      ],
      pasif: { ad: 'Ay Kalkanı', acik: 'Savaş başında bütün dostlara 30 kalkan.' },
    },
    {
      id: 'infazci', katman: 3, rol: 'savasci', koken: 'gece', can: 115, atk: 12, hiz: 1.0, menzil: 'atlar', cd: 7,
      skill: { ad: 'İnfaz', tel: 1.0, acik: 'Canı en az olan rakibe 40; canı %40 altındaysa iki kat.' },
      dallar: [
        { ad: 'Kanlı Av', acik: 'İnfaz öldürürse skill hemen yeniden dolar.' },
        { ad: 'Kuzgun Sürüsü', acik: 'İnfaz kanama bırakır: 4 sn saniyede 8.' },
      ],
      pasif: { ad: 'Leş Kargası', acik: 'Bir rakip öldükçe 25 can ve +%10 hasar kazanır.' },
    },
  ];
  F2.KAHRAMAN = {};
  for (const k of F2.KAHRAMANLAR) F2.KAHRAMAN[k.id] = k;

  F2.ESYALAR = [
    { id: 'kalkan', ad: 'Kum Kalkanı', kisa: 'KK', katman: 1, fiyat: 1, renk: '#e0b24a', acik: 'Savaş başında 30 kalkan.' },
    { id: 'tuy', ad: 'Kuzgun Tüyü', kisa: 'KT', katman: 1, fiyat: 1, renk: '#9b2335', acik: 'İlk vuruş kritik, +%10 kritik şansı.' },
    { id: 'fici', ad: 'Barut Fıçısı', kisa: 'BF', katman: 1, fiyat: 1, renk: '#6b5a3a', acik: 'Ölünce rakibin ön sütununa 30 hasar.' },
    { id: 'eldiven', ad: 'Demir Eldiven', kisa: 'DE', katman: 1, fiyat: 2, renk: '#9aa3ad', acik: '+%25 hasar.' },
    { id: 'kortasi', ad: 'Kor Taşı', kisa: 'KR', katman: 2, fiyat: 2, renk: '#ff5a1f', acik: 'Vuruşlar yanma bırakır (3 sn, saniyede 3).' },
    { id: 'kumsaati', ad: 'Kum Saati', kisa: 'KS', katman: 2, fiyat: 2, renk: '#e8d48a', acik: 'Skill dolumu %25 hızlı.' },
    { id: 'muhur', ad: 'Yemin Mührü', kisa: 'YM', katman: 2, fiyat: 2, renk: '#c23b3b', acik: 'Canı %30 altına inince bir kez 50 iyileşir.' },
    { id: 'cizme', ad: 'Çevik Çizme', kisa: 'ÇÇ', katman: 2, fiyat: 2, renk: '#4fbf8a', acik: '+%25 saldırı hızı.' },
    { id: 'kemer', ad: 'Dev Kemeri', kisa: 'DK', katman: 2, fiyat: 2, renk: '#a0703f', acik: '+50 can.' },
    { id: 'diken', ad: 'Diken Zırhı', kisa: 'DZ', katman: 3, fiyat: 3, renk: '#5f8f4f', acik: '+30 can; yakından vurana her vuruşta 6 hasar.' },
    { id: 'aytasi', ad: 'Ay Taşı', kisa: 'AT', katman: 3, fiyat: 3, renk: '#b8c4ff', acik: 'Skill hasarı ve iyileşmesi +%40.' },
    { id: 'kadeh', ad: 'Kan Kadehi', kisa: 'KD', katman: 3, fiyat: 3, renk: '#7a1020', acik: 'Verdiği hasarın %20\'si kadar iyileşir.' },
  ];
  F2.ESYA = {};
  for (const e of F2.ESYALAR) F2.ESYA[e.id] = e;

  F2.HAYALET_ADLARI = [
    'Gezgin Nermin', 'Kervancı Selim', 'Çöl Kızı Ayla', 'Fener Bekçisi Rıza', 'Kum Falcısı Nur', 'Gölge Tüccarı Mert',
    'Yorgun Akıncı Cem', 'Kâhin Leyla', 'Demirci Hasan', 'Yıldızcı Defne', 'Tuz Yolu Emre', 'Kervanbaşı Zehra',
    'Sürgün Tarık', 'Işıkçı Melis', 'Kuyu Bekçisi Ömer', 'Bakırcı Sena',
  ];
})(typeof window !== 'undefined' ? window : globalThis);
