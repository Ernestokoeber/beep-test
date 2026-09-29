window.BT = window.BT || {};
BT.loadLive = (() => {
  let loading;
  return () => loading || (loading = import('./bridge.mjs').catch(error => { loading = null; throw error; }));
})();
