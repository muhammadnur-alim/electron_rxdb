import { addRxPlugin } from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'

addRxPlugin(RxDBDevModePlugin)

async function initDatabase() {
  const testingDb = await createRxDatabase({
    name: 'testingdb',
    storage: getRxStorageMemory(),
    //FOr dev ignore duplicate
    ignoreDuplicate: true
  })

  const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        maxLength: 100 // <- the primary key must have set maxLength
      },
      name: {
        type: 'string'
      },
      done: {
        type: 'boolean'
      },
      timestamp: {
        type: 'string',
        format: 'date-time'
      }
    },
    required: ['id', 'name', 'done', 'timestamp']
  }

  await testingDb.addCollections({
    todos: {
      schema: todoSchema
    }
  })

  return testingDb
}

export default initDatabase
