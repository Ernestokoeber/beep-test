window.BT = window.BT || {};

// Reference-counted Wake-Lock: mehrere Views koennen sich gleichzeitig anmelden,
// der Screen bleibt wach bis zum letzten release().
BT.wake = (function() {
  let lock = null;
  const claims = new Set();

  async function ensureLock() {
    if (lock || !('wakeLock' in navigator)) return;
    try {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } catch (e) {
      console.warn('Wake Lock nicht verfuegbar:', e.message);
    }
  }

  function dropLock() {
    if (!lock) return;
    lock.release().catch(() => {});
    lock = null;
  }

  function acquire(key) {
    claims.add(key);
    ensureLock();
  }

  function release(key) {
    claims.delete(key);
    if (claims.size === 0) dropLock();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && claims.size > 0 && !lock) {
      ensureLock();
    }
  });

  return { acquire, release };
})();
