import React from 'react'
import Navbar from './Navbar'
import logo1 from '../img/car1.jpeg'
import logo2 from '../img/car2.jpeg'
import logo3 from '../img/car3.jpg'
import logo4 from '../img/car4.jpg'
import cab1 from '../img/cab1.jpg'
import cab2 from '../img/cab2.jpg'
import { Button } from "@material-tailwind/react";
import Bottom from './bottomfoot'

const products = [
    {
      id: 1,
      name: '4 Seater Car',
      href: '#',
      price: 'Rs. 100/hr',
      imageSrc: logo1,
      imageAlt: 'car1',
      seats: '4 seats',
    },
    {
      id: 2,
      name: '7 Seater Car',
      href: '#',
      price: 'Rs. 200/hr',
      imageSrc: logo2,
      imageAlt: 'car2',
      seats: '7 seats',
    },
    {
      id: 3,
      name: 'Royal Enfield Bike',
      href: '#',
      price: 'Rs. 500/hr',
      imageSrc: logo3,
      imageAlt: 'car3',
      seats: '2 seats',
    },
    {
      id: 4,
      name: 'Adventure Cycle',
      href: '#',
      price: 'Rs. 10/hr',
      imageSrc: logo4,
      imageAlt: 'car4',
      seats: '1 seat',
    },
  ]

function Automobile() {
  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <Navbar />
      <div className="flex-1 mt-16 sm:mt-20">
        <Layout />
        <RideServices />
      </div>
      <Bottom />
    </div>
  )
}

export default Automobile

function RideServices() {
  return (
    <div className="bg-gray-100 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-6 sm:mb-8">
          Book a Ride
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Ola Card */}
          <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <img 
              src={cab1} 
              className="h-32 sm:h-40 w-full object-cover" 
              alt="Ola Cabs"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">Ola Cabs</h3>
              <Button 
                ripple={true} 
                className="w-full"
                onClick={() => window.open('https://book.olacabs.com/', '_blank')}
              >
                Book Ola
              </Button>
            </div>
          </div>
          
          {/* Uber Card */}
          <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
            <img 
              src={cab2} 
              className="h-32 sm:h-40 w-full object-cover" 
              alt="Uber"
            />
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">Uber</h3>
              <Button 
                ripple={true} 
                className="w-full"
                onClick={() => window.open('https://www.uber.com/in/en/', '_blank')}
              >
                Book Uber
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  
function Layout() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-800 mb-2">
          Nearby Automobiles
        </h1>
        <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">
          Rent vehicles for your journey
        </p>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
          {products.map((product) => (
            <a 
              key={product.id} 
              href={product.href} 
              className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
            >
              <div className="w-full overflow-hidden">
                <img
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  className="h-40 sm:h-48 w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {product.seats}
                  </span>
                </div>
                <p className="mt-2 text-base sm:text-lg font-bold text-green-600">
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

