
import React, { useRef, useState, useEffect } from 'react'
import Navbar from './Navbar'
import { BsTrash } from "react-icons/bs";
import logo4 from '../img/5.gif'
import Bottom from './bottomfoot';
import { db, auth } from '../Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

function Box(props) {
  const items = props.data.map(
    (singleData) => {
      return <Item 
        removeHandler={props.removeHandler} 
        key={singleData.id} 
        id={singleData.id} 
        item={singleData.item} 
        time={singleData.time} 
      />
    }
  )
  return (
    <div className='p-2 sm:p-3 md:p-4'>
      {items}
    </div>
  )
}

function Input(props) {
  const inputBox = useRef();
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (inputBox.current.value.trim() && !loading) {
      setLoading(true);
      await props.handler(inputBox.current.value);
      inputBox.current.value = "";
      setLoading(false);
    }
  };

  return (
    <div className='p-2 sm:p-3 md:p-4'>
      <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="max-w-md mx-auto">
        <label htmlFor="todo-input" className="mb-2 text-sm font-medium text-gray-900 sr-only">
          Add Todo
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg 
              aria-hidden="true" 
              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <input 
            type="text" 
            id="todo-input"
            placeholder='Whats on your list?' 
            className='block w-full p-3 sm:p-4 pl-9 sm:pl-10 pr-20 sm:pr-24 text-sm sm:text-base text-gray-900 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-zinc-500 focus:border-zinc-500 focus:outline-none shadow-lg' 
            ref={inputBox}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function Item(props) {
  const [done, setDone] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div 
      onClick={() => setDone(!done)} 
      className='select-none cursor-pointer w-full border-b p-2 sm:p-3 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200'
    >
      <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2'>
        <span className='text-xs sm:text-sm text-slate-400'>
          {props.time}
        </span>
        <span className={`${done ? 'line-through text-gray-400' : ''} text-base sm:text-lg md:text-xl break-words`}>
          {props.item}
        </span>
      </div>
      <div 
        onClick={async (e) => {
          e.stopPropagation();
          setDeleting(true);
          await props.removeHandler(props.id);
        }}
        className='p-2 hover:bg-red-100 rounded-full transition-colors duration-200'
      >
        {deleting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
        ) : (
          <BsTrash className='text-[#e74c3c] text-lg sm:text-xl' />
        )}
      </div>
    </div>
  )
}

function Todolist() {
  const [todos, setToDo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to todos from Firestore
  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);
    
    
    const todosRef = collection(db, 'users', user.uid, 'todos');
    const q = query(todosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
     
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate().toLocaleTimeString() || 'Just now'
      }));
      setToDo(todosData);
      setLoading(false);
    }, (err) => {
      
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeToDo = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
    } catch (err) {
      
      setError(err.message);
    }
  }

  const addToDoHandler = async (item) => {
    if (!user) {
      setError("You must be logged in to add todos");
      return;
    }
    try {
      
      const todosRef = collection(db, 'users', user.uid, 'todos');
      await addDoc(todosRef, {
        item,
        createdAt: serverTimestamp(),
        completed: false
      });
      
    } catch (err) {
      
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <Navbar />
      
      {/* Main content */}
      <div className="flex-1 px-3 sm:px-4 md:px-6 lg:px-8 mt-16 sm:mt-20 pb-20 sm:pb-24">
        {/* Error message */}
        {error && (
          <div className="mx-auto max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Not logged in message */}
        {!user && !loading && (
          <div className="mx-auto max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-4" role="alert">
            <span>Please log in to save your todos.</span>
          </div>
        )}

        <div className="rounded-lg mx-auto max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-white shadow-lg mt-4 sm:mt-6">
          <Input handler={addToDoHandler} />
          
          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Box data={todos} removeHandler={removeToDo} />
          )}
        </div>

        {/* Empty state with image */}
        {!loading && todos.length === 0 && (
          <div className="text-center mt-4 sm:mt-6">
            <img 
              src={logo4} 
              className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto" 
              alt="Todo illustration"
            />
            <p className="text-gray-500 mt-2 text-sm sm:text-base">Add your first task above!</p>
          </div>
        )}

        {/* Show image smaller when there are todos */}
        {!loading && todos.length > 0 && (
          <img 
            src={logo4} 
            className="w-32 sm:w-40 md:w-48 mx-auto mt-4 opacity-50" 
            alt="Todo illustration"
          />
        )}
      </div>

      {/* Footer */}
      <div className="hidden sm:block">
        <Bottom />
      </div>
    </div>
  )
}

export default Todolist