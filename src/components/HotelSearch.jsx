import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Bottom from './bottomfoot';
import { auth, db } from '../Firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

// Database of verified real hotels by location (Budget, Mid-range, and Luxury)
const REAL_HOTELS_DB = {
  // India
  'delhi': [
    // Luxury
    'The Imperial New Delhi', 'ITC Maurya', 'Taj Mahal Hotel', 'The Oberoi New Delhi',
    'The Leela Palace New Delhi', 'Shangri-La Eros', 'Hyatt Regency Delhi',
    'Radisson Blu Plaza Delhi', 'Park Plaza Shahdara', 'Crowne Plaza New Delhi',
    // Mid-range
    'The Park New Delhi', 'Radisson Blu New Delhi Dwarka', 'Novotel New Delhi Aerocity',
    'Ibis Styles New Delhi', 'Fortune Select Exotica',
    'The Grand New Delhi', 'Country Inn & Suites by Radisson New Delhi',
    // Budget
    'Hotel City Park', 'Hotel Krishna Continental', 'Hotel Amax Inn', 'Treebo Trend',
    'OYO Rooms', 'FabHotel', 'Red Fox Hotel', 'Hotel Sai International'
  ],
  'mumbai': [
    // Luxury
    'The Taj Mahal Palace', 'ITC Grand Central', 'Trident Bandra Kurla', 'The Oberoi Mumbai',
    'The Leela Mumbai', 'Four Seasons Mumbai', 'Park Hyatt Mumbai', 'JW Marriott Mumbai Sahar',
    'The St. Regis Mumbai', 'ITC Maratha',
    // Mid-range
    'The Park Mumbai', 'Radisson Blu Mumbai International Airport', 'Novotel Mumbai Juhu Beach',
    'Ibis Mumbai Airport', 'Holiday Inn Mumbai International Airport', 'Courtyard by Marriott Mumbai',
    'The Westin Mumbai Garden City', 'Sofitel Mumbai BKC',
    // Budget
    'Hotel Suba International', 'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Red Fox Hotel',
    'Hotel Bawa International', 'Hotel City Avenue', 'Hotel Sai Leela'
  ],
  'goa': [
    // Luxury
    'Taj Fort Aguada', 'Park Hyatt Goa', 'The Leela Goa', 'ITC Grand Goa',
    'Alila Diwa Goa', 'Sofitel Goa', 'The Zuri White Sands', 'Grand Hyatt Goa',
    'Radisson Blu Resort Goa', 'DoubleTree by Hilton Goa',
    // Mid-range
    'The Park Calangute Goa', 'Radisson Blu Resort Goa Cavelossim', 'Novotel Goa Resort',
    'Ibis Styles Goa Calangute', 'Holiday Inn Resort Goa', 'Citrus Goa Candolim',
    'The Byke Suraj Plaza', 'Kenilworth Resort', 'Majorda Beach Resort',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Manvin', 'Hotel Delmar Goa',
    'Hotel La Paz Gardens', 'Hotel Fidalgo', 'Hotel Goan Heritage'
  ],
  'bangalore': [
    // Luxury
    'ITC Gardenia', 'The Oberoi Bengaluru', 'Taj West End', 'The Leela Palace Bengaluru',
    'JW Marriott Bengaluru', 'The Ritz-Carlton Bengaluru', 'Park Plaza Bengaluru',
    'Radisson Blu Bengaluru', 'Sheraton Grand Bengaluru', 'Hyatt Centric MG Road',
    // Mid-range
    'The Park Bengaluru', 'Radisson Blu Bengaluru Outer Ring Road', 'Novotel Bengaluru Techpark',
    'Ibis Bengaluru Hosur Road', 'Holiday Inn Bengaluru Racecourse', 'Courtyard by Marriott Bengaluru',
    'The Chancery Pavilion', 'Royal Orchid Central', 'Goldfinch Hotel',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Nandhini', 'Hotel City Max',
    'Hotel Sai Vishram', 'Hotel Presidency', 'Hotel Empire International'
  ],
  'kolkata': [
    // Luxury
    'The Astor', 'ITC Royal Bengal', 'Taj Bengal', 'The Park Kolkata',
    'Hyatt Regency Kolkata', 'The Peerless Inn', 'Swissotel Kolkata',
    'Novotel Kolkata Hotel & Residences', 'Ibis Kolkata Rajarhat', 'Holiday Inn Kolkata',
    // Mid-range
    'The Sonnet', 'Lyric Hotel Kolkata', 'The Astor Kolkata', 'Radisson Blu Kolkata',
    'Courtyard by Marriott Kolkata', 'The Gateway Hotel Kolkata', 'Golden Tulip Kolkata',
    'Hotel Hindustan International', 'Vedic Village Spa Resort Kolkata',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Lindsay', 'Hotel Broadway',
    'Hotel Hindustan International', 'Hotel Astey Ladies', 'Hotel Casa Fortuna'
  ],
  'chennai': [
    // Luxury
    'ITC Grand Chola', 'Taj Coromandel', 'The Leela Chennai', 'Park Hyatt Chennai',
    'The Ritz-Carlton Chennai', 'Radisson Blu Chennai City Centre', 'Hilton Chennai',
    'The Accord Metropolitan', 'GreenPark Chennai', 'Trident Chennai',
    // Mid-range
    'The Park Chennai', 'Radisson Blu Chennai', 'Novotel Chennai Chamiers Road',
    'Ibis Chennai City Centre', 'Holiday Inn Chennai', 'Courtyard by Marriott Chennai',
    'The Raintree Hotel', 'Savoy Chennai', 'Clarion Chennai',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Raj Palace', 'Hotel Park Plaza',
    'Hotel New Woodlands', 'Hotel Chennai Gate', 'Hotel Paramount'
  ],
  'jaipur': [
    // Luxury
    'Rambagh Palace', 'Taj Jai Mahal Palace', 'The Oberoi Rajvilas', 'ITC Rajputana',
    'Fairmont Jaipur', 'Four Seasons Hotel Jaipur', 'The Leela Palace Jaipur',
    'Park Regis Jaipur', 'Radisson Jaipur City Center', 'Trident Jaipur',
    // Mid-range
    'The Park Jaipur', 'Radisson Blu Jaipur', 'Novotel Jaipur', 'Ibis Styles Jaipur',
    'Holiday Inn Jaipur City Centre', 'Courtyard by Marriott Jaipur', 'Sarovar Portico Jaipur',
    'Golden Tulip Jaipur', 'Fortune Select Metropolitan Jaipur',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Royal Orchid', 'Hotel Shikha',
    'Hotel Pearl Palace', 'Hotel Khandela Haveli', 'Hotel Mandakini Villas'
  ],
  'agra': [
    // Luxury
    'ITC Mughal', 'Taj View', 'The Oberoi Amarvilas', 'Jaypee Palace Hotel',
    'Radisson Blu Agra', 'Crystal Sarovar Premiere', 'Trident Agra',
    'Courtyard by Marriott Agra', 'DoubleTree by Hilton Agra', 'Hotel Clarks Shiraz',
    // Mid-range
    'The Park Agra', 'Radisson Blu Agra Taj East Gate', 'Novotel Agra Taj',
    'Ibis Agra', 'Holiday Inn Agra', 'Courtyard by Marriott Agra', 'Crystal Sarovar Premiere',
    'Trident Agra', 'DoubleTree by Hilton Agra',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Amar', 'Hotel Taj Plaza',
    'Hotel Clarks Shiraz', 'Hotel Pushp Villa', 'Hotel Atulyaa Taj'
  ],
  'hyderabad': [
    // Luxury
    'ITC Kakatiya', 'Taj Falaknuma Palace', 'The Park Hyderabad', 'Trident Hyderabad',
    'Radisson Blu Plaza Hotel Hyderabad', 'Novotel Hyderabad Convention Centre',
    'Courtyard by Marriott Hyderabad', 'The Westin Hyderabad Mindspace', 'Hilton Hyderabad',
    // Mid-range
    'The Park Hyderabad', 'Radisson Blu Hyderabad Hitec City', 'Novotel Hyderabad Airport',
    'Ibis Hyderabad Hitec City', 'Holiday Inn Hyderabad Gachibowli', 'Courtyard by Marriott Hyderabad',
    'The Westin Hyderabad Mindspace', 'Hilton Hyderabad', 'Lemon Tree Premier Hyderabad',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Minerva Grand', 'Hotel Imperial Classic',
    'Hotel Sitara Grand', 'Hotel Sandesh The Prince', 'Hotel Nayaab'
  ],
  'pune': [
    // Luxury
    'ITC Grand Central', 'JW Marriott Pune', 'The Westin Pune Koregaon Park',
    'Hyatt Regency Pune', 'Corinthians Club', 'Blue Diamond', 'Radisson Blu Pune Hinjawadi',
    'Crowne Plaza Pune City Centre', 'Novotel Pune Nagar Road', 'Citrus Hotels Pune',
    // Mid-range
    'The Park Pune', 'Radisson Blu Pune', 'Novotel Pune Vimannagar', 'Ibis Pune Hinjawadi',
    'Holiday Inn Pune Hinjawadi', 'Courtyard by Marriott Pune', 'The Westin Pune Koregaon Park',
    'Hyatt Regency Pune', 'Lemon Tree Premier Pune',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Sai Prasad', 'Hotel Aurora Towers',
    'Hotel Shree Panchratna', 'Hotel Pride Inn', 'Hotel Vrindavan'
  ],
  'ahmedabad': [
    // Luxury
    'The House of MG', 'Courtyard by Marriott Ahmedabad', 'Radisson Blu Ahmedabad',
    'Hyatt Regency Ahmedabad', 'The Fern Ahmedabad', 'Novotel Ahmedabad',
    'Taj Skyline Ahmedabad', 'The Grand Bhagwati', 'Comfort Inn President Ahmedabad',
    // Mid-range
    'The Park Ahmedabad', 'Radisson Blu Ahmedabad', 'Novotel Ahmedabad', 'Ibis Ahmedabad',
    'Holiday Inn Ahmedabad', 'Courtyard by Marriott Ahmedabad', 'Hyatt Regency Ahmedabad',
    'Lemon Tree Premier Ahmedabad', 'The Fern Ahmedabad',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Royal Highness', 'Hotel Volga',
    'Hotel Sarovar Portico', 'Hotel Comfort Inn', 'Hotel Platinum Inn'
  ],
  'lucknow': [
    // Luxury
    'Taj Hotel Lucknow', 'Clarks Avadh', 'Radisson Blu Lucknow', 'The Piccadily Lucknow',
    'Novotel Lucknow', 'Courtyard by Marriott Lucknow', 'Golden Tulip Lucknow',
    'Dayal Paradise', 'Hotel Savvy Grand',
    // Mid-range
    'The Park Lucknow', 'Radisson Blu Lucknow', 'Novotel Lucknow', 'Ibis Lucknow',
    'Holiday Inn Lucknow', 'Courtyard by Marriott Lucknow', 'Lemon Tree Premier Lucknow',
    'The Piccadily Lucknow', 'Golden Tulip Lucknow',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Charans International', 'Hotel Savvy Grand',
    'Hotel Dayal Paradise', 'Hotel Gomti', 'Hotel Mandakini'
  ],
  'varanasi': [
    // Luxury
    'Taj Ganges Varanasi', 'Ramada Plaza JHV Varanasi', 'Radisson Blu Varanasi',
    'Courtyard by Marriott Varanasi', 'Hotel Surya', 'Hotel Hindustan International',
    'The Gateway Hotel Ganges Varanasi', 'Clarks Varanasi', 'Hotel Meraden Grand',
    // Mid-range
    'The Park Varanasi', 'Radisson Blu Varanasi', 'Novotel Varanasi', 'Ibis Varanasi',
    'Holiday Inn Varanasi', 'Courtyard by Marriott Varanasi', 'Lemon Tree Premier Varanasi',
    'Ramada Plaza JHV Varanasi', 'Hotel Surya',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Hindustan International', 'Hotel Meraden Grand',
    'Hotel Alka', 'Hotel Basant Residency', 'Hotel Pradeep'
  ],
  'amritsar': [
    // Luxury
    'Taj Swarna Amritsar', 'Hyatt Regency Amritsar', 'Radisson Blu Amritsar',
    'The Golden Tulip Amritsar', 'Ramada Amritsar', 'Country Inn & Suites by Radisson Amritsar',
    'Hotel Pearl Continental Amritsar', 'Holiday Inn Amritsar', 'Ritz Plaza Amritsar',
    // Mid-range
    'The Park Amritsar', 'Radisson Blu Amritsar', 'Novotel Amritsar', 'Ibis Amritsar',
    'Holiday Inn Amritsar', 'Courtyard by Marriott Amritsar', 'Lemon Tree Premier Amritsar',
    'The Golden Tulip Amritsar', 'Ramada Amritsar',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Pearl Continental', 'Hotel Ritz Plaza',
    'Hotel City Heart', 'Hotel Raj Continental', 'Hotel Grand Legacy'
  ],
  'udaipur': [
    // Luxury
    'Taj Lake Palace', 'The Oberoi Udaivilas', 'Leela Palace Udaipur',
    'Shangri-La\'s - Eros Palace', 'Trident Udaipur', 'Radisson Blu Udaipur Palace Resort',
    'Courtyard by Marriott Udaipur', 'The Ananta Udaipur', 'Ramada Udaipur Resort',
    // Mid-range
    'The Park Udaipur', 'Radisson Blu Udaipur', 'Novotel Udaipur', 'Ibis Udaipur',
    'Holiday Inn Udaipur', 'Courtyard by Marriott Udaipur', 'Lemon Tree Premier Udaipur',
    'Trident Udaipur', 'The Ananta Udaipur',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Lake Pichola', 'Hotel Jagat Niwas Palace',
    'Hotel Shiv Niwas Palace', 'Hotel Udai Kothi', 'Hotel Paras Mahal'
  ],
  'shimla': [
    // Luxury
    'The Oberoi Cecil', 'Wildflower Hall Shimla', 'Hotel Willow Banks',
    'Radisson Jass Shimla', 'The Fort Ramgarh', 'Clarkes Hotel Shimla',
    'Hotel Combermere', 'Summit Le Royale', 'The Mallwood',
    // Mid-range
    'The Park Shimla', 'Radisson Jass Shimla', 'Novotel Shimla', 'Ibis Shimla',
    'Holiday Inn Shimla', 'Courtyard by Marriott Shimla', 'Lemon Tree Premier Shimla',
    'The Fort Ramgarh', 'Clarkes Hotel Shimla',
    // Budget
    'Treebo Trend', 'OYO Rooms', 'FabHotel', 'Hotel Combermere', 'Hotel Woodrina',
    'Hotel Silverine', 'Hotel Ashiana Regency', 'Hotel Satyam'
  ],

  // Middle East & UAE
  'dubai': [
    'Burj Al Arab', 'Armani Hotel Dubai', 'Atlantis The Palm', 'Jumeirah Beach Hotel',
    'The Palm Jumeirah', 'Emirates Palace', 'Four Seasons Hotel Dubai', 'Park Hyatt Dubai',
    'The Ritz-Carlton Dubai', 'JW Marriott Marquis Dubai'
  ],
  'abu dhabi': [
    'Emirates Palace Abu Dhabi', 'St. Regis Abu Dhabi', 'Rosewood Abu Dhabi',
    'Park Hyatt Abu Dhabi', 'The Ritz-Carlton Abu Dhabi', 'Jumeirah at Etihad Towers',
    'Hilton Abu Dhabi', 'Radisson Blu Abu Dhabi', 'Sheraton Abu Dhabi', 'Traders Hotel Qaryat Al Beri'
  ],
  'sharjah': [
    'Radisson Blu Resort Sharjah', 'Hilton Sharjah', 'Sheraton Sharjah Beach Resort',
    'Ibis Sharjah', 'Novotel Sharjah', 'Golden Sands Hotel', 'Citymax Sharjah',
    'Al Hamra Residence', 'Ramee Guestline Hotel Sharjah'
  ],

  // Southeast Asia
  'singapore': [
    'Marina Bay Sands', 'Raffles Hotel', 'Shangri-La Hotel', 'The Fullerton Hotel',
    'Four Seasons Singapore', 'The Ritz-Carlton Millenia', 'Park Hyatt Singapore',
    'Mandarin Oriental Singapore', 'Capella Singapore', 'The St. Regis Singapore'
  ],
  'bangkok': [
    'Mandarin Oriental Bangkok', 'The Peninsula Bangkok', 'Shangri-La Bangkok', 'Grand Hyatt Erawan',
    'Four Seasons Bangkok', 'The Ritz-Carlton Bangkok', 'Park Hyatt Bangkok',
    'The St. Regis Bangkok', 'Anantara Siam Bangkok', 'Bangkok Marriott Marquis Queen\'s Park'
  ],
  'bali': [
    'The Laguna, a Luxury Collection Hotel', 'St. Regis Bali Resort', 'Ayodya Resort Bali',
    'Four Seasons Resort Bali', 'Mulia Resort', 'The Legian', 'COMO Shambhala Estate',
    'Alila Manggis', 'Alila Seminyak', 'The Griya Santrian'
  ],
  'phuket': [
    'Belmond Le Meridien Phuket', 'The Surin Phuket', 'Trisara Phuket',
    'COMO Point Yamu Phuket', 'Rosewood Phuket', 'Anantara Phuket Layan',
    'Six Senses Yao Noi', 'The Naka Phuket', 'Cape Sane Beach Phuket'
  ],
  'ho chi minh city': [
    'Park Hyatt Saigon', 'The Reverie Saigon', 'Sheraton Saigon', 'Pullman Saigon Centre',
    'Caravelle Saigon', 'Majestic Saigon', 'Nikko Saigon', 'InterContinental Saigon',
    'Rex Hotel Saigon', 'Grand Hotel Saigon'
  ],

  // Europe
  'paris': [
    'Hotel Plaza Athenee', 'Ritz Paris', 'George V', 'Le Meurice',
    'Four Seasons Hotel George V Paris', 'The Ritz Paris', 'Park Hyatt Paris-Vendome',
    'Shangri-La Hotel Paris', 'The Peninsula Paris', 'Mandarin Oriental Paris'
  ],
  'london': [
    'The Savoy', 'Claridge\'s', 'The Dorchester', 'Ritz London',
    'Four Seasons Hotel London', 'The Ritz London', 'Park Hyatt London',
    'The Peninsula London', 'Mandarin Oriental Hyde Park', 'The Berkeley'
  ],
  'rome': [
    'Hotel de Russie', 'The Hassler Roma', 'Hotel Eden', 'The St. Regis Rome',
    'Four Seasons Hotel Rome', 'The Ritz-Carlton Rome', 'Hotel de Paris',
    'Palazzo Navona Hotel', 'Hotel Campo de\' Fiori', 'Hotel Indigo Rome'
  ],
  'barcelona': [
    'Hotel Arts Barcelona', 'Mandarin Oriental Barcelona', 'The St. Regis Barcelona',
    'Four Seasons Hotel Barcelona', 'Hotel W Barcelona', 'Majestic Hotel & Spa Barcelona',
    'Sofitel Barcelona', 'The One Barcelona', 'Mercer Hotel Barcelona', 'Casa Fuster'
  ],
  'amsterdam': [
    'Hotel de l\'Europe', 'The Dylan Amsterdam', 'Conservatorium Hotel', 'Hotel Pulitzer',
    'Boutique Hotel Notting Hill', 'Hotel Vondel', 'The Toren', 'Hotel Seven One Seven',
    'Sofitel Legend The Grand Amsterdam', 'InterContinental Amstel Amsterdam'
  ],
  'venice': [
    'The Gritti Palace', 'Hotel Danieli', 'Ca\' Sagredo Hotel', 'Palazzo Barbarigo',
    'Hotel Ai Reali', 'Hotel Ca\' Sagredo', 'The St. Regis Venice', 'Hotel Ai Cavalieri di Venezia',
    'Palazzo Venart', 'Hotel Ai Reali di Venezia'
  ],
  'prague': [
    'Mandarin Oriental Prague', 'Four Seasons Hotel Prague', 'The Charles Hotel Prague',
    'Hotel Paris Prague', 'Aria Hotel Prague', 'Alchymist Grand Hotel', 'Hotel Imperial Prague',
    'Boscolo Prague', 'Hotel Savoy Prague', 'Grand Hotel Bohemia'
  ],
  'vienna': [
    'Hotel Sacher Wien', 'Palais Hansen Kempinski', 'The Ritz-Carlton Vienna',
    'Hotel Imperial Vienna', 'Park Hyatt Vienna', 'Steigenberger Hotel Herrenhof',
    'Hotel Bristol Vienna', 'Grand Hotel Wien', 'The Ring Hotel', 'Hotel Astoria Wien'
  ],
  'zurich': [
    'The Dolder Grand', 'Baur au Lac', 'Hotel Eden au Lac', 'Marktgasse Hotel',
    'Storchen Zurich', 'Widder Hotel', 'Park Hyatt Zurich', 'Alden Hotel Splügenschloss',
    'Hotel Schweizerhof Zurich', 'Sofitel Zurich'
  ],
  'munich': [
    'Mandarin Oriental Munich', 'Hotel Vier Jahreszeiten Kempinski', 'The Charles Hotel Munich',
    'Hotel Bayerischer Hof', 'Sofitel Munich Bayerpost', 'Park Hyatt Munich',
    'Hotel Königshof', 'Derag Livinghotel Am Viktualienmarkt', 'Hotel Excelsior Munich'
  ],

  // North America
  'new york': [
    'The Plaza Hotel', 'St. Regis New York', 'The Carlyle', 'Four Seasons Hotel New York',
    'The Ritz-Carlton New York', 'Park Hyatt New York', 'The St. Regis New York',
    'Mandarin Oriental New York', 'The Plaza', 'The Carlyle, A Rosewood Hotel'
  ],
  'los angeles': [
    'The Beverly Hills Hotel', 'Bel-Air Hotel', 'The Ritz-Carlton Los Angeles',
    'Four Seasons Hotel Los Angeles', 'InterContinental Los Angeles', 'Mondrian Los Angeles',
    'Standard Hotel Hollywood', 'Sunset Tower Hotel', 'Chateau Marmont', 'Hollywood Roosevelt'
  ],
  'san francisco': [
    'The Ritz-Carlton San Francisco', 'Four Seasons Hotel San Francisco', 'The St. Regis San Francisco',
    'Mandarin Oriental San Francisco', 'Palace Hotel San Francisco', 'Fairmont San Francisco',
    'Hotel Nikko San Francisco', 'Hyatt Regency San Francisco', 'InterContinental San Francisco'
  ],
  'las vegas': [
    'The Venetian Resort', 'Bellagio', 'Caesars Palace', 'Wynn Las Vegas',
    'The Cosmopolitan', 'Paris Las Vegas', 'Planet Hollywood', 'New York-New York',
    'Aria Resort & Casino', 'MGM Grand'
  ],
  'miami': [
    'The Ritz-Carlton South Beach', 'Four Seasons Hotel at The Surf Club', 'The Standard Spa Miami Beach',
    'Mandarin Oriental Miami', 'The Setai Miami Beach', 'Faena Hotel Miami Beach',
    '1 Hotel South Beach', 'The Confidante Miami Beach', 'Nobu Fifty Seven'
  ],
  'toronto': [
    'The Ritz-Carlton Toronto', 'Four Seasons Hotel Toronto', 'The St. Regis Toronto',
    'Mandarin Oriental Toronto', 'Park Hyatt Toronto', 'Fairmont Royal York',
    'Shangri-La Hotel Toronto', 'The Hazelton Hotel', 'Hotel X Toronto'
  ],
  'vancouver': [
    'Rosewood Hotel Georgia', 'The Ritz-Carlton Vancouver', 'Four Seasons Hotel Vancouver',
    'Fairmont Pacific Rim', 'Shangri-La Hotel Vancouver', 'The St. Regis Vancouver',
    'Mandarin Oriental Vancouver', 'Opus Hotel Vancouver', 'JW Marriott Parq Vancouver'
  ],

  // Australia & Oceania
  'sydney': [
    'The Rocks Hotel', 'Park Hyatt Sydney', 'The Ritz-Carlton Sydney', 'Four Seasons Hotel Sydney',
    'Shangri-La Hotel Sydney', 'The Langham Sydney', 'InterContinental Sydney Double Bay',
    'The Westin Sydney', 'Hyatt Regency Sydney', 'Pullman Quay Grand Sydney Harbour'
  ],
  'melbourne': [
    'The Ritz-Carlton Melbourne', 'Park Hyatt Melbourne', 'Crown Towers Melbourne',
    'The Langham Melbourne', 'InterContinental Melbourne', 'Grand Hyatt Melbourne',
    'Shangri-La Hotel Melbourne', 'The Westin Melbourne', 'Art Series - The Olsen'
  ],

  // Africa
  'cape town': [
    'The Table Bay Hotel', 'Belmond Mount Nelson Hotel', 'The Ritz-Carlton Cape Town',
    'One&Only Cape Town', 'Southern Sun Cape Sun', 'The Twelve Apostles Hotel',
    'Cape Grace', 'Ellerman House', 'The Cellars-Hohenort'
  ],
  'johannesburg': [
    'The Ritz-Carlton Johannesburg', 'Four Seasons Hotel Johannesburg', 'The Westcliff',
    'Southern Sun Sandton', 'Hyatt Regency Johannesburg', 'InterContinental Johannesburg',
    'The Michelangelo', 'Park Hyatt Johannesburg', 'Rosebank Hotel'
  ],

  // South America
  'rio de janeiro': [
    'Copacabana Palace', 'Fasano Rio', 'Belmond Copacabana Palace', 'The Ritz-Carlton Rio de Janeiro',
    'Four Seasons Hotel Rio de Janeiro', 'Sheraton Rio Hotel & Towers', 'Windsor Atlantica',
    'PortoBay Rio Internacional', 'Arena Copacabana Hotel', 'Ibis Rio de Janeiro Centro'
  ],
  'buenos aires': [
    'Palacio Duhau - Park Hyatt Buenos Aires', 'The Ritz-Carlton Buenos Aires', 'Four Seasons Hotel Buenos Aires',
    'Alvear Palace Hotel', 'Park Tower Buenos Aires', 'Faena Hotel Buenos Aires',
    'Hyatt Centric Buenos Aires', 'Sheraton Buenos Aires', 'NH Buenos Aires City'
  ],

  // Alternative city names and spellings
  'bombay': ['The Taj Mahal Palace', 'ITC Grand Central', 'Trident Bandra Kurla'], // Alternative name for Mumbai
  'bengaluru': ['ITC Gardenia', 'The Oberoi Bengaluru', 'Taj West End'], // Alternative name for Bangalore
  'bangaluru': ['ITC Gardenia', 'The Oberoi Bengaluru', 'Taj West End'], // Common misspelling
  'moscow': [
    'The Ritz-Carlton Moscow', 'Four Seasons Hotel Moscow', 'The St. Regis Moscow Nikolskaya',
    'Mandarin Oriental Moscow', 'Hotel Metropol Moscow', 'Ararat Park Hyatt Moscow',
    'Baltschug Kempinski Moscow', 'Lotus Hotel Moscow', 'Swissotel Krasnye Holmy'
  ],
  'istanbul': [
    'Four Seasons Hotel Istanbul', 'The Ritz-Carlton Istanbul', 'Ciragan Palace Kempinski',
    'Mandarin Oriental Istanbul', 'Park Hyatt Istanbul', 'The St. Regis Istanbul',
    'Hyatt Regency Istanbul', 'Swissotel The Bosphorus', 'Ritz-Carlton Istanbul'
  ],
  'cairo': [
    'Four Seasons Hotel Cairo', 'The Ritz-Carlton Cairo', 'Nile Ritz-Carlton Cairo',
    'Mandarin Oriental Cairo', 'Park Hyatt Cairo', 'The St. Regis Cairo',
    'Kempinski Nile Hotel Cairo', 'Sofitel Cairo Nile Plaza', 'InterContinental Cairo Citystars'
  ],
  'tokyo': [
    'The Ritz-Carlton Tokyo', 'Park Hyatt Tokyo', 'Mandarin Oriental Tokyo',
    'Four Seasons Hotel Tokyo', 'The Peninsula Tokyo', 'Shangri-La Hotel Tokyo',
    'The St. Regis Tokyo', 'Hyatt Regency Tokyo', 'Grand Hyatt Tokyo'
  ],
  'beijing': [
    'The Ritz-Carlton Beijing', 'Four Seasons Hotel Beijing', 'Park Hyatt Beijing',
    'Mandarin Oriental Wangfujing', 'The Peninsula Beijing', 'Shangri-La Hotel Beijing',
    'The St. Regis Beijing', 'China World Summit Wing', 'Beijing Marriott Hotel Northeast'
  ],
  'hong kong': [
    'The Ritz-Carlton Hong Kong', 'Four Seasons Hotel Hong Kong', 'Mandarin Oriental Hong Kong',
    'The Peninsula Hong Kong', 'Park Hyatt Hong Kong', 'Shangri-La Hotel Hong Kong',
    'The St. Regis Hong Kong', 'InterContinental Hong Kong', 'Grand Hyatt Hong Kong'
  ]
};

// Function to calculate budget relevance score based on user's budget
const calculateBudgetRelevance = (hotelPrice, userBudget, currency) => {
  // Extract numeric price from hotel price string (e.g., "₹2500/night" -> 2500)
  const priceMatch = hotelPrice.match(/[\d,]+/);
  if (!priceMatch) return 0;

  const hotelPriceNum = parseInt(priceMatch[0].replace(/,/g, ''));

  // Convert user budget to number
  const userBudgetNum = parseInt(userBudget);

  // Calculate how well the hotel fits the budget
  const priceRatio = hotelPriceNum / userBudgetNum;

  if (priceRatio <= 0.5) {
    // Hotel is much cheaper than budget - good value but might be too basic
    return 2;
  } else if (priceRatio <= 0.8) {
    // Hotel is slightly cheaper than budget - good fit
    return 4;
  } else if (priceRatio <= 1.0) {
    // Hotel is within budget - perfect fit
    return 5;
  } else if (priceRatio <= 1.3) {
    // Hotel is slightly over budget - acceptable
    return 3;
  } else if (priceRatio <= 2.0) {
    // Hotel is moderately over budget - less relevant
    return 1;
  } else {
    // Hotel is way over budget - not relevant
    return 0;
  }
};

// Function to validate if hotels are real (more flexible approach)
const validateRealHotels = (hotels, location) => {
  const locationKey = location.toLowerCase().trim();
  const knownHotels = REAL_HOTELS_DB[locationKey] || [];

  // If city is not in our database, allow all hotels (flexible approach)
  if (knownHotels.length === 0) {
    return hotels;
  }

  // If city is in database, validate but be more lenient
  return hotels.filter(hotel => {
    const hotelName = hotel.name.toLowerCase().trim();

    // Check if hotel name matches any known real hotel (partial match)
    const isKnownHotel = knownHotels.some(knownHotel =>
      knownHotel.toLowerCase().includes(hotelName) ||
      hotelName.includes(knownHotel.toLowerCase())
    );

    // If it's a known hotel, definitely include it
    if (isKnownHotel) return true;

    // For unknown hotels, include them if they seem like real hotel names
    // (not generic like "Hotel ABC" or obviously fake)
    const suspiciousPatterns = [
      /\b(test|fake|demo|sample)\b/i,
      /\b(hotel\s+abc|hotel\s+xyz|hotel\s+123)\b/i,
      /\b(cheap\s+hotel|budget\s+inn)\b/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(hotelName));

    // Include if it doesn't match suspicious patterns and has some credibility indicators
    return !isSuspicious && (
      hotelName.includes('hotel') ||
      hotelName.includes('resort') ||
      hotelName.includes('inn') ||
      hotelName.includes('plaza') ||
      hotelName.includes('grand') ||
      hotelName.includes('palace') ||
      hotelName.includes('international')
    );
  });
};

// Function to get suggested budget ranges for locations
const getSuggestedBudget = (location, currency) => {
  const locationKey = location.toLowerCase().trim();
  const budgetRanges = {
    // India
    'delhi': { INR: { min: 3000, max: 15000 }, USD: { min: 35, max: 180 }, EUR: { min: 30, max: 160 } },
    'mumbai': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'goa': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },
    'bangalore': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },
    'kolkata': { INR: { min: 2000, max: 10000 }, USD: { min: 25, max: 120 }, EUR: { min: 20, max: 110 } },
    'chennai': { INR: { min: 2000, max: 10000 }, USD: { min: 25, max: 120 }, EUR: { min: 20, max: 110 } },
    'jaipur': { INR: { min: 1500, max: 8000 }, USD: { min: 20, max: 100 }, EUR: { min: 15, max: 90 } },
    'agra': { INR: { min: 1500, max: 6000 }, USD: { min: 20, max: 75 }, EUR: { min: 15, max: 65 } },
    'hyderabad': { INR: { min: 2000, max: 10000 }, USD: { min: 25, max: 120 }, EUR: { min: 20, max: 110 } },
    'pune': { INR: { min: 2000, max: 8000 }, USD: { min: 25, max: 100 }, EUR: { min: 20, max: 90 } },
    'ahmedabad': { INR: { min: 1500, max: 7000 }, USD: { min: 20, max: 90 }, EUR: { min: 15, max: 80 } },
    'lucknow': { INR: { min: 1500, max: 6000 }, USD: { min: 20, max: 75 }, EUR: { min: 15, max: 65 } },
    'varanasi': { INR: { min: 1200, max: 5000 }, USD: { min: 15, max: 65 }, EUR: { min: 12, max: 55 } },
    'amritsar': { INR: { min: 1500, max: 6000 }, USD: { min: 20, max: 75 }, EUR: { min: 15, max: 65 } },
    'udaipur': { INR: { min: 2000, max: 8000 }, USD: { min: 25, max: 100 }, EUR: { min: 20, max: 90 } },
    'shimla': { INR: { min: 2000, max: 8000 }, USD: { min: 25, max: 100 }, EUR: { min: 20, max: 90 } },

    // Middle East & UAE
    'dubai': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },
    'abu dhabi': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'sharjah': { INR: { min: 2000, max: 8000 }, USD: { min: 25, max: 100 }, EUR: { min: 20, max: 90 } },

    // Southeast Asia
    'singapore': { INR: { min: 8000, max: 40000 }, USD: { min: 100, max: 500 }, EUR: { min: 90, max: 450 } },
    'bangkok': { INR: { min: 2000, max: 15000 }, USD: { min: 25, max: 180 }, EUR: { min: 20, max: 160 } },
    'bali': { INR: { min: 3000, max: 15000 }, USD: { min: 40, max: 180 }, EUR: { min: 35, max: 160 } },
    'phuket': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },
    'ho chi minh city': { INR: { min: 2000, max: 10000 }, USD: { min: 25, max: 120 }, EUR: { min: 20, max: 110 } },

    // Europe
    'paris': { INR: { min: 10000, max: 50000 }, USD: { min: 120, max: 600 }, EUR: { min: 110, max: 550 } },
    'london': { INR: { min: 8000, max: 40000 }, USD: { min: 100, max: 500 }, EUR: { min: 90, max: 450 } },
    'rome': { INR: { min: 6000, max: 30000 }, USD: { min: 75, max: 375 }, EUR: { min: 65, max: 330 } },
    'barcelona': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },
    'amsterdam': { INR: { min: 6000, max: 30000 }, USD: { min: 75, max: 375 }, EUR: { min: 65, max: 330 } },
    'venice': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },
    'prague': { INR: { min: 3000, max: 15000 }, USD: { min: 40, max: 180 }, EUR: { min: 35, max: 160 } },
    'vienna': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'zurich': { INR: { min: 6000, max: 30000 }, USD: { min: 75, max: 375 }, EUR: { min: 65, max: 330 } },
    'munich': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },

    // North America
    'new york': { INR: { min: 8000, max: 50000 }, USD: { min: 100, max: 600 }, EUR: { min: 90, max: 550 } },
    'los angeles': { INR: { min: 6000, max: 35000 }, USD: { min: 75, max: 425 }, EUR: { min: 65, max: 380 } },
    'san francisco': { INR: { min: 7000, max: 40000 }, USD: { min: 85, max: 500 }, EUR: { min: 75, max: 450 } },
    'las vegas': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },
    'miami': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },
    'toronto': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'vancouver': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },

    // Australia & Oceania
    'sydney': { INR: { min: 6000, max: 30000 }, USD: { min: 75, max: 375 }, EUR: { min: 65, max: 330 } },
    'melbourne': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } },

    // Africa
    'cape town': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'johannesburg': { INR: { min: 3000, max: 15000 }, USD: { min: 40, max: 180 }, EUR: { min: 35, max: 160 } },

    // South America
    'rio de janeiro': { INR: { min: 3000, max: 15000 }, USD: { min: 40, max: 180 }, EUR: { min: 35, max: 160 } },
    'buenos aires': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },

    // Alternative city names
    'bombay': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'bengaluru': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },
    'bangaluru': { INR: { min: 2500, max: 12000 }, USD: { min: 30, max: 150 }, EUR: { min: 25, max: 130 } },
    'moscow': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'istanbul': { INR: { min: 3000, max: 15000 }, USD: { min: 40, max: 180 }, EUR: { min: 35, max: 160 } },
    'cairo': { INR: { min: 2000, max: 10000 }, USD: { min: 25, max: 120 }, EUR: { min: 20, max: 110 } },
    'tokyo': { INR: { min: 6000, max: 30000 }, USD: { min: 75, max: 375 }, EUR: { min: 65, max: 330 } },
    'beijing': { INR: { min: 4000, max: 20000 }, USD: { min: 50, max: 250 }, EUR: { min: 45, max: 220 } },
    'hong kong': { INR: { min: 5000, max: 25000 }, USD: { min: 60, max: 300 }, EUR: { min: 55, max: 270 } }
  };

  return budgetRanges[locationKey]?.[currency] || null;
};

const LLM_PROVIDER = 'groq'; // 'groq', 'gemini', or 'openai'

// Helper function to call AI
const callAI = async (model, prompt, maxTokens = 8000) => {
  if (LLM_PROVIDER === 'groq') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API key not configured. Get it free at: https://console.groq.com/keys');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a hotel search assistant. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content;
  } else if (LLM_PROVIDER === 'openai') {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a hotel search assistant. Return ONLY valid JSON, no markdown, no explanation. Keep responses concise.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content;
  }
};

export default function HotelSearch() {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shortlistedHotels, setShortlistedHotels] = useState(new Set());
  const navigate = useNavigate();
  const locationState = useLocation();

  // Initialize form with trip data from navigation state
  useEffect(() => {
    if (locationState.state?.tripData) {
      const tripData = locationState.state.tripData;
      const currencyFromState = locationState.state.currency || 'INR';
      
      setLocation(tripData.destination || '');
      setCurrency(currencyFromState);
      
      // Set budget based on trip data or state
      if (locationState.state.budgetAmount) {
        setBudget(locationState.state.budgetAmount.toString());
      }
      
      // Set dates if available in trip data
      if (tripData.startDate) {
        setCheckIn(tripData.startDate);
      }
      if (tripData.endDate) {
        setCheckOut(tripData.endDate);
      }
    }
  }, [locationState.state]);

  // Load shortlisted hotels for the current user
  useEffect(() => {
    const loadShortlistedHotels = async () => {
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'user_shortlists', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setShortlistedHotels(new Set(data.hotels || []));
          }
        } catch (error) {
          console.error('Error loading shortlisted hotels:', error);
        }
      }
    };
    loadShortlistedHotels();
  }, []);

  // Function to toggle hotel shortlisting
  const toggleShortlist = async (hotel) => {
    if (!auth.currentUser) {
      alert('Please sign in to shortlist hotels');
      return;
    }

    const hotelId = `${hotel.name}-${hotel.price}`;
    const isShortlisted = shortlistedHotels.has(hotelId);
    
    try {
      const userDocRef = doc(db, 'user_shortlists', auth.currentUser.uid);
      
      if (isShortlisted) {
        // Remove from shortlist
        await updateDoc(userDocRef, {
          hotels: arrayRemove(hotelId)
        });
        setShortlistedHotels(prev => {
          const newSet = new Set(prev);
          newSet.delete(hotelId);
          return newSet;
        });
      } else {
        // Add to shortlist
        const hotelData = {
          id: hotelId,
          name: hotel.name,
          price: hotel.price,
          rating: hotel.rating,
          amenities: hotel.amenities,
          location: location,
          budgetRelevance: hotel.budgetRelevance,
          bookingLink: hotel.bookingLink,
          dateAdded: new Date().toISOString()
        };
        
        await setDoc(userDocRef, {
          hotels: arrayUnion(hotelId),
          hotelDetails: arrayUnion(hotelData)
        }, { merge: true });
        
        setShortlistedHotels(prev => new Set([...prev, hotelId]));
      }
    } catch (error) {
      console.error('Error updating shortlist:', error);
      alert('Failed to update shortlist. Please try again.');
    }
  };

  const currencies = {
    INR: { symbol: '₹', name: 'Indian Rupee' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
  };

  const searchHotels = async () => {
    if (!location || !checkIn || !checkOut || !budget) {
      setError('Please fill all fields');
      return;
    }

    const budgetNum = parseInt(budget);
    if (budgetNum < 500 && currency === 'INR') {
      setError('Budget too low. Minimum recommended budget is ₹500 per night for basic accommodation.');
      return;
    }
    if (budgetNum < 20 && currency === 'USD') {
      setError('Budget too low. Minimum recommended budget is $20 per night for basic accommodation.');
      return;
    }
    if (budgetNum < 15 && currency === 'EUR') {
      setError('Budget too low. Minimum recommended budget is €15 per night for basic accommodation.');
      return;
    }

    setLoading(true);
    setError(null);

    const currencySymbol = currencies[currency]?.symbol || '₹';

    const prompt = `You are a hotel search expert. Find REAL, VERIFIABLE hotels that actually exist in ${location} across different price ranges.

REQUIREMENTS:
1. Find hotels within ${currencySymbol}${budget} per night maximum budget
2. Include hotels from ALL price ranges: BUDGET, MID-RANGE, and LUXURY
3. Each hotel must physically exist and be verifiable on Google Maps
4. Provide 8-12 hotel options total, distributed across price ranges

EXAMPLES of real hotels by price range in ${location}:

BUDGET OPTIONS (${currencySymbol}500-${currencySymbol}1500 INR / ${currencySymbol}7-${currencySymbol}20 USD):
- OYO Rooms, FabHotel, Treebo Trend, Hotel City Park, Hotel Krishna Continental

MID-RANGE OPTIONS (${currencySymbol}1500-${currencySymbol}5000 INR / ${currencySymbol}20-${currencySymbol}65 USD):
- Ibis, Holiday Inn, Novotel, Courtyard by Marriott, Radisson Blu, The Park

LUXURY OPTIONS (${currencySymbol}5000+ INR / ${currencySymbol}65+ USD):
- Taj, ITC, Oberoi, Leela, Marriott, Hyatt, Four Seasons, Ritz-Carlton

For each hotel, provide:
- EXACT real hotel name
- Realistic price within budget
- Rating out of 5
- Key amenities
- Budget relevance (budget/mid-range/luxury)

If no hotels found within budget, suggest increasing budget.

Return ONLY valid JSON:
{
  "hotels": [
    {
      "name": "EXACT REAL HOTEL NAME",
      "price": "${currencySymbol}XXX/night",
      "rating": "X.X/5",
      "amenities": ["wifi", "pool", "gym", "restaurant"],
      "budgetRelevance": "budget/mid-range/luxury"
    }
  ],
  "message": "Optional message about availability"
}`;

    try {
      const text = await callAI('openai/gpt-oss-20b', prompt, 4000);

      // Improved JSON extraction with multiple fallback methods
      let hotelData;

      try {
        // Method 1: Try to find JSON between first { and last }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          hotelData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found with basic regex');
        }
      } catch (parseError) {
        console.warn('Basic JSON parsing failed, trying alternative methods:', parseError);

        try {
          // Method 2: Look for JSON after common prefixes
          const prefixes = ['Here is the JSON:', 'Response:', 'Result:', 'Output:'];
          for (const prefix of prefixes) {
            const prefixIndex = text.indexOf(prefix);
            if (prefixIndex !== -1) {
              const jsonStart = text.indexOf('{', prefixIndex);
              if (jsonStart !== -1) {
                const jsonText = text.substring(jsonStart);
                // Find matching closing brace
                let braceCount = 0;
                let endIndex = jsonStart;
                for (let i = jsonStart; i < text.length; i++) {
                  if (text[i] === '{') braceCount++;
                  if (text[i] === '}') braceCount--;
                  if (braceCount === 0) {
                    endIndex = i + 1;
                    break;
                  }
                }
                const potentialJson = text.substring(jsonStart, endIndex);
                hotelData = JSON.parse(potentialJson);
                break;
              }
            }
          }

          if (!hotelData) {
            // Method 3: Try to extract JSON by finding the largest valid JSON object
            const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/g;
            const matches = text.match(jsonRegex);
            if (matches) {
              // Try each match, starting with the longest
              const sortedMatches = matches.sort((a, b) => b.length - a.length);
              for (const match of sortedMatches) {
                try {
                  hotelData = JSON.parse(match);
                  break;
                } catch (e) {
                  continue;
                }
              }
            }
          }

          if (!hotelData) {
            throw new Error('Could not extract valid JSON from AI response');
          }

        } catch (fallbackError) {
          console.error('All JSON parsing methods failed:', fallbackError);
          throw new Error('Invalid response format - AI returned malformed data');
        }
      }

      // Check if no hotels found
      if (!hotelData.hotels || hotelData.hotels.length === 0) {
        if (hotelData.message) {
          setError(hotelData.message);
        } else {
          setError('No hotels found within your budget. Please increase your budget amount.');
        }
        setResults([]);
        return;
      }

      // Validate hotels against known real hotels (more flexible)
      const validatedHotels = validateRealHotels(hotelData.hotels, location);

      if (validatedHotels.length === 0) {
        const suggestedBudget = getSuggestedBudget(location, currency);
        const locationKey = location.toLowerCase().trim();
        const isKnownCity = REAL_HOTELS_DB[locationKey] !== undefined;

        if (isKnownCity) {
          setError(`No verified hotels found within ${currencySymbol}${budget} budget in ${location}. ${suggestedBudget ? `Try budgets from ${currencySymbol}${suggestedBudget.min} to ${currencySymbol}${suggestedBudget.max} for this location.` : 'Try increasing your budget or choose a different location.'}`);
        } else {
          setError(`No hotels found within ${currencySymbol}${budget} budget in ${location}. This city may not be well-supported yet. Try increasing your budget or choose a more popular destination.`);
        }
        setResults([]);
        return;
      }

      // Sort hotels: budget relevance first (based on user's actual budget), then rating
      const sortedHotels = validatedHotels.sort((a, b) => {
        // Calculate budget relevance scores for both hotels
        const aBudgetScore = calculateBudgetRelevance(a.price, budget, currency);
        const bBudgetScore = calculateBudgetRelevance(b.price, budget, currency);

        // First sort by budget relevance score (higher score = more relevant to budget)
        if (aBudgetScore !== bBudgetScore) {
          return bBudgetScore - aBudgetScore; // Higher budget relevance first
        }

        // If budget relevance is equal, sort by rating
        const aRating = parseFloat(a.rating?.split('/')[0] || 0);
        const bRating = parseFloat(b.rating?.split('/')[0] || 0);
        return bRating - aRating; // Higher rating first
      });

      // Remove duplicates based on hotel name
      const uniqueHotels = sortedHotels.filter((hotel, index, self) =>
        index === self.findIndex(h => h.name.toLowerCase() === hotel.name.toLowerCase())
      );

      // Calculate and update budget relevance labels based on actual budget fit
      const hotelsWithBudgetLabels = uniqueHotels.map(hotel => {
        const budgetScore = calculateBudgetRelevance(hotel.price, budget, currency);
        let budgetLabel = 'low'; // Default to budget stretch

        if (budgetScore === 5) {
          budgetLabel = 'high'; // Perfect fit
        } else if (budgetScore >= 3) {
          budgetLabel = 'medium'; // Good fit
        } else {
          budgetLabel = 'low'; // Budget stretch
        }

        return {
          ...hotel,
          budgetRelevance: budgetLabel
        };
      });

      // Add Google Maps URLs for each hotel
      const hotelsWithMaps = hotelsWithBudgetLabels.map(hotel => ({
        ...hotel,
        bookingLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + ' ' + location)}`
      }));

      setResults(hotelsWithMaps);
    } catch (err) {
      console.error('Error searching hotels:', err);
      setError(err.message || 'Failed to search hotels');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button 
            onClick={() => {
              if (locationState.state?.fromPage === 'trip-planner') {
                navigate(-1); // Go back to trip planner calendar view
              } else {
                navigate('/home');
              }
            }}
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm mb-6 transition-all hover:-translate-x-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Calendar
          </button>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-6 mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 mb-6">Find Hotels</h1>

            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Goa, India"
                  className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Max Budget per Night</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {Object.entries(currencies).map(([code, data]) => (
                      <option key={code} value={code}>
                        {data.symbol} {code} - {data.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={searchHotels}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:bg-zinc-300 disabled:text-zinc-500 transition-all"
              >
                {loading ? 'Searching...' : 'Search Hotels'}
              </button>
            </div>
          </div>

          {results && results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-zinc-900">Hotel Options (Sorted by Budget Match)</h2>
              {results.map((hotel, i) => {
                const hotelId = `${hotel.name}-${hotel.price}`;
                const isShortlisted = shortlistedHotels.has(hotelId);
                
                return (
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900">{hotel.name}</h3>
                        {hotel.budgetRelevance && (
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                            hotel.budgetRelevance === 'high' ? 'bg-green-100 text-green-800' :
                            hotel.budgetRelevance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {hotel.budgetRelevance === 'high' ? 'Best Match' :
                             hotel.budgetRelevance === 'medium' ? 'Good Match' : 'Budget Stretch'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">{hotel.rating}</span>
                        <button
                          onClick={() => toggleShortlist(hotel)}
                          className={`p-1.5 rounded-full transition-colors ${
                            isShortlisted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                          {isShortlisted ? (
                            <HeartSolidIcon className="w-5 h-5" />
                          ) : (
                            <HeartOutlineIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-600 mb-2">{hotel.price}</p>
                    <p className="text-sm text-zinc-600 mb-3">Amenities: {hotel.amenities?.join(', ')}</p>
                    <div className="flex gap-2">
                      {hotel.bookingLink && (
                        <a
                          href={hotel.bookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                          View on Maps
                        </a>
                      )}
                      <button
                        onClick={() => navigate('/shortlist')}
                        className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                      >
                        View Shortlist
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {results && results.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Hotels Found</h3>
              <p className="text-yellow-700">
                No hotels are available within your budget in {location}. Consider increasing your budget or choosing a different location.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="w-full fixed bottom-0">
        <div className="hidden sm:block">
          <Bottom />
        </div>
      </div>
    </div>
  );
}