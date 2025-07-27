// ==UserScript==
// @name         R-a-d.io Faves Downloader
// @namespace    https://r-a-d.io/
// @version      2.0
// @description  Downloads all faves as JSON, using a button added to the page.
// @author       ChatGPT
// @match        https://r-a-d.io/faves*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // A consistent logging function for console output
    function log(message, isError = false) {
        const logMessage = `[R-a-d.io Faves Downloader] ${message}`;
        if (isError) {
            console.error(logMessage);
        } else {
            console.log(logMessage);
        }
    }

    // Main logic for the download process
    async function startDownload(button) {
        button.disabled = true;

        const nick = new URLSearchParams(window.location.search).get("nick");
        if (!nick) {
            log("Error: No ?nick= found in the URL.", true);
            button.textContent = "Error";
            button.disabled = false;
            return;
        }

        log(`Starting download for user: ${nick}`);

        const pageLinks = Array.from(document.querySelectorAll("li.m-0 a.pagination-link"));
        const lastPage = Math.max(...pageLinks.map(a => parseInt(a.textContent)).filter(n => !isNaN(n)));

        if (!lastPage || lastPage < 1) {
            log("Error: Couldn't determine number of pages.", true);
            button.textContent = "Error";
            button.disabled = false;
            return;
        }

        log(`Found ${lastPage} pages of favorites.`);
        const allFaves = [];

        for (let page = 1; page <= lastPage; page++) {
            const url = `/faves?nick=${encodeURIComponent(nick)}&dl=true&page=${page}`;
            try {
                button.textContent = `Fetching page ${page}/${lastPage}...`;
                log(`Fetching URL: ${url}`);
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error(`Invalid data on page ${page}. Expected an array.`);
                allFaves.push(...data);
                log(`Successfully fetched page ${page}. Added ${data.length} entries.`);
                await new Promise(r => setTimeout(r, 200)); // Be polite with a small delay
            } catch (err) {
                log(`Failed to fetch page ${page}: ${err.message}`, true);
                button.textContent = "Download Failed";
                button.disabled = false;
                return;
            }
        }

        log("All pages fetched successfully. Creating JSON file.");

        const blob = new Blob([JSON.stringify(allFaves, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${nick}_faves.json`;
        a.click();

        log("JSON file generated and download started.");
        button.textContent = "Download Complete!";

        // Reset the button text after a delay
        setTimeout(() => {
            button.textContent = "Download all faves";
            button.disabled = false;
        }, 5000);
    }

    // Use a reliable interval check to ensure the page is ready
    let findButtonInterval = setInterval(() => {
        const submitButton = document.querySelector('input.submit.is-link[type="submit"]');

        if (submitButton) {
            clearInterval(findButtonInterval);
            log("Submit button found. Attaching download button.");

            const newButton = document.createElement("button");
            newButton.textContent = "Download all faves";
            newButton.type = "button";
            newButton.className = "btn button is-link ml-3 is-info";
            newButton.style.marginLeft = "10px";

            // Insert the new button right after the submit button
            submitButton.parentNode.insertBefore(newButton, submitButton.nextSibling);

            newButton.addEventListener("click", () => startDownload(newButton));
        } else {
            // This log will only show up if the button is not found on the first check
            log("Waiting for submit button...", false);
        }
    }, 200); // Check every 200ms
})();
