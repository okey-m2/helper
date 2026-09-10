importScripts("engine.js?v=20260910-strategy1");
onmessage=({data})=>{
  try { postMessage({id:data.id,moves:rankMoves(data.hand,data.out,data.score)}); }
  catch(error) { postMessage({id:data.id,error:error.message}); }
};
