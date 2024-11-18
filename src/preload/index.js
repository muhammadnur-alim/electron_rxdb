import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import initDatabase from './rxdb/initDatabase'
import initPopulate from './rxdb/initPopulate'
import EventSource from 'eventsource'
import { Subject } from 'rxjs'
import { replicateRxCollection } from 'rxdb/plugins/replication'
import { distinctUntilChanged } from 'rxjs/operators'

// Custom APIs for renderer
const api = {}

const database = {
  init: async (token) => {
    const db = await initDatabase()

    const myPullStream$ = new Subject()
    const eventSource = new EventSource('https://sort.my.id/rxdb/stream', {
      withCredentials: false
    })
    eventSource.onmessage = (event) => {
      const eventData = JSON.parse(event.data)
      // Return ini harus sama dengan yang di pull replicate
      myPullStream$.next({
        documents: eventData.documents,
        checkpoint: eventData.checkpoint
      })
    }

    eventSource.onerror = () => myPullStream$.next('RESYNC')

    const syncUrl = 'https://sort.my.id/rxdb'

    const replicateState = replicateRxCollection({
      collection: db.todos,
      replicationIdentifier: 'https://sort.my.id/rxdb',
      push: {
        /* add settings from below */
        async handler(changeRows) {
          console.log(changeRows)
          const rawResponse = await fetch(`${syncUrl}`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: token
            },
            body: JSON.stringify(changeRows)
          })
          const conflictsArray = await rawResponse.json()
          return conflictsArray
        }
      },
      pull: {
        /* add settings from below */
        async handler(lastCheckpoint, batchSize) {
          const minTimestamp = lastCheckpoint ? lastCheckpoint.updatedAt : 0
          /**
           * In this example we replicate with a remote REST server
           */
          const response = await fetch(
            `${syncUrl}?minUpdatedAt=${minTimestamp}&limit=${batchSize}`,
            {
              headers: {
                Authorization: token
              }
            }
          )
          const documentsFromRemote = await response.json()
          return {
            /**
             * Contains the pulled documents from the remote.
             * Not that if documentsFromRemote.length < batchSize,
             * then RxDB assumes that there are no more un-replicated documents
             * on the backend, so the replication will switch to 'Event observation' mode.
             */
            documents: documentsFromRemote.documents,
            /**
             * The last checkpoint of the returned documents.
             * On the next call to the pull handler,
             * this checkpoint will be passed as 'lastCheckpoint'
             */
            checkpoint: documentsFromRemote.checkpoint
          }
        },
        stream$: myPullStream$.asObservable()
      }
    })

    replicateState.error$.subscribe((error) => {
      myPullStream$.next('RESYNC')
      console.error('replication error:', error)
    })

    return {
      todos: {
        find: async (query = {}) => {
          const docs = await db.todos.find(query).exec()
          return docs.map((doc) => doc.toJSON())
        },
        findOne: async (id) => {
          const doc = await db.todos.findOne(id).exec()
          return doc ? doc.toJSON() : null
        },
        insert: async (todo) => {
          console.log(todo, 'todo----------')
          const doc = await db.todos.insert(todo)
          return doc.toJSON()
        },
        update: async (id, update) => {
          const doc = await db.todos.findOne(id).exec()
          if (!doc) throw new Error('Document not found')
          await doc.patch(update)
          return doc.toJSON()
        },
        delete: async (id) => {
          const doc = await db.todos.findOne(id).exec()
          if (!doc) throw new Error('Document not found')
          await doc.remove()
          return { success: true }
        },
        subscribe: (callback) => {
          db.todos.find().$.subscribe((docs) => {
            console.log(docs)
            // This will be triggered on any change to the todos collection
            const updatedDocs = docs.map((doc) => doc.toJSON())

            // Call the provided callback with the updated data
            callback(updatedDocs)
          })
        },
        cleanUp: async () => {
          console.log('cleaning up--------')
          await db.todos.cleanup()
        }
      }
    }
  }
}

const testPopulate = {
  init: async () => {
    const db = await initPopulate()

    await db.users.bulkInsert([
      {
        id: 'user-1',
        name: 'John Doe'
      },
      {
        id: 'user-2',
        name: 'Jane Smith'
      }
    ])

    await db.posts.bulkInsert([
      {
        id: 'post-1',
        content: 'This is about technology',
        userId: 'user-1'
      },
      {
        id: 'post-2',
        content: 'This is about traveling',
        userId: 'user-2'
      }
    ])

    return {
      // Expose collection methods
      posts: {
        find: async (query = {}) => {
          const docs = await db.posts.find(query).exec()
          const populatedPost = await docs.populate('userId')
          return populatedPost.map((doc) => doc.toJSON())
        },
        findOne: async (id) => {
          const doc = await db.posts.findOne(id).exec()
          const populatedPost = await doc.populate('userId')
          return populatedPost ? populatedPost.toJSON() : null
        },
        insert: async (post) => {
          console.log(post, 'post----------')
          const doc = await db.posts.insert(post)
          return doc.toJSON()
        },
        update: async (id, update) => {
          const doc = await db.posts.findOne(id).exec()
          if (!doc) throw new Error('Document not found')
          await doc.patch(update)
          return doc.toJSON()
        },
        delete: async (id) => {
          const doc = await db.posts.findOne(id).exec()
          if (!doc) throw new Error('Document not found')
          await doc.remove()
          return { success: true }
        },
        subscribe: (callback) => {
          const subscription = db.todos.find().$.subscribe({
            next: (docs) => {
              try {
                console.log('Subscription update:', docs)
                const updatedDocs = docs?.map((doc) => doc?.toJSON()) || []
                callback(updatedDocs)
              } catch (error) {
                console.error('Subscription processing error:', error)
                subscription.unsubscribe()
              }
            },
            error: (error) => {
              console.error('Subscription error:', error)
              subscription.unsubscribe()
            }
          })
        }
      },
      users: {
        insert: async (user) => {
          console.log(user, 'post----------')
          const doc = await db.posts.insert(user)
          return doc.toJSON()
        },
        subscribe: (callback) => {
          db.posts
            .find()
            .$.pipe(
              distinctUntilChanged((prev, curr) => {
                // Compare if the documents have actually changed
                return JSON.stringify(prev) === JSON.stringify(curr)
              })
            )
            .subscribe((docs) => {
              // This will be triggered on any change to the todos collection
              const updatedDocs = docs.map((doc) => doc.toJSON())

              // Call the provided callback with the updated data
              callback(updatedDocs)
            })
        }
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('database', database)
    contextBridge.exposeInMainWorld('populate', testPopulate)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
