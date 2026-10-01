window.BT = window.BT || {};

BT.aiimport = (function() {
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = String(result).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function parseWithGemini(file, _legacyApiKey, onProgress) {
    if (!BT.api.getToken()) throw new Error('Bitte zuerst unter „Konto & Sync“ anmelden.');
    if (onProgress) onProgress('PDF wird gelesen …');
    const base64 = await fileToBase64(file);
    const mime = file.type || 'application/pdf';
    const sizeKB = Math.round(base64.length * 0.75 / 1024);
    if (onProgress) onProgress('PDF (' + sizeKB + ' KB) wird geschützt analysiert …');
    const startedAt = Date.now();
    const response = await BT.api.ai('parsePlan', {
      fileBase64: base64,
      mimeType: mime,
      schedule: {
        days: BT.storage.getSetting('regularDays', ['tue', 'fri']),
        time: BT.storage.getSetting('regularTime', '20:15'),
        durationMinutes: Number(BT.storage.getSetting('trainingDurationMinutes', 105)) || 105
      }
    });
    const parsed = response.data;
    parsed._meta = {
      model: response.model,
      requestId: response.requestId,
      elapsedSec: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      trainingsFound: parsed.trainings.length
    };
    return parsed;
  }

  function dayKeyToNum(key) {
    const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
    return map[String(key || '').toLowerCase()];
  }

  function nextDateForWeekday(weekday, fromDate) {
    const target = dayKeyToNum(weekday);
    if (target === undefined) return null;
    const d = new Date(fromDate);
    for (let i = 0; i < 14; i++) {
      const candidate = new Date(d);
      candidate.setDate(d.getDate() + i);
      if (candidate.getDay() === target) return candidate;
    }
    return null;
  }

  function isoDate(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function applyPhase(parsed) {
    if (!parsed.phase || !parsed.phase.name) return null;
    const p = parsed.phase;
    const existing = BT.storage.getPhases().find(ph =>
      ph.name === p.name || (p.start && ph.start === p.start)
    );
    return BT.storage.upsertPhase({
      id: existing ? existing.id : undefined,
      name: p.name || '',
      focus: p.focus || '',
      start: p.start || null,
      end: p.end || null,
      goals: Array.isArray(p.goals) ? p.goals : []
    });
  }

  function applyPlanToTrainings(parsed, preview) {
    applyPhase(parsed);
    const time = BT.storage.getSetting('regularTime', '20:15');
    const trainings = BT.storage.getTrainings();
    const results = [];
    const approvedItems = Array.isArray(preview?.items) ? preview.items : [];

    for (const item of approvedItems) {
      const planEntry = item.planEntry;
      const targetDate = item.date;
      if (item.action === 'protected') {
        results.push({ date: targetDate, action: 'protected', id: item.existingId });
        continue;
      }
      if (item.action !== 'new' && item.action !== 'fillable') continue;

      const shots = (planEntry.shots || []).filter(s => s.category && (s.attempted || 0) > 0);
      const ftAtt = planEntry.freethrows && planEntry.freethrows.attempted ? planEntry.freethrows.attempted : 0;
      const drills = (planEntry.drills || []).filter(d => d.name);

      const planObj = {
        summary: planEntry.summary || '',
        freethrows: ftAtt > 0 ? { attempted: ftAtt } : null,
        shots: shots.map(s => ({ category: s.category, attempted: s.attempted })),
        drills: drills.map(d => ({ name: d.name, minutes: d.minutes || null, description: d.description || '' }))
      };

      const planning = { source: 'ai-pdf', coachEdited: false };
      let existing = item.existingId
        ? trainings.find(t => t.id === item.existingId)
        : trainings.find(t => t.date === targetDate);
      if (item.action === 'fillable' && existing) {
        existing.plan = planObj;
        if (!existing.note && planObj.summary) existing.note = planObj.summary;
        existing.planning = planning;
        existing.status = 'draft';
        existing.coachEdited = false;
        existing.shots = existing.shots || [];
        for (const s of planObj.shots) {
          if (!existing.shots.find(x => x.category === s.category)) {
            existing.shots.push({ category: s.category, entries: [] });
          }
        }
        BT.storage.upsertTraining(existing);
        results.push({ date: targetDate, action: 'updated', id: existing.id });
      } else {
        const created = BT.storage.upsertTraining({
          date: targetDate,
          startTime: time,
          note: planObj.summary || '',
          plan: planObj,
          planning,
          status: 'draft',
          coachEdited: false,
          attendance: BT.storage.attendanceForActivePlayers(targetDate),
          freethrows: [],
          shots: planObj.shots.map(s => ({ category: s.category, entries: [] }))
        });
        results.push({ date: targetDate, action: 'created', id: created.id });
      }

      const globalCats = BT.storage.getShotCategories();
      let changed = false;
      for (const s of planObj.shots) {
        if (!globalCats.includes(s.category)) { globalCats.push(s.category); changed = true; }
      }
      if (changed) BT.storage.setShotCategories(globalCats);
    }

    return results;
  }

  async function summarizeTraining(training, previous, onProgress) {
    if (!BT.api.getToken()) throw new Error('Bitte zuerst unter „Konto & Sync“ anmelden.');
    const players = BT.storage.getPlayers();
    const data = BT.aicore.buildSummaryFacts(training, previous, players);
    if (onProgress) onProgress('Trainingsdaten werden geschützt ausgewertet …');
    const response = await BT.api.ai('summarizeTraining', data);
    return { text: response.text, model: response.model, requestId: response.requestId };
  }

  return { parseWithGemini, applyPlanToTrainings, summarizeTraining };
})();
