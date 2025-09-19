// ==UserScript==
// @name         PAD2 Copy VRID and Location (Truck Emojis + Toast)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Copy truck-specific VRID/Location pairs with emoji buttons and confirmation toast on Amazon logistics page.
// @author       You
// @match        https://trans-logistics-eu.amazon.com/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    function createButton(id, text, onClick, offsetX) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.innerText = text;
        btn.style.position = 'fixed';
        btn.style.top = '100px';
        btn.style.left = `calc(50% + ${offsetX}px)`;
        btn.style.zIndex = 1000;
        btn.style.padding = '10px 16px';
        btn.style.backgroundColor = '#007bff';
        btn.style.color = 'white';
        btn.style.fontSize = '14px';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.style.display = 'none';
        btn.addEventListener('click', onClick);
        document.body.appendChild(btn);
        return btn;
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.position = 'fixed';
        toast.style.top = '150px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = '#28a745';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '6px';
        toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        toast.style.zIndex = 1001;
        toast.style.fontSize = '14px';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }

    function addButtons() {
        const button1 = createButton('btn1', '🚚 Copy 1st Truck details', () => copyData(0, 2), -120);
        const button2 = createButton('btn2', '🚛 Copy 2nd Truck details', () => copyData(2, 4), 120);

        function checkElements() {
            const locationInputs = document.querySelectorAll('input[id^="search-field-"]');
            const vridElements = document.querySelectorAll('.css-t4qdd4');

            const pairCount = Math.min(locationInputs.length, vridElements.length);

            button1.style.display = pairCount >= 1 ? 'block' : 'none';
            button2.style.display = pairCount >= 3 ? 'block' : 'none';
        }

        setInterval(checkElements, 500);
    }

    function copyData(startIndex, endIndex) {
        const locationInputs = document.querySelectorAll('input[id^="search-field-"]');
        const vridElements = document.querySelectorAll('.css-t4qdd4');

        const pairs = [];
        for (let i = startIndex; i < endIndex; i++) {
            const location = locationInputs[i]?.value.trim() || '[No Location]';
            const vrid = vridElements[i]?.innerText.trim() || '[No VRID]';
            pairs.push(`${vrid}\n${location}`);
        }

        const textToCopy = pairs.join('\n\n');
        GM_setClipboard(textToCopy);

        showToast('✅ Truck details copied!');
    }

    window.addEventListener('load', () => {
        setTimeout(addButtons, 2000);
    });
})();

