export default async (req) => {
  try {
    const body = await req.json();
    const { pdfBase64, prompt } = body;

    if (!pdfBase64 || !prompt) {
      return Response.json({ error: { message: 'Missing pdfBase64 or prompt' } }, { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Netlify.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }},
          { type: 'text', text: prompt }
        ]}]
      })
    });

    const data = await response.json();
    return Response.json(data);

  } catch (err) {
    return Response.json({ error: { message: err.message || 'Function error' } }, { status: 500 });
  }
};

export const config = { path: '/api/parse-tds' };
