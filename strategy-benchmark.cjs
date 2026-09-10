// Reproducible paired games, using identical unseen decks for both engines.
// Usage: node strategy-benchmark.cjs [games=500] [offset=0] [output.json]
const {Worker,isMainThread,parentPort}=require('node:worker_threads');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const E=require('./engine.js'),baseline=require('./test-support/engine-baseline.cjs');
const cards=['R','B','G'].flatMap(c=>Array.from({length:8},(_,i)=>c+(i+1)));
function play(engine,initialDeck){
 const deck=initialDeck.slice(),times=[];let hand=[],out=[],score=0,exact=0,decisions=0;
 while(score<300){
  while(hand.length<5&&deck.length)hand.push(deck.pop());if(hand.length<3)break;
  const start=performance.now(),m=engine.rankMoves(hand,out,score)[0];times.push(performance.now()-start);
  if(!m)break;
  assert(m.cards.every(c=>hand.includes(c)));assert.equal(new Set([...hand,...out,...deck]).size,24);
  if(m.kind==='play')assert.equal(engine.comboScore(m.cards).points,m.points);else assert(deck.length);
  if(m.exact)exact++;decisions++;
  hand=hand.filter(c=>!m.cards.includes(c));out.push(...m.cards);score+=m.points;assert(decisions<=24);
 }
 return {win:score>=300,score,exact,decisions,times};
}
if(!isMainThread){
 parentPort.on('message',id=>{
  const deck=cards.slice(),rng=E.mulberry32((0xA19F034D+Math.imul(id,2654435761))>>>0);
  for(let i=23;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  parentPort.postMessage({id,baseline:play(baseline,deck),current:play(E,deck)});
 });
}else{
 const n=Number(process.argv[2]||500),offset=Number(process.argv[3]||0),results=[];
 assert(Number.isInteger(n)&&n>0);assert(Number.isInteger(offset)&&offset>=0);
 const start=Date.now();let next=offset;
 const engineSha256=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'engine.js'))).digest('hex');
 for(let i=0;i<Math.min(8,n);i++){
  const worker=new Worker(__filename);worker.on('error',error=>{console.error(error);process.exit(1)});
  worker.on('message',r=>{
   results.push(r);if(next<offset+n)worker.postMessage(next++);else worker.terminate();
   if(results.length%100===0)console.log(`${results.length}/${n} games completed`);
   if(results.length===n){
    results.sort((a,b)=>a.id-b.id);
    const oldWins=results.filter(r=>r.baseline.win).length,wins=results.filter(r=>r.current.win).length;
    const gained=results.filter(r=>r.current.win&&!r.baseline.win).length,lost=results.filter(r=>!r.current.win&&r.baseline.win).length;
    const p=wins/n,z=1.95996398454,den=1+z*z/n,mid=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
    const delta=(gained-lost)/n,margin=z*Math.sqrt(((gained+lost)/n-delta*delta)/n);
    const times=results.flatMap(r=>r.current.times).sort((a,b)=>a-b);
    const summary={games:n,offset,engineSha256,baselineWins:oldWins,wins,rate:p,ci95:[mid-half,mid+half],gained,lost,delta,pairedDeltaCI95:[delta-margin,delta+margin],seconds:(Date.now()-start)/1000,decisionMs:{median:times[Math.floor(times.length/2)],p95:times[Math.floor(times.length*.95)],max:times.at(-1)}};
    if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify({summary,results},null,2));
    console.log(JSON.stringify(summary,null,2));
   }
  });worker.postMessage(next++);
 }
}
