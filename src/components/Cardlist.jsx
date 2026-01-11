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
    <div className="py-6 sm:py-8 md:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
      <h1 className='text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-2'>
        Features
      </h1>
      <hr className='mx-auto w-12 sm:w-16 md:w-20 lg:w-24 border-2 border-gray-800 mb-4 sm:mb-6 md:mb-8 lg:mb-10'/>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto'>
        {features.map((feature) => (
          <div
            key={feature.id}
            className='bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1'
          >
            <img
              src={feature.image}
              className='w-full h-32 sm:h-40 md:h-48 object-cover'
              alt={feature.title}
            />
            <div className='p-3 sm:p-4 md:p-6'>
              <h2 className='font-bold text-base sm:text-lg md:text-xl mb-2 sm:mb-3 md:mb-4 text-center text-gray-800'>
                {feature.title}
              </h2>
              <div className='space-y-1.5 sm:space-y-2 md:space-y-3'>
                {feature.items.map((item, index) => (
                  <span
                    key={index}
                    className='block bg-gray-100 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-800 hover:text-white text-center'
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