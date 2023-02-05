import React from 'react'
import logo1 from '../img/2.gif'
import logo2 from '../img/3.gif'
import logo3 from '../img/4.gif'

function Cardlist() {
  return (
    <div>
      <h1 className='mt-10 mb-2 text-center capitalize text-4xl'>Features</h1>
    <hr className='mx-auto w-1/5'></hr>
    <div className='grid grid-cols-1 lg:grid-cols-3 lg:gap-5 justify-items-center'>
      <div className='py-2'>
        <div className='rounded overflow-hidden shadow max-w-sm shadow-2xl'>
          <img src={logo1} className='w-full container mx-auto'></img>
          <div className='px-6'>
            <div className='font-bold text-xl mb-2 text-center'>Suggest route</div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6 pt-4'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Route with most fun attractions to visit</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Route with key services like restaurants, toilets, hotels.</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Route with lowest traffic congestion.</span>
            </div>
          </div>
        </div>
      </div>
      <div className='py-2'>
        <div className='rounded overflow-hidden shadow max-w-sm shadow-2xl'>
          <img src={logo2} className='w-full container mx-auto'></img>
          <div className='px-6'>
            <div className='font-bold text-xl mb-2 text-center'>Available Automobiles</div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6 pt-4'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Suggest nearby costfriendly rental automobiles</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Redirect car rental services for pickup</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Show nearby cars available for hitchiking</span>
            </div>
          </div>
        </div>
      </div>
      <div className='py-2'>
        <div className='rounded overflow-hidden shadow max-w-sm shadow-2xl'>
          <img src={logo3} className='w-full container mx-auto'></img>
          <div className='px-6'>
            <div className='font-bold text-xl mb-2 text-center'>Cost Friendly Hotels</div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6 pt-4'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Location: Cheaper Neighborhood Renting</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Room Sharing: Split Rent, Save Money</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Utilities: Look for homes with energy-efficient features</span>
            </div>
          </div>
        </div>
      </div>
      {/* <div className='py-2'>
        <div className='rounded overflow-hidden shadow max-w-sm'>
          <img src={logo3} className='w-full container mx-auto pt-4'></img>
          <div className='px-6'>
            <div className='font-bold text-xl mb-2 text-center'>Cost Friendly Hotels</div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Location: Cheaper Neighborhood Renting</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Room Sharing: Split Rent, Save Money</span>
            </div>
            <div className='grid grid-flow-col gap-5 pb-2 px-6'>
              <span className='bg-gray-200 rounded-full px-3 py-1 text-sm font-base mb-2 cursor-pointer transition-all duration-200 ease-in-out hover:bg-black hover:text-white'>Utilities: Look for homes with energy-efficient features</span>
            </div>
          </div>
        </div>
      </div> */}
    </div>
    </div>
  )
}

export default Cardlist