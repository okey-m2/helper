const COLORS = ["R","B","G"];
const COLOR_NAMES = {R:"Rosso", B:"Blu", G:"Giallo"};
const ALL_CARDS = [];
for (const c of COLORS) for (let n=1;n<=8;n++) ALL_CARDS.push(`${c}${n}`);

const state = {
  hand:new Set(),
  out:new Set(),
  score:0,
  mode:"hand",
  history:[],
  analysis:null
};

const el = id => document.getElementById(id);

function parseCard(card){ return {c:card[0], n:Number(card.slice(1))}; }

function computeComboScore(cards){
  if(cards.length !== 3 || new Set(cards).size !== 3 || cards.some(c=>!ALL_CARDS.includes(c))) return null;
  const p = cards.map(parseCard);
  const nums = p.map(x=>x.n).sort((a,b)=>a-b);
  const cols = p.map(x=>x.c);

  if(nums[0]===nums[1] && nums[1]===nums[2] && new Set(cols).size===3){
    return {points: nums[0]*10+10, desc:`TRIS di ${nums[0]}`};
  }

  if(nums[1]===nums[0]+1 && nums[2]===nums[1]+1){
    let points = nums[0]*10;
    const mono = new Set(cols).size===1;
    if(mono) points += 40;
    return {points, desc: mono ? `SCALA MONOCOLORE ${nums.join("-")}` : `SCALA ${nums.join("-")}`};
  }
  return null;
}

// Build once: every ordered triple points to its immutable scoring result.
const CARD_INDEX=Object.fromEntries(ALL_CARDS.map((c,i)=>[c,i]));
const SCORE_TABLE=new Array(24*24*24).fill(null);
const POINT_TABLE=new Uint8Array(24*24*24);
for(let a=0;a<24;a++)for(let b=a+1;b<24;b++)for(let c=b+1;c<24;c++){
 const result=computeComboScore([ALL_CARDS[a],ALL_CARDS[b],ALL_CARDS[c]]);
 if(!result)continue;
 Object.freeze(result);
 for(const [i,j,k] of [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]){
  const key=i*576+j*24+k;SCORE_TABLE[key]=result;POINT_TABLE[key]=result.points;
 }
}
function comboScore(cards){
 if(cards.length!==3)return null;
 const a=CARD_INDEX[cards[0]],b=CARD_INDEX[cards[1]],c=CARD_INDEX[cards[2]];
 if(a===undefined||b===undefined||c===undefined)return null;
 return SCORE_TABLE[a*576+b*24+c];
}

function combos(arr){
  const out=[];
  for(let i=0;i<arr.length;i++)
    for(let j=i+1;j<arr.length;j++)
      for(let k=j+1;k<arr.length;k++){
        const cs=[arr[i],arr[j],arr[k]];
        const result=comboScore(cs);
        if(result) out.push({...result,cards:cs});
      }
  return out;
}

function remainingCards(hand=state.hand, out=state.out){
  return ALL_CARDS.filter(c=>!hand.has(c)&&!out.has(c));
}

function possibleCompletions(a,b,remaining){
  const result=[];
  for(const x of remaining){
    const r=comboScore([a,b,x]);
    if(r) result.push({card:x,...r});
  }
  return result;
}

function staticCardPotential(card, handArr, remaining, score){
 const index=CARD_INDEX[card], n=index%8+1;
 const base=[0,2,5,9,14,19,24,23,18];
 let value=base[n], directCount=0;
 for(const other of handArr){
  if(other===card)continue;
  const oi=CARD_INDEX[other], offset=index*576+oi*24;
  let count=0,best=0;
  for(const x of remaining){
   const points=POINT_TABLE[offset+CARD_INDEX[x]];
   if(!points)continue;
   count++;if(points>best)best=points;
   if(score>=200 && score+points>=300)directCount++;
  }
  if(count){
   value+=best*.65+count*7;
   if((index/8|0)===(oi/8|0))value+=12;
   if(index%8===oi%8)value+=n*3;
  }
 }
 // Preserve the original floating-point addition order and tie breaking.
 while(directCount-->0)value+=22;
 return value;
}

function rolloutPolicy(handSet,outSet,score,rng){
  let hand=new Set(handSet), out=new Set(outSet), total=score;
  let deck=remainingCards(hand,out);

  // Shuffle remaining unseen deck for a simulated future.
  for(let i=deck.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }

  // Fill up to five if necessary.
  while(hand.size<5 && deck.length) hand.add(deck.pop());

  let guard=50;
  while(guard-- > 0){
    if(total>=300) return 1;

    if(hand.size<3) return 0;

    const handArr=[...hand];
    const legal=combos(handArr);

    // Prefer direct Silver, then strong scoring combinations.
    const direct=legal.find(x=>total+x.points>=300);
    if(direct){
      total+=direct.points;
      direct.cards.forEach(c=>{hand.delete(c);out.add(c);});
      while(hand.size<5 && deck.length) hand.add(deck.pop());
      continue;
    }

    // Early/mid rollout: only cash reasonable combos.
    const minAccept = deck.length>10 ? 70 : deck.length>4 ? 50 : 10;
    legal.sort((a,b)=>b.points-a.points);
    if(legal.length && legal[0].points>=minAccept){
      const play=legal[0];
      total+=play.points;
      play.cards.forEach(c=>{hand.delete(c);out.add(c);});
      while(hand.size<5 && deck.length) hand.add(deck.pop());
      continue;
    }

    if(!deck.length) {
      // With no draw left, cash whatever helps.
      if(legal.length){
        const play=legal[0];
        total+=play.points;
        play.cards.forEach(c=>{hand.delete(c);out.add(c);});
        continue;
      }
      return total>=300 ? 1 : 0;
    }

    // Discard lowest-potential card.
    const rem=deck.slice();
    let worst=null, worstPot=Infinity;
    for(const c of hand){
      const pot=staticCardPotential(c,[...hand],rem,total);
      if(pot<worstPot){worstPot=pot;worst=c;}
    }
    hand.delete(worst); out.add(worst);
    hand.add(deck.pop());
  }
  return total>=300 ? 1 : 0;
}

function mulberry32(a){
  return function(){
    let t=a+=0x6D2B79F5;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  }
}

function simulateDiscard(card, iterations=2200){
  let wins=0;
  const seedBase = [...card].reduce((a,ch)=>a+ch.charCodeAt(0), state.score+state.out.size*31);
  for(let i=0;i<iterations;i++){
    const hand=new Set(state.hand);
    const out=new Set(state.out);
    hand.delete(card);
    out.add(card);
    const rng=mulberry32(seedBase + i*9973);
    wins += rolloutPolicy(hand,out,state.score,rng);
  }
  return wins/iterations;
}

function evaluatePlay(combo){
  const final=state.score+combo.points;
  if(final>=300) return 1;


  // Estimate continuation after playing combo.
  let wins=0, iterations=1600;
  for(let i=0;i<iterations;i++){
    const hand=new Set(state.hand), out=new Set(state.out);
    combo.cards.forEach(c=>{hand.delete(c);out.add(c);});
    const rng=mulberry32(123456 + i*7919 + combo.points*17);
    wins += rolloutPolicy(hand,out,final,rng);
  }
  return wins/iterations;
}


function rankMoves(hand, out, score, iterations=700){
  state.hand=new Set(hand); state.out=new Set(out); state.score=score;
  if(score>=300) return [];
  const moves=combos(hand).map(c=>({...c,kind:"play",probability:evaluatePlay(c)}));
  if(remainingCards().length) for(const card of hand)
    moves.push({kind:"discard",cards:[card],points:0,probability:simulateDiscard(card,iterations)});
  return moves.sort((a,b)=>b.probability-a.probability || b.points-a.points);
}
if(typeof module!=="undefined") module.exports={comboScore,combos,rankMoves,rolloutPolicy,mulberry32};
