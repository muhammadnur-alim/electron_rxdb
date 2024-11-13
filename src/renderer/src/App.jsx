import { useState, useEffect } from 'react'

function App() {
  const [db, setDb] = useState(null)
  const [populateDb, setPopulateDb] = useState(null)
  const [todos, setTodos] = useState([])
  const [posts, setPosts] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    // Initialize database
    const initDb = async () => {
      const database = await window.database.init()
      const populate = await window.populate.init()
      setDb(database)
      setPopulateDb(populate)
    }
    initDb()
  }, [])

  useEffect(() => {
    if (db) {
      // Load initial todos
      // Ambil data dari subscribe
      const loadTodos = async () => {
        await db.todos.subscribe((updateTodos) => {
          // Directly set the todos state with the filtered result
          setTodos(updateTodos)
        })
      }
      loadTodos()
    }

    if (populateDb) {
      const loadPosts = async () => {
        await populateDb.posts.subscribe((updatePost) => {
          // Directly set the todos state with the filtered result
          setPosts(updatePost)
        })

        await populateDb.users.subscribe((updateUsers) => {
          setUsers(updateUsers)
        })
      }
      loadPosts()
    }
  }, [db])

  const addTodo = async () => {
    await db.todos.insert({
      id: 'todo_' + new Date().toISOString(),
      name: 'electron_rxdb_todo_' + Date.now().toString(),
      done: false,
      timestamp: new Date().toISOString()
    })

    //Barisan ini bisa di hapus
    // setTodos((prev) => [...prev, result])
  }

  const addPost = async () => {
    await populateDb.posts.insert({
      id: '_id' + new Date().toISOString(),
      content: 'Content Date ' + Date.now().toString(),
      user_id: '_idLim'
    })
  }

  const addUser = async () => {
    await populateDb.users.insert({
      id: '_idLim',
      name: 'Alim'
    })
  }

  const toggleTodo = async (id) => {
    const todo = todos.find((t) => t.id === id)
    if (todo) {
      // Update the todo in the database by toggling the `done` field
      const success = await db.todos.update(id, { done: !todo.done })
      if (success) {
        // Update the state only if the database update was successful
        setTodos((prev) => prev.map((todo) => (todo._id === id ? success : todo)))
      }
    }
  }

  const handleDeleteTodos = async (id) => {
    try {
      const success = await db.todos.delete(id)
      if (success) {
        //Barisan ini bisa di hapus
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

      <h2>Posts With Population:</h2>
      <button onClick={addPost}>Post a Data</button>
      {posts.length > 0 ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              {post.content} - {post.user_id}
            </li>
          ))}
        </ul>
      ) : (
        <p>No posts available</p>
      )}

      <h2>Current Users :</h2>
      <button onClick={addUser}>Add User</button>
      {users.length > 0 ? (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.id} - {user.name}
            </li>
          ))}
        </ul>
      ) : (
        <p>No posts available</p>
      )}
    </>
  )
}

export default App
