// Use these functions for emoji/unicode-safe encoding/decoding

function basicDecode(str) {
            console.log(str);
            try {
                console.log(decodeURIComponent(escape(atob(str))));
                return decodeURIComponent(escape(atob(str)));
            } catch (e) {
                return '';
            }
        }

function getHashParams() {
    // Example hash: #ENCODED&time=2000
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const [main, ...params] = hash.split('&');
    const paramObj = {};
    for (const p of params) {
        const [k, v] = p.split('=');
        if (k && v) paramObj[k] = v;
    }
    return { encoded: main, ...paramObj };
}

// Utility to get the word from the URL hash
function getWordFromHash() {
    const { encoded } = getHashParams();
    if (encoded) {
        return basicDecode(encoded || '');
    } else {
        // Fallback: prompt for input if no encoded word in hash
        let fallback = window.prompt("Enter a word or emoji to reveal:", "");
        return fallback || "";
    }
}

function getRevealTimeFromHash(defaultTime = 2000) {
    const { time } = getHashParams();
    const t = parseInt(time, 10);
    return (!isNaN(t) && t > 0) ? t : defaultTime;
}

function getRevealSpeedFromHash(defaultSpeed = 300) {
    const { speed } = getHashParams();
    const s = parseInt(speed, 10);
    return (!isNaN(s) && s > 0) ? s : defaultSpeed;
}

function getSpinSpeedFromHash(defaultSpinSpeed = 50) {
    const { spinspeed } = getHashParams();
    const s = parseInt(spinspeed, 10);
    return (!isNaN(s) && s > 0) ? s : defaultSpinSpeed;
}

function getWordGraphemes() {
    // Use GraphemeSplitter for accurate emoji/grapheme splitting
    const word = getWordFromHash();
    if (!word) return [];
    let Splitter = null;
    // Try to support both CommonJS and browser global, from either node_modules or root
    if (window.GraphemeSplitter && typeof window.GraphemeSplitter === "function") {
        Splitter = window.GraphemeSplitter;
    } else if (
        window.GraphemeSplitter &&
        typeof window.GraphemeSplitter === "object" &&
        typeof window.GraphemeSplitter.default === "function"
    ) {
        Splitter = window.GraphemeSplitter.default;
    } else if (window["GraphemeSplitter"] && typeof window["GraphemeSplitter"] === "function") {
        // fallback if loaded from root as /grapheme-splitter.js
        Splitter = window["GraphemeSplitter"];
    }
    let graphemes = [];
    if (Splitter) {
        try {
            const splitter = new Splitter();
            const lines = word.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (i > 0) graphemes.push('\n');
                graphemes = graphemes.concat(splitter.splitGraphemes(lines[i]));
            }
            return graphemes;
        } catch (e) {
            // fallback below
        }
    }
    // Fallback: split by code units (not emoji-safe)
    const lines = word.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (i > 0) graphemes.push('\n');
        graphemes = graphemes.concat(Array.from(lines[i]));
    }
    return graphemes;
}

function setResponsiveSlotLengthAttr() {
    const graphemes = getWordGraphemes();
    const slotMachine = document.getElementById('slotMachine');
    const slotMachineContainer = document.querySelector('.slot-machine-container');
    if (graphemes.length && slotMachine && slotMachineContainer) {
        slotMachine.setAttribute('data-length', graphemes.length);
        slotMachineContainer.setAttribute('data-length', graphemes.length);
    }
}

// Fill the slot machine with boxes and random letters (no animation)
function prefillSlots() {
    const graphemes = getWordGraphemes();
    const slotMachine = document.getElementById('slotMachine');
    const slotMachineContainer = document.querySelector('.slot-machine-container');
    slotMachine.innerHTML = '';
    if (!graphemes.length) return;
    setResponsiveSlotLengthAttr();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < graphemes.length; i++) {
        if (graphemes[i] === ' ' || graphemes[i] === '\n') {
            // Create an invisible spacer that takes up the same width as a slot
            const spacer = document.createElement('div');
            spacer.className = 'slot slot-space';
            slotMachine.appendChild(spacer);
        } else {
            const slot = document.createElement('div');
            slot.className = 'slot';
            const slotInner = document.createElement('div');
            slotInner.className = 'slot-inner';
            const charDiv = document.createElement('div');
            // Use emoji if the grapheme is an emoji, else use random letter/number
            if (isEmoji(graphemes[i])) {
                charDiv.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
            } else {
                charDiv.textContent = chars[Math.floor(Math.random() * chars.length)];
            }
            charDiv.style.height = "100%";
            charDiv.style.width = "100%";
            charDiv.style.display = "flex";
            charDiv.style.alignItems = "center";
            charDiv.style.justifyContent = "center";
            charDiv.style.textAlign = "center";
            slotInner.appendChild(charDiv);
            slot.appendChild(slotInner);
            slotMachine.appendChild(slot);
        }
    }
}

// Update prefill when hash changes
window.addEventListener('hashchange', prefillSlots);

// Prefill on page load
window.addEventListener('DOMContentLoaded', () => {
    prefillSlots();
    // Set dynamic og:image after slots are determined
    const graphemes = getWordGraphemes();
    if (graphemes.length > 0) setDynamicOgImage(graphemes);
});

// Only animate on slider pull
function startSlotMachine() {
    const graphemes = getWordGraphemes();
    const slotMachine = document.getElementById('slotMachine');
    const revealedWord = document.getElementById('revealedWord');
    revealedWord.textContent = '';
    slotMachine.innerHTML = '';

    if (!graphemes.length) return;

    const speed = getRevealSpeedFromHash(); // <-- Get speed from hash

    for (let i = 0; i < graphemes.length; i++) {
        if (graphemes[i] === ' ' || graphemes[i] === '\n') {
            const spacer = document.createElement('div');
            spacer.className = 'slot slot-space';
            slotMachine.appendChild(spacer);
        } else {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slotMachine.appendChild(slot);

            animateSlot(slot, graphemes[i], i * speed); // <-- Use grapheme here
        }
    }
}

function animateSlot(slot, letter, delay) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const spinCount = 15;
    const slotInner = document.createElement('div');
    slotInner.className = 'slot-inner';

    // Fill with random characters or emojis depending on the revealed letter
    for (let i = 0; i < spinCount; i++) {
        const charDiv = document.createElement('div');
        if (isEmoji(letter)) {
            charDiv.textContent = emojiList[Math.floor(Math.random() * emojiList.length)];
        } else {
            charDiv.textContent = chars[Math.floor(Math.random() * chars.length)];
        }
        charDiv.style.height = "100%"; // instead of slot.offsetHeight + "px"
        charDiv.style.width = "100%";
        charDiv.style.display = "flex";
        charDiv.style.alignItems = "center";
        charDiv.style.justifyContent = "center";
        charDiv.style.textAlign = "center";
        slotInner.appendChild(charDiv);
    }
    slot.appendChild(slotInner);

    let spinning = true;
    let isTransitioning = false;

    const spinSpeed = getSpinSpeedFromHash(); // Get spinspeed from hash

    function cycle() {
        if (!spinning || isTransitioning) return;
        isTransitioning = true;
        slotInner.style.transition = `transform ${spinSpeed}ms linear`; // Use spinspeed here
        const overshoot = 0.54; // 10% further than the slot height
        slotInner.style.transform = `translateY(${slot.offsetHeight * overshoot}px)`;
    }

    slotInner.addEventListener('transitionend', () => {
        if (!isTransitioning) return;
        isTransitioning = false;

        if (spinning) {
            // Move last child to the top and reset transform immediately
            const last = slotInner.lastElementChild;
            slotInner.insertBefore(last, slotInner.firstElementChild);
            slotInner.style.transition = 'none';
            slotInner.style.transform = 'translateY(0)';

            // Use requestAnimationFrame TWICE to ensure the browser paints the reset state
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (spinning) {
                        slotInner.style.transition = `transform ${spinSpeed}ms linear`;
                        slotInner.style.transform = `translateY(${slot.offsetHeight * 0.54}px)`;
                        isTransitioning = true;
                    }
                });
            });
        } else {
            // If not spinning, just reset transform
            slotInner.style.transition = 'none';
            slotInner.style.transform = 'translateY(0)';
        }
    });

    // Start the first cycle
    cycle();

    // Stop cycling and reveal the letter after delay
    const revealTime = getRevealTimeFromHash(); // default 2000ms
    setTimeout(() => {
        spinning = false;
        // Remove all children and show only the final letter
        slotInner.innerHTML = '';
        const finalDiv = document.createElement('div');
        finalDiv.textContent = letter;
        finalDiv.style.height = "100%"; // instead of slot.offsetHeight + "px"
        finalDiv.style.width = "100%";
        finalDiv.style.display = "flex";
        finalDiv.style.alignItems = "center";
        finalDiv.style.justifyContent = "center";
        finalDiv.style.textAlign = "center";
        slotInner.appendChild(finalDiv);
        slotInner.style.transition = 'none';
        slotInner.style.transform = 'translateY(0)';
    }, revealTime + delay); // Adjust duration as needed
}

function setDynamicOgImage(graphemes) {
    // Create a canvas and draw a simple slot machine preview based on grapheme count
    const length = graphemes.length;
    const width = Math.max(320, length * 60);
    const height = 120;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = "#232323";
    ctx.fillRect(0, 0, width, height);

    // Draw slot boxes
    const slotW = 48, slotH = 72, gap = 12;
    const startX = (width - (length * slotW + (length - 1) * gap)) / 2;
    for (let i = 0; i < length; i++) {
        const x = startX + i * (slotW + gap);
        ctx.fillStyle = "#e0e0e0";
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, (height-slotH)/2, slotW, slotH, 10);
        ctx.fill();
        ctx.stroke();
    }

    // Draw word length in the center
    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = "#e53935";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${length} slots`, width/2, height-28);

    // Set og:image meta tag
    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage) {
        metaImage.setAttribute('content', canvas.toDataURL("image/png"));
    }

    // Set og:description meta tag based on word length
    const metaDescription = document.querySelector('meta[property="og:description"]');
    const descLength = graphemes.length;
    let description = `Reveal a word!`;
    if (descLength <= 3) {
        description = `Short ${descLength}-letter word reveal!`;
    } else if (descLength <= 7) {
        description = `Medium ${descLength}-letter word slot machine!`;
    } else {
        description = `Long ${descLength}-letter word challenge!`;
    }
    if (metaDescription) {
        metaDescription.setAttribute('content', description);
    }
}

const sliderBtn = document.getElementById('startButton');
const sliderKnob = sliderBtn.querySelector('.slider-knob');
let isDragging = false;
let startY = 0;
let currentY = 0;
const maxDrag = 60; // Maximum drag distance in px

sliderBtn.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    sliderBtn.style.transition = 'none';
    document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    currentY = Math.max(0, Math.min(maxDrag, e.clientY - startY));
    sliderKnob.style.transform = `translateY(${currentY}px)`;
});

document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    sliderKnob.style.transition = 'transform 0.2s';
    sliderKnob.style.transform = 'translateY(0)';
    document.body.style.userSelect = '';
    // Trigger slot machine only if dragged a significant amount
    if (currentY > maxDrag * 0.7) {
        startSlotMachine();
    }
    setTimeout(() => {
        sliderKnob.style.transition = '';
    }, 200);
    currentY = 0;
});

// Optional: Touch support
sliderBtn.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    sliderBtn.style.transition = 'none';
    document.body.style.userSelect = 'none';
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = Math.max(0, Math.min(maxDrag, e.touches[0].clientY - startY));
    sliderKnob.style.transform = `translateY(${currentY}px)`;
}, { passive: false });

document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sliderKnob.style.transition = 'transform 0.2s';
    sliderKnob.style.transform = 'translateY(0)';
    document.body.style.userSelect = '';
    if (currentY > maxDrag * 0.7) {
        startSlotMachine();
    }
    setTimeout(() => {
        sliderKnob.style.transition = '';
    }, 200);
    currentY = 0;
}, { passive: false });

function isEmoji(grapheme) {
    // Basic emoji detection (covers most common emojis)
    // This is not exhaustive but works for most cases
    return /\p{Emoji}/u.test(grapheme);
}

const emojiList = [
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
    "😋","😜","😝","😛","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌",
    "😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕"
];