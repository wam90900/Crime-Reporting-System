$(document).ready(function() {
    // Initialize the map centered on Oman
    const map = L.map('map').setView([23.588, 58.3829], 6); // Center on Oman

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    // Create a custom red marker icon without a shadow
    const redMarkerIcon = L.icon({
        iconUrl: 'image/push-pin_9071932.png',
        iconSize: [40, 50],
        iconAnchor: [15, 50],
        popupAnchor: [2, -36],
        shadowUrl: null,
    });

    let selectedMarker; // Declare selectedMarker variable
    let crimeReports = JSON.parse(localStorage.getItem('crimeReports')) || [];
    let initialCrimeReports = []; // Initialize for use later

    // Load existing crime data from JSON
    fetch('crime_data.json')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load JSON');
        return response.json();
    })
    .then(data => {
        initialCrimeReports.push(...data.crimes);
        addMarkers(initialCrimeReports);
    })
    .catch(error => console.error('Error loading crime data:', error));

    // Show the crime reporting form and reset the form fields
    $('#reportCrimeBtn').click(function() {
        $('#crimeForm').toggle();
    });

    // Handle form submission
    $('#form').submit(handleFormSubmission);

    // Filter functionality
    $('.filter input').change(filterMarkers);

    // Search functionality
    $('#searchBar').on('input', function() {
        const query = $(this).val().toLowerCase();
        const idRegex = /^[0-9]{5,15}$/; // Regular expression for ID validation

        // Combine both datasets for searching
        const combinedReports = [...initialCrimeReports, ...crimeReports];

        // Filter combinedReports based on the query
        const filteredReports = combinedReports.filter(report => {
            const matchesCrimeType = report.crime_type.toLowerCase().includes(query);
            const matchesDate = report.report_date_time.includes(query);
            const matchesId = idRegex.test(query) && report.id.toString().includes(query);
            return matchesCrimeType || matchesDate || matchesId;
        });

        // Clear existing markers and add filtered reports
        clearMarkers();
        addMarkers(filteredReports);
    }).fail(function() {
        console.error("Error loading JSON data.");
    });

    // Function to add markers to the map
    function addMarkers(reports) {
        reports.forEach(crime => {
            const marker = L.marker([crime.latitude, crime.longitude]).addTo(map);
            marker.bindPopup(createPopupContent(crime));
        });
    }

    // Function to create popup content for markers
    function createPopupContent(crime) {
        return `
            <div class="popup-content">
                <strong>Report Details:</strong> ${crime.report_details}<br>
                <strong>Crime Type:</strong> ${crime.crime_type}<br>
                <strong>Report Date & Time:</strong> ${crime.report_date_time.replace(/-/g, ':')}<br>
                <strong>Report Status:</strong> ${crime.report_status}
            </div>
        `;
    }

    // Handle map click event to place a marker
    map.on('click', function(e) {
        if (selectedMarker) {
            map.removeLayer(selectedMarker); // Remove the previous marker
        }
        selectedMarker = L.marker(e.latlng, { icon: redMarkerIcon }).addTo(map);
        $('#confirmLocationBtn').show(); // Show confirm button
        $('#latitude').val(e.latlng.lat); // Set latitude input
        $('#longitude').val(e.latlng.lng); // Set longitude input
    });

    // Confirm location button click event
    $('#confirmLocationBtn').click(function() {
        alert('Location confirmed: ' + $('#latitude').val() + ', ' + $('#longitude').val());
        $(this).hide(); // Hide the confirm button after selection
    });

    // Handle form submission
    function handleFormSubmission(event) {
        event.preventDefault(); // Prevent the default form submission

        // Get form values
        const reportDetails = $('#reportDetails').val().trim();
        const crimeType = $('#crimeType').val().trim();
        const nationalID = $('#nationalID').val().trim();
        const latitude = parseFloat($('#latitude').val());
        const longitude = parseFloat($('#longitude').val());

        // Validate form inputs
        if (!validateForm(reportDetails, crimeType, nationalID, latitude, longitude)) {
            return; // Exit the function if validation fails
        }

        // Create a new crime report object
        const newCrimeReport = createCrimeReport(reportDetails, crimeType, latitude, longitude);
        crimeReports.push(newCrimeReport);
        localStorage.setItem('crimeReports', JSON.stringify(crimeReports));

        // Clear existing markers and re-add all markers including the new one, then reset the form
        clearMarkers();
        addMarkers(initialCrimeReports);
        addNewMarker(newCrimeReport);

        // Clear the form
        $('#form')[0].reset();
        $('#crimeForm').hide(); // Hide the form after submission
        alert("Report submitted successfully!");
    }

    // Validate form inputs
    function validateForm(reportDetails, crimeType, nationalID, latitude, longitude) {
        let isValid = true;
        let errorMessage = "";

        if (!reportDetails) {
            errorMessage += "Report details cannot be empty.\n";
            isValid = false;
        }
        if (!crimeType) {
            errorMessage += "Please select a crime type.\n";
            isValid = false;
        }
        if (!/^[a-zA-Z0-9]{5,15}$/.test(nationalID)) {
            errorMessage += "National ID must be 5-15 alphanumeric characters.\n";
            isValid = false;
        }
        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            errorMessage += "Please enter a valid latitude value between -90 and 90.\n";
            isValid = false;
        }
        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            errorMessage += "Please enter a valid longitude value between -180 and 180.\n";
            isValid = false;
        }

        if (!isValid) {
            alert(errorMessage);
        }
        return isValid;
    }

    // Create a new crime report object
    function createCrimeReport(reportDetails, crimeType, latitude, longitude) {
        return {
            id: crimeReports.length + 1, // Simple ID generation
            report_details: reportDetails,
            crime_type: crimeType,
            report_date_time: new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '-'), // Current timestamp
            report_status: "Pending",
            latitude: latitude,
            longitude: longitude
        };
    }

    // Clear existing markers from the map
    function clearMarkers() {
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
    }

    // Add the new marker to the map
    function addNewMarker(crime) {
        const marker = L.marker([crime.latitude, crime.longitude], { icon: redMarkerIcon }).addTo(map);
        marker.bindPopup(createPopupContent(crime));
    }

    // Filter markers based on selected crime types
    function filterMarkers() {
        const selectedTypes = $('.filter input:checked').map(function() {
            return this.value;
        }).get();

        clearMarkers(); // Clear existing markers

        // Add markers for selected types
        initialCrimeReports.forEach(crime => {
            if (selectedTypes.includes(crime.crime_type)) {
                const marker = L.marker([crime.latitude, crime.longitude]).addTo(map);
                marker.bindPopup(createPopupContent(crime));
            }
        });
    }
    // to register the service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed:', error);
            });
    }
}); // Closing brace for $(document).ready
