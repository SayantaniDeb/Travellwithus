
import React, { useRef,useState } from 'react'
import Navbar from './Navbar'
import { BsTrash } from "react-icons/bs";
import {AiOutlinePlus} from "react-icons/ai";
import logo4 from '../img/5.gif'
import Bottom from './bottomfoot';

function Box(props) {
    const items = props.data.map(
        (singleData, index) => {
            return <Item removeHandler={props.removeHandler} key={index} id={index} item={singleData.item} time={singleData.time} />
        }
    )
    return (
        <div className='p-3'>
            {items}
            {/* <Item/>
        <Item/>
        <Item/>
        <Item/>
        <Item/> */}
        </div>
    )
}
function Input(props) {
    const inputBox = useRef();
  return (
    <div className='p-3 flex justify-around'>
        <input type="text" placeholder='Whats on your list?' className='p-3 focus:outline-none w-[90%] border border-slate-400' ref={inputBox} />
        <div className='cursor-pointer w-[50px] h-[50px] bg-[#111827] text-white text-3xl rounded-[50%] flex justify-center items-center' onClick={() => {
            props.handler(inputBox.current.value)
            inputBox.current.value = "";
        } }>
            <AiOutlinePlus/>
        </div>
    </div>

  )
}
function Item(props) {
    const [done, setDone] = useState(false);
    return (
        <div onClick={() => setDone(!done)} className={`select-none cursor-pointer w-full border-b p-3 flex justify-between items-center`}>
            <div>
                <span className='pr-2 text-[14px] text-slate-400'>
                    {props.time}
                </span>
                <span className={`${done === true ? 'line-through' : ''} text-[20px]`}>
                    {props.item}
                </span>
            </div>
            <div onClick={() => props.removeHandler(props.id)}>
                <BsTrash className='text-[#e74c3c]' />
            </div>
        </div>
    )
}
function Todolist() {
    const [todos,setToDo] = useState([]);

  const removeToDo = (id) => {
    
    const newTodos = todos.filter(
       (d,index) => {
          if(index !== id){
            return true;
          }else{
            return false;
          }
       }
    )
    setToDo(newTodos); // state update
  }

  const addToDoHandler = (item) => {
    // console.log(item);
    setToDo(
      [
        ...todos,
        {
          item,
          time: new Date().toLocaleTimeString()
        }
      ]
    )
  }
  return (
    <div>
        <Navbar/>
        <div className="p-3 mt-20">
        <div className="rounded mx-auto max-w-[750px] bg-white">
            <Input handler={addToDoHandler} />
            <Box data={todos} removeHandler={removeToDo}/>
        </div>
        
    </div>
    <img src={logo4} className="w-full lg:w-2/5 container mx-auto flex items-center"></img>
    <div className='w-full fixed bottom-0'>
    <Bottom/>
    </div>
    </div>
  )
}

export default Todolist