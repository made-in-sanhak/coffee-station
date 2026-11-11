import {aiPolicy} from '../../config/aiPolicy';
import {env} from '../../config/env';
import type {searchProducts} from './productSearch';

type Result = Omit<Awaited<ReturnType<typeof searchProducts>>, 'mode'> & {mode:'rules'|'ai'};

// The provider can choose only a sentence built from verified search fields.
// It never receives arbitrary DB rows or permission to add claims.
export async function explainProducts(result: Result, request: typeof fetch = fetch): Promise<Result> {
  if (env.extractionMode !== 'gemini' || !result.items.length || !env.geminiApiKey || !env.geminiModel)
    return result;
  const choices = result.items.map(item => ({
    id:item.matchedMenu.id,
    price:item.reasons[0],
    ...(item.cafe.distance === undefined ? {} : {
      distance:`매장까지의 직선거리는 약 ${item.cafe.distance}m입니다.`,
    }),
  }));
  try {
    const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.geminiApiKey},
      signal:AbortSignal.timeout(aiPolicy.providerTimeoutMs),
      body:JSON.stringify({systemInstruction:{parts:[{text:'각 ID에 대해 제공된 price 또는 distance 문장 하나만 그대로 고른다. JSON 형식 {"reasons":[{"id":"...","reason":"..."}]}만 반환한다. 새 사실·문구를 쓰지 않는다.'}]},
        contents:[{role:'user',parts:[{text:JSON.stringify(choices)}]}],
        generationConfig:{temperature:0,responseMimeType:'application/json',maxOutputTokens:1024}}),
    });
    if (!response.ok) return result;
    const body=await response.json();
    const candidate=body.candidates?.[0];
    if (candidate?.finishReason!=='STOP' || !Array.isArray(candidate.content?.parts)) return result;
    const output=candidate.content.parts.filter((p:{text?:unknown;thought?:boolean})=>!p.thought&&typeof p.text==='string')
      .map((p:{text:string})=>p.text).join('');
    const parsed=JSON.parse(output);
    if (!Array.isArray(parsed.reasons) || parsed.reasons.length!==choices.length) return result;
    const seen=new Set<string>();
    const selected=new Map<string,string>();
    for (const entry of parsed.reasons) {
      const choice=choices.find(c=>c.id===entry?.id);
      if (!choice || seen.has(choice.id) || entry.reason!==choice.price && entry.reason!==choice.distance)
        return result;
      seen.add(choice.id);selected.set(choice.id,entry.reason);
    }
    return {...result,mode:'ai',items:result.items.map(item=>({...item,
      reasons:[selected.get(item.matchedMenu.id)!]}))};
  } catch { return result; }
}
