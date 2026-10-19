window.BT = window.BT || {};
BT.individualCopy = (function() {
  const sessions={planned:'Geplant',in_progress:'In Durchführung',completed:'Abgeschlossen',cancelled:'Abgesagt'};
  const attendance={pending:'Antwort offen',confirmed:'Zugesagt',declined:'Abgesagt',attended:'Anwesend',unexcused_no_show:'Unentschuldigt gefehlt'};
  const drafts={queued:'Zur Erstellung vorgemerkt',generating:'Wird erstellt',current:'Bereit zur Prüfung',stale:'Nach Änderungen neu erstellen',approved:'Für Spieler freigegeben',failed:'Erstellung fehlgeschlagen'};
  const metrics={
    tatsaechliches_ende:"Tatsächliches Trainingsende",dauer_ab_geplantem_beginn:"Dauer ab geplantem Beginn",
    readiness:'Tagesform',zeit:'Zeit',ballverluste:'Ballverluste',ausgelassene_huetchen:'Ausgelassene Hütchen',blick_oben:'Blick oben',schwache_hand:'Schwache Hand',
    treffer_rechts:'Treffer rechts',treffer_links:'Treffer links',korrekte_abschlusshand:'Richtige Abschlusshand',korrekte_schrittfolge:'Korrekte Schrittfolge',ballverlust_vor_abschluss:'Ballverlust vor Abschluss',technik:'Technik insgesamt',
    treffer_baseline_links:'Treffer Grundlinie links',treffer_fluegel_links:'Treffer Flügel links',treffer_frontal:'Treffer frontal',treffer_fluegel_rechts:'Treffer Flügel rechts',treffer_baseline_rechts:'Treffer Grundlinie rechts',
    fehlwurfrichtung:'Häufigste Fehlwurfrichtung',balance:'Gleichgewicht',wurflinie:'Wurflinie',follow_through:'Wurfbewegung ausschwingen',
    coach_beobachtung:'Trainerbeobachtung',entscheidung_richtig:'Richtige Entscheidungen',entscheidung_verspaetet:'Verspätete Entscheidungen',entscheidung_falsch:'Falsche Entscheidungen',treffer:'Treffer',versuche:'Versuche',
    vorteil_erzeugt:'Vorteil erzeugt',abschluss_erreicht:'Abschluss erreicht',genutzte_seite:'Bevorzugte Seite',coach_bewertung:'Entscheidungen insgesamt',kontrollbereich:'Wiederholter Bereich',kontrollwert:'Ergebnis nach der Technikkorrektur',
    funktionierte_am_besten:'Was funktionierte am besten?',am_schwierigsten:'Was war am schwierigsten?',hinweis_naechstes_training:'Hinweis fürs nächste Training',vollstaendig:'Alle Tests vollständig?',vergleichbar:'Bedingungen vergleichbar?',abweichung:'Abweichung bei der Messung',
    tatsaechliche_dauer:'Tatsächliche Dauer',schnellbewertung:'Schnellbewertung',beobachtung:'Beobachtung'
  };
  const fields={documentation:'Dokumentation',
    readinessScale:'Tagesformskala',mobilityTrips:'Bewegungsbahnen',stationaryDribbles:'Dribblings am Platz',controlledRuns:'Kontrollierte Läufe',practiceRuns:'Probedurchgänge',regularMeasuredRuns:'Messdurchgänge',weakHandMeasuredRuns:'Messdurchgänge mit schwacher Hand',
    rightLayups:'Korbleger rechts',leftLayups:'Korbleger links',switchAfterAttempts:'Spielerwechsel nach jeweils so vielen Versuchen',totalFinishes:'Abschlüsse insgesamt',positions:'Wurfpositionen',attemptsPerPosition:'Versuche je Position',totalAttempts:'Versuche insgesamt',switchAfterEachPosition:'Spielerwechsel nach jeder Position',
    ballhandling:'Ballkontrolle',finishOption:'Alternative Korbabschluss',shotOption:'Alternative Wurf',sets:'Serien',actionsPerSet:'Aktionen je Serie',totalActions:'Aktionen insgesamt',switchAfterEachSet:'Spielerwechsel nach jeder Serie',attacksPerPlayer:'Angriffe je Spieler',totalPossessions:'Ballbesitze insgesamt',maxDribbles:'Höchstens so viele Dribblings',
    finishProblem:'Bei Problemen beim Korbabschluss',shotProblem:'Bei Problemen beim Wurf',ballControlProblem:'Bei Problemen mit der Ballkontrolle',questions:'Reflexionsfragen',validationPasses:'Vollständigkeitsprüfung',digitalReflectionMinutes:'Digitale Reflexion in Minuten',thomasConversationMinutes:'Einzelgespräch mit Thomas in Minuten',adnanConversationMinutes:'Einzelgespräch mit Adnan in Minuten',jointCloseMinutes:'Gemeinsamer Abschluss in Minuten',durationMinutes:'Dauer in Minuten',
    setup:'Aufbau',metrics:'Zu erfassende Ergebnisse',rules:'Hinweise zur Messung',instruction:'Anleitung',instructions:'Anleitung',protocol:'Ablauf',totalDurationMinutes:'Gesamtdauer in Minuten',attempts:'Versuche',repetitions:'Wiederholungen'
  };
  const readable=value=>String(value ?? '').replaceAll('_',' ').replace(/([a-zäöü])([A-ZÄÖÜ])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
  const instruction=value=>String(value).replace(/\bReadiness\b/g,'Tagesform').replace(/\bCoach-/g,'Trainer-').replace(/\bFollow-through\b/gi,'Ausschwingen der Wurfbewegung').replace('Baseline niemals ersetzen','Ausgangswert niemals ersetzen').replace('beide Baselines','beide Grundlinien').replace(/\bSpeed\b/g,'schnell');
  function details(value) {
    if(typeof value==='string'){
      if(/^[\[{]/.test(value.trim())){try{return details(JSON.parse(value));}catch{/* Eigene Texte unverändert lesbar erhalten. */}}
      return instruction(value);
    }
    if(value===true)return 'Ja';if(value===false)return 'Nein';
    if(value===null || value===undefined)return 'Keine Angabe';
    if(Array.isArray(value))return value.map(details).join('; ') || 'Keine Vorgaben';
    if(typeof value==='object')return Object.entries(value).filter(([key,item])=>key!=='durationNotRecorded' && item!==null && item!==undefined && !(Array.isArray(item)&&!item.length)).map(([key,item])=>`${fields[key] || readable(key)}: ${details(item)}`).join(' · ') || 'Keine Vorgaben';
    return String(value);
  }
  function title(value) {
    const text=String(value || '').replace(/^Piloteinheit\b/i,'Einheit');
    return ({'Check-in und Readiness':'Ankommen und Tagesform','Check-in':'Ankommen und Tagesform','Check-in, Readiness und standardisierte Aktivierung':'Ankommen, Tagesform und standardisierte Aktivierung','Kontrollmessung nach Coaching':'Kontrollmessung nach Technikkorrektur'})[text] || text;
  }
  function cue(value) {
    const text=String(value || '');
    return ({
      'Bei Readiness 1–4 persönlich sprechen und Belastung regulär, angepasst oder nicht festlegen.':'Bei Tagesform 1–4 persönlich sprechen und Belastung regulär, angepasst oder nicht festlegen.',
      'Private Coach-Notiz, Spielerfeedback und Wochenfokus getrennt speichern.':'Private Trainernotiz, Rückmeldung für den Spieler und Wochenfokus getrennt speichern.',
      'Wochenfokus mit höchstens zwei Hinweisen erst nach Coach-Freigabe veröffentlichen.':'Wochenfokus mit höchstens zwei Hinweisen erst nach Trainerfreigabe veröffentlichen.'
    })[text] || text;
  }
  return {session:value=>sessions[value] || 'Status unbekannt',attendance:value=>attendance[value] || 'Status unbekannt',draft:value=>drafts[value] || 'Noch kein Entwurf',metric:value=>metrics[value] || readable(value),details,title,cue};
})();
