const COLORS = {R:'Rosso', B:'Blu', G:'Giallo'};
const CARDS = Object.keys(COLORS).flatMap(c=>Array.from({length:8},(_,i)=>c+(i+1)));
const $ = id=>document.getElementById(id);
const KEY='okey-helper-v2';
let game={hand:[],out:[],score:0,started:false}, history=[], moves=[], worker=null, busy=false, savedSession=null, selectedSlot=null;
function valid(g){return g && Array.isArray(g.hand) && Array.isArray(g.out) && g.hand.length<=5 && [...g.hand,...g.out].every(c=>CARDS.includes(c)) && new Set([...g.hand,...g.out]).size===g.hand.length+g.out.length && Number.isInteger(g.score) && g.score>=0 && g.score<=800 && g.score%10===0 && typeof g.started==='boolean';}
// Keep visual positions separate from the compact hand consumed by the engine.
function syncSlots(g){
 const previous=Array.isArray(g.slots)?g.slots:[];
 const placed=new Set();
 g.slots=Array.from({length:5},(_,i)=>{
  const c=previous[i];
  if(!g.hand.includes(c)||placed.has(c))return null;
  placed.add(c);return c;
 });
 for(const c of g.hand)if(!placed.has(c)){g.slots[g.slots.indexOf(null)]=c;placed.add(c);}
 return g;
}
function addCard(c){
 if(!CARDS.includes(c)||game.hand.includes(c)||game.out.includes(c)||game.hand.length>=5)return;
 change(()=>{
  const index=selectedSlot!==null && game.slots[selectedSlot]===null?selectedSlot:game.slots.indexOf(null);
  game.slots[index]=c;game.hand.push(c);selectedSlot=null;
 });
}
syncSlots(game);
try {
 const saved=JSON.parse(localStorage.getItem(KEY));
 if(valid(saved?.game) && (saved.game.hand.length || saved.game.out.length || saved.game.score)) {
  savedSession={game:syncSlots(saved.game),history:Array.isArray(saved.history)?saved.history.filter(valid).slice(-50).map(syncSlots):[]};
 }
} catch {}

function save(){try{localStorage.setItem(KEY,JSON.stringify({game,history}));}catch{$('saveNotice').hidden=false;$('saveNotice').textContent='Salvataggio non disponibile: tieni aperta questa pagina.';}}
function cancel(){worker?.terminate();worker=null;busy=false;moves=[];}
function change(fn){savedSession=null;cancel();history.push(structuredClone(game));history=history.slice(-50);fn();syncSlots(game);if(selectedSlot!==null && game.slots[selectedSlot]!==null)selectedSlot=null;save();render();analyze();}
function unseen(){return CARDS.filter(c=>!game.hand.includes(c)&&!game.out.includes(c));}
function needed(){return Math.min(5-game.hand.length,unseen().length);}
function card(c,click){const b=document.createElement(click?'button':'div');b.className='card';b.dataset.color=c[0];b.innerHTML=`<span class="num">${c.slice(1)}</span><span class="color-name">${COLORS[c[0]]}</span>`;if(click){b.type='button';b.onclick=click;b.setAttribute('aria-label',`${c.slice(1)} ${COLORS[c[0]]}`);}return b;}
function title(m){return m.kind==='play'?`Gioca queste 3 carte · +${m.points} punti`:'Scarta questa carta';}
function render(){
 const missing=needed(), done=game.score>=300, best=moves[0];
 $('resumePanel').hidden=!savedSession;
 if(savedSession) $('resumeSummary').textContent=`Partita salvata: ${savedSession.game.hand.length} carte in mano, ${savedSession.game.score} punti.`;
 $('score').textContent=game.score;$('scoreInput').value=game.score;$('progress').value=Math.min(game.score,300);
 $('targetLabel').textContent=done?'Obiettivo raggiunto':`Mancano ${300-game.score} punti`;
 $('remainingCount').textContent=`${unseen().length} carte nel mazzo`;$('outCount').textContent=`${game.out.length} già uscite`;$('handCount').textContent=`${game.hand.length}/5`;
 $('hand').replaceChildren(...game.slots.map((c,index)=>{
  if(c){
   const b=card(c,()=>change(()=>{game.hand=game.hand.filter(x=>x!==c);selectedSlot=index;}));
   b.dataset.slot=index+1;b.setAttribute('aria-label',`Slot ${index+1}: ${c.slice(1)} ${COLORS[c[0]]}. Tocca per correggere.`);
   if(best?.cards.includes(c))b.classList.add('suggested');return b;
  }
  const slot=document.createElement('button');slot.type='button';slot.className='slot';slot.textContent='+';
  slot.dataset.slot=index+1;slot.setAttribute('aria-label',`Inserisci carta nello slot ${index+1}`);
  slot.classList.toggle('active-slot',index===(selectedSlot??game.slots.indexOf(null)));
  slot.disabled=done;
  slot.onclick=()=>{selectedSlot=index;render();};return slot;
 }));
 $('cardGrid').replaceChildren(...CARDS.map(c=>{const b=card(c,()=>addCard(c));b.disabled=game.hand.includes(c)||game.out.includes(c)||game.hand.length===5||done;b.classList.toggle('out',game.out.includes(c));b.classList.toggle('selected',game.hand.includes(c));return b;}));
 $('outGrid').replaceChildren(...CARDS.map(c=>{const b=card(c,()=>change(()=>{game.started=true;game.out=game.out.includes(c)?game.out.filter(x=>x!==c):[...game.out,c];}));b.disabled=game.hand.includes(c);b.classList.toggle('selected',game.out.includes(c));b.setAttribute('aria-pressed',String(game.out.includes(c)));return b;}));
 $('picker').hidden=done||!!best;
 $('pickerTitle').textContent=game.started?'Aggiungi le nuove carte pescate':'Inserisci le 5 carte iniziali';
 $('pickerHint').textContent=missing?`Mancano ${missing} ${missing===1?'carta':'carte'} · Prossimo slot: ${(selectedSlot??game.slots.indexOf(null))+1}`:'';
 $('analyzeBtn').disabled=missing>0||game.hand.length<3||busy||done;
 $('analyzeBtn').hidden=true;
 $('analyzeBtn').textContent='Riprova il calcolo';
 $('undoBtn').disabled=!history.length;
 let headline='Partiamo dalla tua mano', detail='Seleziona le 5 carte che vedi in Metin2, rispettando numero e colore.';
 if(game.started){headline=missing?`Pesca ${missing} ${missing===1?'carta':'carte'} nel gioco`:'La mano è pronta';detail=missing?'Inserisci le nuove carte negli slot vuoti.':'Il consiglio viene calcolato automaticamente.';}
 else if(!missing){headline='La mano è pronta';detail='Il consiglio viene calcolato automaticamente.';}
 if(busy){headline='Confronto le mosse possibili…';detail='Attendi il consiglio.';}
 if(best){headline=title(best);detail=best.kind==='play'?`Giocale nel gioco: ${game.score} → ${game.score+best.points} punti.`:'Scartala nel gioco, poi premi «Fatto».';}
 if(done){headline=game.score>=400?'Oro raggiunto!':'Argento raggiunto!';detail=`Hai ${game.score} punti: l’obiettivo di almeno 300 è raggiunto. Puoi terminare la partita nel gioco e ritirare il baule.`;}
 else if(!unseen().length&&!moves.length&&!busy&&game.hand.length<3){headline='Partita conclusa';detail=`Hai ${game.score} punti. Non restano abbastanza carte per una combinazione.`;}
 $('recommendationHeadline').textContent=headline;$('recommendationDetail').textContent=detail;
 $('moveCards').replaceChildren(...(best?.cards||[]).map(c=>card(c)));
 $('tableCards').replaceChildren(...(best?.cards||[]).map(c=>card(c)));
 for(let i=best?.cards.length||0;i<3;i++){const back=document.createElement('div');back.className='card-back';back.textContent='\u2725';$('tableCards').append(back);}
 $('probabilityBadge').classList.toggle('hidden',!best);
 if(best)$('probabilityBadge').textContent=`Probabilità stimata di 300+ punti: ${(best.probability*100).toFixed(1)}%`;
 $('applyBtn').hidden=!best||done;
 $('applyBtn').textContent=best?.kind==='discard'?'Fatto, ho scartato':'Fatto, ho giocato';
 $('ranking').replaceChildren();
 for(const m of moves){const row=document.createElement('div');row.className='rank-item';row.textContent=`${m.kind==='play'?'Gioca':'Scarta'} ${m.cards.map(c=>`${c.slice(1)} ${COLORS[c[0]]}`).join(' + ')}${m.points?` (+${m.points})`:''} · ${(m.probability*100).toFixed(1)}%`;$('ranking').append(row);}
}
function analyze(){
 if(needed()||game.hand.length<3||game.score>=300)return;
 cancel();busy=true;render();
 try{worker=new Worker('worker.js?v=20260908-fast5');const current=worker;
 worker.onmessage=({data})=>{if(worker!==current)return;cancel();if(data.error){showError();return;}moves=data.moves;render();if(!moves.length){$('recommendationHeadline').textContent='Nessuna combinazione disponibile';$('recommendationDetail').textContent=`Il mazzo è esaurito. Puoi terminare nel gioco con ${game.score} punti.`;}};
 worker.onerror=()=>{if(worker!==current)return;cancel();showError();};
 worker.postMessage({...game,id:Date.now()});
 }catch{cancel();showError();}
}
function showError(){render();$('analyzeBtn').hidden=false;$('recommendationHeadline').textContent='Calcolo non disponibile';$('recommendationDetail').textContent='Riprova. Se hai aperto il file direttamente, usa la versione GitHub Pages oppure un server locale: il browser potrebbe bloccare il motore di calcolo.';}
$('resumeBtn').onclick=()=>{
 if(!savedSession)return;
 cancel();selectedSlot=null;game=structuredClone(savedSession.game);history=structuredClone(savedSession.history);savedSession=null;
 save();render();analyze();
};
$('analyzeBtn').onclick=analyze;
$('applyBtn').onclick=()=>{const best=moves[0];if(!best)return;change(()=>{game.hand=game.hand.filter(c=>!best.cards.includes(c));game.out.push(...best.cards);game.score+=best.points;game.started=true;});};
$('undoBtn').onclick=()=>{if(!history.length)return;cancel();selectedSlot=null;game=history.pop();save();render();analyze();};
$('resetBtn').onclick=()=>change(()=>{selectedSlot=null;game={hand:[],out:[],score:0,started:false};});
$('scoreInput').onchange=()=>{const score=Number($('scoreInput').value);if(!Number.isInteger(score)||score<0||score>800||score%10!==0){$('scoreInput').setCustomValidity('Inserisci un multiplo di 10 tra 0 e 800.');$('scoreInput').reportValidity();return;}$('scoreInput').setCustomValidity('');change(()=>{game.score=score;game.started=true;});};
$('scoreInput').oninput=()=>{cancel();$('applyBtn').hidden=true;$('analyzeBtn').disabled=true;$('probabilityBadge').classList.add('hidden');$('scoreInput').setCustomValidity('');};
render();
analyze();
