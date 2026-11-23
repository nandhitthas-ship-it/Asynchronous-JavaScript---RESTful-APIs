const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");

const weatherCodes = {
  0: { description: "Clear sky", icon: "☀️", nightIcon: "🌙" },
  1: { description: "Mainly clear", icon: "🌤️", nightIcon: "🌙" },
  2: { description: "Partly cloudy", icon: "⛅", nightIcon: "☁️" },
  3: { description: "Overcast", icon: "☁️", nightIcon: "☁️" },
  45: { description: "Foggy", icon: "🌫️", nightIcon: "🌫️" },
  48: { description: "Depositing rime fog", icon: "🌫️", nightIcon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌦️", nightIcon: "🌧️" },
  53: { description: "Drizzle", icon: "🌦️", nightIcon: "🌧️" },
  55: { description: "Heavy drizzle", icon: "🌧️", nightIcon: "🌧️" },
  56: { description: "Light freezing drizzle", icon: "🌧️", nightIcon: "🌧️" },
  57: { description: "Freezing drizzle", icon: "🌧️", nightIcon: "🌧️" },
  61: { description: "Light rain", icon: "🌦️", nightIcon: "🌧️" },
  63: { description: "Rain", icon: "🌧️", nightIcon: "🌧️" },
  65: { description: "Heavy rain", icon: "🌧️", nightIcon: "🌧️" },
  66: { description: "Light freezing rain", icon: "🌧️", nightIcon: "🌧️" },
  67: { description: "Freezing rain", icon: "🌧️", nightIcon: "🌧️" },
  71: { description: "Light snow", icon: "🌨️", nightIcon: "🌨️" },
  73: { description: "Snow", icon: "🌨️", nightIcon: "🌨️" },
  75: { description: "Heavy snow", icon: "❄️", nightIcon: "❄️" },
  77: { description: "Snow grains", icon: "🌨️", nightIcon: "🌨️" },
  80: { description: "Light rain showers", icon: "🌦️", nightIcon: "🌧️" },
  81: { description: "Rain showers", icon: "🌧️", nightIcon: "🌧️" },
  82: { description: "Violent rain showers", icon: "⛈️", nightIcon: "⛈️" },
  85: { description: "Light snow showers", icon: "🌨️", nightIcon: "🌨️" },
  86: { description: "Heavy snow showers", icon: "❄️", nightIcon: "❄️" },
  95: { description: "Thunderstorm", icon: "⛈️", nightIcon: "⛈️" },
  96: { description: "Thunderstorm with hail", icon: "⛈️", nightIcon: "⛈️" },
  99: { description: "Thunderstorm with heavy hail", icon: "⛈️", nightIcon: "⛈️" },
};

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  form.classList.toggle("is-loading", isLoading);
  form.setAttribute("aria-busy", String(isLoading));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather service returned an error (${response.status}). Please try again.`);
  }
  return response.json();
}

function formatLocalTime(time) {
  if (typeof time !== "string" || !time.includes("T")) {
    return "Local time unavailable";
  }
  const [date, clock] = time.split("T");
  return `${clock.slice(0, 5)} · ${date}`;
}

function displayWeather(place, data) {
  const current = data.current;
  const requiredValues = [
    current?.temperature_2m,
    current?.relative_humidity_2m,
    current?.apparent_temperature,
    current?.wind_speed_10m,
    current?.precipitation,
    current?.weather_code,
  ];

  if (requiredValues.some((value) => !Number.isFinite(value))) {
    throw new Error("The weather service returned incomplete data. Please try again.");
  }

  const condition = weatherCodes[current.weather_code] ?? {
    description: "Conditions unavailable",
    icon: "🌡️",
    nightIcon: "🌡️",
  };
  const isNight = current.is_day === 0;

  document.querySelector("#location-name").textContent = place.name;
  document.querySelector("#location-meta").textContent = [place.admin1, place.country]
    .filter((part, index, parts) => part && parts.indexOf(part) === index)
    .join(" · ");
  document.querySelector("#local-time").textContent = formatLocalTime(current.time);
  document.querySelector("#weather-symbol").textContent = isNight ? condition.nightIcon : condition.icon;
  document.querySelector("#weather-description").textContent = condition.description;
  document.querySelector("#temperature").textContent = Math.round(current.temperature_2m);
  document.querySelector("#feels-like").textContent =
    `Feels like ${Math.round(current.apparent_temperature)}°`;
  document.querySelector("#humidity").textContent = Math.round(current.relative_humidity_2m);
  document.querySelector("#wind-speed").textContent = Math.round(current.wind_speed_10m);
  document.querySelector("#precipitation").textContent = Number(current.precipitation).toFixed(1);
  document.querySelector("#updated-time").textContent = `Updated ${formatLocalTime(current.time)}`;
}

async function searchWeather(city) {
  const locationUrl = new URL(GEOCODING_API);
  locationUrl.search = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });

  const locationData = await fetchJson(locationUrl);
  const place = locationData.results?.[0];
  if (!place) {
    throw new Error(`We couldn't find "${city}". Check the spelling and try again.`);
  }

  const weatherUrl = new URL(API_BASE);
  weatherUrl.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    timezone: "auto",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  });

  const weatherData = await fetchJson(weatherUrl);
  displayWeather(place, weatherData);
  statusMessage.textContent = "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    statusMessage.textContent = "Enter a city name to search.";
    cityInput.focus();
    return;
  }

  setLoading(true);
  statusMessage.textContent = "";
  try {
    await searchWeather(city);
  } catch (error) {
    statusMessage.textContent =
      error instanceof TypeError
        ? "Unable to connect to the weather service. Check your internet connection and try again."
        : error.message;
  } finally {
    setLoading(false);
  }
});

searchWeather("London").catch((error) => {
  document.querySelector("#location-name").textContent = "Find your forecast";
  document.querySelector("#location-meta").textContent = "";
  document.querySelector("#weather-description").textContent = "Search for a city to get started";
  statusMessage.textContent =
    error instanceof TypeError
      ? "Unable to connect to the weather service. Check your internet connection and try again."
      : error.message;
});
