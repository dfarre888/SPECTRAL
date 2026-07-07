import { callBedrock } from '@/lib/claude/bedrock'

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

  return callBedrock({
    system: systemPrompt,
    userContent: contextStr
      ? `Context data:\n${contextStr}\n\nQuestion: ${question}`
      : question,
    maxTokens: 2048,
    temperature: 0.3,
  })
}
