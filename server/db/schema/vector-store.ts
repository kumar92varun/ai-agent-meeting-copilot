import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core'
import { customType } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { resources } from './resources'

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

export const vectorStore = pgTable(
  'vector_store',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: embeddingEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    embedding: vector('embedding', 1536).notNull(),
    modelUsed: text('model_used').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('vector_store_entity_idx').on(table.entityType, table.entityId),
    index('vector_store_project_idx').on(table.projectId),
    index('vector_store_resource_idx').on(table.resourceId),
    // HNSW index created via raw SQL in migration
  ]
)
