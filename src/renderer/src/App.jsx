import { useState, useEffect } from 'react'

function App() {
  const [db, setDb] = useState(null)
  const [todos, setTodos] = useState([])
  const [users] = useState([
    'sharkpos.course@gmail.com',
    'irfanfandi38@gmail.com',
    'dea.edria@gmail.com'
  ])
  const [token, setToken] = useState(null)
  // const [populateDb, setPopulateDb] = useState(null)
  // const [posts, setPosts] = useState([])
  // const [users, setUsers] = useState([])

  const initDb = async () => {
    const database = await window.database.init()
    // const populate = await window.populate.init()
    setDb(database)
    // setPopulateDb(populate)
  }

  useEffect(() => {
    // Initialize database
  }, [])

  useEffect(() => {
    if (token) {
      //Using RxState to send data to preload
      initDb(token)
    }
  }, [token])

  useEffect(() => {
    if (db) {
      // Load initial todos
      // Ambil data dari subscribe
      const loadTodos = async () => {
        await db.todos.subscribe((updatedDocs) => {
          try {
            setTodos(updatedDocs)
          } catch (error) {
            console.error('Error handling update:', error)
          }
        })
      }
      loadTodos()
    }

    // if (populateDb) {
    //   const loadPosts = async () => {
    //     await populateDb.posts.subscribe((updatePost) => {
    //       // Directly set the todos state with the filtered result
    //       setPosts(updatePost)
    //     })

    //     await populateDb.users.subscribe((updateUsers) => {
    //       setUsers(updateUsers)
    //     })
    //   }
    //   loadPosts()
    // }
  }, [db])

  const cleanUp = async () => {
    await db.todos.cleanUp()
    console.log('running clean up---------------')
  }

  const addTodo = async () => {
    if (!token) {
      return
    }
    await db.todos.insert({
      id: 'todo_' + new Date().toISOString(),
      name: 'electron_rxdb_todo_' + Date.now().toString(),
      done: false,
      timestamp: new Date().toISOString()
    })

    //Barisan ini bisa di hapus
    // setTodos((prev) => [...prev, result])
  }

  // const addPost = async () => {
  //   await populateDb.posts.insert({
  //     id: '_id' + new Date().toISOString(),
  //     content: 'Content Date ' + Date.now().toString(),
  //     userId: '_idLim'
  //   })
  // }

  // const addUser = async () => {
  //   await populateDb.users.insert({
  //     id: '_idLim',
  //     name: 'Alim'
  //   })
  // }

  const toggleTodo = async (id) => {
    if (!token) {
      return
    }
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
      if (!token) {
        return
      }
      const success = await db.todos.delete(id)
      if (success) {
        //Barisan ini bisa di hapus
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const handleLogin = async (user) => {
    const userCreds = { username: user }
    try {
      const response = await fetch(`https://sort.my.id/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userCreds)
      })

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`)
      }

      const data = await response.json()
      // Save the response data in local storage or state as needed
      console.log('Login successful:', data)
      setToken(data)
    } catch (error) {
      console.error('Error during login:', error)
    }
  }

  const handleLogOut = () => {
    setToken(null)
    setTodos([])
  }

  return (
    <>
      <h1>Hello RxDb!</h1>
      <button onClick={addTodo} disabled={!token}>
        insertData
      </button>
      <button onClick={cleanUp} disabled={!token}>
        Clean Up
      </button>
      <br />
      <button onClick={() => handleLogin(users[0])}>Login as {users[0]}</button>
      <br />

      <button onClick={() => handleLogin(users[1])}>Login as {users[1]}</button>
      <br />

      <button onClick={() => handleLogin(users[2])}>Login as {users[2]}</button>
      <br />
      <button onClick={handleLogOut}>Logout</button>

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
                disabled={!token}
              >
                Delete
              </button>
              <button
                onClick={() => toggleTodo(todo.id)}
                style={{ marginLeft: '10px', color: 'green' }}
                disabled={!token}
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No todos available</p>
      )}

      {/* <h2>Posts With Population:</h2>
      <button onClick={addPost}>Post a Data</button>
      {posts.length > 0 ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              {post.id} - {post.content} - {post.userId}
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
      )} */}
    </>
  )
}

export default App
