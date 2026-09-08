importScripts("engine.js?v=20260908-fast5");
onmessage=({data})=>{
  try { postMessage({id:data.id,moves:rankMoves(data.hand,data.out,data.score)}); }
  catch(error) { postMessage({id:data.id,error:error.message}); }
};
