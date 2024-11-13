import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import initDatabase from './rxdb/initDatabase'

let db
// Initialize database
const initDb = async () => {
  if (!db) {
    db = await initDatabase()
  }
  return true
}

// Custom APIs for renderer
const api = {
  // Database operations
  initDb: () => initDb(),

  // Todos operations
  getTodos: async () => {
    if (!db) await initDb()
    const todos = await db.todos.find().exec()
    return todos.map((doc) => doc.toJSON())
  },
  addTodo: async (todo) => {
    if (!db) await initDb()
    const newTodo = await db.todos.insert(todo)
    return newTodo.toJSON()
  },
  updateTodo: async (id, updates) => {
    if (!db) await initDb()
    //Cek if exisitingTodo already exist or not

    const todo = await db.todos.findOne(id).exec()
    if (todo) {
      await todo.patch(updates)
      return todo.toJSON()
    }
    return null
  },
  deleteTodo: async (id) => {
    if (!db) await initDb()
    const todo = await db.todos.findOne(id).exec()
    if (todo) {
      await todo.remove()
      return true
    }
    return false
  },
  // Optional: Subscribe to changes
  subscribeTodos: (callback) => {
    if (!db) return
    const sub = db.todos.find().$.subscribe((todos) => {
      callback(todos.map((doc) => doc.toJSON()))
    })
    return () => sub.unsubscribe()
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
