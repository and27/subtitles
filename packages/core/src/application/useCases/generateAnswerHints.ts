import type { AnswerScaffold } from '../../domain/answerScaffold'
import { classifyIntent, type Intent } from '../../domain/intent'

type HintOptions = {
  maxHints?: number
}

const intentTemplate = (intent: Intent): string[] => {
  switch (intent) {
    case 'intro':
      return ['Briefly: current role -> highlight -> why now']
    case 'behavioral':
      return ['Use STAR: context -> action -> result']
    case 'motivation':
      return ['Tie role/company -> your goals -> fit']
    case 'strength':
      return ['Name strength -> proof -> impact']
    case 'weakness':
      return ['Name minor gap -> mitigation -> progress']
    case 'technical':
      return ['State approach -> tradeoffs -> next steps']
    case 'general':
    default:
      return ['Restate the question -> give 2-3 key points']
  }
}

const dedupe = (items: string[]) => Array.from(new Set(items))

export const generateAnswerHints = (
  transcript: string,
  scaffold: AnswerScaffold | null,
  options: HintOptions = {},
): string[] => {
  const trimmed = transcript.trim()
  if (!trimmed) {
    return []
  }

  const maxHints = options.maxHints ?? 3
  const hints: string[] = []

  if (scaffold?.starterPhrases?.length) {
    hints.push(`Start with: "${scaffold.starterPhrases[0]}"`)
  }

  const structure = scaffold?.structure?.length
    ? scaffold.structure.join(' -> ')
    : null
  if (structure) {
    hints.push(`Structure: ${structure}`)
  }

  const intent = classifyIntent(trimmed)
  hints.push(...intentTemplate(intent))

  return dedupe(hints).slice(0, maxHints)
}
