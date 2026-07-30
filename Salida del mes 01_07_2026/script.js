// ===========================
// LIBRO ENCANTADO
// ===========================

const pages = Array.from(document.querySelectorAll(".page"));
const particles = document.querySelector(".particles");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finish");
const soundToggle = document.getElementById("soundToggle");
const challengePage = document.getElementById("challenges");
const challengeGrid = document.getElementById("challengeGrid");
const toRevealBtn = document.getElementById("toReveal");
const revealPage = document.getElementById("reveal");

let currentPage = 0;
let activeTypeTimer = null;
let hasLaunchedMagic = false;
let audioContext = null;

const ambientTrack = new Audio("harry-potter-2.mp3");
ambientTrack.loop = true;
ambientTrack.volume = 0.35;

// Efectos configurables (cambia estos nombres por tus mp3)
const correctSfx = new Audio("wingardium-leviosa.mp3");
const wrongSfx = new Audio("its-leviosa-not-leviosar.mp3");
const finalSfx = new Audio("final.mp3");

correctSfx.volume = 0.7;
wrongSfx.volume = 0.7;
finalSfx.volume = 0.85;

correctSfx.preload = "auto";
wrongSfx.preload = "auto";
finalSfx.preload = "auto";
const riddlePages = pages.filter(page => page.querySelector("input[data-answer]"));
const pageIndexByElement = new Map(pages.map((page, index) => [page, index]));
const solvedRiddles = new Set();
let maxUnlockedRiddle = 0;

const ambientState = {
    isOn: false,
    droneNodes: [],
    sparkleTimer: null
};

// ---------------------------
// Utilidades
// ---------------------------

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function playSfx(audio) {
    if (!audio)
        return;

    const sound = audio.cloneNode();
    sound.volume = audio.volume;
    sound.play().catch(() => {
        // Ignorar bloqueos de autoplay del navegador.
    });
}

function isRiddlePage(pageIndex) {
    const page = pages[pageIndex];
    return Boolean(page && page.querySelector("input[data-answer]"));
}

function riddleIndexFromPage(pageIndex) {
    if (!isRiddlePage(pageIndex))
        return -1;

    const page = pages[pageIndex];
    return riddlePages.indexOf(page);
}

function showPage(index) {
    if (index < 0 || index >= pages.length)
        return;

    pages.forEach(page => page.classList.remove("active"));
    pages[index].classList.add("active");
    currentPage = index;

    if (isRiddlePage(index)) {
        const letter = pages[index].querySelector(".letter");
        if (letter)
            letter.classList.add("open");
    }

    triggerPageTyping(pages[index]);
    updateChallengeHub();
}

function nextPage() {
    if (currentPage >= pages.length - 1)
        return;

    pages[currentPage].classList.remove("active");
    pages[currentPage].classList.add("flip");
    showPage(currentPage + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goToChallengeHub() {
    if (!challengePage)
        return;

    const hubIndex = pageIndexByElement.get(challengePage);
    if (typeof hubIndex === "number")
        showPage(hubIndex);
}

function allRiddlesSolved() {
    return solvedRiddles.size === riddlePages.length;
}

// ---------------------------
// Efecto escritura
// ---------------------------

document.querySelectorAll("p").forEach(p => {
    p.dataset.original = p.innerHTML;
});

function typeWriter(element, speed = 16) {
    const text = element.dataset.original;
    if (!text)
        return;

    if (activeTypeTimer)
        clearInterval(activeTypeTimer);

    element.innerHTML = "";
    let i = 0;

    activeTypeTimer = setInterval(() => {
        element.innerHTML += text.charAt(i);
        i++;

        if (i >= text.length) {
            clearInterval(activeTypeTimer);
            activeTypeTimer = null;
        }
    }, speed);
}

function triggerPageTyping(page) {
    const firstParagraph = page.querySelector("p");
    if (!firstParagraph || page.dataset.typed === "true")
        return;

    typeWriter(firstParagraph);
    page.dataset.typed = "true";
}

// ---------------------------
// Sala de pruebas
// ---------------------------

function getRiddleTitle(page, index) {
    const title = page.querySelector("h2");
    if (title && title.textContent.trim())
        return title.textContent.trim();

    return "Prueba " + (index + 1);
}

function createChallengeButton(index, page) {
    const button = document.createElement("button");
    const isUnlocked = index <= maxUnlockedRiddle;
    const isSolved = solvedRiddles.has(index);

    button.type = "button";
    button.className = "challenge-card";
    button.classList.toggle("locked", !isUnlocked);
    button.classList.toggle("solved", isSolved);
    button.disabled = !isUnlocked;

    const icon = isSolved ? "✅" : isUnlocked ? "🔓" : "🔒";
    const status = isSolved
        ? "Completada"
        : isUnlocked ? "Disponible" : "Bloqueada";

    button.innerHTML =
        "<span class=\"challenge-icon\">" + icon + "</span>"
        + "<span class=\"challenge-name\">" + getRiddleTitle(page, index) + "</span>"
        + "<span class=\"challenge-status\">" + status + "</span>";

    button.addEventListener("click", () => {
        if (!isUnlocked)
            return;

        const pageIndex = pageIndexByElement.get(page);
        if (typeof pageIndex === "number")
            showPage(pageIndex);
    });

    return button;
}

function updateChallengeHub() {
    if (!challengeGrid)
        return;

    challengeGrid.innerHTML = "";
    riddlePages.forEach((page, index) => {
        challengeGrid.appendChild(createChallengeButton(index, page));
    });

    if (!toRevealBtn)
        return;

    toRevealBtn.hidden = !allRiddlesSolved();
}

// ---------------------------
// Cartas y acertijos
// ---------------------------

document.querySelectorAll(".letter").forEach(letter => {
    const seal = letter.querySelector(".seal");
    if (!seal)
        return;

    seal.addEventListener("click", () => {
        letter.classList.add("open");
    });
});

document.querySelectorAll(".check").forEach(button => {
    button.addEventListener("click", function () {
        const input = this.previousElementSibling;
        if (!input)
            return;

        const answer = normalizeText(input.dataset.answer || "");
        const value = normalizeText(input.value || "");

        if (value && value === answer)
            correctAnimation(this);
        else
            wrongAnimation(input);
    });
});

function correctAnimation(button) {
    const riddleIndex = riddleIndexFromPage(currentPage);
    if (riddleIndex >= 0) {
        solvedRiddles.add(riddleIndex);

        if (riddleIndex < riddlePages.length - 1) {
            maxUnlockedRiddle = Math.max(maxUnlockedRiddle, riddleIndex + 1);
        }
    }

    button.innerHTML = "✔ Correcto";
    button.style.background = "#356b39";
    button.disabled = true;
    updateChallengeHub();
    playSfx(correctSfx);

    setTimeout(() => {
        goToChallengeHub();
    }, 1000);
}

function wrongAnimation(input) {
    input.classList.add("wrong");
    input.value = "";
    input.placeholder = "Intenta otra vez...";
    playSfx(wrongSfx);

    setTimeout(() => {
        input.classList.remove("wrong");
    }, 700);
}

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            const button = input.nextElementSibling;
            if (button)
                button.click();
        }
    });
});

// ---------------------------
// Navegacion
// ---------------------------

if (startBtn) {
    startBtn.addEventListener("click", async () => {
        nextPage();
        await startAmbient();
    });
}

document.querySelectorAll(".next").forEach(btn => {
    btn.addEventListener("click", () => {
        nextPage();
    });
});

if (toRevealBtn && revealPage) {
    toRevealBtn.addEventListener("click", () => {
        const revealIndex = pageIndexByElement.get(revealPage);
        if (typeof revealIndex === "number")
            showPage(revealIndex);
    });
}

pages.forEach(page => {
    page.addEventListener("animationend", () => {
        page.classList.remove("flip");
    });
});

// ---------------------------
// Final
// ---------------------------

if (finishBtn) {
    finishBtn.addEventListener("click", () => {
        finishBtn.innerHTML = "❤️ Mision Aceptada ❤️";
        finishBtn.disabled = true;
        playSfx(finalSfx);
        launchMagic();
    });
}

function launchMagic() {
    if (hasLaunchedMagic)
        return;

    hasLaunchedMagic = true;
    document.body.classList.add("magic-mode");

    const frases = [
        "✨",
        "La magia jamas desaparece...",
        "Solo cambia de forma...",
        "Gracias por aceptar esta aventura."
    ];

    const reveal = document.querySelector(".final .page-content");
    if (!reveal)
        return;

    let i = 0;
    const interval = setInterval(() => {
        if (i >= frases.length) {
            clearInterval(interval);
            return;
        }

        const p = document.createElement("p");
        p.className = "magic-text";
        p.innerHTML = frases[i];
        reveal.appendChild(p);
        i++;
    }, 1500);
}

// ---------------------------
// Particulas, pistas, parallax
// ---------------------------

function createParticle() {
    if (!particles)
        return;

    const particle = document.createElement("span");
    particle.classList.add("particle");
    particle.style.left = Math.random() * window.innerWidth + "px";
    particle.style.animationDuration = (4 + Math.random() * 5) + "s";
    particle.style.opacity = String(Math.random());
    particle.style.transform = "scale(" + (0.3 + Math.random()) + ")";

    particles.appendChild(particle);
    setTimeout(() => {
        particle.remove();
    }, 8000);
}

const hints = [
    "Las respuestas estan mas cerca de lo que parecen.",
    "Piensa con calma...",
    "La magia favorece a los curiosos.",
    "Lee nuevamente el acertijo.",
    "Tal vez el oceano tenga la respuesta."
];

function randomHint() {
    if (!isRiddlePage(currentPage))
        return;

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.innerHTML = hints[Math.floor(Math.random() * hints.length)];
    document.body.appendChild(hint);

    setTimeout(() => {
        hint.remove();
    }, 3200);
}

window.addEventListener("mousemove", e => {
    const bg = document.querySelector(".background");
    if (!bg)
        return;

    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bg.style.transform = `translate(${x}px,${y}px)`;
});

setInterval(createParticle, 180);
setInterval(randomHint, 35000);

// ---------------------------
// Musica ambiental opcional
// ---------------------------

function ensureAudioContext() {
    if (!audioContext)
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function noteToFreq(semitone) {
    return 440 * Math.pow(2, semitone / 12);
}

function playSparkleNote() {
    if (!audioContext || !ambientState.isOn)
        return;

    const melody = [-12, -9, -7, -5, -2, 0, 3];
    const semitone = melody[Math.floor(Math.random() * melody.length)] + 12;
    const freq = noteToFreq(semitone);

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = 1800;

    gain.gain.value = 0.0001;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    osc.start(now);
    osc.stop(now + 1.6);
}

function createDrone() {
    const master = audioContext.createGain();
    master.gain.value = 0.0001;
    master.connect(audioContext.destination);

    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    const gainA = audioContext.createGain();
    const gainB = audioContext.createGain();
    const lowPass = audioContext.createBiquadFilter();
    const lfo = audioContext.createOscillator();
    const lfoDepth = audioContext.createGain();

    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.value = noteToFreq(-17);
    oscB.frequency.value = noteToFreq(-5);

    gainA.gain.value = 0.45;
    gainB.gain.value = 0.2;

    lowPass.type = "lowpass";
    lowPass.frequency.value = 900;

    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    lfoDepth.gain.value = 0.007;

    lfo.connect(lfoDepth);
    lfoDepth.connect(master.gain);

    oscA.connect(gainA);
    oscB.connect(gainB);
    gainA.connect(lowPass);
    gainB.connect(lowPass);
    lowPass.connect(master);

    oscA.start();
    oscB.start();
    lfo.start();

    const now = audioContext.currentTime;
    master.gain.exponentialRampToValueAtTime(0.045, now + 1.4);

    return [oscA, oscB, gainA, gainB, lowPass, master, lfo, lfoDepth];
}

async function startAmbient() {
    ambientState.isOn = true;
    await ambientTrack.play();
    document.body.classList.add("music-on");
    setSoundToggleState(true);
}

function stopAmbient() {
    ambientTrack.pause();
    ambientTrack.currentTime = 0;
    ambientState.isOn = false;
    document.body.classList.remove("music-on");
    setSoundToggleState(false);
}

function setSoundToggleState(isOn) {
    if (!soundToggle)
        return;

    soundToggle.innerHTML = isOn
        ? "Silenciar ambiente"
        : "Activar ambiente";

    soundToggle.setAttribute("aria-pressed", isOn ? "true" : "false");
}

if (soundToggle) {
    soundToggle.addEventListener("click", async () => {
        ensureAudioContext();
        if (!audioContext)
            return;

        if (audioContext.state === "suspended")
            await audioContext.resume();

        if (ambientState.isOn)
            stopAmbient();
        else
            await startAmbient();
    });
}

updateChallengeHub();
showPage(0);