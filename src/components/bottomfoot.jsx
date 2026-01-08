import React from 'react'

function Bottom() {
  return (
    <footer className="w-full p-3 sm:p-4 md:p-6 bg-gray-800 shadow md:flex md:items-center md:justify-between">
      <span className="text-xs sm:text-sm text-gray-400 text-center block md:inline">
        © 2023 <a href='#' className="hover:underline hover:text-white transition-colors">Sayantani Deb™</a>. All Rights Reserved.
      </span>
      <ul className="flex flex-wrap items-center justify-center md:justify-end mt-2 md:mt-0 text-xs sm:text-sm text-gray-400 gap-4">
        <li>
          <a 
            href="https://www.linkedin.com/in/sayantani-deb-035794200/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline hover:text-white transition-colors"
          >
            Contact
          </a>
        </li>
        <li>
          <a 
            href="https://github.com/SayantaniDeb" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline hover:text-white transition-colors"
          >
            GitHub
          </a>
        </li>
      </ul>
    </footer>
  )
}

export default Bottom