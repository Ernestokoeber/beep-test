window.BT = window.BT || {};

BT.audio = (function() {
  let ctx = null;
  let unlocked = false;

  function ensureContext() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { console.warn('Web Audio API nicht unterstützt'); return null; }
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (!unlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        unlocked = true;
      } catch (e) { /* ignore */ }
    }
    return ctx;
  }

  function beep(frequency, duration, startAt) {
    const c = ensureContext();
    if (!c) return;
    const t0 = startAt || c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.4, t0 + 0.01);
    gain.gain.setValueAtTime(0.4, t0 + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function shuttleBeep() {
    beep(1000, 0.15);
  }

  function levelBeep() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    beep(1200, 0.12, now);
    beep(1200, 0.12, now + 0.2);
  }

  function startBeep() {
    beep(800, 0.25);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { console.warn('TTS fehlgeschlagen:', e.message); }
  }

  function announceLevel(levelNum) {
    speak('Level ' + levelNum);
  }

  return { ensureContext, shuttleBeep, levelBeep, startBeep, speak, announceLevel };
})();
