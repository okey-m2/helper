const assert=require('node:assert/strict');
const {comboScore,rankMoves,rolloutPolicy,mulberry32}=require('./engine');
for(let n=1;n<=8;n++) assert.equal(comboScore(['R'+n,'B'+n,'G'+n]).points,n*10+10);
for(let n=1;n<=6;n++){
 assert.equal(comboScore(['R'+n,'R'+(n+1),'R'+(n+2)]).points,n*10+40);
 assert.equal(comboScore(['R'+n,'B'+(n+1),'G'+(n+2)]).points,n*10);
}
assert.equal(comboScore(['R1','R2','R4']),null);
assert.equal(rolloutPolicy(new Set(),new Set(),400,mulberry32(1)),1);
const deck=['R','B','G'].flatMap(c=>Array.from({length:8},(_,i)=>c+(i+1)));
const hand=['R6','R7','R8'];
const out=deck.filter(c=>!hand.includes(c));
const winning=rankMoves(hand,out,250);
assert.equal(winning[0].probability,1);
assert.equal(winning[0].points,100);
assert.ok(winning.every(m=>m.kind==='play'));
assert.deepEqual(rankMoves(['R1','B4'],deck.filter(c=>!['R1','B4'].includes(c)),0),[]);
assert.equal(rankMoves(hand,out,190)[0].probability,0);
assert.deepEqual(rankMoves(hand,out,400),[]);
console.log('Engine checks passed: score tables, invalid combinations, threshold, exhausted deck.');
console.time('full hand');
const m=rankMoves(['R1','R4','B6','G7','G8'],[],0,100);
assert.ok(m.filter(x=>x.kind==='discard').length===5 && m.every(x=>x.probability>=0&&x.probability<=1));
console.timeEnd('full hand');
// Keep the historical benchmark opponent reproducible. The current strategy
// intentionally changes these recommendations; exact regressions live in
// strategy.test.cjs and empirical strength is checked by the paired benchmark.
const baseline=require('./test-support/engine-baseline.cjs');
for(const c of require('./engine-regression.json').cases){
 assert.deepEqual(baseline.rankMoves(c.hand,c.out,c.score),c.expected);
}
assert.equal(comboScore(['R1','R1','R2']),null);
assert.equal(comboScore(['R9','R7','R8']),null);
console.log('Historical baseline remains unchanged and reproducible.');
