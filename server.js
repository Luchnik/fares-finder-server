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

require('dotenv').config();

const geoLocationApikey = process.env.GEOLOCATION_API_KEY;
const ryanairApikey = process.env.RYANAIR_API_KEY;
const ryanairApiEndpoint = 'https://apigateway.ryanair.com/pub/v1/';

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
    let discoverFaresUrl = `https://www.ryanair.com/gb/en/booking/home` +
      `/${flightQueryParams.departureAirportIataCode}` +
      `/${flightQueryParams.arrivalAirportIataCode}` +
      `/${flightQueryParams.outboundDepartureDateFrom}`;

    conv.close(new SimpleResponse({ 
      text: `The cheapest fare found!`,
      speech: `The cheapest fare is ${flightsData.fares[0].summary.price.value} ${flightsData.fares[0].summary.price.currencySymbol}`,
    }));

    conv.close(new BasicCard({
      title: `The cheapest fare is ${flightsData.fares[0].summary.price.value} ${flightsData.fares[0].summary.price.currencySymbol}`,
      image: new Image({
        url: 'https://cdn.jetphotos.com/400/1/17578_1295567460.jpg',
        alt: 'RyanAir Logo'
      }),
      buttons: new Button({
        title: 'Discover Fares',
        url: discoverFaresUrl,
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
    `${ryanairApiEndpoint}geolocation/3/nearbyAirports` +
    `?latitude=${cityLocation.lat}` +
    `&longitude=${cityLocation.lng}` +
    `&limit=1&apikey=${ryanairApikey}`
  );
  const airportData = await airportLocationResp.json();
  return airportData;
};

const findFlights = async (params) => {
  let link = `${ryanairApiEndpoint}farefinder/3/oneWayFares` +
  `?departureAirportIataCode=${params.departureAirportIataCode}` +
  `&arrivalAirportIataCode=${params.arrivalAirportIataCode}` +
  `&outboundDepartureDateFrom=${params.outboundDepartureDateFrom}` +
  `&outboundDepartureDateTo=${params.outboundDepartureDateTo}` +
  `&priceValueTo=${params.priceValueTo}` +
  `&currency=${params.currency}`;

  const response = await fetch(link + `&apikey=${ryanairApikey}`);
  const data = await response.json();
  return data;
};

const formatDate = (date) => moment(date).format('YYYY-MM-DD');

express().use(bodyParser.json(), app).listen(port);
