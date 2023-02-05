import React from 'react'
import Navbar from './Navbar'
import logo1 from '../img/home1.jpg'
import logo2 from '../img/home2.jpg'
import logo3 from '../img/home3.jpg'
import logo4 from '../img/home3.jpg'


const products = [
    {
      id: 1,
      name: 'Homestay1',
      href: '#',
      price: '$48',
      imageSrc:logo1,
      imageAlt: 'home',
    },
    {
      id: 2,
      name: 'Homestay2',
      href: '#',
      price: '$35',
      imageSrc: logo2,
      imageAlt:'home2',
    },
    {
      id: 3,
      name: 'Homestay3',
      href: '#',
      price: '$89',
      imageSrc: logo3,
      imageAlt: 'home3',
    },
    {
      id: 4,
      name: 'Homestay4',
      href: '#',
      price: '$35',
      imageSrc: logo4,
      imageAlt: 'home',
    },
    // More products...
  ]
function Homestay() {
  return (
    <div>
        <Navbar/>
        <Layout/>
        
        </div>
  )
}

export default Homestay

function Layout() {
  return (
    <div className="bg-white mt-20">
      <div className="mx-auto max-w-2xl py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
        

        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {products.map((product) => (
            <a key={product.id} href={product.href} className="group">
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8">
                <img
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  className="h-full w-full object-cover object-center group-hover:opacity-75"
                />
              </div>
              <h3 className="mt-4 text-sm text-gray-700">{product.name}</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{product.price}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

