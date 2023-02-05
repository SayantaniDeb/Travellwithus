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
      name: '4 seater car',
      href: '#',
      price: 'Rs. 100/hr',
      imageSrc: logo1,
      imageAlt: 'car1',
    },
    {
      id: 2,
      name: '7 seater car',
      href: '#',
      price: 'Rs. 200/hr',
      imageSrc: logo2,
      imageAlt: 'car2',
    },
    {
      id: 3,
      name: 'Royal-enfield Bike',
      href: '#',
      price: 'Rs. 500/hr',
      imageSrc: logo3,
      imageAlt: 'car3',
    },
    {
      id: 4,
      name: 'Adventure Cycle Bike',
      href: '#',
      price: 'Rs. 10/hr',
      imageSrc: logo4,
      imageAlt: 'car4',
    },
    // More products...
  ]
function Automobile() {
  return (
    <div>
        <Navbar/>
        
        <Layout/>
        <Button1/>
        <Bottom/>
        </div>
  )
}

export default Automobile

function Button1() {
    return (
      <div className="w-full max-w-sm mx-auto grid grid-cols-2 gap-2 items-center justify-center">
        <div className='aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8'>
            <img src={cab1} className="h-full w-full object-cover object-center group-hover:opacity-75"></img>
        <Button ripple={true}><a href="https://book.olacabs.com/" target="_blank" >Ola</a></Button>
        </div>
        <div className='aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-w-7 xl:aspect-h-8'>
        <img src={cab2}></img>
        <Button ripple={true}><a href="https://www.uber.com/in/en/" target="_blank" >Uber</a></Button>
        </div>
      </div>
    );
  }
  
function Layout() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl py-16 px-4 sm:py-24 sm:px-6 lg:max-w-7xl lg:px-8">
       <h1 className='text-xl lg:text-4xl mt-2 mb-4 text-center capitalize font-serif'>Nearby Autombobiles for you...</h1>
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

