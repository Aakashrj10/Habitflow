// LLM client — tries Ollama locally, then OpenRouter (free), then Anthropic
export async function chat(params: {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  max_tokens?: number
}): Promise<string> {
  const { system, messages, max_tokens = 500 } = params

  // 1. Try Ollama first (local, free)
  try {
    const res = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:1b',
        stream: false,
        options: { num_predict: max_tokens },
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      signal: AbortSignal.timeout(120000),
    })
    if (res.ok) {
      const data = await res.json()
      const text = data.message?.content ?? ''
      if (text) return text
    }
  } catch {
    // Ollama not running
  }

  // 2. Try OpenRouter with multiple free models as fallback
  if (process.env.OPENROUTER_API_KEY) {
    const freeModels = [
      'google/gemma-3-4b-it:free',
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
    ]
    for (const model of freeModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://habitflow.vercel.app',
            'X-Title': 'Habitflow',
          },
          body: JSON.stringify({
            model,
            max_tokens,
            messages: [{ role: 'system', content: system }, ...messages],
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content ?? ''
          if (text) { console.log('Using model:', model); return text }
        }
      } catch {
        continue
      }
    }
  }

  // 3. Fallback to Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system,
      messages,
    })
    return (response.content.find((b: any) => b.type === 'text') as any)?.text ?? ''
  }

  throw new Error('No LLM available. Add OPENROUTER_API_KEY to .env.local')
}
