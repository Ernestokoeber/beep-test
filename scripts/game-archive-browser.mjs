import assert from 'node:assert/strict';

export async function verifyGameArchive(browser, options, name, baseUrl) {
  const context=await browser.newContext({...options,locale:'de-DE',timezoneId:'Europe/Berlin',serviceWorkers:'block'});
  await context.addInitScript(()=>{
    window.BT={};let sync;
    Object.defineProperty(window.BT,'sync',{configurable:true,get:()=>sync,set(value){
      sync=value;const original=value.getState.bind(value);
      value.getState=()=>({...original(),user:{id:'archive-coach',role:'coach',organization:{id:'archive-e2e'}}});
    }});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const check=async label=>{
    const sizes=await page.evaluate(()=>[document.documentElement.clientWidth,document.documentElement.scrollWidth,document.body.scrollWidth]);
    assert(Math.max(sizes[1],sizes[2])<=sizes[0]+1,`${name}: ${label} overflow ${JSON.stringify(sizes)}`);
    assert.equal(errors.length,0,`${name}: ${errors.join(' | ')}`);
  };
  const warning=async accept=>{
    const shown=new Promise(resolve=>page.once('dialog',async dialog=>{
      assert(dialog.message().includes('Sicherheitshinweis')&&dialog.message().includes('geschlossen'));
      if(accept)await dialog.accept();else await dialog.dismiss();resolve();
    }));
    await page.locator('[data-action="unlock-game"]').tap();await shown;
  };
  try {
    await page.goto(baseUrl+'/#/dashboard');await page.locator('.mobile-home').waitFor();
    const data=await page.evaluate(()=>{
      const BT=window.BT;
      const players=Array.from({length:5},(_,i)=>BT.storage.upsertPlayer({name:'Archiv Spieler '+i,jerseyNumber:String(i)}));
      const today=BT.util.todayISO();
      const pastDate=new Date(today+'T12:00:00');pastDate.setDate(pastDate.getDate()-2);
      const past=BT.storage.upsertGame({team:'herren',date:`${pastDate.getFullYear()}-${String(pastDate.getMonth()+1).padStart(2,'0')}-${String(pastDate.getDate()).padStart(2,'0')}`,home:'TSV Lindau',away:'Archivgegner',status:'upcoming',coachSummary:'Original'});
      const upcoming=BT.storage.upsertGame({team:'herren',date:today,home:'TSV Lindau',away:'Heutiger Gegner',status:'upcoming'});
      const futureDate=`${Number(today.slice(0,4))+1}-03-06`;
      const future=BT.storage.upsertGame({team:'herren',date:futureDate,home:'TSV Ottobeuren 2',away:'TSV Lindau',status:'played',coachSummary:'Vorabnotiz',liveStats:{selectedSessionId:'before-game',sessions:[{id:'before-game',events:[{id:'finish',seq:1,kind:'finish'}]}]}});
      return {past:past.id,upcoming:upcoming.id,future:future.id,players:players.map(p=>p.id)};
    });
    await page.goto(baseUrl+'/#/games/'+data.past);
    const note=page.locator('[data-game-field="coachSummary"]');await note.waitFor();
    assert.equal(await note.getAttribute('readonly'),'');
    assert((await page.locator(`[data-game-id="${data.past}"]`).innerText()).includes('Absolviert · Ergebnis offen'));
    assert(await page.locator('[data-action="load-atlas"]').isDisabled());
    assert(await page.locator('[data-action="delete-game"]').isDisabled());
    await check('geschlossenes Spiel');
    await warning(false);assert.equal(await note.getAttribute('readonly'),'');
    await warning(true);assert.equal(await note.getAttribute('readonly'),null);
    await note.fill('Freigegebener Nachtrag');
    await page.locator('[data-action="lock-game"]').tap();
    await page.locator('[data-action="unlock-game"]').waitFor();
    assert.equal(await page.evaluate(id=>window.BT.storage.getGame(id).coachSummary,data.past),'Freigegebener Nachtrag');
    await warning(true);
    await page.locator('[data-action="edit-selected"]').tap();
    await page.locator('[data-role="game-form"] [name="score"]').fill('65:72');
    await page.locator('[data-role="game-form"] button[type="submit"]').tap();
    await page.locator('.game-list-card.active').filter({hasText:'Absolviert · 65:72'}).waitFor();
    await page.reload();await note.waitFor();
    assert.equal(await note.getAttribute('readonly'),'');
    assert.equal(await note.inputValue(),'Freigegebener Nachtrag');
    await check('Reload und Ergebnis');
    await page.locator(`[data-game-id="${data.upcoming}"]`).tap();
    assert.equal(await note.getAttribute('readonly'),null);
    assert((await page.locator(`[data-game-id="${data.upcoming}"]`).innerText()).includes('Geplant'));
    await page.locator(`[data-game-id="${data.future}"]`).tap();
    assert((await page.locator(`[data-game-id="${data.future}"]`).innerText()).includes('Geplant'));
    assert.equal(await page.locator('[data-role="game-archive"]').isVisible(),false);
    assert.equal(await note.getAttribute('readonly'),null);
    const priorCapture=await page.evaluate(id=>JSON.stringify(window.BT.storage.getGame(id).liveStats),data.future);
    await note.fill('Weiter bearbeitbare Vorabnotiz');await note.press('Tab');
    await page.locator(`[data-game-id="${data.past}"]`).tap();
    await page.locator(`[data-game-id="${data.future}"]`).tap();
    assert.equal(await note.inputValue(),'Weiter bearbeitbare Vorabnotiz');
    await page.reload();await page.locator(`[data-game-id="${data.future}"]`).tap();
    assert.equal(await note.getAttribute('readonly'),null);
    assert.equal(await note.inputValue(),'Weiter bearbeitbare Vorabnotiz');
    assert.equal(await page.evaluate(id=>JSON.stringify(window.BT.storage.getGame(id).liveStats),data.future),priorCapture,'Die Voraberfassung darf durch die Statuskorrektur nicht verändert werden.');
    await check('zukünftiges Spiel mit beendeter Voraberfassung nach Reload');
    await page.locator(`[data-game-id="${data.past}"]`).tap();
    await page.locator('[data-action="open-matchday"]').tap();
    await page.locator('.matchday').waitFor();
    assert(await page.locator('.matchday form > fieldset').evaluate(node=>node.disabled));
    assert(await page.locator('[data-field="ownSide"]').isDisabled());
    assert.equal(await page.evaluate(id=>window.BT.storage.getGame(id).matchday,data.past),undefined,'Lesendes Öffnen legt einen Entwurf an.');
    await check('direkter archivierter Spieltag');
    await warning(true);
    await page.locator('[data-field="ownSide"]').selectOption('home');
    await page.locator('[data-action="next"]').tap();
    await page.locator('[data-player-roster]').first().waitFor();
    for(const id of data.players)await page.locator(`[data-player-roster="${id}"][data-status="bench"]`).tap();
    await page.getByRole('button',{name:'Starting Five',exact:true}).tap();
    for(const id of data.players)await page.locator(`[data-player-lineup="${id}"][data-status="starter"]`).tap();
    await page.getByRole('button',{name:'Vorbereitung speichern',exact:true}).tap();
    await page.locator('.matchday > [role="status"]').filter({hasText:'Lokal gesichert'}).waitFor();
    await page.reload();await page.locator('.matchday').waitFor();
    assert(await page.locator('.matchday form > fieldset').evaluate(node=>node.disabled));
    assert.equal(await page.evaluate(id=>window.BT.storage.getGame(id).matchday.revisions.at(-1).value.roster.length,data.past),5);
    await check('gespeicherter archivierter Kader nach Reload');
    console.log(`CourtHub Spielarchiv Browser: ${name} · Status, Ablehnen, Freigabe, Ergebnis, Spieltag und erneute Sperre erfolgreich.`);
  } finally {await context.close();}
}
