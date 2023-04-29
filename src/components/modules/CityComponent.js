import styled from "styled-components";

const WeatherLogo=styled.img`
width:140px;
height:140px;
margin:40px auto;`

const ChooseCityLabel=styled.span`
color:black;
font-size:18px;
font-weight:bold;`

const SearchBox=styled.form`
display:flex;
flex-direction:row;
border: black solid 1px;
border-radius: 2px;
color: black;
font-size:18px;
font-weight:bold;
margin: 20px auto;
& input {
    padding: 10px;
    font-size: 14px;
    border: none;
    outline: none;
    font-family: Montserrat;
    font-weight: bold;
  }
  & button {
    background-color: black;
    font-size: 14px;
    padding: 0 10px;
    color: white;
    border: none;
    outline: none;
    cursor: pointer;
    font-family: Montserrat;
    font-weight: bold;
  }
`;

const CityComponent =(props)=>{
  const{ updateCity ,fetchWeather}=props;
    return(
        <>
        <WeatherLogo src="/icons/perfect-day.svg"/>
        <ChooseCityLabel>Find Weather Of Your City</ChooseCityLabel>
        <SearchBox onSubmit={fetchWeather}>
            <input placeholder="City" 
            onChange={(e) =>updateCity(e.target.value)}/>
            <button type="submit">Search</button>
          
        </SearchBox>
        </>
    )
}
export default CityComponent;
