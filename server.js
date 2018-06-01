const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const moment = require('moment');
const {
  dialogflow,
  SimpleResponse,
  BasicCard,
  Button,
  Image,
  Suggestions
} = require('actions-on-google');

const geoLocationApikey = 'AIzaSyDEfZBPpxnnX4mLiAmmXV0Yg1xBf8WkghI';
const ryanairApiEndpoint = 'https://apigateway.ryanair.com/pub/v1/';
const ryanairApikey = 'I8Q6famX1tQw9AF1V6RG07CXQFAH3iBa';

const flightQueryParams = {
  departureAirportIataCode: '',
  arrivalAirportIataCode: '',
  outboundDepartureDateFrom: '',
  outboundDepartureDateTo: '',
  priceValueTo: 0,
  currency: ''
};

const port = process.env.PORT || 4000;
const app = dialogflow();

app.intent('Default Welcome Intent', async (conv) => {
  conv.ask('Welcome to Flight Finder! What\'s your flight connection?');
});

app.intent('Flight Connection', async (conv, { departureCity, arrivalCity }) => {
  const departureAirportData = await getAirportDataByCity(departureCity);
  const arrivalAirportData = await getAirportDataByCity(arrivalCity);

  if (departureAirportData.length && arrivalAirportData.length) {
    flightQueryParams.departureAirportIataCode = departureAirportData[0].iataCode;
    flightQueryParams.arrivalAirportIataCode = arrivalAirportData[0].iataCode;
    conv.ask(`Your flight connection is ${departureCity} - ${arrivalCity}. Please choose expected price!`);
  } else {
    conv.ask('Sorry. Didn\'t find such connection! Try again with different locations.');
  }
});

app.intent('Desired Date Range', async (conv, { fromDate, toDate }) => {
  flightQueryParams.outboundDepartureDateFrom = formatDate(fromDate.startDate);
  flightQueryParams.outboundDepartureDateTo = formatDate(toDate.startDate);

  const flightsData = await findFlights(flightQueryParams);

  if (flightsData.total) {
    conv.close(new SimpleResponse({ 
      text: `${flightsData.total} ${flightsData.total > 1 ? 'fares' : 'fare'} found!`,
      speech: `I found ${flightsData.total} ${flightsData.total > 1 ? 'fares' : 'fare'} for you`,
    }));

    conv.close(new BasicCard({
      title: `Check your flight!`,
      image: new Image({
        url: 'https://cdn.jetphotos.com/400/1/17578_1295567460.jpg',
        alt: 'RyanAir Logo'
      }),
      buttons: new Button({
        title: 'Discover',
        url: 'https://www.ryanair.com/gb/en/',
      }),
    }));
  } else {
    conv.close('Sorry. Didn\'t find such connection! Try again with different parameters.');
  }
});

app.intent('Desired Price', (conv, { price }) => {
  flightQueryParams.priceValueTo = price.amount;
  flightQueryParams.currency = price.currency;
  conv.ask('Great! What\'s your desired date range?');
});

const getAirportDataByCity = async (city) => {
  const cityLocationResp = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${geoLocationApikey}`
  );
  const locationData = await cityLocationResp.json();
  const cityLocation = locationData.results[0].geometry.location;

  const airportLocationResp = await fetch(
    `${ryanairApiEndpoint}geolocation/3/nearbyAirports?latitude=${cityLocation.lat}&longitude=${cityLocation.lng}&limit=1&apikey=${ryanairApikey}`
  );
  const airportData = await airportLocationResp.json();
  return airportData;
};

const findFlights = async (params) => {
  let link = `${ryanairApiEndpoint}farefinder/3/oneWayFares`;
  link += `?departureAirportIataCode=${params.departureAirportIataCode}`;
  link += `&arrivalAirportIataCode=${params.arrivalAirportIataCode}`;
  link += `&outboundDepartureDateFrom=${params.outboundDepartureDateFrom}`;
  link += `&outboundDepartureDateTo=${params.outboundDepartureDateTo}`;
  link += `&priceValueTo=${params.priceValueTo}`;
  link += `&currency=${params.currency}`;
  const response = await fetch(link + `&apikey=${ryanairApikey}`);
  const data = await response.json();
  return data;
};

const formatDate = (date) => moment(date).format('YYYY-MM-DD');

express().use(bodyParser.json(), app).listen(port);
