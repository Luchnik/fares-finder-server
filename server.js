const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const {
  dialogflow,
  SimpleResponse,
  BasicCard,
  Button,
  Image,
  Suggestions
} = require('actions-on-google');

const geoLocationApikey = 'AIzaSyDEfZBPpxnnX4mLiAmmXV0Yg1xBf8WkghI';
const ryanairApikey = 'I8Q6famX1tQw9AF1V6RG07CXQFAH3iBa';
const flightQueryParams = '';

const port = process.env.PORT || 4000;
const app = dialogflow();

app.intent('Default Welcome Intent', async (conv) => {
  conv.ask('Welcome to Flight Finder! What\'s your flight connection?');
});

app.intent('Flight Connection', async (conv, { departureCity, arrivalCity }) => {
  conv.ask(`Your flight connection is ${departureCity} - ${arrivalCity}. Please choose expected price!`);

  const departureAirportData = await getAirportDataByCity(departureCity);
  const arrivalAirportData = await getAirportDataByCity(arrivalCity);

  console.log('dep', departureAirportData);
  console.log('arr', arrivalAirportData);
});

app.intent('Desired Date Range', (conv, { fromDate, toDate }) => {
  console.log('fromDate ---------------------------------------------------------------', fromDate);
  console.log('toDate ---------------------------------------------------------------', toDate);
  conv.ask(`from ${fromDate.startDate} to ${toDate.startDate}`);
});

app.intent('Desired Price', (conv, { price }) => {
  console.log('price -------------------------------------------------------------', price);
  conv.ask('Okay, What\'s your desired date range?');
});

const getAirportDataByCity = async (city) => {
  const cityLocationResp = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${geoLocationApikey}`
  );
  const locationData = await cityLocationResp.json();
  const cityLocation = locationData.results[0].geometry.location;

  const airportLocationResp = await fetch(
    `https://apigateway.ryanair.com/pub/v1/geolocation/3/nearbyAirports?latitude=${cityLocation.lat}&longitude=${cityLocation.lng}&limit=1&apikey=${ryanairApikey}`
  );
  const airportData = await airportLocationResp.json();
  return airportData;
}

express().use(bodyParser.json(), app).listen(port);
