function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createHistory(initialValue, options = {}) {
  const limit = Math.max(1, Number(options.limit) || 80);
  const copy = typeof options.clone === 'function' ? options.clone : clone;
  let present = copy(initialValue);
  let past = [];
  let future = [];

  function reset(value) {
    present = copy(value);
    past = [];
    future = [];
  }

  function replace(value) {
    present = copy(value);
  }

  function commit(value) {
    const next = copy(value);
    if (equal(present, next)) return false;
    past.push(copy(present));
    if (past.length > limit) past.splice(0, past.length - limit);
    present = next;
    future = [];
    return true;
  }

  function undo() {
    if (!past.length) return null;
    future.push(copy(present));
    present = past.pop();
    return copy(present);
  }

  function redo() {
    if (!future.length) return null;
    past.push(copy(present));
    present = future.pop();
    return copy(present);
  }

  return {
    reset,
    replace,
    commit,
    undo,
    redo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    current: () => copy(present),
    sizes: () => ({ past: past.length, future: future.length })
  };
}
