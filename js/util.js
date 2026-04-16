window.BT = window.BT || {};

BT.util = (function() {
  function uuid(prefix) {
    const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    return (prefix || '') + rand;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function formatDate(iso) {
    if (!iso) return '';
    const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('de-DE');
  }

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function ageFrom(birthDate) {
    if (!birthDate) return null;
    const b = new Date(birthDate + 'T00:00:00');
    if (isNaN(b)) return null;
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
  }

  function renderTemplate(id) {
    const tpl = document.getElementById(id);
    return tpl.content.firstElementChild.cloneNode(true);
  }

  function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",;\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(escapeCSV).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function shareOrDownloadJSON(filename, obj, title) {
    const text = JSON.stringify(obj, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || filename });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        console.warn('Share fehlgeschlagen, falle auf Download zurueck:', e);
      }
    }
    downloadBlob(filename, blob);
    return 'downloaded';
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function pickFile(accept) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || '';
      input.addEventListener('change', () => resolve(input.files[0] || null));
      input.click();
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  var _toastTimer = null;

  function toast(msg, opts) {
    opts = opts || {};
    var host = document.querySelector('[data-role="toast-host"]');
    if (!host) return { dismiss: function() {} };
    if (_toastTimer) clearTimeout(_toastTimer);
    host.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    if (opts.action && opts.actionLabel) {
      var btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = opts.actionLabel;
      btn.addEventListener('click', function() { opts.action(); dismiss(); });
      el.appendChild(btn);
    }
    host.appendChild(el);
    function dismiss() {
      if (_toastTimer) clearTimeout(_toastTimer);
      _toastTimer = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    _toastTimer = setTimeout(dismiss, opts.timeout || 5000);
    return { dismiss: dismiss };
  }

  function confirmBtn(btn, onConfirm, opts) {
    opts = opts || {};
    if (btn._confirmPending) { onConfirm(); resetBtn(); return; }
    var origText = btn.textContent;
    var origClass = btn.className;
    btn._confirmPending = true;
    btn.textContent = opts.label || 'Wirklich löschen?';
    btn.classList.add('danger');
    var timer = setTimeout(resetBtn, opts.timeout || 3000);
    function resetBtn() {
      clearTimeout(timer);
      btn.textContent = origText;
      btn.className = origClass;
      btn._confirmPending = false;
    }
  }

  return { uuid, $, $$, formatDate, todayISO, ageFrom, renderTemplate, downloadCSV, downloadJSON, shareOrDownloadJSON, pickFile, readFileAsText, escapeHTML, downloadBlob, toast, confirmBtn };
})();
