'use strict';

// Challenges
// 1. Ability to edit a workout
// 2. Ability to delete a workout
// 3. Abitlity to delete all workouts
// 4. Ability to sort workouts by a certain fiels
// 5. Re-build Running and Cycling objects coming from local Storage;
// 6. More realistic error and confirmation messages;
// 7. Ability to position the map to show all the workouts[very hard].
// 8. Ability to draw lines and shapes instead of just points.[very hard].
// 9. Geocode location from coordinates('Run in Faro, Portugal') [only after asynchronous javascript section]
// 10. Display weather data for workout time and place[only after asynchronouos javascript section]

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + Math.trunc(Math.random() * 100000) + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in Km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  isRunning = true;

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  isRunning = false;

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

// const run1 = new Running([12, 23], 4.5, 24, 178);
// const cycling1 = new Cycling([23, 45], 8.9, 45, 118);

// console.log(run1);
// console.log(cycling1);

class App {
  #workouts = [];
  #map;
  #mapEvnt;
  #mapZoomLevel = 13;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert('could not get your location');
      });
    }
  }
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(this.#map)
    //   .bindPopup(L.popup(popupOpt))
    //   .setPopupContent(`Workout`)
    //   .openPopup();

    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }
  _showForm(mapEvent) {
    this.#mapEvnt = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // inputType.value = 'running';
    // this._toggleElevationField();

    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _moveToPopup(evnt) {
    const workoutEl = evnt.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    workout.click();
  }

  _newWorkout(evnt) {
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const allPositive = (...inputs) => inputs.every(input => input > 0);

    evnt.preventDefault();
    // get data fromt the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvnt.latlng;
    const coords = [lat, lng];
    let newWorkout;

    // check if the data is valid
    // if activity is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // if (
      //   !Number.isFinite(distance) ||
      //   !Number.isFinite(duration) ||
      //   !Number.isFinite(cadence)
      // )
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`Inputs have to be positive numbers`);

      newWorkout = new Running(coords, distance, duration, cadence);
    }
    // if workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      newWorkout = new Cycling(coords, distance, duration, elevation);
    }

    // add new object to working array
    this.#workouts.push(newWorkout);
    console.log(this.#workouts);

    // render workout on map as marker
    this._renderWorkout(newWorkout);

    // Display marker
    this._renderWorkoutMarker(newWorkout);

    // Clear and hide the form
    this._hideForm();

    // Set local storage to all workouts;
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    const html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.isRunning ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
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
              workout.isRunning ? 'MIN/KM' : 'KM/H'
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.isRunning ? '🦶🏼' : '⛰️'
            }</span>
            <span class="workout__value">${
              workout.isRunning ? workout.cadence : workout.elevationGain
            }</span>
            <span class="workout__unit">${
              workout.isRunning ? 'SPM' : 'M'
            }</span>
          </div>
        </li>`;

    form.insertAdjacentHTML('afterend', html);
  }

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
        `${workout.isRunning ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    this.#map.setView(workout.coords, this.#mapZoomLevel);
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  static reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
// app._getPosition();
