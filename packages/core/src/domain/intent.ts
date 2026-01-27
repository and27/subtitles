export type Intent =
  | 'intro'
  | 'behavioral'
  | 'motivation'
  | 'strength'
  | 'weakness'
  | 'technical'
  | 'general'

const includesAny = (text: string, phrases: string[]) =>
  phrases.some((phrase) => text.includes(phrase))

export const classifyIntent = (text: string): Intent => {
  const normalized = text.toLowerCase()

  if (
    includesAny(normalized, [
      'tell me about yourself',
      'introduce yourself',
      'walk me through',
      'give me an overview',
    ])
  ) {
    return 'intro'
  }

  if (
    includesAny(normalized, [
      'tell me about a time',
      'give an example',
      'challenge',
      'difficult',
      'conflict',
      'mistake',
      'failure',
    ])
  ) {
    return 'behavioral'
  }

  if (includesAny(normalized, ['why this role', 'why this company', 'why do you want'])) {
    return 'motivation'
  }

  if (includesAny(normalized, ['strength', 'strongest'])) {
    return 'strength'
  }

  if (includesAny(normalized, ['weakness', 'improve'])) {
    return 'weakness'
  }

  if (
    includesAny(normalized, [
      'how would you',
      'design',
      'implement',
      'architecture',
      'approach',
    ])
  ) {
    return 'technical'
  }

  return 'general'
}
