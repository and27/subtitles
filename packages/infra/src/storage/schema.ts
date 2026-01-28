import { z } from 'zod'

const audioModeSchema = z.enum(['mic', 'system', 'mixed']).default('system')

const overlayStyleSchema = z.object({
  opacity: z.number(),
  fontSize: z.number(),
  lineHeight: z.number(),
  positionY: z.number(),
})

const overlayPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

const scaffoldSchema = z.object({
  id: z.string(),
  triggers: z.array(z.string()),
  structure: z.array(z.string()),
  starterPhrases: z.array(z.string()),
  tags: z.array(z.string()).optional(),
})

export const storeSchema = z.object({
  schemaVersion: z.number(),
  scaffolds: z.array(scaffoldSchema),
  activeScaffoldId: z.string().nullable(),
  overlayStyle: overlayStyleSchema,
  overlayPosition: overlayPositionSchema.optional(),
  audioMode: audioModeSchema,
  hotkey: z.string().default('CommandOrControl+Shift+Space'),
  saveTranscript: z.boolean().default(false),
  latencyTargetMs: z.number().default(1200),
  llmProvider: z.enum(['local', 'openai']).default('local'),
  llmModel: z.string().default('gpt-4o-mini'),
  llmMode: z.enum(['coaching', 'direct']).default('coaching'),
})

export type StoreData = z.infer<typeof storeSchema>
