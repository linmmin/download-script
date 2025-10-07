// ==UserScript==
// @name         Copy INFO from trans-logistics/dock dashboard
// @namespace    http://tampermonkey.net/
// @author       linmmin@
// @version      1.0
// @description  Adds a button to copy VR Id and Sortieren/Leiten from selected table
// @match        https://trans-logistics-eu.amazon.com/ssp/dock/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // Create the button
    const button = document.createElement('button');
    button.textContent = 'Copy INFO';
    button.style.position = 'fixed';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    button.style.padding = '8px';
    button.style.cursor = 'pointer';

    // Create message box with pre-formatted text
    const messageBox = document.createElement('div');
    messageBox.style.position = 'fixed';
    messageBox.style.bottom = '50px';
    messageBox.style.right = '10px';
    messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageBox.style.color = 'white';
    messageBox.style.padding = '15px';
    messageBox.style.borderRadius = '5px';
    messageBox.style.display = 'none';
    messageBox.style.zIndex = '10000';
    messageBox.style.whiteSpace = 'pre-line'; // Preserves line breaks
    messageBox.style.fontFamily = 'monospace'; // Uses monospace font for better readability
    messageBox.style.fontSize = '14px';
    messageBox.style.lineHeight = '1.4';
    document.body.appendChild(messageBox);

    function showMessage(message) {
        messageBox.innerHTML = message; // Using innerHTML to support HTML formatting
        messageBox.style.display = 'block';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 3000);
    }

    function copySelectedRowInfo() {
        // Get all checked checkboxes
        const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');

        if (checkedBoxes.length === 0) {
            showMessage('Please select a row first');
            return;
        }

        if (checkedBoxes.length > 1) {
            showMessage('Please select only one row');
            // Uncheck all boxes
            checkedBoxes.forEach(box => box.checked = false);
            return;
        }

        // Get the parent row of the checked checkbox
        const selectedRow = checkedBoxes[0].closest('tr');
        if (selectedRow) {
            const vrIdElement = selectedRow.querySelector('.loadId[data-vrid]');
            const ortElement = selectedRow.querySelector('.locLabel');
            const sortierenLeitenElement = selectedRow.querySelector('.hideLane');

            const vrId = vrIdElement ? vrIdElement.getAttribute('data-vrid') : '';
            const ort = ortElement ? ortElement.textContent.trim() : '';
            const sortierenLeiten = sortierenLeitenElement ? sortierenLeitenElement.textContent.trim() : '';

            const copiedText = `VR Id:\n${vrId}\n\nOrt:\n${ort}\n\nSortieren/Leiten:\n${sortierenLeiten}`;
            GM_setClipboard(copiedText);

            // Format message for display
            const displayMessage = `Copied to clipboard:

VR Id:
${vrId}

Ort:
${ort}

Sortieren/Leiten:
${sortierenLeiten}`;

            showMessage(displayMessage);
 ;
        }
    }

    // Add click event listener to the button
    button.addEventListener('click', copySelectedRowInfo);

    // Add the button to the page
    document.body.appendChild(button);

    // Add click event listener to checkboxes
    document.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
            if (checkedBoxes.length > 1) {
                // If more than one checkbox is checked, uncheck all except the most recently checked one
                checkedBoxes.forEach(box => {
                    if (box !== event.target) {
                        box.checked = false;
                    }
                });
                showMessage('Only one row can be selected at a time');
            }
        }
    });
})();
