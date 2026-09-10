const assert=require('node:assert/strict');
const E=require('./engine'),{createReference}=require('./test-support/exact-reference.cjs');
const cards=['R','B','G'].flatMap(c=>Array.from({length:8},(_,i)=>c+(i+1)));
const key=m=>m.cards.slice().sort().join(',');
for(const t of require('./test-support/strategy-regressions.json')){
 const actual=E.rankMoves(t.hand,t.out,t.score),expected=new Map(t.values.map(m=>[key(m),m.exact]));
 assert(Math.abs(actual[0].probability-t.best)<1e-12);
 for(const m of actual){assert.equal(m.exact,true);assert(Math.abs(m.probability-expected.get(key(m)))<1e-12);}
 // Entry order must not affect exact action values.
 const reordered=E.rankMoves(t.hand.slice().reverse(),t.out.slice().reverse(),t.score);
 for(const m of reordered)assert(Math.abs(m.probability-expected.get(key(m)))<1e-12);
}
const rng=E.mulberry32(0x71a9401);let checked=0;
for(let i=0;i<80;i++){
 const shuffled=cards.slice();for(let j=23;j>0;j--){const k=Math.floor(rng()*(j+1));[shuffled[j],shuffled[k]]=[shuffled[k],shuffled[j]];}
 const n=i%8,hand=shuffled.slice(0,5),unseen=shuffled.slice(5,5+n),out=shuffled.slice(5+n),score=10*Math.floor(rng()*30);
 const expected=createReference(),moves=E.rankMoves(hand,out,score);
 let best=0;for(const m of expected.actions(hand,unseen))best=Math.max(best,expected.after(hand,unseen,score,m));
 for(const m of moves){assert.equal(m.exact,true);assert(Math.abs(m.probability-expected.after(hand,unseen,score,m))<1e-12);checked++;}
 if(moves.length)assert(Math.abs(moves[0].probability-best)<1e-12);
 else assert.equal(best,0);
}
console.log(`Strategy checks passed: all 18 reported mistakes, hand-order invariance, ${checked} independent random action comparisons.`);
for(const [h,o,s] of [ [['R1','R1'],[],0], [['R1'],['R1'],0], [['X1'],[],0], [[],[],15], [[],[],-10] ])assert.throws(()=>E.rankMoves(h,o,s),/Invalid game/);
assert.throws(()=>E.rankMoves(['R1'],[],0,0),/Invalid game/);
assert.throws(()=>E.rankMoves(['R1'],[],0),/Complete the hand/);
assert.throws(()=>E.createExactSolver(['R1','R1']),/Invalid solver cards/);
const limited=E.createExactSolver(['R6','R7','R8'],0);
assert.throws(()=>limited.value(limited.mask(['R6','R7','R8']),0,10),/budget exceeded/);
// A directly winning move remains certified even before the exact endgame.
const direct=E.rankMoves(['R6','R7','R8','B1','G2'],[],200,1)[0];
assert.equal(direct.exact,true);assert.equal(direct.probability,1);
// An incomplete search must never be labelled exact or mixed with exact values.
const fallback=E.rankMoves(['R6','G8','G5','R1','R2'],['R3','R4','G3','B4','B3','B2','B1'],60,1);
assert(fallback.every(m=>m.exact===false));
