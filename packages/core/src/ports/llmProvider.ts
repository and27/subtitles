export type LlmMode = 'coaching' | 'direct'

export type LlmHintRequest = {
  question: string
  mode: LlmMode
  maxHints?: number
}

export type LlmHintResponse = {
  text: string
}

export interface LlmProviderPort {
  generateHints: (request: LlmHintRequest) => Promise<LlmHintResponse>
}
