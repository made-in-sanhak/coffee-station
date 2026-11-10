// Dry-run by default. Live mode must be explicitly authorized by the user.
const fs = require('node:fs');
const path = require('node:path');
const cases = require('../tests/fixtures/midterm-inputs.json');
const live = process.argv.includes('--live');
async function main() {
 if (!live) { console.log(JSON.stringify({mode:'dry-run',external_calls:0,cases:cases.length,max_calls:5,retries:0})); return; }
 require('dotenv').config({path:path.resolve(__dirname,'../../.env'),quiet:true});
 const model = process.env.GEMINI_MODEL || '', apiKey = process.env.GEMINI_API_KEY || '';
 const {createMidtermGeminiExtractor} = require('../dist/modules/recommendations/midtermGemini');
 const {prepareMidterm} = require('../dist/modules/recommendations/midtermFlow');
 let calls=0,providerFailure=false;
 const request=async(url,options)=>{
  if(calls>=5)throw Error('Budget exhausted');
  calls++;
  try { const r=await fetch(url,options); if(!r.ok)providerFailure=true;return r; }
  catch {providerFailure=true;throw Error('Provider unavailable');}
 };
 const extractor=createMidtermGeminiExtractor({apiKey,model},request);
 console.log(JSON.stringify({mode:'live',model,max_calls:5,retries:0,data_mode:'mock'}));
 let pass=0;
 for(let i=0;i<Math.min(cases.length,5);i++){
  const c=cases[i],start=Date.now();
  try {
   const p=await prepareMidterm(c.message,extractor,'gemini');
   const fields=Object.entries(c.expected).every(([k,v])=>p.suggested_constraints[k]===v);
   const unresolved=(p.proposal.unresolved.length>0)===(c.unresolved.length>0);
   const ok=fields&&unresolved;if(ok)pass++;
   console.log(JSON.stringify({case:i+1,pass:ok,fields_match:fields,unresolved_presence_match:unresolved,
    conditions:p.suggested_constraints,unresolved:p.proposal.unresolved,elapsed_ms:Date.now()-start}));
  }catch(e){console.log(JSON.stringify({case:i+1,pass:false,http_status:e.status||null,elapsed_ms:Date.now()-start}));}
  if(providerFailure){console.log(JSON.stringify({stopped:'provider_failure',remaining_skipped:true}));break;}
 }
 console.log(JSON.stringify({summary:true,actual_calls:calls,passed:pass,total_planned:cases.length,
  note:'Unresolved presence is a coarse check; semantic review required.'}));
}
main().catch(()=>{console.error('Evaluation initialization failed; check configured model/key and build.');process.exitCode=1;});
