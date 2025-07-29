// 1. Import the OpenAI client library (we use this to talk to Groq's API)
const OpenAI = require("openai");

// 2. Initialize the client to point to the Groq API
const groq = new OpenAI({
    // Point to the Groq API endpoint
    baseURL: "https://api.groq.com/openai/v1",
    // Use your GROK_API_KEY from Netlify environment variables
    apiKey: process.env.GROK_API_KEY,
});

exports.handler = async (event) => {
    // Make sure the request is a POST request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 3. Get the data from the frontend
        const { action, code, inputLang, outputLang } = JSON.parse(event.body);

        let userPrompt;

        // 4. Build the prompt dynamically based on the selected action
        switch (action) {
            case 'translate':
                userPrompt = `Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text.`;
                break;
            case 'explain':
                userPrompt = `Explain the following ${inputLang} code in simple, clear terms. Use markdown for formatting. Provide a step-by-step breakdown of what it does.`;
                break;
            case 'debug':
                userPrompt = `Find and fix any bugs in the following ${inputLang} code. Provide the corrected code in a single code block, and then below it, explain what you changed and why.`;
                break;
            case 'add_comments':
                userPrompt = `Add detailed, line-by-line comments to the following ${inputLang} code. Return the full, commented code in a single code block.`;
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid action specified." }) };
        }
        
        // Append the user's code to the instruction prompt
        const fullPrompt = `${userPrompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;

        // 5. Call the Groq Chat Completions API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert programmer across all scripting languages.  You are also an expert assistant. You only supply code that has a high rate of success and does not include made up commands or modules that do not exist." },
                { role: "user", content: fullPrompt }
            ],
            // Using a powerful Llama 3 model hosted by Groq
            model: "grok-4-0709", 
        });
        
        // 6. Extract the text from the Groq response
        const result = chatCompletion.choices[0].message.content;

        // 7. Return the result to the frontend
        return {
            statusCode: 200,
            // The key here ('pythonCode') must match what the frontend script expects
            body: JSON.stringify({ pythonCode: result }) 
        };

    } catch (error) {
        console.error("API call failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred while processing your request." })
        };
    }
};