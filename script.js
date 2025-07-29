// Get references to all elements
const translateButton = document.getElementById('translate-btn');
const codeInput = document.getElementById('code-input');
const pythonOutput = document.getElementById('py-output');
const uploadInput = document.getElementById('ps-upload');
const downloadButton = document.getElementById('download-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const livePreviewToggle = document.getElementById('live-preview');

const actionSelect = document.getElementById('action-select');
const inputLangSelect = document.getElementById('input-lang');
const outputLangSelect = document.getElementById('output-lang');

// --- NEW: Variable to store the original filename ---
let uploadedFileName = null;
// --- END NEW ---

// Translation cache
const translationCache = new Map();
const maxCacheSize = 50;

async function callApi(payload) {
    const cacheKey = JSON.stringify(payload);
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Something went wrong. Server status: ${response.status}`);
    }

    const data = await response.json();
    const result = data.pythonCode;
    
    translationCache.set(cacheKey, result);
    if (translationCache.size > maxCacheSize) {
        translationCache.clear();
    }
    return result;
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

actionSelect.addEventListener('change', () => {
    const isTranslate = actionSelect.value === 'translate';
    outputLangSelect.disabled = !isTranslate;
});

// --- MODIFIED: File upload listener ---
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        uploadedFileName = null; // Reset if no file is chosen
        showNotification('No file selected.');
        return;
    }
    
    // Store the filename without its original extension
    uploadedFileName = file.name.split('.').slice(0, -1).join('.');

    const reader = new FileReader();
    reader.onload = (e) => {
        codeInput.value = e.target.result;
        if (livePreviewToggle.checked) {
            handleApiCall();
        }
    };
    reader.readAsText(file);
});
// --- END MODIFIED ---

async function handleApiCall() {
    const code = codeInput.value;
    if (!code) {
        if (event.type !== 'input') {
            showNotification('Please enter some code.');
        }
        pythonOutput.value = '';
        return;
    }

    loadingSpinner.style.display = 'block';
    pythonOutput.style.opacity = '0';
    pythonOutput.value = '';
    translateButton.disabled = true;
    downloadButton.disabled = true;

    const payload = {
        action: actionSelect.value,
        code: code,
        inputLang: inputLangSelect.value,
        outputLang: outputLangSelect.value
    };

    try {
        const result = await callApi(payload);
        pythonOutput.value = result;
        pythonOutput.style.opacity = '1';
        downloadButton.disabled = false;
    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
        pythonOutput.style.opacity = '1';
    } finally {
        loadingSpinner.style.display = 'none';
        translateButton.disabled = false;
    }
}

let debounceTimeout;
// --- MODIFIED: Live preview listener ---
codeInput.addEventListener('input', () => {
    uploadedFileName = null; // Reset filename if user types manually
    if (!livePreviewToggle.checked) return;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleApiCall, 1000);
});
// --- END MODIFIED ---

translateButton.addEventListener('click', handleApiCall);

// --- MODIFIED: Download button logic ---
downloadButton.addEventListener('click', () => {
    const pythonCode = pythonOutput.value;
    if (!pythonCode || pythonCode.startsWith('Error:')) {
        showNotification('No valid code to download.');
        return;
    }

    const blob = new Blob([pythonCode], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const action = actionSelect.value;
    let filename;

    // Determine the correct file extension based on the output language
    const lang = outputLangSelect.options[outputLangSelect.selectedIndex].text.toLowerCase();
    const extensionMap = { 'python': 'py', 'javascript': 'js', 'powershell': 'ps1', 'c#': 'cs', 'go': 'go' };
    const extension = extensionMap[lang] || 'txt';

    // Use the uploaded filename if it exists and the action is 'translate'
    if (action === 'translate' && uploadedFileName) {
        filename = `${uploadedFileName}.${extension}`;
    } else {
        // Otherwise, use the generic fallback names
        switch(action) {
            case 'translate':
                filename = `translated_script.${extension}`;
                break;
            case 'explain':
                filename = 'explanation.txt';
                break;
            case 'debug':
                filename = 'debugged_code.txt';
                break;
            case 'add_comments':
                filename = `commented_script.${extension}`;
                break;
            default:
                filename = 'result.txt';
        }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});
// --- END MODIFIED ---

// Social sharing
const xIcon = document.querySelector('.x-icon');
if (xIcon) {
    xIcon.addEventListener('click', () => { /* Share logic here */ });
}
const githubIcon = document.querySelector('.github-icon');
if (githubIcon) {
    githubIcon.addEventListener('click', () => { /* Share logic here */ });
}

// Particle background
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ff00ff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#ff00ff', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2 }
    },
    interactivity: {
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } }
    }
});