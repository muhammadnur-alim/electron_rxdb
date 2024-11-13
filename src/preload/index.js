import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import initDatabase from './rxdb/initDatabase'
import { Subject } from 'rxjs'
import { replicateRxCollection } from 'rxdb/plugins/replication'
import EventSource from 'eventsource'
import { distinctUntilChanged } from 'rxjs/operators'

// Custom APIs for renderer
const api = {}

const database = {
  init: async () => {
    const db = await initDatabase()

    const syncUrl = 'https://sort.my.id/rxdb'

    const myPullStream$ = new Subject()
    const eventSource = new EventSource('https://sort.my.id/rxdb/stream', {
      withCredentials: false
    })
    eventSource.onmessage = (event) => {
      const eventData = JSON.parse(event.data)
      myPullStream$.next({
        data: eventData
      })
    }

    const replicate = replicateRxCollection({
      collection: db.todos,
      replicationIdentifier: 'todos-replication',
      push: {
        /* add settings from below */
        async handler(changeRows) {
          console.log(changeRows)
          const rawResponse = await fetch(`${syncUrl}`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(changeRows)
          })
          const conflictsArray = await rawResponse.json()
          return conflictsArray
        }
      },
      pull: {
        /* add settings from below */
        async handler(checkpointOrNull, batchSize) {
          const updatedAt = checkpointOrNull ? checkpointOrNull.updatedAt : 0
          const id = checkpointOrNull ? checkpointOrNull.id : ''
          const response = await fetch(
            `${syncUrl}?updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`
          )
          const data = await response.json()
          return { documents: data.documents, checkpoint: data.checkpoint }
        },
        stream$: myPullStream$.asObservable()
      }
    })

    replicate.error$.subscribe((error) => {
      console.error('replication error:', error)
    })

    return {
      // Expose collection methods
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
          db.todos
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
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
