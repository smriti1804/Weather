// Replace with your OpenWeatherMap API key
const apiKey = "2cfcff55e0af1813d4a96e3604a42d72"; // <-- keep your API key here

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

/**
 * Fallback: uses 5-day / 3-hour forecast and picks near-midday entries for next 3 days.
 */
async function getForecastFallback(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn("Fallback forecast fetch failed:", resp.status);
      return;
    }
    const data = await resp.json();
    const list = data.list || [];

    // group entries by date (YYYY-MM-DD)
    const groups = {};
    list.forEach(item => {
      const dateKey = new Date(item.dt * 1000).toISOString().split("T")[0];
      groups[dateKey] = groups[dateKey] || [];
      groups[dateKey].push(item);
    });

    // pick next 3 distinct future date keys
    const keys = Object.keys(groups).sort();
    const todayKey = new Date().toISOString().split("T")[0];
    const futureKeys = keys.filter(k => k !== todayKey).slice(0, 3);

    const container = document.querySelector(".forecast-days");
    if (!container) return;
    container.innerHTML = "";

    futureKeys.forEach(k => {
      const dayEntries = groups[k];
      // choose entry closest to 12:00
      let chosen = dayEntries.reduce((best, cur) => {
        const curHour = new Date(cur.dt * 1000).getHours();
        const bestHour = new Date(best.dt * 1000).getHours();
        return Math.abs(curHour - 12) < Math.abs(bestHour - 12) ? cur : best;
      }, dayEntries[0]);

      const dt = new Date(chosen.dt * 1000);
      const weekday = dt.toLocaleDateString(undefined, { weekday: "short" });
      const date = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const icon = chosen.weather?.[0]?.icon;
      const desc = chosen.weather?.[0]?.description || "";
      const temp = Math.round(chosen.main.temp);

      const card = document.createElement("div");
      card.className = "day-card";
      // <<< Minimal change: added Lat/Lon display for fallback cards
      card.innerHTML = `
        <div class="day-date">${weekday}, ${date}</div>
        <div class="day-weather-icon">
          ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">` : ""}
        </div>
        <div class="day-temperature">${temp}&deg;C</div>
        <div class="day-description">${desc}</div>
        <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.8);">
          Lat: ${lat} · Lon: ${lon}
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error in fallback forecast:", err);
  }
}

/**
 * Fetch and display 3-day forecast using One Call (daily).
 * If One Call fails or doesn't return daily data, automatically fall back to the 5-day forecast.
 */
async function getForecast(lat, lon) {
  if (!lat || !lon) return;
  try {
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&units=metric&appid=${apiKey}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      // If One Call is blocked by plan (401/403) or other error, fall back
      console.warn("One Call fetch status:", resp.status);
      // try fallback
      await getForecastFallback(lat, lon);
      return;
    }

    const data = await resp.json();

    // If daily data is missing or too short, fallback
    if (!data.daily || data.daily.length < 4) {
      await getForecastFallback(lat, lon);
      return;
    }

    const days = data.daily.slice(1, 4); // next 3 days
    const container = document.querySelector(".forecast-days");
    if (!container) return;
    container.innerHTML = "";

    days.forEach(day => {
      const dt = new Date(day.dt * 1000);
      const weekday = dt.toLocaleDateString(undefined, { weekday: "short" });
      const date = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const icon = day.weather?.[0]?.icon;
      const desc = day.weather?.[0]?.description || "";
      const tempDay = typeof day.temp?.day === "number" ? Math.round(day.temp.day) : "--";

      const card = document.createElement("div");
      card.className = "day-card";
      // <<< Minimal change: added Lat/Lon display for One Call cards
      card.innerHTML = `
        <div class="day-date">${weekday}, ${date}</div>
        <div class="day-weather-icon">
          ${icon ? `<img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}">` : ""}
        </div>
        <div class="day-temperature">${tempDay}&deg;C</div>
        <div class="day-description">${desc}</div>
        <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.8);">
          Lat: ${lat} · Lon: ${lon}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error getting forecast:", err);
    // on error, try fallback once
    await getForecastFallback(lat, lon);
  }
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

    // --- NEW: fetch 3-day forecast using coordinates (Lab 7) ---
    if (data.coord && data.coord.lat && data.coord.lon) {
      getForecast(data.coord.lat, data.coord.lon);
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

/* =========================
   Lab 10 additions (minimal)
   - fetchWeatherData(latitude, longitude) returns simulated 3-day forecast including lat/lon
   - DOMContentLoaded now calls this to render lab-specific output
   ========================= */

// Lab10: fetchWeatherData(latitude, longitude) — returns array of 3 simulated forecast objects
function fetchWeatherData(latitude, longitude) {
  const weatherConditions = ["Sunny", "Cloudy", "Partly Cloudy", "Rainy", "Thunderstorm", "Foggy"];
  const forecast = [];
  const currentDate = new Date();

  for (let i = 1; i <= 3; i++) {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();

    const temperature = Math.round(Math.random() * 12 + 18); // 18-30°C random example
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const humidityVal = Math.round(Math.random() * 50 + 30); // 30-80%

    forecast.push({
      date: `${month}/${day}/${year}`,
      temperature: temperature,
      condition: condition,
      humidity: `${humidityVal}%`,
      latitude: latitude,
      longitude: longitude
    });
  }

  return forecast;
}

/* =========================
   DOMContentLoaded: default city + Lab9/Lab10 simulation with Lab11 error handling
   - getUserLocation() simulates geolocation and can throw
   - generateWeatherForecast() now validates city and may throw
   ========================= */

// Simulated geolocation with error possibility (Lab 11 Task 2)
function getUserLocation() {
  const isLocationAvailable = Math.random() > 0.2; // 80% success chance
  if (!isLocationAvailable) {
    // Simulate geolocation failure
    throw new Error("Failed to detect location. Geolocation data is unavailable.");
  }
  // Return a sample location (lab examples often use New York)
  return { latitude: 40.7128, longitude: -74.0060 };
}

// Load a default city when the page loads (lab sample: Guwahati)
document.addEventListener("DOMContentLoaded", () => {
  const defaultCity = "Guwahati";
  if (placeInput) placeInput.value = defaultCity;
  getWeather(defaultCity);

  /* =========================
     Lab 9/10/11: Simulated Geolocation + render simulated forecast using fetchWeatherData()
     Now wrapped in try/catch per Lab 11 requirements so errors are handled gracefully
     ========================= */

  try {
    // Try to get simulated user location (may throw)
    const simulatedLocation = getUserLocation();

    // Generate lab forecast using the Lab10 function (includes lat/lon)
    const labForecast = fetchWeatherData(simulatedLocation.latitude, simulatedLocation.longitude);
    console.log("Lab10 simulated forecast (with coords):", labForecast);

    const container = document.querySelector(".forecast-days");
    if (container) {
      container.innerHTML = ""; // clear previous
      labForecast.forEach(day => {
        const card = document.createElement("div");
        card.className = "day-card";
        card.innerHTML = `
          <div class="day-date">${day.date}</div>
          <div class="day-weather-icon">
            <div style="width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);color:#fff;font-weight:700;">
              ${day.condition.split(" ").map(w=>w[0]).join("")}
            </div>
          </div>
          <div class="day-temperature">${day.temperature}&deg;C</div>
          <div class="day-description">${day.condition}</div>
          <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.8);">
            Lat: ${day.latitude} · Lon: ${day.longitude} · Humidity: ${day.humidity}
          </div>
        `;
        container.appendChild(card);
      });
    }

    // Clear any previous error message
    if (errorEl) errorEl.textContent = "";

  } catch (err) {
    // Lab11: handle geolocation or forecast generation errors gracefully
    console.error("Lab11 error:", err.message);
    if (errorEl) {
      errorEl.textContent = `Error: ${err.message}`;
    }
    // Do not rethrow; allow user to still use the search form etc.
  }
});

/* =========================
   Lab 8: Simulating the 3-Day Forecast
   (your existing generator kept for compatibility)
   ========================= */

function randomBetween(min, max, decimals = 0) {
  const val = Math.random() * (max - min) + min;
  return decimals ? Number(val.toFixed(decimals)) : Math.round(val);
}

/**
 * generateWeatherForecast(city, latitude, longitude)
 * Returns an array of 3 forecast objects for the next 3 days.
 * Each object: { city, date, temperature, condition, humidity, wind, rainfall, uvIndex, latitude, longitude }
 *
 * NOTE: Lab11 Task1 — this function now validates the city parameter (throws on invalid)
 */
function generateWeatherForecast(city = "", latitude = null, longitude = null) {
  // Lab11 Task1: validate city
  if (typeof city !== "string" || city.trim() === "") {
    throw new Error("Invalid city name. Please provide a valid city.");
  }

  const weatherConditions = [
    "Sunny", "Cloudy", "Partly Cloudy", "Rainy", "Thunderstorm", "Foggy"
  ];

  const baseTemp = randomBetween(15, 30); // base temp for simulation
  const forecast = [];
  const currentDate = new Date();

  for (let i = 1; i <= 3; i++) {
    const dt = new Date(currentDate);
    dt.setDate(currentDate.getDate() + i);
    const month = dt.getMonth() + 1;
    const day = dt.getDate();
    const isoDate = `${month}/${day}/${dt.getFullYear()}`;

    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

    let humidity = randomBetween(35, 85);
    if (/Rain|Thunder|Fog/i.test(condition)) humidity = randomBetween(65, 95);

    let tempDelta = randomBetween(-6, 6);
    if (humidity > 75) tempDelta -= randomBetween(0, 3);
    const temperature = Math.round(baseTemp + tempDelta);

    let wind = randomBetween(1, 6, 1); // m/s
    if (/Thunder|Storm/i.test(condition)) wind = randomBetween(6, 12, 1);

    let rainfall = 0;
    if (/Rain|Thunder/i.test(condition)) rainfall = randomBetween(2, 32, 1);

    let uvIndex = randomBetween(2, 8);
    if (/Cloud|Rain|Fog/i.test(condition)) uvIndex = randomBetween(0, 5);

    forecast.push({
      city: city || "Unknown",
      date: isoDate,
      temperature: temperature,
      condition: condition,
      humidity: `${humidity}%`,
      wind: `${wind} m/s`,
      rainfall: `${rainfall} mm`,
      uvIndex: uvIndex,
      latitude: latitude,
      longitude: longitude
    });
  }

  return forecast;
}

/**
 * simulateAndRender(city, latitude, longitude)
 * - Calls generateWeatherForecast() and renders into .forecast-days (if present)
 * - Also returns the generated array (useful for console / practical file)
 *
 * Note: this function can throw if city is invalid (Lab11). Caller should wrap in try/catch.
 */
function simulateAndRender(city = "", latitude = null, longitude = null) {
  const data = generateWeatherForecast(city, latitude, longitude);
  console.log("Simulated 3-day forecast for", city, data);

  const container = document.querySelector(".forecast-days");
  if (!container) return data; // if UI not present, just return the array

  container.innerHTML = ""; // clear existing cards

  data.forEach(day => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-date">${day.date}</div>
      <div class="day-weather-icon">
        <div style="width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);color:#fff;font-weight:700;">
          ${day.condition.split(" ").map(w=>w[0]).join("")}
        </div>
      </div>
      <div class="day-temperature">${day.temperature}&deg;C</div>
      <div class="day-description">${day.condition}</div>
      <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.8);">
        Lat: ${day.latitude} · Lon: ${day.longitude} · Humidity: ${day.humidity} · Wind: ${day.wind} · UV: ${day.uvIndex}
      </div>
    `;
    container.appendChild(card);
  });

  return data;
}
