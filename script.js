let map;
let geocoder;
let allHospitals = [];
let activeMarkers = [];

async function loadHospitals() {
  try {
    const response = await fetch('hospitals.json');
    allHospitals = await response.json();
    console.log(`✅ Loaded hospitals: ${allHospitals.length}`);
  } catch (err) {
    console.error('❌ Failed to load hospitals:', err);
  }
}

function initMap() {
  geocoder = new google.maps.Geocoder();
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 54.0, lng: -2.0 },
    zoom: 6,
  });

  loadHospitals();

  document.getElementById('search-button').addEventListener('click', (e) => {
    e.preventDefault();
    performSearch();
  });
}

function performSearch() {
  const postcode = document.getElementById('postcode-search').value.trim();
  const radiusInMiles = parseInt(document.getElementById('radius-select').value, 10);

  if (!postcode) {
    alert('Please enter a postcode or town.');
    return;
  }

  geocoder.geocode({ address: postcode, region: 'UK' }, (results, status) => {
    if (status === 'OK' && results.length > 0) {
      const userLocation = results[0].geometry.location;
      const locationName = results[0].formatted_address.split(',')[0];
      map.panTo(userLocation);
      map.setZoom(11);
      console.log("User's search location:", userLocation.toString());
      findHospitalsNearby(userLocation, radiusInMiles, locationName);
    } else {
      alert('Could not find that location. Please try again.');
      console.error('Geocode failed:', status);
    }
  });
}

function updateResultsHeader(locationName) {
  const headerContainer = document.getElementById('results-header');
  if (headerContainer) {
    const headerText = `HOSPITALS NEAR ${locationName.toUpperCase()}`;
    const subParagraphText = "You can receive treatment at a hospital/medical facility listed on your selected Hospital Directory. Your search result is as follows:";
    headerContainer.innerHTML = `<h2>${headerText}</h2><p>${subParagraphText}</p>`;
  }
}

function findHospitalsNearby(userLocation, radiusInMiles, locationName) {
  clearMarkers();
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.innerHTML = '';
  updateResultsHeader(locationName);

  const radiusInMeters = radiusInMiles * 1609.34;
  let hospitalsInRange = [];

  allHospitals.forEach(hospital => {
    if (!hospital.lat || !hospital.lng) return;
    const hospitalLoc = new google.maps.LatLng(hospital.lat, hospital.lng);
    const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(userLocation, hospitalLoc);
    if (distanceMeters <= radiusInMeters) {
      hospitalsInRange.push({ ...hospital, distanceMeters });
    }
  });

  hospitalsInRange.sort((a, b) => a.distanceMeters - b.distanceMeters);

  if (hospitalsInRange.length === 0) {
    resultsContainer.innerHTML = '<p>No hospitals found within that radius.</p>';
    return;
  }

  hospitalsInRange.forEach(h => {
    const hospitalLoc = new google.maps.LatLng(h.lat, h.lng);
    addMarker(h, hospitalLoc);
    addResultToList(h, h.distanceMeters);
  });
}

function addMarker(hospital, location) {
  const marker = new google.maps.Marker({
    map,
    position: location,
    title: hospital.name,
  });

  const infowindow = new google.maps.InfoWindow({
    content: `<strong>${hospital.name}</strong><br>${hospital.address}`,
  });

  marker.addListener('click', () => infowindow.open(map, marker));
  activeMarkers.push(marker);
}

function clearMarkers() {
  activeMarkers.forEach(marker => marker.setMap(null));
  activeMarkers = [];
}

function addResultToList(hospital, distanceMeters) {
  const distanceMiles = (distanceMeters / 1609.34).toFixed(1);
  const resultsContainer = document.getElementById('results-container');

  const phoneHTML = hospital.phone ? `<p><strong>Phone:</strong> <a href="tel:${hospital.phone.replace(/\s+/g, '')}">${hospital.phone}</a></p>` : '';
  const websiteHTML = hospital.website && hospital.website.startsWith('http') ? `<p><a href="${hospital.website}" target="_blank" rel="noopener">Visit Website</a></p>` : '';

  const typeLabel = hospital.type && hospital.type.toLowerCase().includes('private') ? 'Private' : 'NHS';

  const html = `
    <div class="hospital-result-item">
      <h4>${hospital.name}</h4>
      <p>${hospital.address}</p>
      <p><strong>Type:</strong> ${typeLabel}</p>
      <p><strong>Distance:</strong> ${distanceMiles} miles</p>
      ${phoneHTML}
      ${websiteHTML}
    </div>
  `;

  resultsContainer.innerHTML += html;
}
