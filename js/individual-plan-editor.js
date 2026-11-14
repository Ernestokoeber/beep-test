window.BT = window.BT || {};
BT.individualPlanEditor = {
  mount(host,{profile,session,plan,exercises,measurements,refresh}) {
    if (!plan || !session) return;
    const esc=BT.util.escapeHTML;
    const planning=session.status === 'planned';
    const details=document.createElement('details'); details.className='card individual-plan-editor';
    details.open=planning && !exercises.length;
    details.innerHTML=planning ? '<summary>Trainingsplan bearbeiten</summary><p>Ergänze Ziel, Übungen, Dauer, Wiederholungen und Trainerhinweise für diesen Termin.</p>' : '<summary>Durchgeführten Ablauf nachtragen / korrigieren</summary><p>Hier dokumentierst du diese Einheit. Das tatsächliche Ende wird getrennt erfasst. Beobachtungen bleiben privat.</p>';
    const form=document.createElement('form');
    form.innerHTML=`<label>Titel<input name="title" required maxlength="200" value="${esc(plan.title)}"></label><label>Ziel / Einordnung<textarea name="objective" required maxlength="3000">${esc(plan.objective || '')}</textarea></label>${planning ? '' : '<label>Tatsächliches Trainingsende (optional)<input name="endedTime" type="time"></label>'}<div data-review-exercises></div><button type="button" class="btn" data-add-review-exercise>Übung hinzufügen</button><label>Grund der Korrektur<input name="reason" required minlength="5" maxlength="240" value="${planning ? 'Trainingsplanung angepasst' : ''}" placeholder="Zum Beispiel: tatsächlicher Ablauf laut Hallennotizen"></label><p role="status" data-review-status></p><button class="btn primary" type="submit">Ablauf und Beobachtungen speichern</button>`;
    const list=form.querySelector('[data-review-exercises]');
    const catalog=BT.exerciseCatalog, identity=catalog?.scope(),route=location.hash;
    const active=()=>form.isConnected && host.isConnected && location.hash===route && (!catalog || identity===catalog.scope() && catalog.writable());
    if(catalog) {
      form.querySelector('[data-add-review-exercise]').insertAdjacentHTML('afterend','<button type="button" class="btn primary" data-open-exercise-catalog>Aus Bibliothek</button><section class="individual-catalog-picker" data-individual-catalog hidden><button type="button" class="btn" data-close-exercise-catalog>Auswahl schließen</button><div data-catalog-browser></div></section>');
      const picker=form.querySelector('[data-individual-catalog]');let mounted=false;
      form.querySelector('[data-open-exercise-catalog]').onclick=()=>{
        if(!active())return;picker.hidden=false;
        if(!mounted){catalog.mountBrowser(picker.querySelector('[data-catalog-browser]'),{onPick:drill=>{
          if(!active())throw Error('Der Arbeitsbereich hat sich geändert. Bitte den Plan neu öffnen.');
          if(list.children.length>=30)throw Error('Ein Plan kann höchstens 30 Übungen enthalten.');
          add(catalog.individualExercise(drill));
        }});mounted=true;}
        picker.querySelector('[name=search]').focus();
      };
      form.querySelector('[data-close-exercise-catalog]').onclick=()=>{picker.hidden=true;form.querySelector('[data-open-exercise-catalog]').focus();};
    }
    function add(e={}) {
      const row=document.createElement('fieldset'); row.dataset.exerciseId=e.id || '';
      const observation=e.observation ?? ([...measurements].reverse().find(m=>m.exercise_id===e.id && m.metric_key==='trainernotiz')?.text_value || '');
      row.innerHTML=`<legend>Übung</legend><label>Übungsname<input name="exerciseTitle" required maxlength="200" value="${esc(e.title || '')}"></label><label>Zeitvorgabe aus dem Plan (Minuten)<input name="minutes" type="number" min="1" max="120" value="${e.measurement_method?.durationNotRecorded ? '' : e.duration_minutes || ''}"></label><label>Wiederholungen / Ablauf<textarea name="repetitions" maxlength="2000">${esc(e.repetitions?.instruction || '')}</textarea></label><label>Messung / Erfolgskriterium<textarea name="measurementInstruction" maxlength="2000">${esc(e.measurement_method?.instruction || '')}</textarea></label><label>Trainerhinweise<textarea name="cues" maxlength="1000">${esc((e.coaching_cues || []).join('\n'))}</textarea></label><label>Beobachtung / Ergebnis (privat)<textarea name="observation" maxlength="500">${esc(observation)}</textarea></label><button class="btn small" type="button" data-review-up>Nach oben</button><button class="btn small" type="button" data-review-down>Nach unten</button><button class="btn small" type="button" data-remove-review-exercise>Übung aus Ablauf entfernen</button>`;
      if(planning && BT.trainingProposals)BT.trainingProposals.enhanceRow(row,e);
      row.querySelector('[data-review-up]').onclick=()=>{if(row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);};
      row.querySelector('[data-review-down]').onclick=()=>{if(row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);};
      row.querySelector('[data-remove-review-exercise]').onclick=()=>row.remove();list.append(row);
      if(catalog) {
        row.insertAdjacentHTML('beforeend','<button type="button" class="btn small" data-save-review-library>Als eigene Übung speichern</button><p role="status" data-save-library-status></p>');
        row.querySelector('[data-save-review-library]').onclick=async event=>{
          const button=event.currentTarget,status=row.querySelector('[data-save-library-status]');
          if(button.disabled||!active())return;
          const value=name=>row.querySelector('[name="'+name+'"]').value.trim();
          const name=value('exerciseTitle'),minutes=Number(value('minutes')||0);
          if(name.length<2||!Number.isInteger(minutes)||minutes<0||minutes>120){status.textContent='Bitte einen Übungsnamen und eine gültige Dauer eintragen.';return;}
          button.disabled=true;
          try {
            // Private observations and recorded results never enter a template.
            BT.storage.upsertDrill({name,minutes,category:'Individualtraining',description:value('repetitions'),coachingPoints:value('cues').split('\n').filter(Boolean),successIndicator:value('measurementInstruction')});
            await BT.storage.flush();
            if(active())status.textContent='Als eigene Übung gespeichert. Private Beobachtungen wurden nicht übernommen.';
          }catch {if(active()){status.textContent='Speichern fehlgeschlagen. Bitte erneut versuchen.';button.disabled=false;}}
        };
      }
    }
    exercises.forEach(add);form.querySelector('[data-add-review-exercise]').onclick=()=>add();
    const serialize=()=>({expectedVersion:plan.version,title:form.elements.title.value,objective:form.elements.objective.value,
      exercises:[...list.children].map(row=>({id:row.dataset.exerciseId||null,title:row.querySelector('[name=exerciseTitle]').value,durationMinutes:row.querySelector('[name=minutes]').value||null,
        repetitions:row.querySelector('[name=repetitions]').value,measurementInstruction:row.querySelector('[name=measurementInstruction]').value,cues:row.querySelector('[name=cues]').value,
        observation:row.querySelector('[name=observation]').value,...(BT.trainingProposals?.rowData(row)||{})}))});
    const proposalUI=planning&&BT.trainingProposals?BT.trainingProposals.mount({form,list,profile,session,plan,serialize,add,refresh,active}):null;
    form.onsubmit=async event=>{
      event.preventDefault();if (!active() || !form.reportValidity()) return;
      if(proposalUI){await proposalUI.save();return;}
      const button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-review-status]');button.disabled=true;
      const rows=[...list.children].map(row=>({id:row.dataset.exerciseId || null,title:row.querySelector('[name="exerciseTitle"]').value,durationMinutes:row.querySelector('[name="minutes"]').value || null,cues:row.querySelector('[name="cues"]').value,repetitions:row.querySelector('[name="repetitions"]').value,measurementInstruction:row.querySelector('[name="measurementInstruction"]').value,observation:row.querySelector('[name="observation"]').value}));
      try {
        await BT.api.individualAction('saveSessionPlan',{profileId:profile.id,sessionId:session.id,expectedVersion:plan.version,title:form.elements.title.value,objective:form.elements.objective.value,changeReason:form.elements.reason.value,endedTime:form.elements.endedTime?.value || null,exercises:rows});
        await refresh();
      } catch(error) {status.textContent=error.message;button.disabled=false;}
    };
    details.append(form);host.append(details);
  }
};
