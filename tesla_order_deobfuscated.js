/**
 * =================================================================================
 * Tesla Vehicle Reservation Bot - Deobfuscated Version
 * =================================================================================
 *
 * Original Author: Unknown (Obfuscated)
 * 
 * ### WARNING ###
 *
 * Use this for educational purposes only and at your own risk.
 *
 * =================================================================================
 */

// MARK: - User Details & Configuration
// --- This section contains user-specific information that will be used ---
// --- to automatically fill out the reservation forms. ---

const USER_DETAILS = {
    email: "example@gmail.com",
    phoneNumber: "1111111111",
    firstName: "ismail",
    lastName: "kundakcı",
    nationalId: "145314531453", // Turkish Citizen Number (TCKN)
    address: {
        street: "korucu",
        city: "ivrindi",
        state: "balikesir",
        zipCode: "10775",
    },
};

// The local WebSocket server URL for real-time status updates.
const LOCAL_WEBSOCKET_URL = "ws://localhost:8000";


// MARK: - Network Interception (Monkey Patching)
// --- This code hijacks the browser's built-in network functions (`fetch` and ---
// --- `WebSocket`) to monitor and modify requests sent to Tesla's servers. ---

(function setupNetworkInterception() {

    // --- WebSocket Interception ---
    // Force all WebSocket connections to go through the local server for monitoring.
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        // Override the URL to redirect to the local WebSocket server.
        const modifiedUrl = LOCAL_WEBSOCKET_URL;
        return new OriginalWebSocket(modifiedUrl, protocols);
    };

    // --- Fetch API Interception ---
    // Intercept all `fetch` requests to replace placeholder data with user data.
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        const newOptions = { ...options };

        // Check if the request body is a string and contains placeholder data.
        if (newOptions.body && typeof newOptions.body === 'string') {
            const replacements = {
                "harmanboran@gmail.com": USER_DETAILS.email,
                "5308513308": USER_DETAILS.phoneNumber,
                "Burhan": USER_DETAILS.firstName,
                "CAN": USER_DETAILS.lastName,
                "19970025036": USER_DETAILS.nationalId,
                "Yayla Mahallesi, Gül Sokak No: 12 D:4": USER_DETAILS.address.street,
                "Kartal": USER_DETAILS.address.city,
                "İstanbul": USER_DETAILS.address.state,
                "34890": USER_DETAILS.address.zipCode
            };

            for (const [placeholder, userValue] of Object.entries(replacements)) {
                if (newOptions.body.includes(placeholder)) {
                    console.log(`[Fetch Intercept] Replacing '${placeholder}' in request body.`);
                    newOptions.body = newOptions.body.replaceAll(placeholder, userValue);
                }
            }
        }

        // --- URL Redirection for Time Synchronization ---
        // Redirects a specific API call, likely for time synchronization, to a local server.
        // This can be used to bypass certain timing checks or to use a more accurate local time.
        const originalUrl = "https://jis-3c9e59e9.berkant.dev/date_time_fix";
        const localUrl = "http://localhost:8181/date_time_fix";

        if (typeof url === "string" && url === originalUrl) {
            console.log(`[Fetch Intercept] Redirecting URL from ${originalUrl} to ${localUrl}`);
            url = localUrl;
        }

        if (url instanceof Request && url.url === originalUrl) {
            console.log(`[Fetch Intercept] Redirecting Request object URL from ${originalUrl} to ${localUrl}`);
            url = new Request(localUrl, {
                method: url.method,
                headers: url.headers,
                body: url.body,
                mode: url.mode,
                credentials: url.credentials,
                cache: url.cache,
                redirect: url.redirect,
                referrer: url.referrer,
                referrerPolicy: url.referrerPolicy,
                integrity: url.integrity
            });
        }

        return originalFetch.call(this, url, newOptions);
    };
}());


// MARK: - Main Bot Logic
// --- This is the core functionality of the bot, which was heavily obfuscated. ---
// --- It contains the logic for finding, reserving, and checking out a vehicle. ---

(async () => {
    "use strict";

    // --- Bot Constants ---
    const TESLA_API_URL = "https://www.tesla.com/tr_tr/inventory/api/v1/inventory-results";
    const NOTIFICATION_WEBHOOK_URL = "discord webhook urlnizi buraya koyun";
    const HCAPTCHA_SITE_KEY = "523522a6-253c-404f-9b62-959c25dd8542";
    const TARGET_MODEL = "Model Y";
    const TARGET_TRIM = "LRW"; // Long Range All-Wheel Drive
    const POLLING_INTERVAL_MS = 1000; // Check for inventory every 1 second.
    const RETRY_DELAY_MS = 250; // Short delay between rapid actions.
    
    let isReservationInProgress = false;

    /**
     * Sends a notification to a Discord webhook.
     * @param {string} message - The message content to send.
     */
    const sendNotification = (message) => {
        fetch(NOTIFICATION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
    };

    /**
     * Logs messages to the console with a timestamp.
     * @param {...any} args - The message parts to log.
     */
    const log = (...args) => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}]`, ...args);
    };
    
    /**
     * Main loop to search for and reserve a vehicle.
     */
    const searchAndReserve = async () => {
        log(`Starting search for ${TARGET_MODEL} - ${TARGET_TRIM}...`);

        for (;;) { // Infinite loop
            if (isReservationInProgress) {
                log("Reservation already in progress. Skipping this cycle.");
                await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
                continue;
            }

            try {
                // Step 1: Fetch available inventory from Tesla's API
                const inventoryResponse = await fetch(TESLA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        "query": {
                            "model": TARGET_MODEL.toLowerCase().replace(' ', ''),
                            "condition": "new",
                            "options": {},
                            "arrangeby": "Price",
                            "order": "asc",
                            "market": "TR",
                            "language": "tr",
                            "super_region": "north america",
                            "region": "TR"
                        },
                        "offset": 0,
                        "count": 50,
                        "outsideOffset": 0,
                        "outsideSearch": false
                    })
                });

                const inventoryData = await inventoryResponse.json();
                const availableCars = inventoryData.results || [];
                
                log(`Found ${availableCars.length} total cars in inventory.`);

                // Step 2: Filter for the exact matching vehicle trim
                const matchingCar = availableCars.find(car => car.Trim === TARGET_TRIM);

                if (matchingCar) {
                    isReservationInProgress = true;
                    log(`🎉 MATCH FOUND! VIN: ${matchingCar.VIN}, Price: ${matchingCar.Price}`);
                    sendNotification(`🚗 Vehicle Found! VIN: ${matchingCar.VIN}, Price: ${matchingCar.Price}. Attempting to reserve...`);
                    
                    // Step 3: Solve hCaptcha to get a reservation token
                    let captchaToken;
                    try {
                        log("Solving hCaptcha...");
                        const captchaWidgetId = hcaptcha.render(document.body, { "sitekey": HCAPTCHA_SITE_KEY });
                        const captchaResult = await hcaptcha.execute(captchaWidgetId, { async: true });
                        captchaToken = captchaResult.response;
                        hcaptcha.remove(captchaWidgetId);
                        log("hCaptcha solved successfully.");
                    } catch (captchaError) {
                        log("❌ hCaptcha failed:", captchaError);
                        sendNotification(`❌ hCaptcha failed: ${captchaError.message}`);
                        isReservationInProgress = false;
                        continue; // Try again in the next loop
                    }

                    // Step 4: Construct and send the final checkout/reservation request
                    const checkoutUrl = TESLA_API_URL.replace('inventory-results', 'checkout');
                    const reservationPayload = {
                        "vin": matchingCar.VIN,
                        "isCash": true,
                        "PaymentInfo": { "paymentMethod": "Cash" },
                        "CustomerInfo": {
                            "customerType": "Individual",
                            "TIN": USER_DETAILS.nationalId, // Turkish National ID
                            "firstName": USER_DETAILS.firstName,
                            "lastName": USER_DETAILS.lastName,
                            "email": USER_DETAILS.email,
                            "phoneNumber": USER_DETAILS.phoneNumber,
                            "contactPreference": "Email",
                            "locale": "tr_TR"
                        },
                        "TradeIn": {},
                        "BillingAddress": {
                            "firstName": USER_DETAILS.firstName,
                            "lastName": USER_DETAILS.lastName,
                            "addressLine1": USER_DETAILS.address.street,
                            "city": USER_DETAILS.address.city,
                            "stateProvince": USER_DETAILS.address.state,
                            "zip": USER_DETAILS.address.zipCode
                        },
                        "captchaToken": captchaToken,
                        "transactionId": "" // Transaction ID is often generated server-side or in a prior step
                    };
                    
                    log("Sending reservation request...");
                    const reservationResponse = await fetch(checkoutUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(reservationPayload)
                    });
                    
                    // Step 5: Handle the reservation response
                    if (reservationResponse.ok) {
                        const reservationResult = await reservationResponse.json();
                        log("✅ RESERVATION SUCCESSFUL!", reservationResult);
                        sendNotification(`✅ RESERVATION SUCCESSFUL! Order Number: ${reservationResult.order.reservationNumber}\nVIN: ${matchingCar.VIN}\nPrice: ${matchingCar.Price}`);
                        break; // Exit the loop on success
                    } else {
                        const errorResult = await reservationResponse.json();
                        log("❌ RESERVATION FAILED!", errorResult);
                        sendNotification(`❌ RESERVATION FAILED for VIN ${matchingCar.VIN}. Reason: ${errorResult.error || 'Unknown'}`);
                        isReservationInProgress = false;
                    }
                }

            } catch (error) {
                log("An error occurred in the search loop:", error);
                isReservationInProgress = false; // Reset on error
            }

            // Wait before the next poll to avoid spamming the API
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
        }

        log("Bot has finished its task.");
    };

    // --- Start the Bot ---
    searchAndReserve();

})();