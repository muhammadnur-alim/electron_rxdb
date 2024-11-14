import { addRxPlugin } from 'rxdb'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { createRxDatabase } from 'rxdb'
// import { getRxStorageMemory } from 'rxdb/plugins/storage-memory'
// import { wrappedValidateZSchemaStorage } from 'rxdb/plugins/validate-z-schema'
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup'

addRxPlugin(RxDBDevModePlugin)
addRxPlugin(RxDBCleanupPlugin)

async function initDatabase() {
  // const storage =
  //   storage: getRxStorageMemory()
  // })

  const encryptedDexieStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageDexie()
  })

  const testingDb = await createRxDatabase({
    name: 'testingdb',
    // storage,
    // storage: getRxStorageMemory(),
    storage: encryptedDexieStorage,
    password: 'sudoLetMeIn',
    //FOr dev ignore duplicate
    ignoreDuplicate: true
    // cleanupPolicy: {
    //   /**
    //    * The minimum time in milliseconds for how long
    //    * a document has to be deleted before it is
    //    * purged by the cleanup.
    //    * [default=one month]
    //    */
    //   minimumDeletedTime: 1000 * 60, // one month,
    //   /**
    //    * The minimum amount of that that the RxCollection must have existed.
    //    * This ensures that at the initial page load, more important
    //    * tasks are not slowed down because a cleanup process is running.
    //    * [default=60 seconds]
    //    */
    //   minimumCollectionAge: 1000 * 60, // 60 seconds
    //   /**
    //    * After the initial cleanup is done,
    //    * a new cleanup is started after [runEach] milliseconds
    //    * [default=5 minutes]
    //    */
    //   runEach: 1000 * 60, // 5 minutes
    //   /**
    //    * If set to true,
    //    * RxDB will await all running replications
    //    * to not have a replication cycle running.
    //    * This ensures we do not remove deleted documents
    //    * when they might not have already been replicated.
    //    * [default=true]
    //    */
    //   awaitReplicationsInSync: true,
    //   /**
    //    * If true, it will only start the cleanup
    //    * when the current instance is also the leader.
    //    * This ensures that when RxDB is used in multiInstance mode,
    //    * only one instance will start the cleanup.
    //    * [default=true]
    //    */
    //   waitForLeadership: false
    // }
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
    required: ['id', 'name', 'done', 'timestamp'],
    encrypted: ['name']
  }

  await testingDb.addCollections({
    todos: {
      schema: todoSchema
    }
  })

  return testingDb
}

export default initDatabase
