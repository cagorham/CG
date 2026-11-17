const $ = (id) => document.getElementById(id);

const CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "❄️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm, hail", "⛈️"], 99: ["Thunderstorm, hail", "⛈️"],
};
const describe = (code) => CODES[code] || ["Unknown", "❓"];

let units = localStorage.getItem("units") || "celsius";
let lastPlace = JSON.parse(localStorage.getItem("place") || "null");

function setStatus(msg) { $("status").textContent = msg; }

async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  if (!data.results?.length) throw new Error(`No results for "${name}"`);
  const r = data.results[0];
  return { name: [r.name, r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude };
}

async function fetchWeather({ lat, lon }) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: "auto",
    temperature_unit: units,
    wind_speed_unit: units === "celsius" ? "kmh" : "mph",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("Weather request failed");
  return res.json();
}

function render(place, data) {
  const c = data.current;
  const [desc, icon] = describe(c.weather_code);
  const u = data.current_units;
  $("place").textContent = place.name;
  $("icon").textContent = icon;
  $("temp").textContent = `${Math.round(c.temperature_2m)}${u.temperature_2m}`;
  $("desc").textContent = desc;
  $("feels").textContent = `${Math.round(c.apparent_temperature)}${u.apparent_temperature}`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(c.wind_speed_10m)} ${u.wind_speed_10m}`;

  const d = data.daily;
  $("forecast").innerHTML = d.time.map((t, i) => {
    const [dd, ic] = describe(d.weather_code[i]);
    const day = new Date(t + "T00:00").toLocaleDateString(undefined, { weekday: "short" });
    return `<div class="day" title="${dd}"><div>${day}</div><span class="icon">${ic}</span>
      <div>${Math.round(d.temperature_2m_max[i])}°</div><small>${Math.round(d.temperature_2m_min[i])}°</small></div>`;
  }).join("");

  $("current").hidden = false;
  $("forecast").hidden = false;
}

async function load(place) {
  setStatus("Loading…");
  try {
    const data = await fetchWeather(place);
    render(place, data);
    lastPlace = place;
    localStorage.setItem("place", JSON.stringify(place));
    setStatus("");
  } catch (e) {
    setStatus(e.message);
  }
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  setStatus("Searching…");
  try {
    await load(await geocode(q));
  } catch (err) {
    setStatus(err.message);
  }
});

$("locate").addEventListener("click", () => {
  if (!navigator.geolocation) return setStatus("Geolocation not supported");
  setStatus("Locating…");
  navigator.geolocation.getCurrentPosition(
    (pos) => load({ name: "Your location", lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => setStatus("Unable to get location"),
  );
});

function updateUnitsButton() { $("units").textContent = units === "celsius" ? "°C" : "°F"; }
$("units").addEventListener("click", () => {
  units = units === "celsius" ? "fahrenheit" : "celsius";
  localStorage.setItem("units", units);
  updateUnitsButton();
  if (lastPlace) load(lastPlace);
});

updateUnitsButton();
if (lastPlace) load(lastPlace);
