// Prototiplerde kullanılabilecek mevcut karakterler (görseller projenin kendi kart görsellerinden küçültüldü).
// Adlar çalışma adı; sınıf ve renk yalnız prototip içindir, kanon değildir.
window.Karakterler = [
  { id: 'muhafiz', ad: 'Kum Devi', sinif: 'Muhafız', rol: 'tank', renk: '#d9772b' },
  { id: 'oncu', ad: 'Gümüş Tanrıça', sinif: 'Öncü', rol: 'tank', renk: '#e8d48a' },
  { id: 'duellocu', ad: 'Yemin Şövalyesi', sinif: 'Düellocu', rol: 'savaşçı', renk: '#c23b3b' },
  { id: 'akinci', ad: 'Akıncı', sinif: 'Akıncı', rol: 'savaşçı', renk: '#7d7aa8' },
  { id: 'infazci', ad: 'Kuzgun', sinif: 'İnfazcı', rol: 'suikastçı', renk: '#9b2335' },
  { id: 'kor_ustasi', ad: 'Kor Ustası', sinif: 'Büyücü', rol: 'büyücü', renk: '#ff5a1f' },
  { id: 'zaman_ustasi', ad: 'Kum Saati Cini', sinif: 'Zaman', rol: 'destek', renk: '#e0b24a' },
  { id: 'nisanci', ad: 'Yıldız Okçusu', sinif: 'Nişancı', rol: 'nişancı', renk: '#7fb8ff' },
  { id: 'avci', ad: 'Barutçu Kontes', sinif: 'Avcı', rol: 'nişancı', renk: '#2f8f6f' },
];
window.KarakterBul = id => window.Karakterler.find(k => k.id === id);

// Bütün portre ve kart görsellerini yükler. kok: prototip klasöründen ortak klasöre göreli yol.
window.KarakterGorselleriYukle = function (kok) {
  kok = kok || '../ortak/';
  const harita = {};
  for (const k of window.Karakterler) {
    harita['portre_' + k.id] = kok + 'gorseller/portre/' + k.id + '.jpg';
    harita['kart_' + k.id] = kok + 'gorseller/kart/' + k.id + '.jpg';
  }
  Kit.gorselYukle(harita);
};
