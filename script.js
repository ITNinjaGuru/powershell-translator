// --- 1. SUPABASE SETUP ---
const SUPABASE_URL = 'https://dlsbcrwkmjzhdwyzsola.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsc2JjcndrbWp6aGR3eXpzb2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzAxNTQsImV4cCI6MjA2OTQwNjE1NH0.VqsHrjA3-FHNCoiDmRDiOFZwnblrl-AZrEAtC6vRUHY';
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Get references to all interactive DOM elements ---
const translateButton = document.getElementById('translate-btn');
const codeInput = document.getElementById('code-input');
const pythonOutput = document.getElementById('py-output');
const uploadInput = document.getElementById('ps-upload');
const downloadButton = document.getElementById('download-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const actionSelect = document.getElementById('action-select');
const inputLangSelect = document.getElementById('input-lang');
const outputLangSelect = document.getElementById('output-lang');
const aiProviderSelect = document.getElementById('ai-provider-select');
const authButton = document.getElementById('auth-btn');
// NEW: Settings modal elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveKeysBtn = document.getElementById('save-keys-btn');
// NEW: History list
const historyList = document.getElementById('history-list');

// --- 2. AUTHENTICATION LOGIC ---
let currentUser = null;

async function signInWithGithub() {
    const { error } = await _supabase.auth.signInWithOAuth({ provider: 'github' });
    if (error) showNotification(`Error: ${error.message}`);
}

async function signOut() {
    const { error } = await _supabase.auth.signOut();
    if (error) showNotification(`Error: ${error.message}`);
}

function updateAuthUI(user) {
    currentUser = user;
    if (user) {
        authButton.textContent = 'Logout';
        authButton.onclick = signOut;
        settingsBtn.style.display = 'block'; // Show settings when logged in
        loadHistory(); // Load user's history
    } else {
        authButton.textContent = 'Login with GitHub';
        authButton.onclick = signInWithGithub;
        settingsBtn.style.display = 'none'; // Hide settings when logged out
        historyList.innerHTML = '<li>Login to see your history.</li>';
    }
}

_supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session?.user);
});

async function checkInitialSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    updateAuthUI(session?.user);
}
checkInitialSession();

// --- 3. SETTINGS MODAL & API KEYS ---
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    // TODO: When modal opens, load and display existing user keys
});
closeModalBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});
saveKeysBtn.addEventListener('click', () => {
    // TODO: Save the keys from the input fields to Supabase
    showNotification('API Keys saved!'); // Placeholder
    settingsModal.style.display = 'none';
});

// --- 4. CONVERSATION HISTORY ---
async function saveConversation(payload, result) {
    if (!currentUser) return; // Don't save if not logged in
    console.log("Saving conversation...", { ...payload, output: result });
    // TODO: Add Supabase code to insert into 'conversations' table
}

async function loadHistory() {
    if (!currentUser) return;
    historyList.innerHTML = '<li>Loading...</li>';
    console.log("Loading history...");
    // TODO: Add Supabase code to fetch from 'conversations' table
    // For now, here's some placeholder data:
    const mockHistory = [
        { id: 1, input_code: 'Get-Process', created_at: new Date().toISOString() },
        { id: 2, input_code: 'Write-Host "Hello"', created_at: new Date().toISOString() },
    ];
    renderHistory(mockHistory);
}

function renderHistory(items) {
    historyList.innerHTML = '';
    if (items.length === 0) {
        historyList.innerHTML = '<li>No history yet.</li>';
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.input_code.split('\n')[0]; // Show first line
        li.title = `Ran on ${new Date(item.created_at).toLocaleString()}`;
        // TODO: Add click event listener to load this conversation
        historyList.appendChild(li);
    });
}

// --- 5. CORE APP LOGIC (API Calls, etc.) ---
let uploadedFileName = null;
const translationCache = new Map();
const maxCacheSize = 50;

async function callApi(payload) {
    // This function is now just for making the call, not caching
    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMessage = `API Error: Server responded with status ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || JSON.stringify(errorData);
        } catch (e) {
            const textError = await response.text();
            if (textError) errorMessage = textError;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

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
        const data = await callApi(payload);
        const result = data.pythonCode;
        pythonOutput.value = result;
        pythonOutput.style.opacity = '1';
        downloadButton.disabled = false;
        
        // Save to history after a successful call
        saveConversation(payload, result);
        // Refresh history list to show the new item
        loadHistory();

    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
        pythonOutput.style.opacity = '1';
    } finally {
        loadingSpinner.style.display = 'none';
        translateButton.disabled = false;
    }
}

// Event Listeners (Upload, Process, Download)
translateButton.addEventListener('click', handleApiCall);
uploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) { uploadedFileName = null; return; }
    uploadedFileName = file.name.split('.').slice(0, -1).join('.');
    const reader = new FileReader();
    reader.onload = (e) => { codeInput.value = e.target.result; };
    reader.readAsText(file);
});
downloadButton.addEventListener('click', () => {
    const outputContent = pythonOutput.value;
    if (!outputContent || outputContent.startsWith('Error:')) { showNotification('No valid code to download.'); return; }
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

// Particles.js
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
