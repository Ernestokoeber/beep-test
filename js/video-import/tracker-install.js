import { enhanceVideoTracking } from './tracker-v2.js';

export function installVideoTracking(view) {
  const NativeObserver = window.MutationObserver;
  if (!NativeObserver) return enhanceVideoTracking(view);

  window.MutationObserver = class TrackerMutationObserver extends NativeObserver {
    constructor(callback) {
      super((records, observer) => {
        const relevant = records.filter(record =>
          !record.target?.closest?.('.vi-tracker-v2')
        );
        if (relevant.length) callback(relevant, observer);
      });
    }
  };

  try {
    return enhanceVideoTracking(view);
  } finally {
    window.MutationObserver = NativeObserver;
  }
}
