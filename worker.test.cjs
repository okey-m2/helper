const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
let posted;const imports=[];
const ctx=vm.createContext({postMessage:m=>posted=m,importScripts:url=>{
 imports.push(url);vm.runInContext(fs.readFileSync(path.join(__dirname,url.split('?')[0]),'utf8'),ctx);
}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'worker.js'),'utf8'),ctx);
const cases=require('./test-support/strategy-regressions.json');
for(let i=0;i<cases.length;i++){
 const t=cases[i];ctx.onmessage({data:{id:i,hand:t.hand,out:t.out,score:t.score}});
 assert.equal(posted.id,i);assert(!posted.error);assert(posted.moves[0].exact);
 assert(Math.abs(posted.moves[0].probability-t.best)<1e-12);
}
assert(imports[0].startsWith('engine.js?v='));
const version=imports[0].split('?v=')[1];
assert(fs.readFileSync(path.join(__dirname,'app.js'),'utf8').includes(`worker.js?v=${version}`));
assert(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').includes(`app.js?v=${version}`));
ctx.onmessage({data:{id:'bad',hand:null,out:[],score:0}});
assert.equal(posted.id,'bad');assert.equal(typeof posted.error,'string');
console.log('Worker integration passed: engine loading, exact advice and error response.');
