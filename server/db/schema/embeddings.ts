import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core'
import { customType } from 'drizzle-orm/pg-core'

// pgvector type — drizzle doesn't ship a native vector type so we define it
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`
    },
    toDriver(value: number[]) {
      return `[${value.join(',')}]`
    },
    fromDriver(value: string) {
      return value
        .slice(1, -1)
        .split(',')
        .map((v) => parseFloat(v))
    },
  })(name)

export const embeddingEntityTypeEnum = pgEnum('embedding_entity_type', [
  'standup',
  'task',
  'risk',
])

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: embeddingEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', 1536).notNull(),
    modelUsed: text('model_used').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('embeddings_entity_idx').on(table.entityType, table.entityId),
    // HNSW index created via raw SQL in migration
  ]
)
