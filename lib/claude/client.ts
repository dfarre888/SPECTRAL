import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface SpectralQuery {
  question: string
  context: {
    platforms?: object[]
    jammers?: object[]
    defeatSystems?: object[]
    incidents?: object[]
  }
}

export async function querySpectral({ question, context }: SpectralQuery): Promise<string> {
  const systemPrompt = `You are Spectral Intelligence, an AI analyst for the Spectral drone threat platform.
You analyse UAS platform capabilities, EW spectrum data, GNSS vulnerabilities, and defeat system effectiveness.
All data is OSINT-sourced. Be precise, use exact figures where available, flag uncertainty when data is estimated.
Format responses with clear structure. Use metric units. Reference sources where known.`

  const contextStr = Object.entries(context)
    .filter(([, v]) => v && (v as object[]).length > 0)
    .map(([k, v]) => `## ${k}\n${JSON.stringify(v, null, 2)}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: contextStr
        ? `Context data:\n${contextStr}\n\nQuestion: ${question}`
        : question,
    }],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
