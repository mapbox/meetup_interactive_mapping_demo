const map = window.map = new mapboxgl.Map({
    container: 'map',
    zoom: 10,
    center: [-122.2738, 37.8251],
    style: 'mapbox://styles/brandihaskins/ck1sg2tq924lw1cmygrgpugv7',
    hash: true
});

// sanitize our inputs!
function getInput(promptMsg, maxLength, required) {
    const alphaExp = /^[a-zA-Z0-9 ]+ *[a-zA-Z0-9 ]*$/;
    let promptText = promptMsg + '\n Enter up to ' + maxLength + ' letters.';
    let userData = ' ';
    // keep prompting if criteria not met
    while (userData == ' ' || userData == null || userData.length > maxLength || !userData.match(alphaExp)) {

        // skip logic if no change.
        if (userData == ' ') { }

        else if (userData == null || userData == '') {
            if (!required){
                return null;
            }        // return null if no answer is required, or reprompt.

            promptText = 'Sorry, we need an answer.\n\n' + promptMsg + '\n Enter up to ' + maxLength + ' Characters, letters and spaces only.';
            
        }
        // check entry for special characters and length
        else if (!userData.match(alphaExp) || userData.length > maxLength) {
            promptText = 'Please limit your response to ' + maxLength + ' alphanumeric characters and spaces only.\n' + promptMsg;
        }
        userData = window.prompt(promptText);
    }
    return userData;
}


map.on('load', async function () {

    var addBlocker = false;

    //Setting up custom mapbox logo icons
    map.loadImage("https://i.imgur.com/MK4NUzI.png", function (error, image) {
        if (error) throw error;
        map.addImage("custom-marker", image);
    });

    //Get a username
    const userName = await getInput("Welcome to our collaborative map! What's your name?", 20, true);


    // The name of our marker data source for our map
    const markerSourceName = "markerSource";

    function featureFromUserMarker(userMarker) {
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [userMarker.lng, userMarker.lat]
            },
            "properties": {
                "name": userMarker.name,
                "description": userMarker.description
            }
        };
    }

    async function sendMarkerToServer(newMarker) {
        const url = '/markers';

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMarker)
        });
    }

    async function getMarkersFromServer() {
        const url = '/markers';

        const userMarkers = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(async (response) => {
                return await response.json();
            })

        const geoJsonMarkers = {
            "type": "FeatureCollection",
            "features": []
        };

        userMarkers.forEach((userMarker) => {
            geoJsonMarkers["features"].push(featureFromUserMarker(userMarker));
        })
        console.log('GeoJSON source updated.');

        return geoJsonMarkers;
    }

    async function updateMapFromServer() {
        const markerData = await getMarkersFromServer();
        console.log(markerData);
        map.getSource(markerSourceName).setData(markerData);
    }

    map.on('click', async function (event) {
        if (addBlocker==false){
            const newMarker = event.lngLat;
            newMarker.name = userName;
            newMarker.description = getInput("Enter a description:", 256, false);
            if(newMarker.description != null){
            await sendMarkerToServer(newMarker);
            }
            await updateMapFromServer();
        }
    });

    map.addSource(markerSourceName, {
        "type": "geojson",
        "data": await getMarkersFromServer()
    });

    map.addLayer({
        "id": "markers",
        "type": "symbol",
        "source": markerSourceName,
        "layout": {
            "icon-image": "custom-marker",
            "icon-size": 1,
            "text-field": ["get", "name"],
            "text-max-width": [
                "interpolate",
                [
                    "linear"
                ],
                [
                    "zoom"
                ],
                0,
                5,
                3,
                6
            ],

            "text-size": [
                "interpolate",
                [
                    "linear"
                ],
                [
                    "zoom"
                ],
                2,
                [
                    "step",
                    [
                        "get",
                        "scalerank"
                    ],
                    13,
                    3,
                    11,
                    5,
                    9
                ],
                9,
                [
                    "step",
                    [
                        "get",
                        "scalerank"
                    ],
                    35,
                    3,
                    27,
                    5,
                    22
                ]
            ],
            "icon-offset": [
                "interpolate",
                [
                    "linear"
                ],
                [
                    "zoom"
                ],
                0,
                [
                    "literal",
                    [
                        0,
                        -10
                    ]
                ],
                10,
                [
                    "literal",
                    [
                        0,
                        -15
                    ]
                ]
            ],
            "icon-size": 1,
            "text-anchor": "top"

        }
    });

    const updateInterval = setInterval(async () => {
        console.log('Polling for marker data ...');
        await updateMapFromServer();
    }, 500);
    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    map.on('click', 'markers', function (e) {
        var coordinates = e.features[0].geometry.coordinates.slice();
        var description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML('<div style = "font-size:20px;font-weight:bold; padding:3px;">'+description+'</div>')
            .addTo(map);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'markers', function () {
        map.getCanvas().style.cursor = 'pointer';
        addBlocker = true;
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'markers', function () {
        map.getCanvas().style.cursor = '';
        addBlocker = false;
    });
});


