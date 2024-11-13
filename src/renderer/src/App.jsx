import { useState, useEffect } from 'react'

function App() {
  const [db, setDb] = useState(null)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    // Initialize database
    const initDb = async () => {
      const database = await window.database.init()
      setDb(database)
    }
    initDb()
  }, [])

  useEffect(() => {
    if (db) {
      // Load initial todos
      const loadTodos = async () => {
        await db.todos.subscribe((updateTodos) => {
          setTodos(updateTodos)
        })
        // const result = await db.todos.find()
        // console.log(result, '----result')
      }
      loadTodos()
    }
  }, [db])

  const addTodo = async () => {
    const result = await db.todos.insert({
      id: 'todo_' + Date.now().toString(),
      name: 'electron_rxdb_todo_' + Date.now().toString(),
      done: false,
      timestamp: new Date().toISOString()
    })
    setTodos((prev) => [...prev, result])
  }

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id)
    if (todo) {
      const updated = await db.todos.update(id, { done: !todo.done })
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
    }
  }

  const handleDeleteTodos = async (id) => {
    try {
      const success = await db.todos.delete(id)
      if (success) {
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  return (
    <>
      <h1>Hello RxDb!</h1>
      <button onClick={addTodo}>insertData</button>
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
                onClick={() => toggleTodo(todo.id)}
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
