Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message: string = body.message || '';
    const images: string[] = Array.isArray(body.images) ? body.images : [];
    const flowchart = body.flowchart || {};
    const provider: string = (body.provider || 'openai').toLowerCase();
    const model: string = body.model || (provider === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'gpt-4o-mini');

    const authHeader = req.headers.get('authorization') || '';

    // Build provider-specific payload
    let reply = '';
    let raw: any = null;

    if (provider === 'openai') {
      const messages: any[] = [
        { role: 'system', content: `You are Soodo Code's assistant. Analyze flowcharts and help build programs. Optionally include a <soodo>{"tasks":[],"code":{...}}</soodo> control block.` },
        { role: 'system', content: `Flowchart: ${JSON.stringify(flowchart)}` },
        { role: 'user', content: [
          { type: 'text', text: message },
          ...images.map((img) => ({ type: 'input_image', image_url: img }))
        ] }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || `Bearer ${Deno.env.get('OPENAI_API_KEY') || ''}`
        },
        body: JSON.stringify({ model, messages })
      });
      raw = await res.json();
      const content = raw.choices?.[0]?.message?.content;
      reply = typeof content === 'string' ? content : (Array.isArray(content) ? content.map((p: any) => p.text || p.content || '').join('\n') : '');
    } else if (provider === 'anthropic') {
      const userContent: any[] = [{ type: 'text', text: message }];
      for (const img of images) userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: img.split(',')[1] || img } });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': authHeader?.replace(/^Bearer\s+/i, '') || Deno.env.get('ANTHROPIC_API_KEY') || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          system: `You are Soodo Code's assistant. Flowchart: ${JSON.stringify(flowchart)}`,
          messages: [{ role: 'user', content: userContent }],
          max_tokens: 800
        })
      });
      raw = await res.json();
      reply = (raw.content || []).map((p: any) => p.text || '').join('\n');
    } else if (provider === 'gemini') {
      const modelName = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${(authHeader?.replace(/^Bearer\s+/i, '') || Deno.env.get('GOOGLE_API_KEY') || '')}`;
      const parts: any[] = [{ text: `Flowchart: ${JSON.stringify(flowchart)}` }];
      if (message) parts.push({ text: message });
      for (const img of images) parts.push({ inline_data: { mime_type: 'image/png', data: (img.split(',')[1] || img) } });
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }] }) });
      raw = await res.json();
      reply = (raw.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('\n');
    } else if (provider === 'huggingface') {
      const model = body.model || 'mistralai/Mixtral-8x7B-Instruct-v0.1';
      const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
      const prompt = `Flowchart: ${JSON.stringify(flowchart)}\n\nUser: ${message}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader || `Bearer ${Deno.env.get('HF_API_KEY') || ''}` },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 600, return_full_text: false } })
      });
      raw = await res.json();
      if (Array.isArray(raw)) reply = raw[0]?.generated_text || '';
      else if (typeof raw?.generated_text === 'string') reply = raw.generated_text;
      else reply = JSON.stringify(raw);
    } else if (provider === 'custom' && body.forward_url) {
      const res = await fetch(body.forward_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ message, images, flowchart })
      });
      raw = await res.json();
      reply = raw.reply || raw.message || '';
    } else {
      reply = `No provider configured.`;
      raw = { error: 'PROVIDER_NOT_SET' };
    }

    return new Response(JSON.stringify({ reply, raw }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});