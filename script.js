// Get references to all our elements
const translateButton = document.getElementById('translate-btn');
const powershellInput = document.getElementById('ps-input');
const pythonOutput = document.getElementById('py-output');
const uploadInput = document.getElementById('ps-upload');
const downloadButton = document.getElementById('download-btn');

// --- NEW: Event listener for the file upload ---
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return; // No file selected
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // Put the file content into the textarea
        powershellInput.value = e.target.result;
    };
    reader.readAsText(file);
});


// --- Event listener for the translate button (mostly unchanged) ---
translateButton.addEventListener('click', async () => {
    const psCode = powershellInput.value;
    if (!psCode) {
        alert('Please enter some PowerShell code.');
        return;
    }

    // Reset UI for new translation
    pythonOutput.value = 'Translating...';
    translateButton.disabled = true;
    downloadButton.disabled = true;

    try {
        const response = await fetch('/.netlify/functions/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: psCode })
        });

        if (!response.ok) {
            throw new Error(`Something went wrong. Server status: ${response.status}`);
        }

        const data = await response.json();
        pythonOutput.value = data.pythonCode;
        // Enable download button on success
        downloadButton.disabled = false; 

    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
    } finally {
        translateButton.disabled = false;
    }
});

// --- NEW: Event listener for the download button ---
downloadButton.addEventListener('click', () => {
    const pythonCode = pythonOutput.value;
    if (!pythonCode || pythonCode.startsWith('Error:')) {
        alert("There is no valid Python code to download.");
        return;
    }

    // Create a blob (a file-like object) from the text
    const blob = new Blob([pythonCode], { type: 'text/plain' });

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'translated_script.py'; // The default filename

    // Trigger the download
    document.body.appendChild(link);
    link.click();
    
    // Clean up the temporary link
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});