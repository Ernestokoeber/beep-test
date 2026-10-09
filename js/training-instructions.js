window.BT = window.BT || {};

BT.trainingInstructions = (() => {
  const normalize = value => String(value || '').trim().toLocaleLowerCase('de-DE').replace(/^station\s*\d+\s*:\s*/, '');
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const LABELS = ['Ziel', 'Aufbau', 'Ablauf', 'Umfang & Pausen', 'Coaching', 'Anpassung'];
  const make = (goal, setup, steps, volume, coaching, adaptation) => LABELS.map((label, index) => `${label}: ${[goal, setup, steps, volume, coaching, adaptation][index]}`).join('\n\n');
  const load = 'Grün: geplantes Volumen in sauberer Qualität. Gelb: etwa 70 % der Versuche/Wiederholungen und zusätzliche Pausen. Rot: keine Sprünge oder harten Richtungswechsel, nur ausdrücklich freigegebene schmerzfreie Aufgaben; sonst Pause.';
  const shared = 'Korb A wird von Station 3 und 5 geteilt: Minute 0–1 Wechsel und Vorbereitung; Minute 1–8 nur Paint-Abschlüsse, Minute 8–15 nur Freiwürfe. Die jeweils andere Gruppe arbeitet ohne Korb außerhalb der Wurf- und Laufwege. Korb B gehört Station 4.';
  const TODAY = new Map([
    ['readiness-check & belastungsampel', make(
      'Vor dem Spiel die individuelle Belastung festlegen und alle Spieler den fünf Startgruppen zuordnen.',
      'Alle am Seitenrand versammeln; CourtHub im Reiter Belastung öffnen. Fünf möglichst gleich große Gruppen bilden, nur tatsächlich teilnehmende Spieler einteilen.',
      '1. Tagesform, Schmerzen und Belastung pro Spieler erfassen (3 min).\n2. Belastungsampel und Tagesziel besprechen (3 min).\n3. Die fünf Stationen, zwei Körbe und Rotationsrichtung erklären (4 min). Nach jeder 15-Minuten-Runde wechseln die Gruppen 1 → 2 → 3 → 4 → 5 → 1; alle fünf Stationen laufen parallel. ' + shared,
      '10 Minuten insgesamt; eine Gruppenliste und ein gemeinsames Wechselsignal für die fünf Runden festlegen.',
      'Anwesenheit prüfen, schmerzhafte Bewegungen vor Beginn melden lassen; Qualität vor Ermüdung. Jede Gruppe kennt ihre Startstation.', load)],
    ['individuelle aktivierung', make(
      'Körper und Ballgefühl vorbereiten, ohne vor dem Wochenendspiel zu ermüden.',
      'Ohne Korb auf freien Außenflächen verteilen; ein Ball pro Spieler oder paarweise abwechseln. Hütchen markieren sichere Laufwege.',
      '1. 2 min lockeres Gehen/Traben mit Richtungswechseln.\n2. 3 min kontrollierte Mobilität und langsame Knie-/Hüftbeuge im eigenen schmerzfreien Bereich.\n3. 3 min Ballhandling rechts/links, Blick nach vorn, Handwechsel im Stand und Gehen.\n4. 2 min Start-Stopp-Schritte und ruhige Landepositionen ohne maximale Sprünge.',
      '10 Minuten, kein Wettkampf und keine Sprintserie. Beim Partnerwechsel kurz durchatmen.',
      'Körperschwerpunkt kontrollieren; Stopps stabil ausführen. Bewegungstempo nur erhöhen, wenn die Technik sauber bleibt.', load)],
    ['pnr ballhandling & reject-fußarbeit', make(
      'Screen eng nutzen oder bewusst ablehnen; Ball und Füße beim Richtungswechsel kontrollieren.',
      'Ohne Korb an einer Seitenfläche. Zwei Hütchen als Screen-Linie, ein Startpunkt 3–4 m davor; Abstand zum nächsten Spieler halten. Ein Partner kann den Screen nur ruhig darstellen, kein Kontaktduell.',
      '1. Mit Ball am Startpunkt beginnen.\n2. Langsam an das Screen-Hütchen heranführen, Tempo kurz wechseln und die Schulter eng daran vorbeiführen.\n3. Nächste Wiederholung: Screen antäuschen, kontrolliert auf der freien Seite rejecten.\n4. Links und rechts abwechseln; am Ende stabil stoppen und über eine getrennte Rückspur zurückkehren. Partner wechseln nach jeder kleinen Serie.',
      '15 Minuten einschließlich 1 min Gruppenwechsel: 2 min Erklärung, 3 × 3 min Technik, je 1 min Pause zwischen den Serien und 1 min Rückmeldung. Pro Serie je Seite 4 kontrollierte Wiederholungen; keine Würfe.',
      'Ball abschirmen, Blick oben, Hüfte tief. Beim Nutzen des Screens keinen großen Bogen laufen; beim Reject nicht in den gedachten Verteidiger dribbeln.', load)],
    ['closeout-balance & defensiv-slides', make(
      'Kontrolliert ankommen und seitlich verschieben, ohne nach vorn durchzulaufen.',
      'Ohne Korb auf der gegenüberliegenden Außenfläche. Start- und Zielhütchen 3–4 m auseinander; seitlich je ein Hütchen. Ein Partner steht als ruhiges Passziel am Zielpunkt.',
      '1. Zügig zum Ziel anlaufen, die letzten Schritte deutlich verkürzen.\n2. Auf Armlänge kontrolliert stoppen; eine Hand zum Ball, Füße unter dem Körper.\n3. Zwei bis drei seitliche Slides links, wieder zur Mitte, dann rechts.\n4. Über die Außenbahn zum Start zurückgehen; Partner nach vier Wiederholungen wechseln. Keine aktive 1-gegen-1-Spielform.',
      '15 Minuten einschließlich 1 min Wechsel: 2 min zeigen, 3 × 3 min üben, je 1 min Pause und 1 min Rückmeldung. In jeder Serie vier Durchgänge je Spieler, Tempo kontrolliert.',
      'Gewicht nicht auf die Zehenspitzen werfen, Füße bei Slides nicht kreuzen. Fehler: zu schnell ankommen, zu eng stehen oder dem Ball hinterherspringen.', load)],
    ['paint-finishing & floater-touch', make(
      'Kurze Abschlüsse mit ruhiger Fußarbeit, weicher Ballabgabe und beidseitiger Kontrolle.',
      'Station 3 an Korb A; zwei Startpunkte am Rand der Zone, getrennte Rücklaufspur. Pro Paar ein Werfer und ein Rebounder. ' + shared,
      '1. Minute 0–1 Positionen und Reihenfolge festlegen.\n2. Minute 1–8 paarweise: ein kontrollierter Antritt, stabiler Stopp, kurzer Floater oder vereinbarter Nahabschluss. Links/rechts abwechseln; Werfer nach einer kleinen Serie wechseln.\n3. Ab Minute 8 Korb vollständig für Station 5 freigeben; außerhalb der Zone dieselbe Schrittfolge ohne Abschluss üben und Partner korrigieren.',
      '15 Minuten; echte Würfe nur im siebenminütigen Korbfenster. {targets} Nach jeder kleinen Serie Partnerwechsel und kurze Erholung; keine zusätzlichen Versuche erzwingen, wenn das Zeitfenster endet.',
      'Hoch und weich abgeben, Blick zum Ziel, Gleichgewicht beim Abschluss halten. Nicht unter den Korb treiben und keine maximalen Sprungserien durchführen.', load)],
    ['spacing catch-and-shoot', make(
      'Vor dem Fang wurfbereit sein, kontrolliert ausrichten und freie Spot-up-Würfe ohne Zögern nehmen.',
      'Station 4 nutzt Korb B. Zwei markierte Wurfpositionen auf Wing/Corner in passender Distanz, ein Zuspieler, ein Rebounder. Jeweils nur ein Ball in Richtung Korb; Rückwege außerhalb der Wurflinie.',
      '1. Minute 0–1 Positionen und Passweg festlegen.\n2. Füße vor dem Pass ausrichten, Hände als Ziel anbieten.\n3. Pass fangen, mit vereinbarter Fußarbeit stabilisieren und direkt kontrolliert werfen.\n4. Nach einer kleinen Serie Werfer, Passgeber und Rebounder wechseln; beide Positionen nutzen. Nur bei sauberer Technik die Distanz erhöhen.',
      '15 Minuten. {targets} Kleine Serien mit Partnerwechsel statt Dauerfeuer; zwischen den Serien kurz erholen. Treffer und tatsächliche Versuche getrennt erfassen.',
      'Hände und Füße vor dem Fang bereit; Ball nicht unnötig absenken. Gleichgewicht und gleiche Wurfbewegung halten; ein freier Wurf braucht keine zusätzliche Dribbelbewegung.', load)],
    ['freiwurf-präzision & fokusroutine', make(
      'Eine gleichbleibende persönliche Freiwurfroutine und konzentrierte Ballabgabe festigen.',
      'Station 5 teilt Korb A mit Station 3. Während Paint-Abschlüssen bleibt diese Gruppe außerhalb der Zone; ab Minute 8 an die Freiwurflinie wechseln. Ein Werfer, ein Rebounder, übrige Spieler warten außerhalb des Laufwegs.',
      '1. Minute 0–1 Routine vereinbaren.\n2. Minute 1–8 ohne Korb Stand, Atmung, Zielblick und ruhige Ausholbewegung besprechen/üben; keine Bälle in Richtung des belegten Korbs werfen.\n3. Minute 8–15 je zwei Freiwürfe in Folge, dann Werfer/Rebounder wechseln.\n4. Vor jedem Versuch dieselbe Routine; Treffer und tatsächliche Versuche in CourtHub eintragen.',
      '15 Minuten; echte Freiwürfe nur in Minute 8–15. {targets} Zwei Versuche pro Durchgang; Pausen entstehen beim Rollenwechsel. Am Ende der Runde keine zusätzlichen Würfe nachholen.',
      'Gleicher Stand und gleiche Vorbereitung, Wurfbewegung bis zum Ende halten. Nach Fehlwürfen nicht hektisch die Routine ändern.', load)],
    ['cooldown & session-rpe', make(
      'Belastung kontrolliert beenden und die tatsächliche Session-RPE dokumentieren.',
      'Bälle ablegen, gemeinsam am Seitenrand sammeln. CourtHub-Reiter Belastung für die Nachbereitung bereithalten.',
      '1. 3 min ruhig gehen und die Atmung beruhigen.\n2. 3 min lockere, selbst gewählte schmerzfreie Mobilität.\n3. 2 min Beschwerden und die Qualität der Stationen kurz besprechen.\n4. 2 min RPE-Eintragung erklären; die gesamte Einheit bewerten und nach kurzer Erholung dokumentieren.',
      '10 Minuten. Keine Zusatzsprints oder Abschlusswettkämpfe; keine Würfe.',
      'Die subjektive Anstrengung der gesamten Einheit erfassen, nicht nur des letzten Blocks. Auffällige Beschwerden und ausgelassene Stationen als Notiz festhalten.', 'Alle schließen ruhig ab. Spieler mit Beschwerden besprechen ihre weitere Teilnahme mit dem Trainer; keine zusätzliche Belastung.')] 
  ]);

  function descriptionFor(training, drill) {
    const original = String(drill?.description || '').trim();
    if (training?.date !== '2026-10-09' || !training.stationTraining || LABELS.every(label => original.includes(label + ':'))) return original;
    const guide = TODAY.get(normalize(drill?.name || drill?.title));
    if (!guide) return original;
    const targets = drill?.shotTargets || training.plan?.drills?.find(item => normalize(item.name) === normalize(drill.title))?.shotTargets || [];
    const volume = targets.length
      ? 'Gespeicherte Vorgabe je Spieler: ' + targets.map(target => `${target.category}: ${target.attempted} Versuche`).join(' · ') + '.'
      : 'Falls noch keine Versuchsvorgabe gespeichert ist, vor der Runde ein erreichbares Ziel festlegen; hier wird keine Versuchszahl als absolviert angenommen.';
    return guide.replace('{targets}', volume) + (original ? `\n\nZusätzliche Hinweise aus dem Plan: ${original}` : '');
  }

  function markup(description) {
    const source = String(description || '').trim();
    if (!source) return '<p class="muted">Noch keine Übungsbeschreibung hinterlegt.</p>';
    const lines = source.split(/\n(?=(?:Ziel|Aufbau|Ablauf|Umfang & Pausen|Coaching|Anpassung|Zusätzliche Hinweise aus dem Plan):)/);
    return lines.map(line => {
      const match = /^(Ziel|Aufbau|Ablauf|Umfang & Pausen|Coaching|Anpassung|Zusätzliche Hinweise aus dem Plan):\s*([\s\S]*)$/.exec(line.trim());
      return match ? `<section class="training-guide-section"><h4>${escape(match[1])}</h4><p>${escape(match[2])}</p></section>` : `<p class="training-guide-text">${escape(line)}</p>`;
    }).join('');
  }

  function stationMarkup(training) {
    return (training?.stationTraining?.stations || []).map((station, index) => `<details class="training-guide"><summary>Station ${index + 1}: ${escape(station.title)}</summary>${markup(descriptionFor(training, station))}</details>`).join('');
  }
  return { descriptionFor, markup, stationMarkup };
})();
