// Prototip ses efektleri: WebAudio ile anında sentezlenir, ses dosyası yok.
// Tarayıcı ilk dokunuşta sesi açar (Kit girdisi Ses.ac() çağırır). M tuşu sesi kapatır/açar.
(function () {
  const Ses = {};
  window.Ses = Ses;
  let ac = null, ana = null, gurultu = null;
  Ses.kapali = false;
  Ses.seviye = 0.5;

  Ses.ac = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      ana = ac.createGain(); ana.gain.value = Ses.seviye; ana.connect(ac.destination);
      const n = ac.sampleRate;
      gurultu = ac.createBuffer(1, n, n);
      const d = gurultu.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  };
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyM') { Ses.kapali = !Ses.kapali; if (ana) ana.gain.value = Ses.kapali ? 0 : Ses.seviye; }
  });

  // Tek ton: tip, frekans başı/sonu, süre, ses, gecikme
  function ton(tip, f0, f1, sure, ses, gec) {
    const t = ac.currentTime + (gec || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tip; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + sure);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ses, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(g); g.connect(ana); o.start(t); o.stop(t + sure + 0.02);
  }
  function hisirti(sure, ses, filtreF, filtreF1, tip, gec) {
    const t = ac.currentTime + (gec || 0);
    const k = ac.createBufferSource(); k.buffer = gurultu;
    const f = ac.createBiquadFilter(); f.type = tip || 'lowpass';
    f.frequency.setValueAtTime(filtreF, t);
    if (filtreF1) f.frequency.exponentialRampToValueAtTime(filtreF1, t + sure);
    const g = ac.createGain();
    g.gain.setValueAtTime(ses, t); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    k.connect(f); f.connect(g); g.connect(ana);
    k.start(t, Math.random() * 0.5); k.stop(t + sure + 0.02);
  }
  const r = (a, b) => a + Math.random() * (b - a);

  const efektler = {
    tikla: () => ton('square', 660, 880, 0.05, 0.08),
    vurus: () => { hisirti(0.08, 0.35, 2400, 300); ton('triangle', r(180, 230), 70, 0.09, 0.3); },
    agirVurus: () => { hisirti(0.18, 0.5, 1800, 120); ton('sine', 120, 40, 0.22, 0.6); },
    kritik: () => { hisirti(0.12, 0.45, 5000, 400, 'highpass'); ton('square', 900, 300, 0.12, 0.15); ton('sine', 140, 45, 0.2, 0.5); },
    ok: () => { hisirti(0.12, 0.2, 3000, 6000, 'bandpass'); ton('sine', 1200, 500, 0.08, 0.06); },
    buyu: () => { ton('sawtooth', 300, 900, 0.25, 0.08); ton('sine', 600, 1400, 0.3, 0.1, 0.03); },
    patlama: () => { hisirti(0.5, 0.7, 1200, 60); ton('sine', 90, 30, 0.45, 0.7); },
    ates: () => { hisirti(0.35, 0.4, 900, 3000, 'bandpass'); ton('sawtooth', 110, 60, 0.3, 0.1); },
    iyiles: () => { ton('sine', 520, 520, 0.12, 0.12); ton('sine', 780, 780, 0.16, 0.12, 0.08); },
    kalkan: () => { ton('triangle', 300, 600, 0.2, 0.2); hisirti(0.1, 0.15, 4000, 2000, 'highpass'); },
    kesme: () => { ton('square', 1400, 200, 0.18, 0.15); hisirti(0.15, 0.4, 6000, 800, 'highpass'); ton('sine', 200, 60, 0.2, 0.4); },
    uyari: () => { ton('square', 440, 440, 0.07, 0.07); ton('square', 440, 440, 0.07, 0.07, 0.12); },
    tikTak: () => ton('sine', 1000, 1000, 0.03, 0.05),
    para: () => { ton('square', 988, 988, 0.06, 0.07); ton('square', 1319, 1319, 0.12, 0.07, 0.06); },
    satin: () => { ton('triangle', 523, 523, 0.07, 0.15); ton('triangle', 659, 659, 0.07, 0.15, 0.06); ton('triangle', 784, 784, 0.14, 0.15, 0.12); },
    seviye: () => { [523, 659, 784, 1047].forEach((f, i) => ton('triangle', f, f, 0.16, 0.16, i * 0.07)); },
    birlesme: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => ton('square', f, f, 0.1, 0.08, i * 0.05)); },
    olum: () => { ton('sawtooth', 400, 60, 0.5, 0.15); hisirti(0.4, 0.3, 1500, 100); },
    hareket: () => hisirti(0.12, 0.15, 800, 2400, 'bandpass'),
    yukselis: () => { ton('sine', 300, 1200, 0.4, 0.15); ton('triangle', 450, 1800, 0.4, 0.08, 0.05); },
    zafer: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton('triangle', f, f, 0.22, 0.18, i * 0.12)); },
    yenilgi: () => { [392, 349, 311, 262].forEach((f, i) => ton('triangle', f, f * 0.98, 0.3, 0.18, i * 0.18)); },
    dalga: () => { ton('sawtooth', 110, 110, 0.5, 0.12); ton('sawtooth', 165, 165, 0.5, 0.08, 0.05); },
    ult: () => { ton('sawtooth', 150, 600, 0.35, 0.15); hisirti(0.6, 0.5, 400, 4000, 'bandpass', 0.1); ton('sine', 80, 40, 0.6, 0.6, 0.3); },
  };

  // Aynı efekt çok sık çalınca kulak yorulmasın: efekt başına en az 35 ms
  const son = {};
  Ses.cal = function (ad) {
    if (!ac || Ses.kapali) return;
    const t = performance.now();
    if (son[ad] && t - son[ad] < 35) return;
    son[ad] = t;
    const f = efektler[ad];
    if (f) { try { f(); } catch (e) { /* yok say */ } }
  };
})();
