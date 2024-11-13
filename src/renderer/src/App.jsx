import { useState, useEffect } from 'react'
import { replicateRxCollection } from 'rxdb/plugins/replication'
import initDatabase from '../../preload/rxdb/initDatabase'
// import { Subject } from 'rxjs'

function App() {
  const [todos, setTodos] = useState([])

  const replication = async (db) => {
    // const myPullStream$ = new Subject()
    // const eventSource = new EventSource('https://cd51-103-81-220-21.ngrok-free.app/documents', {
    //   withCredentials: false
    // })
    // eventSource.onmessage = (event) => {
    //   const eventData = JSON.parse(event.data)
    //   console.log(eventData, 'evetData------')
    //   myPullStream$.next({
    //     data: eventData
    //   })
    // }

    await replicateRxCollection({
      collection: db.todos,
      replicationIdentifier: 'todos-replication',
      live: true,
      retryTime: 5000, // Retry interval in milliseconds
      autoStart: true,
      push: {
        /* add settings from below */
        async handler(changeRows) {
          const rawResponse = await fetch('https://ca99-103-81-220-21.ngrok-free.app/push', {
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
            `https://ca99-103-81-220-21.ngrok-free.app/pull?updatedAt=${updatedAt}&id=${id}&limit=${batchSize}`
          )
          const data = await response.json()
          return { documents: data.documents, checkpoint: data.checkpoint }
        }
        // stream$: myPullStream$.asObservable()
      }
    })
  }

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize database
        await window.api.initDb()
        const db = await initDatabase()
        // console.log(db)
        replication(db)

        // Fetch initial todos
        const todos = await window.api.getTodos()
        console.log(todos, 'get todos--------')
        setTodos(todos)

        // Subscribe to changes
        const unsubscribe = window.api.subscribeTodos((updatedTodos) => {
          console.log(updatedTodos, 'updatedTodos-----')
          setTodos(updatedTodos)
        })

        // Cleanup subscription on unmount
        return () => unsubscribe()
      } catch (error) {
        console.error('Error initializing:', error)
      }
    }
    init()
  }, [])

  const handleInsertData = async () => {
    await window.api.addTodo({
      id: Date.now().toString(),
      name: `todos + ${Date.now().toString()}`,
      done: false,
      timestamp: new Date().toISOString()
    })
  }

  const handleDeleteTodos = async (id) => {
    try {
      const success = await window.api.deleteTodo(id)
      if (success) {
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }
  // 1 withou optimistic update
  const handleToggleDone = async (id, currentDoneStatus) => {
    try {
      await window.api.updateTodo(id, {
        done: !currentDoneStatus
      })
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }
  // const handleToggleDone = async (id, currentDoneStatus) => {
  //   // Optimistic update
  //   setTodos((prev) =>
  //     prev.map((todo) => (todo.id === id ? { ...todo, done: !currentDoneStatus } : todo))
  //   )

  //   // Show loading state
  //   setUpdatingTodos((prev) => new Set(prev).add(id))

  //   try {
  //     const updatedTodo = await window.api.updateTodo(id, {
  //       done: !currentDoneStatus
  //     })

  //     if (!updatedTodo) {
  //       // Revert on failure
  //       setTodos((prev) =>
  //         prev.map((todo) => (todo.id === id ? { ...todo, done: currentDoneStatus } : todo))
  //       )
  //     }
  //   } catch (error) {
  //     console.error('Error updating todo:', error)
  //     // Revert on error
  //     setTodos((prev) =>
  //       prev.map((todo) => (todo.id === id ? { ...todo, done: currentDoneStatus } : todo))
  //     )
  //   } finally {
  //     setUpdatingTodos((prev) => {
  //       const next = new Set(prev)
  //       next.delete(id)
  //       return next
  //     })
  //   }
  // }
  return (
    <>
      <h1>Hello RxDb!</h1>
      <button onClick={handleInsertData}>insertData</button>
      <h2>Todos:</h2>
      {todos.length > 0 ? (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              {todo.name}: {todo.done ? 'Completed' : 'Not Completed'} - {todo.timestamp}
              <button
                key={todo.id}
                onClick={() => handleDeleteTodos(todo.id)}
                style={{ marginLeft: '10px', color: 'red' }}
              >
                Delete
              </button>
              <button
                onClick={() => handleToggleDone(todo.id, todo.done)}
                style={{ marginLeft: '10px', color: 'green' }}
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No todos available</p>
      )}
    </>
  )
}

export default App
