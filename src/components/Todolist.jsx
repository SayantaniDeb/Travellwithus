
import React, { useRef, useState, useEffect } from 'react'
import Navbar from './Navbar'
import { BsTrash } from "react-icons/bs";
import { AiOutlinePlus } from "react-icons/ai";
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
    <div className='p-2 sm:p-3 md:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-around items-center'>
      <input 
        type="text" 
        placeholder='Whats on your list?' 
        className='p-2 sm:p-3 focus:outline-none w-full sm:w-[85%] md:w-[90%] border border-slate-400 rounded-lg text-sm sm:text-base' 
        ref={inputBox}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        disabled={loading}
      />
      <div 
        className={`cursor-pointer w-10 h-10 sm:w-12 sm:h-12 md:w-[50px] md:h-[50px] bg-[#111827] text-white text-xl sm:text-2xl md:text-3xl rounded-full flex justify-center items-center hover:bg-gray-700 transition-colors duration-200 ${loading ? 'opacity-50' : ''}`}
        onClick={handleAdd}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <AiOutlinePlus />
        )}
      </div>
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
      console.log("Auth state changed:", currentUser?.uid);
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
    console.log("Fetching todos for user:", user.uid);
    
    const todosRef = collection(db, 'users', user.uid, 'todos');
    const q = query(todosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Got todos:", snapshot.docs.length);
      const todosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate().toLocaleTimeString() || 'Just now'
      }));
      setToDo(todosData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching todos:", err);
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
      console.error("Error removing todo:", err);
      setError(err.message);
    }
  }

  const addToDoHandler = async (item) => {
    if (!user) {
      setError("You must be logged in to add todos");
      return;
    }
    try {
      console.log("Adding todo for user:", user.uid);
      const todosRef = collection(db, 'users', user.uid, 'todos');
      await addDoc(todosRef, {
        item,
        createdAt: serverTimestamp(),
        completed: false
      });
      console.log("Todo added successfully");
    } catch (err) {
      console.error("Error adding todo:", err);
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
      <Bottom />
    </div>
  )
}

export default Todolist