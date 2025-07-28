const translateButton = document.getElementById('translate-btn');
const powershellInput = document.getElementById('ps-input');
const pythonOutput = document.getElementById('py-output');

translateButton.addEventListener('click', async () => {
    const psCode = powershellInput.value;
    if (!psCode) {
        alert('Please enter some PowerShell code.');
        return;
    }

    pythonOutput.value = 'Translating...';
    translateButton.disabled = true;

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

    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
    } finally {
        translateButton.disabled = false;
    }
});