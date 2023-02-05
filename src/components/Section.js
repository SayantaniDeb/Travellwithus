import React from 'react'
import Lottie from 'react-lottie'
import axios from 'axios';
import { useEffect,useState } from 'react';
import CardList from './Cardlist';
import Navbar from './Navbar';
import Bottom from './bottomfoot';

function SearchBar(){
  return(
  // <div className='absolute' style={{ top: "20px", left: "20px"}}>
  <div className="container mx-auto  px-4 pt-32 lg:pt-20 absolute" style={{ top:"20px"}}>
 

<form className="px-4 mt-10 lg:px-96 lg:mt-48">  
<span className='font-serif lg:font-bold lg:text-xl'>Your Personal Pocket Planner<br></br>plan your weekend gateaway!</span>   
  <label htmlFor="default-search" className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
  <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg aria-hidden="true" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <input type="search" id="default-search" className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Where do you wanna go?" required/>
      <button type="submit" className="text-white absolute right-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
  </div>


</form>

</div>
  // </div>
  )
}

function Section() {
    const [animationData, setAnimationData] = useState(null);
    useEffect(() => {
        axios
          .get('https://assets3.lottiefiles.com/packages/lf20_bhebjzpu.json')
          .then((res) => {
            setAnimationData(res.data);
          })
          .catch((err) => {
            console.error(err);
          });
      }, []);
      const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
        },
      };
      return(<>
      <Navbar/>
      <div className='relative'>
        <Lottie options={defaultOptions} className=" lg:w-1/6 mx-auto sm:object-cover "/>
        <SearchBar />
        
        <CardList />
        
        </div>
        <Bottom/>
        </>
      )
    };
export default Section