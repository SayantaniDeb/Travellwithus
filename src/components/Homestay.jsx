import React from 'react'
import Navbar from './Navbar'
import Bottom from './bottomfoot'
import logo1 from '../img/home1.jpg'
import logo2 from '../img/home2.jpg'
import logo3 from '../img/home3.jpg'
import logo4 from '../img/home3.jpg'


const products = [
    {
      id: 1,
      name: 'Cozy Mountain Retreat',
      href: '#',
      price: '$48/night',
      imageSrc: logo1,
      imageAlt: 'home',
      rating: '4.8',
    },
    {
      id: 2,
      name: 'Beachside Villa',
      href: '#',
      price: '$35/night',
      imageSrc: logo2,
      imageAlt: 'home2',
      rating: '4.6',
    },
    {
      id: 3,
      name: 'Forest Cabin',
      href: '#',
      price: '$89/night',
      imageSrc: logo3,
      imageAlt: 'home3',
      rating: '4.9',
    },
    {
      id: 4,
      name: 'City Apartment',
      href: '#',
      price: '$35/night',
      imageSrc: logo4,
      imageAlt: 'home',
      rating: '4.5',
    },
  ]

function Homestay() {
  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <Navbar />
      <div className="flex-1">
        <Layout />
      </div>
      <Bottom />
    </div>
  )
}

export default Homestay

function Layout() {
  return (
    <div className="bg-gray-50 mt-16 sm:mt-20">
      <div className="mx-auto max-w-7xl py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-2">
          Find Your Perfect Stay
        </h1>
        <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">
          Discover comfortable homestays near your destination
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
          {products.map((product) => (
            <a 
              key={product.id} 
              href={product.href} 
              className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="aspect-w-16 aspect-h-12 w-full overflow-hidden">
                <img
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  className="h-48 sm:h-52 w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                  <span className="text-xs sm:text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ⭐ {product.rating}
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-lg font-bold text-blue-600">
                  {product.price}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

