// Replace with your OpenWeatherMap API key
const apiKey = "83f669a8d48672eb49743c2ff7c41a7c"; // <-- keep your API key here

// Get references to DOM elements (use lab-required IDs)
const form = document.getElementById("search-form") || document.querySelector("form");
const placeInput = document.getElementById("city-input") || document.getElementById("place");
const temperatureEl = document.getElementById("temperature") || document.querySelector(".degree");
const weatherDescEl = document.getElementById("weather-description") || document.querySelector(".weather p");
const placeNameEl = document.getElementById("city-name") || document.querySelector(".place-name h2");
const humidityEl = document.getElementById("humidity") || (document.querySelectorAll(".detail p")[0] ?? null);
const windEl = document.getElementById("wind") || (document.querySelectorAll(".detail p")[1] ?? null);
const rainfallEl = document.getElementById("rainfall") || (document.querySelectorAll(".detail p")[2] ?? null);
const uvEl = document.getElementById("uv") || (document.querySelectorAll(".detail p")[3] ?? null);
const sunriseEl = document.getElementById("sunrise") || (document.querySelectorAll(".detail p")[4] ?? null);
const sunsetEl = document.getElementById("sunset") || (document.querySelectorAll(".detail p")[5] ?? null);
const weatherIconEl = document.getElementById("weather-icon");
const errorEl = document.getElementById("error");

// Format time for sunrise/sunset
function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Helper: clear previous error
function clearError() {
  if (errorEl) errorEl.textContent = "";
}

// Fetch weather data
async function getWeather(place) {
  try {
    clearError();
    if (!place) {
      if (errorEl) errorEl.textContent = "Please enter a city or zip code.";
      return;
    }

    // Use metric units (°C and m/s)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(place)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      // handle 404 and other HTTP errors
      if (response.status === 404) {
        if (errorEl) errorEl.textContent = "City not found. Please enter a valid city name.";
        return;
      } else {
        if (errorEl) errorEl.textContent = "Unable to fetch weather — server error.";
        return;
      }
    }

    const data = await response.json();

    // Safety: check data payload
    if (!data || !data.main) {
      if (errorEl) errorEl.textContent = "Unexpected response from weather server.";
      return;
    }

    // Update DOM with weather data
    if (placeNameEl) placeNameEl.textContent = `Current Weather in ${data.name}${data.sys && data.sys.country ? ", " + data.sys.country : ""}`;
    if (temperatureEl) temperatureEl.innerHTML = `${Math.round(data.main.temp)}&deg;C`;
    if (weatherDescEl) {
      const desc = data.weather?.[0]?.description || "";
      // capitalize each word
      weatherDescEl.textContent = desc.split(" ").map(w => w ? (w[0].toUpperCase() + w.slice(1)) : "").join(" ");
    }
    if (humidityEl) humidityEl.textContent = `${data.main.humidity}%`;
    // OpenWeather gives wind speed in m/s when units=metric
    if (windEl) windEl.textContent = `${data.wind?.speed ?? "--"} m/s`;
    if (rainfallEl) rainfallEl.textContent = data.rain ? `${data.rain["1h"] ?? data.rain["3h"] ?? 0} mm` : `0 mm`;
    if (uvEl) uvEl.textContent = "N/A (requires One Call API)"; // lab note
    if (sunriseEl) sunriseEl.textContent = formatTime(data.sys.sunrise);
    if (sunsetEl) sunsetEl.textContent = formatTime(data.sys.sunset);

    // Insert weather icon (if #weather-icon exists)
    const iconCode = data.weather?.[0]?.icon;
    if (weatherIconEl) {
      weatherIconEl.innerHTML = "";
      if (iconCode) {
        const img = document.createElement("img");
        img.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        img.alt = data.weather?.[0]?.description || "weather icon";
        img.width = 64;
        img.height = 64;
        weatherIconEl.appendChild(img);
      }
    }

  } catch (error) {
    console.error("Error fetching weather data:", error);
    if (errorEl) errorEl.textContent = "Something went wrong. Please check your connection.";
  }
}

// Form submit handler
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const place = (placeInput?.value || "").trim();
    if (!place) {
      if (errorEl) errorEl.textContent = "Please enter a city or zip code.";
      return;
    }
    getWeather(place);
  });
} else {
  // fallback: if no form id, listen on document forms (keeps behavior safe)
  document.querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const place = (placeInput?.value || "").trim();
    if (!place) {
      if (errorEl) errorEl.textContent = "Please enter a city or zip code.";
      return;
    }
    getWeather(place);
  });
}

// Load a default city when the page loads (lab sample: Kochi)
document.addEventListener("DOMContentLoaded", () => {
  const defaultCity = "Kochi";
  if (placeInput) placeInput.value = defaultCity;
  getWeather(defaultCity);
});
