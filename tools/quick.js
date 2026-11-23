const {playLevel}=require('./sim');
(async()=>{
 const t=Date.now();
 for (const n of [1,5,8,9,10,15,20,33,46,76,106,121,150]){
   const lv=MM_LEVELS.getLevel(n); let w=0,sc=0; const N=10;
   for(let s=0;s<N;s++){const r=await playLevel(lv,s+1);w+=r.won;sc+=r.score;}
   console.log(n,'moves',lv.moves,'goals',JSON.stringify(lv.goals),'win',w/N,'avgScore',Math.round(sc/N));
 }
 console.log('ms',Date.now()-t);
})().catch(e=>{console.error(e);process.exit(1)});
