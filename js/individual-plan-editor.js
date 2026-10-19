window.BT = window.BT || {};
BT.individualPlanEditor = {
  mount(host,{profile,session,plan,exercises,measurements,refresh}) {
    if (!plan || !session) return;
    const esc=BT.util.escapeHTML;
    const details=document.createElement('details'); details.className='card individual-plan-editor';
    details.innerHTML='<summary>Durchgeführten Ablauf nachtragen / korrigieren</summary><p>Hier dokumentierst du diese Einheit. Die nächste Einheit wird anschließend mit KI erstellt. Die Zeitvorgaben stammen aus dem Plan. Das tatsächliche Ende wird getrennt erfasst. Beobachtungen bleiben privat.</p>';
    const form=document.createElement('form');
    form.innerHTML=`<label>Titel<input name="title" required maxlength="200" value="${esc(plan.title)}"></label><label>Ziel / Einordnung<textarea name="objective" required maxlength="3000">${esc(plan.objective || '')}</textarea></label><label>Tatsächliches Trainingsende (optional)<input name="endedTime" type="time"></label><div data-review-exercises></div><button type="button" class="btn" data-add-review-exercise>Übung hinzufügen</button><label>Grund der Korrektur<input name="reason" required minlength="5" maxlength="500" placeholder="Zum Beispiel: tatsächlicher Ablauf laut Hallennotizen"></label><p role="status" data-review-status></p><button class="btn primary" type="submit">Ablauf und Beobachtungen speichern</button>`;
    const list=form.querySelector('[data-review-exercises]');
    function add(e={}) {
      const row=document.createElement('fieldset'); row.dataset.exerciseId=e.id || '';
      const observation=[...measurements].reverse().find(m=>m.exercise_id===e.id && m.metric_key==='trainernotiz')?.text_value || '';
      row.innerHTML=`<legend>Übung</legend><label>Übungsname<input name="exerciseTitle" required maxlength="200" value="${esc(e.title || '')}"></label><label>Zeitvorgabe aus dem Plan (Minuten)<input name="minutes" type="number" min="1" max="120" value="${e.measurement_method?.durationNotRecorded ? '' : e.duration_minutes || ''}"></label><label>Trainerhinweise<textarea name="cues" maxlength="1000">${esc((e.coaching_cues || []).join('\n'))}</textarea></label><label>Beobachtung / Ergebnis (privat)<textarea name="observation" maxlength="500">${esc(observation)}</textarea></label><button class="btn small" type="button" data-remove-review-exercise>Übung aus Ablauf entfernen</button>`;
      row.querySelector('[data-remove-review-exercise]').onclick=()=>row.remove();list.append(row);
    }
    exercises.forEach(add);form.querySelector('[data-add-review-exercise]').onclick=()=>add();
    form.onsubmit=async event=>{
      event.preventDefault();if (!form.reportValidity()) return;
      const button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-review-status]');button.disabled=true;
      const rows=[...list.children].map(row=>({id:row.dataset.exerciseId || null,title:row.querySelector('[name="exerciseTitle"]').value,durationMinutes:row.querySelector('[name="minutes"]').value || null,cues:row.querySelector('[name="cues"]').value,observation:row.querySelector('[name="observation"]').value}));
      try {
        await BT.api.individualAction('saveSessionPlan',{profileId:profile.id,sessionId:session.id,expectedVersion:plan.version,title:form.elements.title.value,objective:form.elements.objective.value,changeReason:form.elements.reason.value,endedTime:form.elements.endedTime.value || null,exercises:rows});
        await refresh();
      } catch(error) {status.textContent=error.message;button.disabled=false;}
    };
    details.append(form);host.append(details);
  }
};
