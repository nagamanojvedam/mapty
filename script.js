"use strict";

// -------------------------------------
// Feature Challenges (for further dev)
// -------------------------------------
/*
1. Ability to edit a workout
2. Ability to delete a workout
3. Ability to delete all workouts
4. Ability to sort workouts by a certain field
5. Re-build Running and Cycling objects from localStorage
6. More realistic error and confirmation messages
7. Ability to position the map to show all the workouts [advanced]
8. Ability to draw lines/shapes instead of just points [advanced]
9. Geocode location from coordinates ('Run in Faro, Portugal') [post async JS]
10. Display weather data for workout time and place [post async JS]
*/

// -------------------------------------
// DOM ELEMENTS
// -------------------------------------

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

// -------------------------------------
// Workout Base Class
// -------------------------------------

class Workout {
  // Default properties
  date = new Date();
  id = (Date.now() + Math.trunc(Math.random() * 100_000) + "").slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // Create description based on type and date
  _setDescription() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  // Increment click count (for future gamification)
  click() {
    this.clicks++;
  }
}

// -------------------------------------
// Running Workout Class (inherits from Workout)
// -------------------------------------

class Running extends Workout {
  type = "running";
  isRunning = true;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Calculate pace in min/km
  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

// -------------------------------------
// Cycling Workout Class (inherits from Workout)
// -------------------------------------

class Cycling extends Workout {
  type = "cycling";
  isRunning = false;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  // Calculate speed in km/h
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

// -------------------------------------
// Main App Class
// -------------------------------------

class App {
  #workouts = []; // Private: stores all workout instances
  #map; // Leaflet map instance
  #mapEvnt; // Map click event (lat/lng for new workout)
  #mapZoomLevel = 13; // Default map zoom

  constructor() {
    // Get user's current geographical position
    this._getPosition();

    // Load workouts from local storage
    this._getLocalStorage();

    // Set up event listeners for form and map
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  // Use browser geolocation to get position
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
        alert("Could not get your location")
      );
    }
  }

  // Initialize and display the map
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.#map);

    // Display form on map click
    this.#map.on("click", this._showForm.bind(this));

    // Render existing workout markers
    this.#workouts.forEach((workout) => {
      this._renderWorkoutMarker(workout);
    });
  }

  // Show form at map click position
  _showForm(mapEvent) {
    this.#mapEvnt = mapEvent;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  // Hide form and reset input fields
  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    // Wait and reset to grid for CSS animation
    setTimeout(() => {
      form.style.display = "grid";
    }, 1000);
  }

  // Toggle between cadence and elevation fields
  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  // Move map to workout marker when clicked in workout list
  _moveToPopup(evnt) {
    const workoutEl = evnt.target.closest(".workout");
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (workout) => workout.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // Count the movement as a click
    workout.click();
  }

  // Handle new workout creation from form
  _newWorkout(evnt) {
    evnt.preventDefault();

    // Helper functions for validation
    const validInputs = (...inputs) => inputs.every((i) => Number.isFinite(i));
    const allPositive = (...inputs) => inputs.every((i) => i > 0);

    // Gather data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvnt.latlng;
    const coords = [lat, lng];
    let newWorkout;

    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs have to be positive numbers");
      newWorkout = new Running(coords, distance, duration, cadence);
    }

    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs have to be positive numbers");
      newWorkout = new Cycling(coords, distance, duration, elevation);
    }

    // Add workout to internal array
    this.#workouts.push(newWorkout);

    // Render workout in the list and map marker
    this._renderWorkout(newWorkout);
    this._renderWorkoutMarker(newWorkout);

    // Hide and reset form
    this._hideForm();

    // Persist to local storage
    this._setLocalStorage();
  }

  // Render workout in the sidebar list
  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.isRunning ? "🏃‍♂️" : "🚴‍♀️"}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout.isRunning ? workout.pace : workout.speed
          }</span>
          <span class="workout__unit">${
            workout.isRunning ? "MIN/KM" : "KM/H"
          }</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${workout.isRunning ? "🦶🏼" : "⛰️"}</span>
          <span class="workout__value">${
            workout.isRunning ? workout.cadence : workout.elevationGain
          }</span>
          <span class="workout__unit">${workout.isRunning ? "SPM" : "M"}</span>
        </div>
      </li>
    `;
    form.insertAdjacentHTML("afterend", html);
  }

  // Drop a marker on the map for this workout
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.isRunning ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
    this.#map.setView(workout.coords, this.#mapZoomLevel);
  }

  // Load all workouts from localStorage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach((workout) => this._renderWorkout(workout));
  }

  // Persist all workouts to localStorage
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  // Static method to clear all workouts (optional utility)
  static reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

// -------------------------------------
// Instantiate the app
// -------------------------------------
const app = new App();
