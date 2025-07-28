// Get references to all elements
const translateButton = document.getElementById('translate-btn');
const powershellInput = document.getElementById('ps-input');
const pythonOutput = document.getElementById('py-output');
const uploadInput = document.getElementById('ps-upload');
const downloadButton = document.getElementById('download-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const livePreviewToggle = document.getElementById('live-preview'); // Optional, if toggle is added

// Translation cache
const translationCache = new Map();
const maxCacheSize = 50;

async function translateCode(psCode) {
    if (translationCache.has(psCode)) {
        return translationCache.get(psCode);
    }

    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: psCode })
    });

    if (!response.ok) {
        throw new Error(`Something went wrong. Server status: ${response.status}`);
    }

    const data = await response.json();
    translationCache.set(psCode, data.pythonCode);
    if (translationCache.size > maxCacheSize) {
        translationCache.clear();
    }
    return data.pythonCode;
}

// Notification function
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// File upload
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        showNotification('No file selected.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        powershellInput.value = e.target.result;
        if (livePreviewToggle && livePreviewToggle.checked) {
            translateButton.click(); // Trigger translation if live preview is enabled
        }
    };
    reader.readAsText(file);
});

// Real-time preview (optional)
let debounceTimeout;
if (livePreviewToggle) {
    powershellInput.addEventListener('input', () => {
        if (!livePreviewToggle.checked) return;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            const psCode = powershellInput.value;
            if (!psCode) {
                pythonOutput.value = '';
                downloadButton.disabled = true;
                return;
            }

            loadingSpinner.style.display = 'block';
            pythonOutput.style.opacity = '0';
            try {
                pythonOutput.value = await translateCode(psCode);
                pythonOutput.style.opacity = '1';
                downloadButton.disabled = false;
            } catch (error) {
                pythonOutput.value = `Error: ${error.message}`;
                pythonOutput.style.opacity = '1';
            } finally {
                loadingSpinner.style.display = 'none';
            }
        }, 1000);
    });
}

// Translate button
translateButton.addEventListener('click', async () => {
    const psCode = powershellInput.value;
    if (!psCode) {
        showNotification('Please enter some PowerShell code.');
        return;
    }

    loadingSpinner.style.display = 'block';
    pythonOutput.style.opacity = '0';
    pythonOutput.value = '';
    translateButton.disabled = true;
    downloadButton.disabled = true;

    try {
        pythonOutput.value = await translateCode(psCode);
        pythonOutput.style.opacity = '1';
        downloadButton.disabled = false;
    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
        pythonOutput.style.opacity = '1';
    } finally {
        loadingSpinner.style.display = 'none';
        translateButton.disabled = false;
    }
});

// Download button
downloadButton.addEventListener('click', () => {
    const pythonCode = pythonOutput.value;
    if (!pythonCode || pythonCode.startsWith('Error:')) {
        showNotification('No valid Python code to download.');
        return;
    }

    const blob = new Blob([pythonCode], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'translated_script.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});

// Social sharing
document.querySelector('.x-icon').addEventListener('click', () => {
    const pythonCode = pythonOutput.value;
    if (!pythonCode || pythonCode.startsWith('Error:')) {
        showNotification('No valid Python code to share.');
        return;
    }
    const shareText = `Converted my PowerShell script to Python with PoSh to Py! #PoShToPy\n\n${pythonCode.slice(0, 100)}...`;
    const shareUrl = `https://x.com/share?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank');
});

document.querySelector('.github-icon').addEventListener('click', () => {
    const pythonCode = pythonOutput.value;
    if (!pythonCode || pythonCode.startsWith('Error:')) {
        showNotification('No valid Python code to share.');
        return;
    }
    showNotification('GitHub sharing is not implemented yet. Try sharing on X!');
});

// Particle background (if included)
if (document.getElementById('particles-js')) {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#7a5af8' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#7a5af8', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 2 }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } }
        }
    });
}