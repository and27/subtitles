import { z } from 'zod'

const overlayStyleSchema = z.object({
  opacity: z.number(),
  fontSize: z.number(),
  lineHeight: z.number(),
  positionY: z.number(),
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
})

export type StoreData = z.infer<typeof storeSchema>
