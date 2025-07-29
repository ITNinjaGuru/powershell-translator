// Get references to all interactive DOM elements
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

// Global variable to store the name of an uploaded file, without extension
let uploadedFileName = null;

// Simple cache to store recent API results
const translationCache = new Map();
const maxCacheSize = 50;

/**
 * Sends a payload to the backend API function.
 * Checks cache first to avoid redundant calls.
 * @param {object} payload The data to send to the API.
 * @returns {Promise<string>} The text result from the API.
 */
async function callApi(payload) {
    const cacheKey = JSON.stringify(payload);
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    // Replace '/.netlify/functions/translate' with your actual API endpoint
    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API Error: Server responded with status ${response.status}`);
    }

    const data = await response.json();
    // Assuming your backend returns the result in a key named 'pythonCode' or similar
    const result = data.pythonCode; 
    
    // Update cache
    translationCache.set(cacheKey, result);
    if (translationCache.size > maxCacheSize) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey); // Evict oldest entry
    }
    return result;
}

/**
 * Displays a temporary notification message on the screen.
 * @param {string} message The message to display.
 */
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Hides the "To:" language dropdown if the action is not 'translate'
actionSelect.addEventListener('change', () => {
    const isTranslate = actionSelect.value === 'translate';
    outputLangSelect.disabled = !isTranslate;
    outputLangSelect.parentElement.style.display = isTranslate ? 'flex' : 'none';
});

// Handles file uploads
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        uploadedFileName = null;
        showNotification('No file selected.');
        return;
    }
    
    // Store filename without extension for later use
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

/**
 * The main function to process the user's request.
 * It gathers all inputs, calls the API, and updates the UI.
 */
async function handleApiCall() {
    const code = codeInput.value;
    if (!code.trim()) {
        if (event && event.type !== 'input') {
            showNotification('Please enter some code.');
        }
        pythonOutput.value = '';
        return;
    }

    // Show loading state
    loadingSpinner.style.display = 'block';
    pythonOutput.style.opacity = '0';
    pythonOutput.value = '';
    translateButton.disabled = true;
    downloadButton.disabled = true;

    // Construct the payload from all user selections
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
        // Hide loading state
        loadingSpinner.style.display = 'none';
        translateButton.disabled = false;
    }
}

// Debounce logic for live preview to avoid excessive API calls
let debounceTimeout;
codeInput.addEventListener('input', () => {
    // If user types manually, forget the uploaded filename
    uploadedFileName = null; 
    if (!livePreviewToggle.checked) return;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleApiCall, 1000);
});

// Trigger the API call when the main button is clicked
translateButton.addEventListener('click', handleApiCall);

// Handles downloading the output content with a smart filename
downloadButton.addEventListener('click', () => {
    const outputContent = pythonOutput.value;
    if (!outputContent || outputContent.startsWith('Error:')) {
        showNotification('No valid code to download.');
        return;
    }

    const blob = new Blob([outputContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const action = actionSelect.value;
    let filename;

    // Map languages to their common file extensions
    const lang = outputLangSelect.options[outputLangSelect.selectedIndex].text.toLowerCase();
    const extensionMap = { 'python': 'py', 'javascript': 'js', 'powershell': 'ps1', 'c#': 'cs', 'go': 'go' };
    const extension = extensionMap[lang] || 'txt';

    // Use the uploaded filename if it exists and the action produces code
    if ((action === 'translate' || action === 'add_comments' || action === 'debug') && uploadedFileName) {
        filename = `${uploadedFileName}.${extension}`;
    } else {
        // Otherwise, use generic fallback names based on the action
        switch(action) {
            case 'translate':
                filename = `translated_script.${extension}`;
                break;
            case 'explain':
                filename = 'explanation.txt';
                break;
            case 'debug':
                filename = `debugged_script.${extension}`;
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

// Placeholder for social sharing logic
const xIcon = document.querySelector('.x-icon');
if (xIcon) {
    xIcon.addEventListener('click', (e) => { e.preventDefault(); showNotification('Share on X coming soon!'); });
}
const githubIcon = document.querySelector('.github-icon');
if (githubIcon) {
    githubIcon.addEventListener('click', (e) => { e.preventDefault(); showNotification('Share on GitHub coming soon!'); });
}

// Initialize the particle.js background
if (document.getElementById('particles-js')) {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#00bfff' }, // DeepSkyBlue
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#00bfff', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2 }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } }
        }
    });
}