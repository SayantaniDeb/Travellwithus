import React, { useEffect, useState } from 'react';
import { auth, provider } from '../Firebase';
import { signInWithPopup } from 'firebase/auth';
import logo1 from '../img/54.jpg';
import logo2 from '../img/61.gif'
import { Button } from '@material-tailwind/react';
import Section from './Section';

function LoginForm() {
  const [value,setValue] = useState('')
  const handleClick=()=>{
    signInWithPopup(auth,provider).then((data)=>{
      setValue(data.user.email)
      localStorage.setItem("email",data.user.email)

    })
  }
  useEffect(()=>{
    setValue(localStorage.getItem('email'))
  })
  return (
    <>
    {value?<Section/>:
    <div className="relative h-screen bg-gray-100">

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-1/2 mx-auto sm:w-1/4">
        <div className="bg-white shadow-md rounded-lg px-8 py-6">
          <div className="text-center">
          <h1 className="text-4xl text-center my-8">Travel With Us</h1>
            <img src={logo2} alt="logo" className="w-32 mx-auto mb-4" />
          </div>
          <Button
            color="blue"
            ripple="light"
            buttonType="filled"
            className="w-full mt-6"
            onClick={handleClick}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full">
        <img
          src={logo1}
          alt="background"
          className='w-full h-full object-cover'
          
        />
      </div>
    </div>}
    </>
  );
}

export default LoginForm;
