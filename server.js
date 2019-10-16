const fs = require('fs');
const express = require('express');
const os = require('os');
const ifaces = os.networkInterfaces();
const app = express()
const port = 3000;

const markersFileName = 'markers.json';

async function getIpAddress() {
    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
            } else {
                // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
            }
            ++alias;
        });
    });
}



async function readFileAsync(file) {
    const wrapPromise = new Promise((resolve, reject) => {
        fs.readFile(file, (error, data) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(data);
            }
        });
    });

    return wrapPromise;
}

async function writeFileAsync(file, data) {
    const wrapPromise = new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data), (error) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });

    return wrapPromise;
}

async function loadMarkers() {
    let markers = null;

    try {
        json = await readFileAsync(markersFileName);
        markers = JSON.parse(json);
    }
    catch (error) {
        console.log(`Couldn't read saved marker data: ${error}`)
    }

    if (markers) {
        console.log('Using saved marker data.')
        return markers;
    }
    else {
        console.log('Initializing marker data.')
        return [];
    }
}


async function saveMarkers(markers) {
    return await writeFileAsync(markersFileName, markers);
}

async function addMarker(lngLat, markers) {
    markers.push(lngLat);
    return await saveMarkers(markers);
}

// Express server API
async function startServer() {
    // Load our saved state
    const markers = await loadMarkers();

    // Support JSON request bodies in POST
    app.use(express.json())

    // Serve static files from '/static'[{"lng":-77.00882798317888,"lat":38.90051768119568}
    app.use(express.static('static'));

    // Serve list of markers to client
    app.get('/markers', function (req, res, next) {
        res.json(markers);
    });

    // Add markers from the client
    app.post('/markers', function (req, res, next) {
        const lngLat = req.body;

        console.log(`Got marker: ${JSON.stringify(lngLat)}`)
        addMarker(lngLat, markers);

        res.sendStatus(200);
    });
    getIpAddress();

    app.listen(port, () => console.log(`Markers demo started on port ${port}`))
}

startServer();
