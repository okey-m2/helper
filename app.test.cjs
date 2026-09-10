const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element{
 constructor(){this.children=[];this.dataset={};this.classList={toggle(){},add(){}};this.value=0;}
 replaceChildren(...x){this.children=x;} append(x){this.children.push(x);} setAttribute(){} setCustomValidity(){} reportValidity(){}
}
const elements=new Map();
const document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement:()=>new Element()};
let saved;
const context=vm.createContext({document,localStorage:{getItem:()=>saved,setItem:(_,v)=>saved=v},structuredClone,Worker:class{postMessage(){} terminate(){}},console});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run('needed()'),5);
run("change(()=>game.hand=['R6','R7','R8','B1','G2'])");
assert.equal(run('needed()'),0);
assert.equal(run('busy'),true);
assert.equal(elements.get('analyzeBtn').hidden,true);
run("cancel();moves=[{kind:'play',cards:['R6','R7','R8'],points:100,probability:0.6}];render()");
elements.get('applyBtn').onclick();
assert.equal(run('game.score'),100);assert.equal(run('needed()'),3);assert.equal(run('game.out.length'),3);
assert.equal(elements.get('analyzeBtn').disabled,true);assert.equal(elements.get('applyBtn').hidden,true);
run("change(()=>game.hand.push('R1','R2','R3'))");
assert.equal(run('needed()'),0);
run("cancel();moves=[{kind:'discard',cards:['B1'],points:0,probability:0.5}];render()");
elements.get('applyBtn').onclick();
assert.equal(run('needed()'),1);assert.equal(run('game.score'),100);
elements.get('undoBtn').onclick();assert.equal(run('game.hand.length'),5);assert.equal(run('game.out.length'),3);
elements.get('resetBtn').onclick();assert.equal(run('game.hand.length'),0);
elements.get('undoBtn').onclick();assert.equal(run('game.hand.length'),5);
run('change(()=>game.score=400)');assert.equal(elements.get('applyBtn').hidden,true);assert.equal(elements.get('recommendationHeadline').textContent,'Oro raggiunto!');
assert.equal(JSON.parse(saved).game.score,400);
run("change(()=>{game.hand=['R1','B2'];game.out=CARDS.filter(c=>!game.hand.includes(c));game.score=100;})");
assert.equal(run('needed()'),0);assert.equal(elements.get('recommendationHeadline').textContent,'Partita conclusa');
assert.equal(run("valid({hand:['R1'],out:['R1'],score:0,started:false})"),false);
console.log('UI state checks passed: setup, play, draw, discard, undo, reset, persistence, target and endgame.');


// No computation until all drawn cards have been entered.
run("change(()=>{game={hand:['R1','R2','B4','G5'],out:[],score:0,started:false};})");
assert.equal(run('busy'),false);
run("change(()=>game.hand.push('G8'))");
assert.equal(run('busy'),true);
const stale=run('worker');
run("change(()=>game.hand.pop())");
stale.onmessage({data:{moves:[{kind:'discard',cards:['R1'],points:0,probability:1}]}});
assert.equal(run('moves.length'),0);
assert.equal(run('busy'),false);
run("change(()=>game.hand.push('G8'))");
run('worker').onerror();
assert.equal(elements.get('analyzeBtn').hidden,false);
elements.get('analyzeBtn').onclick();assert.equal(run('busy'),true);
run('worker').onmessage({data:{moves:[{kind:'discard',cards:['R1'],points:0,probability:0.5}]}});
assert.equal(elements.get('applyBtn').hidden,false);
assert.equal(elements.get('analyzeBtn').hidden,true);
elements.get('applyBtn').onclick();assert.equal(run('busy'),false);
run("change(()=>game.hand.push('R3'))");assert.equal(run('busy'),true);
// Saved cards must never populate the initial hand without explicit resume.
run('cancel();');
const restored=vm.createContext({document,localStorage:{getItem:()=>saved,setItem(){}},structuredClone,Worker:class{postMessage(){} terminate(){}},console});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),restored);
assert.equal(vm.runInContext('busy',restored),false);
assert.equal(vm.runInContext('game.hand.length',restored),0);
assert.equal(vm.runInContext('game.score',restored),0);
assert.equal(elements.get('resumePanel').hidden,false);
const savedBeforeResume=saved;
elements.get('resumeBtn').onclick();
assert.equal(vm.runInContext('busy',restored),true);
assert.equal(vm.runInContext('game.hand.length',restored),5);
assert.equal(elements.get('resumePanel').hidden,true);
assert.equal(saved,savedBeforeResume);
// Starting a new hand dismisses the saved session and cannot mix its cards.
vm.runInContext('cancel();',restored);
const fresh=vm.createContext({document,localStorage:{getItem:()=>saved,setItem(){}},structuredClone,Worker:class{postMessage(){} terminate(){}},console});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),fresh);
vm.runInContext("change(()=>game.hand.push('B8'))",fresh);
assert.equal(vm.runInContext('game.hand.length',fresh),1);
assert.equal(vm.runInContext('savedSession',fresh),null);
assert.equal(vm.runInContext('busy',fresh),false);
assert.equal(elements.get('resumePanel').hidden,true);
console.log('Automatic advice checks passed: complete hand, draw, stale results, retry and restore.');
// Non-adjacent combinations, middle discard, corrections and persistence preserve positions.
const slotsContext=vm.createContext({document,localStorage:{getItem:()=>null,setItem:(_,v)=>saved=v},structuredClone,Worker:class{postMessage(){} terminate(){}},console});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),slotsContext);
const slotRun=s=>vm.runInContext(s,slotsContext);
const positions=()=>JSON.parse(slotRun('JSON.stringify(game.slots)'));
slotRun("change(()=>game.hand=['R6','B1','R7','G2','R8']);cancel();moves=[{kind:'play',cards:['R6','R7','R8'],points:100,probability:0.5}];render()");
elements.get('applyBtn').onclick();
assert.deepEqual(positions(),[null,'B1',null,'G2',null]);
assert.equal(elements.get('hand').children[1].dataset.slot,2);
assert.equal(elements.get('hand').children[3].dataset.slot,4);
elements.get('hand').children[4].onclick();
slotRun("addCard('B8')");
assert.deepEqual(positions(),[null,'B1',null,'G2','B8']);
slotRun("addCard('G7');addCard('R1')");
assert.deepEqual(positions(),['G7','B1','R1','G2','B8']);
assert.equal(slotRun('busy'),true);
slotRun("cancel();moves=[{kind:'discard',cards:['R1'],points:0,probability:0.5}];render()");
elements.get('applyBtn').onclick();
assert.deepEqual(positions(),['G7','B1',null,'G2','B8']);
assert.deepEqual(JSON.parse(saved).game.slots,positions());
const holeSave=saved;
elements.get('undoBtn').onclick();
assert.deepEqual(positions(),['G7','B1','R1','G2','B8']);
// Correct slot 4 while slot 3 is already empty.
slotRun("change(()=>game.hand=game.hand.filter(c=>c!=='R1'))");
elements.get('hand').children[3].onclick();
slotRun("addCard('G5')");
assert.deepEqual(positions(),['G7','B1',null,'G5','B8']);
assert.equal(slotRun('busy'),false);
const holeContext=vm.createContext({document,localStorage:{getItem:()=>holeSave,setItem(){}},structuredClone,Worker:class{postMessage(){} terminate(){}},console});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),holeContext);
elements.get('resumeBtn').onclick();
assert.equal(vm.runInContext('JSON.stringify(game.slots)',holeContext),JSON.stringify(['G7','B1',null,'G2','B8']));
assert.equal(vm.runInContext('needed()',holeContext),1);
console.log('Fixed-slot checks passed: non-adjacent play, selected draw, middle discard, correction, undo and saved holes.');
// A heuristic rollout frequency must not be presented as a calibrated chance.
slotRun("cancel();moves=[{kind:'discard',cards:['G7'],points:0,probability:0.248,exact:false}];render()");
assert.equal(elements.get('probabilityBadge').textContent,'Consiglio stimato');
assert(!elements.get('ranking').children[0].textContent.includes('%'));
slotRun("moves=[{kind:'discard',cards:['G7'],points:0,probability:1,exact:true}];render()");
assert.equal(elements.get('probabilityBadge').textContent,'Scelta ottimale · 300+ punti: 100%');
assert(elements.get('probabilityBadge').title.includes('scelte successive ottimali'));
assert(elements.get('ranking').children[0].textContent.includes('100%'));
assert.equal(slotRun('probabilityText(0.999999)'),'>99,9%');
assert.equal(slotRun('probabilityText(0.000001)'),'<0,1%');
assert.equal(slotRun('probabilityText(0.4)'),'40,0%');
console.log('Advice labels distinguish exact probabilities from heuristic advice.');
