// Replace with your OpenWeatherMap API key
const apiKey = "83f669a8d48672eb49743c2ff7c41a7c"; // <-- put your API key here

// Get references to DOM elements
const form = document.querySelector("form");
const placeInput = document.getElementById("place");
const degree = document.querySelector(".degree");
const weatherDesc = document.querySelector(".weather p");
const placeName = document.querySelector(".place-name h2");
const humidity = document.querySelectorAll(".detail p")[0];
const wind = document.querySelectorAll(".detail p")[1];
const rainfall = document.querySelectorAll(".detail p")[2];
const uvIndex = document.querySelectorAll(".detail p")[3];
const sunrise = document.querySelectorAll(".detail p")[4];
const sunset = document.querySelectorAll(".detail p")[5];

// Format time for sunrise/sunset
function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Fetch weather data
async function getWeather(place) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${place}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === "404") {
      alert("City not found. Please enter a valid city name.");
      return;
    }

    console.log(data); // Debug: View full API response

    // Update DOM with weather data
    placeName.textContent = `Current Weather in ${data.name}, ${data.sys.country}`;
    degree.innerHTML = `${Math.round(data.main.temp)}&deg;C`;
    weatherDesc.textContent = data.weather[0].description
      .split(" ")
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    humidity.textContent = `${data.main.humidity}%`;
    wind.textContent = `${data.wind.speed} km/h`;
    rainfall.textContent = data.rain ? `${data.rain["1h"]} mm` : `0 mm`;
    uvIndex.textContent = "N/A (Basic API plan)"; // Needs One Call API for real UV data
    sunrise.textContent = formatTime(data.sys.sunrise);
    sunset.textContent = formatTime(data.sys.sunset);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert("Something went wrong. Please check your connection.");
  }
}

// Form submit handler
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const place = placeInput.value.trim();

  if (place === "") {
    alert("Please enter a city or zip code.");
    return;
  }

  getWeather(place);
});
