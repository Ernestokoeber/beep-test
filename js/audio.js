window.BT = window.BT || {};

BT.audio = (function() {
  let ctx = null;
  let unlocked = false;
  let ttsUnlocked = false;
  let silentAudio = null;

  function createSilentAudio() {
    // iOS: Hardware-Stummschalter mutet Web Audio, aber nicht HTMLAudioElement.
    // Ein gelooptes stummes WAV flippt die Audio-Session auf "playback" — Beeps bleiben hörbar.
    const sampleRate = 8000;
    const numSamples = sampleRate * 0.5;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);
    const write = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    write(0, 'RIFF');
    view.setUint32(4, 36 + numSamples, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    write(36, 'data');
    view.setUint32(40, numSamples, true);
    for (let i = 0; i < numSamples; i++) view.setUint8(44 + i, 128);

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.loop = true;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    return audio;
  }

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
      try {
        if (!silentAudio) silentAudio = createSilentAudio();
        const p = silentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* ignore */ }
    } else if (silentAudio && silentAudio.paused) {
      try {
        const p = silentAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* ignore */ }
    }
    if (!ttsUnlocked && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        u.rate = 1;
        u.lang = 'de-DE';
        window.speechSynthesis.speak(u);
        ttsUnlocked = true;
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

  function restStartBeep() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    beep(1100, 0.14, now);
    beep(700, 0.18, now + 0.22);
  }

  function restEndBeep() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    beep(700, 0.1, now);
    beep(1100, 0.12, now + 0.15);
    beep(1500, 0.18, now + 0.33);
  }

  function tick() {
    beep(1400, 0.06);
  }

  function pickGermanVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find(v => v.lang === 'de-DE')
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('de'))
      || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      const s = window.speechSynthesis;
      if (s.paused) s.resume();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.1;
      u.pitch = 1.0;
      u.volume = 1.0;
      const v = pickGermanVoice();
      if (v) u.voice = v;
      s.speak(u);
    } catch (e) { console.warn('TTS fehlgeschlagen:', e.message); }
  }

  function announceLevel(levelNum) {
    speak('Level ' + levelNum);
  }

  return { ensureContext, shuttleBeep, levelBeep, startBeep, restStartBeep, restEndBeep, tick, speak, announceLevel };
})();
