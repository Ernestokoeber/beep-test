window.BT = window.BT || {};

// Ernesto's explicitly requested replacement for this one TSV Tuesday.
// Materialize through ordinary workspace storage, once; subsequent coach edits win.
BT.coachPreparedTraining = (() => {
  const date = '2026-11-24', revision = 'tsv-2026-11-24-zusammenspiel-v2';
  const summary = 'Zusammenspiel in der Offense · Full Court zum Aufwärmen · 75 Minuten 5 gegen 5 · Freiwürfe aus Spielsituationen';
  const foulRules = 'Fouls nach normalen Basketballregeln: Wurffoul bei erfolglosem Zweier: zwei Freiwürfe; bei erfolglosem Dreier: drei. Treffer trotz Wurffoul: Korb zählt plus ein Freiwurf. Teamfouls je Viertel erfassen und die normale Mannschaftsfoulstrafe beachten; ein gewöhnliches Foul außerhalb der Wurfaktion gibt davor Einwurf. Für Offensivfouls und besondere Fouls gelten die normalen Regeln. Keine pauschalen Ersatzpunkte für Fouls. Bei Freiwürfen reguläre Aufstellung einnehmen, Ausboxen und Rebound beachten und nach dem letzten Wurf regelgerecht weiterspielen. Keine isolierten Freiwurfserien.';
  const legacyFoulRules = 'Foulregel ohne Freiwürfe: Foul unterbricht den Angriff, danach Einwurf für den Angriff. Ein Wurffoul gibt zusätzlich einen Punkt; ein erzielter Korb zählt regulär, bei zusätzlichem Foul ebenfalls ein Bonuspunkt. Keine Wurfserie an der Linie.';
  const legacyReferences = ['Es gilt dieselbe Einwurf-/Bonuspunkteregel ohne Freiwürfe.','Fouls nach der zuvor erklärten Einwurf-/Bonuspunkteregel, ohne Freiwürfe.'];
  const foulReference = 'Es gelten dieselben normalen Foul- und Freiwurfregeln mit regulärer Aufstellung, Ausboxen, Rebound und anschließendem Weiterspielen.';
  const blocks = [
    ['Full-Court-Passlauf in drei Bahnen',15,'medium',
      'Aufbau: Drei Angreifer mit einem Ball in drei breiten Bahnen an der Grundlinie. Weitere Dreiergruppen warten dahinter. Rückweg außerhalb der markierten Laufbahnen; bei Gegenverkehr erst den Rückweg freigeben.\nAblauf: Im Laufen vom mittleren Spieler nach außen und zurück passen, ohne Dribbling. Der letzte Pass führt zum Korbleger; Abschlussseiten wechseln. Ball sichern und außen zurückgehen. Die nächste Gruppe startet erst, wenn die vorausgehende Gruppe den Abschluss- und Rückwegbereich freigegeben hat. Zunächst vier Minuten locker anlaufen, anschließend Tempo steigern und die Fußarbeit vor dem Fang aktivieren.\nCoaching: Blick vor dem Pass heben, in den Lauf passen, Zielhand zeigen, Ball vor dem Körper fangen und kontrolliert abschließen. Kein Wettrennen und keine kreuzenden Rückwege. Kurze Mobilisation und Trinkpause gehören in dieses Fenster.'],
    ['Offense-Verbindungen im 5 gegen 0',10,'medium',
      'Aufbau: Fünf Spieler im Halbfeld. PG/SG/SF übernehmen Ball- und Flügelrollen, PF/Center stellen Blocks und besetzen innere Fangfenster. Zusätzliche Spieler wechseln nach zwei Abläufen ein.\nAblauf: Flügelpass, Cut des Passgebers und Nachbesetzen des freien Außenplatzes. Danach Einstieg ins Pick-and-Roll: stehender Block, enges Nutzen, Roll oder passendes Pop und ballferner Anschluss. Beide Seiten üben.\nAlternativen: Vorgestellte Hilfe schließt den Drive: Roll-Pass oder Kick-out. Erste Verbindung zu: Ball umkehren und neu aufbauen.\nCoaching: Paint freihalten, nicht gleichzeitig in dieselbe Spur cutten und rollen, nach dem Pass weiterarbeiten. Kurz erklären und Wege verstehen; keine festgelegte Passfolge später gegen geschlossene Linien erzwingen.'],
    ['5 gegen 5 – Zusammenspiel aufbauen',20,'medium',
      'Aufbau: Zwei nach Ballhandlern, Flügeln und Innenspielern ausgeglichene Teams; echte Mannverteidigung. Angriffe im Halbfeld starten, nach jedem Ballbesitz Angriff und Verteidigung wechseln.\nAblauf: Flügelpass und Anschlussbewegung als Einstieg. Danach frei spielen. Keine Hilfe: freie Linie abschließen. Hilfe am Drive: sichtbaren Mitspieler finden. Passwinkel geschlossen: Ball schützen, neu ausrichten oder sicher umkehren.\nCoaching: Nach dem Pass nicht stehen bleiben. Drive-, Cut- und Rollspur abstimmen. Zunächst kurz einfrieren und höchstens einen Punkt korrigieren, dieselbe Situation nochmals starten; danach mehrere Angriffe laufen lassen. Trink- und Wechselpausen im Zeitfenster.\n'+foulRules+''],
    ['5 gegen 5 – Pick-and-Roll und Anschluss',25,'medium',
      'Aufbau: Dieselben Teams; nach Rebound, Korb oder Ballgewinn über das ganze Feld weiterspielen. PG/SG/SF nutzen Blocks, PF/Center stellen sie.\nAblauf: Im geordneten Angriff Pick-and-Roll als Einstieg. Offene eigene Linie: Drive und Abschluss. Hilfe bindet den Ball: Roll-Pass oder Kick-out. Tiefer Roll zugestellt: Big bietet sich im Short Roll an; Außenspieler schafft ein sichtbares Anschlussfenster. Erstes Fenster zu: Re-Screen oder sichere Ballumkehr und neuer Angriff. Pop nur bei passendem Spieler und freiem Raum.\nCoaching: Block vollständig still, Block eng nutzen, Kopf heben, Passwinkel nach Hilfe verändern. Zweiter Big steht außerhalb der Drive-/Rollspur und wird bei passender Hilfe im Post anspielbar. Freie Abschlüsse sofort nehmen. Nach jeweils etwa sieben Minuten kurz korrigieren, trinken und fortsetzen. '+foulReference+''],
    ['5 gegen 5 – freies Trainingsspiel',30,'high',
      'Aufbau: Drei Spielabschnitte à acht Minuten; insgesamt sechs Minuten für zwei kurze Besprechungen, Trinken und Wechsel. Durchgehend echte Verteidigung und Umschalten über das ganze Feld.\nAblauf: Offense selbstständig organisieren. PnR, Flügelzug, Roll, Post-Anspiel und Kick-out passend zur Abwehr verbinden. Ein Zusatzpunkt für einen Korb nach gemeinsam erzeugtem Vorteil, etwa nach Hilfe und Weiterpass oder erfolgreichem Roll-Pass. Keine Pflichtzahl an Pässen; offene Abschlüsse sofort nutzen. '+foulReference+'\nCoaching: In den Besprechungen nur Abstand, Timing und Anschlussentscheidung bewerten. Thomas, falls anwesend: Dribbling und Zug kontrollieren, Hilfe lesen und rechtzeitig passen. Adnan, falls anwesend: Position vor dem Fang sichern, Balance und weichen Abschluss nutzen; geschlossener Post-Move führt zum Konter, zweite Hilfe zum Herauspass. Anschließend dieselbe Situation erneut im Spiel lösen. Zusatzspieler sinnvoll wechseln und Teams nach Rollen ausgleichen.'],
    ['Abschluss: Sieger/Verlierer und Cooldown',5,'medium',
      '100.–103. Minute: Nach dem abschließenden 5 gegen 5 machen die Gewinner zehn Liegestütze, die Verlierer einen Suicide-Durchgang. Ein Durchgang: von der Grundlinie nacheinander zur eigenen Freiwurflinie, Mittellinie, gegenüberliegenden Freiwurflinie und gegenüberliegenden Grundlinie laufen; nach jeder Linie zur Startgrundlinie zurückkehren. 103.–105. Minute: locker gehen, Atmung beruhigen, kurz mobilisieren und eine gelungene Verbindung sowie eine offene Anschlussentscheidung benennen. Keine isolierten Freiwurfserien.\nAuswertung: Haben wir nach dem Pass weitergearbeitet? Waren Drive-, Cut- und Rollspur frei? Haben wir auf Hilfe passend reagiert? Einen konkreten Punkt für das nächste Training festhalten.']
  ];
  function plan() {
    return {summary,durationMinutes:105,freethrows:null,shots:[],variants:null,
      drills:blocks.map(([name,minutes,intensity,description],i)=>({id:revision+'-'+i,name,minutes,intensity,description})),
      organization:'Mindestens zehn aktive Spieler für 5 gegen 5. 11–12 Spieler rotieren nach kurzen Abschnitten bei ausgeglichenen Rollen ein. Bei weniger als zehn wird die entsprechende echte Gleichzahl gespielt: 6/7 Spieler 3 gegen 3, 8/9 Spieler 4 gegen 4, jeweils mit Rotation bei ungerader Zahl. Den fehlenden zehnten Spieler nicht durch Überzahl ersetzen.'};
  }
  function apply(training) {
    const state=BT.sync?.getState?.(),user=state?.user;
    if (!training || training.date!==date || !['admin','coach','assistant'].includes(user?.role) || user?.organization?.slug!=='tsv-lindau-basketball' || state.identitySource!=='server') return training;
    if (training.coachPreparedPlan===revision || training.endedAt || ['completed','cancelled','abgesagt'].includes(training.status) || training.cancelled || training.liveSession || BT.util.todayISO()>date) return training;
    const copy=JSON.parse(JSON.stringify(training));
    if (training.coachPreparedPlan==='tsv-2026-11-24-zusammenspiel-v1') {
      // Amend only the previous foul instructions; keep later coach edits/IDs.
      const patch=text=>legacyReferences.reduce((value,old)=>value.replace(old,foulReference),String(text||'').replace(legacyFoulRules,foulRules)).replace(' · ohne Freiwürfe',' · Freiwürfe aus Spielsituationen').replace('Keine Freiwürfe oder zusätzlichen Wurfserien.','Keine isolierten Freiwurfserien oder zusätzlichen Wurfblöcke.');
      copy.plan.summary=patch(copy.plan.summary);copy.note=patch(copy.note);
      copy.plan.drills=(copy.plan.drills||[]).map(drill=>{
        const updated={...drill,description:patch(drill.description)};
        if (drill.id==='tsv-2026-11-24-zusammenspiel-v1-5') {
          updated.description='Abschluss des letzten 5 gegen 5: Gewinner machen zehn Liegestütze, Verlierer einen Suicide-Durchgang (Grundlinie zur eigenen Freiwurflinie, Mittellinie, gegenüberliegenden Freiwurflinie und gegenüberliegenden Grundlinie, nach jeder Linie zurück zur Startgrundlinie). Dafür die ersten drei Minuten dieses Abschlussblocks nutzen; anschließend zwei Minuten Cooldown und Auswertung.\n'+updated.description;
          if (drill.name==='Cooldown und gemeinsame Auswertung') updated.name='Abschluss: Sieger/Verlierer und Cooldown';
          updated.intensity='medium';
        }
        return updated;
      });
    } else {copy.plan=plan();copy.note=summary;}
    copy.planning={...copy.planning,source:'coach',status:'coach-edited',coachEdited:true,editedAt:new Date().toISOString()};
    copy.coachPreparedPlan=revision;
    // Existing captured results stay intact; only the planned targets are replaced.
    return BT.storage.upsertTraining(copy);
  }
  return {date,revision,plan,apply};
})();
