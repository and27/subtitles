import { classifyIntent, type LlmHintRequest, type LlmHintResponse, type LlmProviderPort } from 'core'

const intentHints = (intent: ReturnType<typeof classifyIntent>): string[] => {
  switch (intent) {
    case 'intro':
      return ['Current role', 'Relevant experience', 'Why this role']
    case 'behavioral':
      return ['Context', 'Action', 'Result']
    case 'motivation':
      return ['Goal', 'Fit', 'Why now']
    case 'strength':
      return ['Strength', 'Proof', 'Impact']
    case 'weakness':
      return ['Gap', 'Mitigation', 'Progress']
    case 'technical':
      return ['Approach', 'Tradeoffs', 'Next steps']
    case 'general':
    default:
      return ['Restate question', '2-3 key points', 'Close with impact']
  }
}

const summarize = (question: string): string => {
  const words = question.trim().split(/\s+/)
  if (words.length <= 12) {
    return question.trim()
  }
  return `${words.slice(0, 12).join(' ')}…`
}

export class LocalLlmProvider implements LlmProviderPort {
  async generateHints(request: LlmHintRequest): Promise<LlmHintResponse> {
    const trimmed = request.question.trim()
    if (!trimmed) {
      return { text: '' }
    }
    const intent = classifyIntent(trimmed)
    const summary = summarize(trimmed)
    const hints = intentHints(intent).slice(0, request.maxHints ?? 3)
    const text = [`Summary: ${summary}`, ...hints.map((hint) => `- ${hint}`)].join('\n')
    return { text }
  }
}
