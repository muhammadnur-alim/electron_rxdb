import { addRxPlugin } from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { createRxDatabase } from 'rxdb'
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'

addRxPlugin(RxDBDevModePlugin)

async function initPopulate() {
  const populateDb = await createRxDatabase({
    name: 'populatedb',
    storage: getRxStorageMemory(),
    //FOr dev ignore duplicate
    ignoreDuplicate: true
  })

  const userSchema = {
    title: 'user schema',
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
      }
    }
  }

  // post schema
  const postSchema = {
    title: 'post schema',
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
      id: {
        type: 'string',
        maxLength: 100 // <- the primary key must have set maxLength
      },
      content: {
        type: 'string'
      },
      user_id: {
        type: 'string',
        ref: 'users' // references `users` collection
      }
    }
  }

  await populateDb.addCollections({
    users: {
      schema: userSchema
    },
    posts: {
      schema: postSchema
    }
  })

  return populateDb
}

export default initPopulate
