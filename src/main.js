// ============== WEATHER APP ============== \\
// + GOALS
//  - if user grants location permission, set their current locations weather on load
//    -- this grabs their coordinates, searches the weather currently + the next 7 days, sets the name of the location and a photo of the location
//  - when user searches for a locations weather, we verify their search query with an autocomplete dropdown. get the coordinates for the verified search query and get weather/photo/set name of that location

"use strict";

// ============== HTML ELEMENTS ============== \\
// ELEMENTS THAT WILL RECIEVE DYNAMIC DATA
const locationEl = document.querySelector("[data-current-location]");
const dateEl = document.querySelector("[data-current-date]");
const tempEl = document.querySelector("[data-current-temp]");
const windEl = document.querySelector("[data-wind-speed]");
const humidityEl = document.querySelector("[data-humidity]");
const precipEl = document.querySelector("[data-precipitation]");
const currentWeatherIconEl = document.querySelector("[data-current-icon");
const weeklyForecastWrapperEl = document.querySelector("#forecast-week-list");

// MODAL ELEMENTS
const btnTriggerModal = document.querySelector("#search-btn-outer");
const modalEl = document.querySelector("#search-modal");
const inputSearchCity = modalEl.querySelector("#searchbar");
const btnSearchCity = modalEl.querySelector("#search-btn-modal");

// ============== API RELATED ============== \\
let lat;
let lon;
let targetCity = "London, GB";
let googlePlace = "London England";
let targetUsState;
let targetCountry;
let weatherCode;
let weeklyForecastArr = [];
let possibleCityNamesArr = [];
const messages = import.meta.env.VITE_MESSAGES;
const googlePlacesAPIKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

// ============== EVENT LISTENERS ============== \\

// when users type into the input for the dialog element call the auto complete function
inputSearchCity.addEventListener("input", () => {
  const val = inputSearchCity.value;
  if (val.length > 2) {
    verifyCityInput(inputSearchCity.value);
  } else {
    modalEl.querySelector(".options-list").innerHTML = null;
  }
});

modalEl.addEventListener("click", async (e) => {
  // if user clicks on one of the autocomplete options
  if (e.target.closest(".option")) {
    const targetLocation = e.target.closest(".option").textContent.trim();
    googlePlace = targetLocation.split(",").join(" ");
    targetCity = targetLocation.split(",")[0];
    inputSearchCity.value = targetLocation;

    const optionArr = Array.from(modalEl.querySelectorAll(".option"));
    const index = optionArr.indexOf(e.target.closest(".option"));
    lat = possibleCityNamesArr[index].geoCode.latitude;
    lon = possibleCityNamesArr[index].geoCode.longitude;

    if (!lat || !lon) {
      targetCountry = possibleCityNamesArr[index].address.countryCode;
      const stateStr = possibleCityNamesArr[index].address.stateCode;
      targetUsState = stateStr.split("-")[1];

      if (!targetUsState) {
        getCoor(true);
      } else {
        getCoor(true, true);
      }
    }

    modalEl.querySelector(".options-list").innerHTML = null;
  }

  // if user clicks the 'search button' to set the input.value as the location to get weather for
  if (e.target.closest("#search-btn-modal")) {
    modalEl.hidePopover();
    if (inputSearchCity.value) {
      const splitCity = inputSearchCity.value.split(",");
      getPlace();
      targetCity = splitCity[0] + ", " + splitCity[2];
      setText(locationEl, targetCity);
      getWeather(lat, lon);
      inputSearchCity.value = "";
    }
  }
});

// ============== API FUNCTIONS ============== \\
/// Google API- Places (New) API

// get the photo of the current place to set as background
async function getPlace() {
  try {
    const url = "https://places.googleapis.com/v1/places:searchText";
    const headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googlePlacesAPIKey,
      "X-Goog-FieldMask":
        "places.id,places.name,places.displayName,places.photos",
    };
    const dataString = `{
            'textQuery': '${googlePlace}',
        }`;
    const options = {
      method: "POST",
      headers: headers,
      body: dataString,
    };

    const req = await fetch(url, options);
    const data = await req.json();
    const name = data.places[0].photos[0].name;
    const maxWidthPx = data.places[0].photos[0].widthPx;
    const photoStr = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${
      maxWidthPx < 4800 ? maxWidthPx : 4800
    }&key=${googlePlacesAPIKey}`;
    document.body.style.setProperty("--body-bg", `url(${photoStr})`);
  } catch (err) {
    console.warn("Caught an error in getPlace: " + err.message);
  }
}

// amadeus api - for getting dropdown list when users type into input
const verifyCityInput = async (str) => {
  try {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const clientId = import.meta.env.VITE_AMADEUS_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

    const dataString = `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`;

    const options = {
      url: "https://test.api.amadeus.com/v1/security/oauth2/token",
      method: "POST",
      headers: headers,
      body: dataString,
    };

    const resp = await fetch(
      "https://test.api.amadeus.com/v1/security/oauth2/token",
      options
    );
    const data = await resp.json();
    const tokenType = data.token_type;
    const token = data.access_token;
    if (resp.ok) {
      const getHeaders = {
        Authorization: tokenType + " " + token,
        "Content-Type": "application/vnd.amadeus+json",
      };
      const getOptions = { headers: getHeaders };
      const getResp = await fetch(
        `https://test.api.amadeus.com/v1/reference-data/locations/cities?keyword=${str}&max=5`,
        getOptions
      );
      const getData = await getResp.json();
      // console.log(getData.data);
      possibleCityNamesArr = getData.data;
      populateDropdown(
        possibleCityNamesArr,
        modalEl.querySelector(".options-list")
      );
    }
  } catch (err) {
    console.warn("Catch verifyCityInput error " + err.message);
    // alert('There has been an error verifying your input')
  }
};

// get coordinates from a city name if lat/lon isnt returned from verifyCityInput()
const getCoor = async (geoCodeUndefined = false, isUsState = false) => {
  try {
    console.log(targetCity, "getCoor");
    let url = `https://api.api-ninjas.com/v1/geocoding?city=${targetCity}`;

    if (geoCodeUndefined) {
      url = `https://api.api-ninjas.com/v1/geocoding?city=${targetCity}&country=${targetCountry}`;

      if (isUsState) {
        url = `https://api.api-ninjas.com/v1/geocoding?city=${targetCity}&state=${targetUsState}&country=${targetCountry}`;
      }
    }
    const request = {
      method: "GET",
      headers: {
        "X-Api-Key": import.meta.env.VITE_API_NINJAS_KEY,
      },
    };
    const resp = await fetch(url, request);
    if (!resp.ok) {
      throw new Error("from getCoor was not a valid response");
    } else {
      const data = await resp.json();
      lat = data[0].latitude;
      lon = data[0].longitude;
    }
  } catch (err) {
    console.warn("Catch Error (getCoor) " + err.message);
    alert("Sorry, there has been an error. Please try again later");
  }
};

// get city name from lat/lon coordinates (if navigator location permission is granted on load)
const getCityName = async (lat, lon) => {
  try {
    const request = {
      method: "GET",
      headers: {
        "X-Api-Key": import.meta.env.VITE_API_NINJAS_KEY,
      },
    };
    const resp = await fetch(
      `https://api.api-ninjas.com/v1/reversegeocoding?lat=${lat}&lon=${lon}`,
      request
    );
    if (!resp.ok) {
      throw new Error("from getCityName was not a valid response");
    } else {
      const data = await resp.json();
      googlePlace = data[0].name + " " + data[0].state + " " + data[0].country;
      targetCity = data[0].name;
      getPlace();
    }
  } catch (err) {
    console.warn("Catch Error (getCityName) " + err.message);
    alert("Sorry, there has been an error. Please try again later");
  }
};

// get international weather data from lat/lon coordinates
const getWeather = async (lat, lon) => {
  try {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,showers,weather_code,wind_speed_10m&hourly=wind_speed_10m&daily=weather_code,apparent_temperature_max,apparent_temperature_min`
    );
    if (!resp.ok) {
      throw new Error("from Weather was not a valid response");
    } else {
      const data = await resp.json();
      // console.log(data);
      const temp = Math.round(data.current.temperature_2m);
      const tempUnit = data.current_units.temperature_2m;
      const humidity = data.current.relative_humidity_2m;
      const humidityUnit = data.current_units.relative_humidity_2m;
      const precip = data.current.precipitation;
      const precipUnit = data.current_units.precipitation;
      const wind = Math.round(data.current.wind_speed_10m);
      const windUnit = data.current_units.wind_speed_10m;
      weatherCode = data.current.weather_code;

      setText(locationEl, targetCity);
      setText(tempEl, temp + tempUnit);
      setText(windEl, wind + windUnit);
      setText(humidityEl, humidity + humidityUnit);
      setText(precipEl, precip + precipUnit);

      setDailyForecastHTML(data, weeklyForecastWrapperEl);
      currentWeatherIconEl.innerHTML = setWeatherIcon(weatherCode);
    }
  } catch (err) {
    console.warn("Catch Error (getWeather) " + err.message);
    alert("Sorry, there has been an error. Please try again later");
  }
};

// ============== UTILITY FUNCTIONS ============== \\
const setText = (el, val) => {
  el.textContent = val;
};

const capitalizeStr = (str) => {
  return str[0].toUpperCase() + str.slice(1);
};

// ============== INITIAL CHANGES ON LOAD ============== \\
// if user grants location permission, initialize page with their current location weather
function getUserLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((position) => {
      lat = position.coords.latitude;
      lon = position.coords.longitude;
      getCityName(lat, lon).then((resp) => {
        getWeather(lat, lon);
        getPlace();
      });
    });
  }
}

// set date on component
const getDate = (date = new Date(), dayOnly = false) => {
  let now = date;
  let options = { day: "2-digit", month: "long", year: "numeric" };
  if (dayOnly) {
    options = { weekday: "short" };
    const day = date.toLocaleDateString(undefined, options);
    return day;
  }
  const dateNowStr = now.toLocaleDateString(undefined, options);
  const dateNowArr = dateNowStr.replace(",", "").split(" ");
  return `${dateNowArr[1]} ${dateNowArr[0]}, ${dateNowArr[2]}`;
};

function setup() {
  // on load apply these styles, attributes, and change text content;
  dateEl.textContent = getDate();

  modalEl.setAttribute("popover", "");
  modalEl.style.scale = "1";
  btnTriggerModal.setAttribute("popovertarget", "search-modal");

  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerHTML = `

        .search-modal::backdrop {
            backdrop-filter: blur(5px);
            background-color: #20232852;
        }

        .options-list {
            background-color: rgb(232, 240, 254);
            border-radius: 0.5em;
        }

        .option-list.hide {
            scale: 0;
        }

        .row {
            display: flex;
            gap: 0.5em;
        }

        .option {
            list-style: none;
            padding: 0.5em;
        }

        .option:not(:first-child) {
            margin-block-start: 0.25em;
        }

        [city-option] {
            background: transparent;
            color: inherit;
            font: inherit;
            border: 0;
            outline: 0;
        }

       .option:has([city-option]:is(:hover, :focus-visible)) {
            background-color: #313941;
            color: #fff;
        }

        .option:has(:focus-within) {
            outline: 1px solid currentColor;
        }
    `;
  document.querySelector("head").appendChild(style);

  getUserLocation();
  createDropdown();
}

// ============== HTML ============== \\
// create element for the dropdown/autocomplete list
function createDropdown() {
  const ul = document.createElement("ul");
  ul.classList.add("options-list");
  modalEl.appendChild(ul);
}

// html for each dropdown item
function populateDropdown(arr, el) {
  let html = "";

  arr.forEach((i) => {
    html += `
            <li class="row option">
                <button class="row" city-option>
                    ${i.name}, ${i.address.stateCode.split("-")[1]}, ${
      i.address.countryCode
    }
                </button>
            </li>`;
  });

  el.innerHTML = html;
}

// dset weather icon (cloud, sun, rain etc) depending on the weather code returned from getWeather
function setWeatherIcon(code) {
  let html;
  if (code >= 0 && code < 3) {
    // 0 is clear, 1 & 2 are clear to partly cloudy
    html = `
             <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-sun"
                    viewBox="0 0 24 24" stroke-width="2"
                    stroke="currentColor" fill="none" stroke-linecap="round"
                    stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                    <path
                        d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
            </svg>
        `;
  } else if (code === 3) {
    //  3 is clear to partly cloudy
    html = `
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-cloud" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878" />
            </svg>
        `;
  } else if ((code > 50 && code < 66) || (code > 80 && code < 83)) {
    // rain of any kind
    html = `
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-cloud-rain" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7" />
                <path d="M11 13v2m0 3v2m4 -5v2m0 3v2" />
            </svg>
        `;
  } else if ((code > 70 && code < 78) || code == 85 || code == 86) {
    // snow of any kind
    html = `
            <svg xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler icon-tabler-cloud-snow"
                    viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7" />
                    <path d="M11 15v.01m0 3v.01m0 3v.01m4 -4v.01m0 3v.01" />
            </svg>
        `;
  } else if (code > 94 && code < 100) {
    // thunderstorms
    html = `
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-cloud-storm" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
                <path d="M13 14l-2 4l3 0l-2 4" />
            </svg>
        `;
  } else {
    html = `
        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-wind"
            viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none"
            stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24" />
            <path d="M3 12h15.5a2.5 2.5 0 1 1 -2.34 3.24" />
            <path d="M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24" />
        </svg>
        `;
  }

  return html;
}

// set 7 day forecast html for each
function setDailyForecastHTML(item, el) {
  let html = "";
  for (let i = 0; i < 6; i++) {
    html += `
        <div class="card-layout">
                <p day-date>${getDate(
                  new Date(item.daily.time[i] + " "),
                  true
                )}</p>
                <div day-icon style="width: 34px; height: 34px;">
                    ${setWeatherIcon(item.daily.weather_code[i])}
                </div>
                <div class="forecast-temperatures-container">
                    <span day-temp-min>${Math.round(
                      item.daily.apparent_temperature_min[i]
                    )}&deg;</span> | <span day-temp-max>${Math.round(
      item.daily.apparent_temperature_max[i]
    )}&deg;</span>
                </div>
        </div>
        `;
  }
  el.innerHTML = html;
}

function init() {
  setup();
}

init();
