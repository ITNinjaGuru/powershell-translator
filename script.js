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
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveKeysBtn = document.getElementById('save-keys-btn');
const historyList = document.getElementById('history-list');
const modelVersionSelect = document.getElementById('model-version-select');

// --- Model Definitions ---
const modelsByProvider = {
    claude: [
        { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4' },
        { id: 'claude-3-opus-20240229', name: 'Opus 3' },
        { id: 'claude-3.5-sonnet-20240620', name: 'Sonnet 3.5' },
    ],
    chatgpt: [
        { id: 'chatgpt-4o-latest', name: 'GPT-4o-latest' },
        { id: 'o4-mini-2025-04-16', name: 'GPT-o4-mini' },
        { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1' },
    ],
    gemini: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
        
    ],
    grok: [
        { id: 'grok-4-0709', name: 'Grok 4' },
        { id: 'grok-3', name: 'Grok 3' },
        { id: 'grok-3-mini', name: 'Grok 3 mini' },
    ]
};

function populateModels() {
    const provider = aiProviderSelect.value;
    const models = modelsByProvider[provider] || [];
    modelVersionSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelVersionSelect.appendChild(option);
    });
}

// --- 2. AUTHENTICATION LOGIC ---
let currentUser = null;
let userApiKeys = {}; // Local cache for user's keys

async function signInWithGithub() { const { error } = await _supabase.auth.signInWithOAuth({ provider: 'github' }); if (error) showNotification(`Error: ${error.message}`); }
async function signOut() { const { error } = await _supabase.auth.signOut(); if (error) showNotification(`Error: ${error.message}`); }

async function updateAuthUI(user) {
    currentUser = user;
    if (user) {
        authButton.textContent = 'Logout';
        authButton.onclick = signOut;
        settingsBtn.style.display = 'block';
        await loadUserApiKeys(); // Load keys on login
        loadHistory();
    } else {
        authButton.textContent = 'Login with GitHub';
        authButton.onclick = signInWithGithub;
        settingsBtn.style.display = 'none';
        historyList.innerHTML = '<li>Login to see your history.</li>';
        userApiKeys = {}; // Clear keys on logout
    }
}

_supabase.auth.onAuthStateChange((event, session) => { updateAuthUI(session?.user); });
async function checkInitialSession() { const { data: { session } } = await _supabase.auth.getSession(); updateAuthUI(session?.user); }

// --- 3. SETTINGS MODAL & API KEYS ---
async function loadUserApiKeys() {
    if (!currentUser) return;
    const { data, error } = await _supabase.from('user_api_keys').select('*').single();
    if (data) {
        userApiKeys = data;
    } else {
        userApiKeys = {}; // Reset if no keys found
    }
}

settingsBtn.addEventListener('click', async () => {
    await loadUserApiKeys(); // Ensure we have the latest keys
    document.getElementById('openai-key').value = userApiKeys.openai_key || '';
    document.getElementById('gemini-key').value = userApiKeys.gemini_key || '';
    document.getElementById('claude-key').value = userApiKeys.claude_key || '';
    document.getElementById('grok-key').value = userApiKeys.grok_key || '';
    settingsModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; });

// --- UPDATED: Robust "Save Keys" button logic ---
saveKeysBtn.addEventListener('click', async () => {
    if (!currentUser) return showNotification('You must be logged in to save keys.');
    
    const keysToSave = {
        id: currentUser.id, // This is the user's UUID
        openai_key: document.getElementById('openai-key').value.trim(),
        gemini_key: document.getElementById('gemini-key').value.trim(),
        claude_key: document.getElementById('claude-key').value.trim(),
        grok_key: document.getElementById('grok-key').value.trim(),
    };

    try {
        // Provide user feedback that something is happening
        saveKeysBtn.disabled = true;
        saveKeysBtn.textContent = 'Saving...';

        const { error } = await _supabase.from('user_api_keys').upsert(keysToSave);

        if (error) {
            // If there's an error, throw it to be caught by the catch block
            throw error;
        }

        showNotification('API Keys saved successfully!');
        userApiKeys = keysToSave; // Update local cache
        settingsModal.style.display = 'none'; // Close modal on success

    } catch (error) {
        showNotification(`Error saving keys: ${error.message}`);
        console.error("Error saving keys:", error);
    } finally {
        // This always runs, ensuring the button is usable again
        saveKeysBtn.disabled = false;
        saveKeysBtn.textContent = 'Save Keys';
    }
});

// --- 4. CONVERSATION HISTORY ---
async function saveConversation(payload, result) {
    if (!currentUser) return;
    const { error } = await _supabase.from('conversations').insert({
        user_id: currentUser.id,
        payload: payload,
        result: result
    });
    if (error) console.error("Error saving history:", error);
}

async function loadHistory() {
    if (!currentUser) return;
    historyList.innerHTML = '<li>Loading...</li>';
    const { data, error } = await _supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
    
    if (error) {
        historyList.innerHTML = '<li>Error loading history.</li>';
    } else {
        renderHistory(data);
    }
}

function renderHistory(items) {
    historyList.innerHTML = '';
    if (!items || items.length === 0) {
        historyList.innerHTML = '<li>No history yet.</li>';
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        const firstLine = item.payload.code.split('\n')[0];
        li.textContent = firstLine.length > 30 ? firstLine.substring(0, 27) + '...' : firstLine;
        li.title = `Ran on ${new Date(item.created_at).toLocaleString()}`;
        li.onclick = () => {
            codeInput.value = item.payload.code;
            pythonOutput.value = item.result;
            aiProviderSelect.value = item.payload.ai_provider;
            populateModels();
            modelVersionSelect.value = item.payload.model_version;
            actionSelect.value = item.payload.action;
            inputLangSelect.value = item.payload.inputLang;
            outputLangSelect.value = item.payload.outputLang;
        };
        historyList.appendChild(li);
    });
}


// --- 5. CORE APP LOGIC ---
async function callApi(payload) {
    const response = await fetch('/.netlify/functions/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        let errorMessage = `API Error: Server responded with status ${response.status}`;
        try { const errorData = await response.json(); errorMessage = errorData.error || JSON.stringify(errorData); } catch (e) { const textError = await response.text(); if (textError) errorMessage = textError; }
        throw new Error(errorMessage);
    }
    return response.json();
}

async function handleApiCall() {
    if (!currentUser) {
        showNotification('Please log in to use the app.');
        return;
    }

    const providerKeyMap = {
        chatgpt: 'openai_key',
        gemini: 'gemini_key',
        claude: 'claude_key',
        grok: 'grok_key'
    };
    const provider = aiProviderSelect.value;
    const requiredKey = providerKeyMap[provider];
    const userApiKey = userApiKeys[requiredKey];

    if (!userApiKey) {
        showNotification(`Please add your ${provider} API key in settings.`);
        settingsModal.style.display = 'flex';
        return;
    }

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
        user_api_key: userApiKey,
        ai_provider: provider,
        model_version: modelVersionSelect.value,
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
        await saveConversation(payload, result);
        await loadHistory();
    } catch (error) {
        pythonOutput.value = `Error: ${error.message}`;
        pythonOutput.style.opacity = '1';
    } finally {
        loadingSpinner.style.display = 'none';
        translateButton.disabled = false;
    }
}

// --- EVENT LISTENERS ---
aiProviderSelect.addEventListener('change', populateModels);
translateButton.addEventListener('click', handleApiCall);
uploadInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) { uploadedFileName = null; return; } uploadedFileName = file.name.split('.').slice(0, -1).join('.'); const reader = new FileReader(); reader.onload = (e) => { codeInput.value = e.target.result; }; reader.readAsText(file); });
downloadButton.addEventListener('click', () => { const outputContent = pythonOutput.value; if (!outputContent || outputContent.startsWith('Error:')) { showNotification('No valid code to download.'); return; } const blob = new Blob([outputContent], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); const action = actionSelect.value; let filename; const lang = outputLangSelect.options[outputLangSelect.selectedIndex].text.toLowerCase(); const extensionMap = { 'python': 'py', 'javascript': 'js', 'powershell': 'ps1', 'c#': 'cs', 'go': 'go' }; const extension = extensionMap[lang] || 'txt'; if ((action === 'translate' || action === 'add_comments' || action === 'debug') && uploadedFileName) { filename = `${uploadedFileName}.${extension}`; } else { switch(action) { case 'translate': filename = `translated_script.${extension}`; break; case 'explain': filename = 'explanation.txt'; break; case 'debug': filename = `debugged_script.${extension}`; break; case 'add_comments': filename = `commented_script.${extension}`; break; default: filename = 'result.txt'; } } link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); });

// --- INITIALIZATION ---
checkInitialSession();
populateModels();

// --- UPDATED: Particles.js ---
// Restored the full configuration object
if (document.getElementById('particles-js')) {
    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 80,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#7DF9FF"
            },
            "shape": {
                "type": "circle"
            },
            "opacity": {
                "value": 0.5,
                "random": true
            },
            "size": {
                "value": 3,
                "random": true
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#7DF9FF",
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "out_mode": "out"
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "repulse"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            }
        },
        "retina_detect": true
    });
}