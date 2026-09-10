// Intentionally independent, readable reference: arrays, string keys, and an
// independent score implementation. No production bound or bit-mask code.
function points(cs){
 const ns=cs.map(c=>+c[1]).sort((a,b)=>a-b);
 if(ns[0]===ns[2])return ns[0]*10+10;
 if(ns[1]===ns[0]+1&&ns[2]===ns[1]+1)return ns[0]*10+(cs.every(c=>c[0]===cs[0][0])?40:0);
 return 0;
}
function createReference(){
 const memo=new Map();
 function actions(h,d){
  const moves=[];
  for(let a=0;a<h.length;a++)for(let b=a+1;b<h.length;b++)for(let c=b+1;c<h.length;c++){
   const cards=[h[a],h[b],h[c]],p=points(cards);if(p)moves.push({kind:'play',cards,points:p});
  }
  if(d.length)for(const c of h)moves.push({kind:'discard',cards:[c],points:0});return moves;
 }
 function after(h,d,s,m){return value(h.filter(c=>!m.cards.includes(c)),d,s+m.points);}
 function value(h,d,s){
  if(s>=300)return 1;if(h.length+d.length<3)return 0;
  const key=h.slice().sort().join(',')+'|'+d.slice().sort().join(',')+'|'+s;
  if(memo.has(key))return memo.get(key);let v=0;
  if(h.length<5&&d.length)for(const c of d)v+=value([...h,c],d.filter(x=>x!==c),s)/d.length;
  else for(const m of actions(h,d))v=Math.max(v,after(h,d,s,m));
  memo.set(key,v);return v;
 }
 return {value,actions,after};
}
module.exports={createReference,points};
