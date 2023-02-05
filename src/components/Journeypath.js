import React from 'react'
import Bottom from './bottomfoot'
import Navbar from './Navbar'
import logo from '../img/load.gif'

function JourneyPath() {
  return (
    <>
    <Navbar/>
    <div className="grid grid-cols-2 gap-4 mt-20">
    <div className="p-4">
      <img src={logo} alt="Your Image" className="w-full" />
    </div>
    <div className="p-4 flex items-center justify-center h-full">
      <p className="text-center text-2xl font-medium">Site Under Construction!</p>
    </div>
  </div>
  <div className='w-full fixed bottom-0'>
  <Bottom/>
  </div>
  </>
    // <div>
    //     <Navbar/>
    //     <h1 className='mt-20'>Site under construction</h1>
    //     <img src={logo} className="object-cover"></img>
    //     <Bottom/>
    // </div>
  )
}

export default JourneyPath