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
const aiProviderSelect = document.getElementById('ai-provider-select');

let uploadedFileName = null;
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

    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // --- UPDATED: Robust Error Handling ---
    if (!response.ok) {
        let errorMessage = `API Error: Server responded with status ${response.status}`;
        try {
            // Try to get a specific error message from the API's JSON response
            const errorData = await response.json();
            errorMessage = errorData.error || JSON.stringify(errorData);
        } catch (e) {
            // If the error response wasn't JSON, try to read it as plain text
            const textError = await response.text();
            if (textError) {
                errorMessage = textError;
            }
        }
        // This throws a more informative error instead of crashing
        throw new Error(errorMessage);
    }
    // --- END OF UPDATE ---

    const data = await response.json();
    const result = data.pythonCode; 
    
    translationCache.set(cacheKey, result);
    if (translationCache.size > maxCacheSize) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
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
    outputLangSelect.parentElement.style.display = isTranslate ? 'flex' : 'none';
});

uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        uploadedFileName = null;
        return;
    }
    
    uploadedFileName = file.name.split('.').slice(0, -1).join('.');

    const reader = new FileReader();
    reader.onload = (e) => {
        codeInput.value = e.target.result;
    };
    reader.readAsText(file);
});

async function handleApiCall() {
    const code = codeInput.value;
    if (!code.trim()) {
        showNotification('Please enter some code.');
        return;
    }

    loadingSpinner.style.display = 'block';
    pythonOutput.style.opacity = '0';
    pythonOutput.value = '';
    translateButton.disabled = true;
    downloadButton.disabled = true;

    const payload = {
        ai_provider: aiProviderSelect.value,
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
let isPasting = false;

codeInput.addEventListener('paste', () => {
    isPasting = true;
    uploadedFileName = null;
});

codeInput.addEventListener('input', () => {
    if (isPasting) {
        isPasting = false;
        return;
    }
    uploadedFileName = null; 
    if (!livePreviewToggle.checked) return;
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(handleApiCall, 1000);
});

translateButton.addEventListener('click', handleApiCall);

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
    const lang = outputLangSelect.options[outputLangSelect.selectedIndex].text.toLowerCase();
    const extensionMap = { 'python': 'py', 'javascript': 'js', 'powershell': 'ps1', 'c#': 'cs', 'go': 'go' };
    const extension = extensionMap[lang] || 'txt';
    if ((action === 'translate' || action === 'add_comments' || action === 'debug') && uploadedFileName) {
        filename = `${uploadedFileName}.${extension}`;
    } else {
        switch(action) {
            case 'translate': filename = `translated_script.${extension}`; break;
            case 'explain': filename = 'explanation.txt'; break;
            case 'debug': filename = `debugged_script.${extension}`; break;
            case 'add_comments': filename = `commented_script.${extension}`; break;
            default: filename = 'result.txt';
        }
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});

const xIcon = document.querySelector('.x-icon');
if (xIcon) { xIcon.addEventListener('click', (e) => { e.preventDefault(); showNotification('Share on X coming soon!'); }); }
const githubIcon = document.querySelector('.github-icon');
if (githubIcon) { githubIcon.addEventListener('click', (e) => { e.preventDefault(); showNotification('Share on GitHub coming soon!'); }); }

if (document.getElementById('particles-js')) {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#7DF9FF' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#7DF9FF', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2 }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } }
        }
    });
}