// Independent reference for larger audit batches. Enumerate unordered draw
// subsets and average probabilities (production sums integer ordered outcomes).
// No production scoring table, optimistic bounds, or search budget is used.
const {points}=require('./exact-reference.cjs');
function createReference(hand,deck){
 const cards=[...hand,...deck],stride=2**cards.length,triples=[],memo=new Map();
 const bits=new Map(cards.map((c,i)=>[c,1<<i]));
 const mask=cs=>cs.reduce((m,c)=>m|bits.get(c),0);
 const count=m=>{let n=0;while(m){m&=m-1;n++;}return n;};
 for(let a=0;a<cards.length;a++)for(let b=a+1;b<cards.length;b++)for(let c=b+1;c<cards.length;c++){
  const p=points([cards[a],cards[b],cards[c]]);if(p)triples.push({mask:(1<<a)|(1<<b)|(1<<c),points:p});
 }
 function value(h,d,score){
  if(score>=300)return 1;
  const key=h+d*stride+(score/10)*stride*stride;
  if(memo.has(key))return memo.get(key);let v=0;
  const draw=Math.min(5-count(h),count(d));
  if(draw){
   let total=0,n=0;
   for(let subset=d;subset;subset=(subset-1)&d)if(count(subset)===draw){total+=value(h|subset,d^subset,score);n++;}
   v=total/n;
  }else{
   for(const t of triples)if((h&t.mask)===t.mask)v=Math.max(v,value(h^t.mask,d,score+t.points));
   if(d)for(let rest=h;rest;rest&=rest-1)v=Math.max(v,value(h^(rest&-rest),d,score));
  }
  memo.set(key,v);return v;
 }
 return {value:(score)=>value(mask(hand),mask(deck),score),after:(score,m)=>value(mask(hand)^mask(m.cards),mask(deck),score+m.points)};
}
module.exports={createReference};
