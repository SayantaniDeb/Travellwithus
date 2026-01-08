import React from 'react'
import logo1 from '../img/2.gif'
import logo2 from '../img/3.gif'
import logo3 from '../img/4.gif'

const features = [
  {
    id: 1,
    title: 'Suggest Route',
    image: logo1,
    items: [
      'Route with most fun attractions to visit',
      'Route with key services like restaurants, toilets, hotels',
      'Route with lowest traffic congestion'
    ]
  },
  {
    id: 2,
    title: 'Available Automobiles',
    image: logo2,
    items: [
      'Suggest nearby cost-friendly rental automobiles',
      'Redirect car rental services for pickup',
      'Show nearby cars available for hitchhiking'
    ]
  },
  {
    id: 3,
    title: 'Cost Friendly Hotels',
    image: logo3,
    items: [
      'Location: Cheaper Neighborhood Renting',
      'Room Sharing: Split Rent, Save Money',
      'Utilities: Look for homes with energy-efficient features'
    ]
  }
]

function Cardlist() {
  return (
    <div className="hidden sm:block py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      <h1 className='text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-2'>
        Features
      </h1>
      <hr className='mx-auto w-16 sm:w-20 lg:w-24 border-2 border-gray-800 mb-6 sm:mb-8 lg:mb-10'/>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto'>
        {features.map((feature) => (
          <div 
            key={feature.id}
            className='bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1'
          >
            <img 
              src={feature.image} 
              className='w-full h-40 sm:h-48 object-cover'
              alt={feature.title}
            />
            <div className='p-4 sm:p-6'>
              <h2 className='font-bold text-lg sm:text-xl mb-3 sm:mb-4 text-center text-gray-800'>
                {feature.title}
              </h2>
              <div className='space-y-2 sm:space-y-3'>
                {feature.items.map((item, index) => (
                  <span 
                    key={index}
                    className='block bg-gray-100 rounded-full px-3 py-2 text-xs sm:text-sm text-gray-700 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-800 hover:text-white text-center'
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Cardlist