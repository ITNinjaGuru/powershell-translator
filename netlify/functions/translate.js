// 1. Import the OpenAI client library (we use this to talk to xAI's compatible API)
const OpenAI = require("openai");

// 2. Initialize the client to point to the xAI API
const xai = new OpenAI({
    // Point to the xAI API endpoint
    baseURL: "https://api.xai.com/v1",
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

        // 5. Call the xAI Chat Completions API
        const chatCompletion = await xai.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert programming assistant." },
                { role: "user", content: fullPrompt }
            ],
            // Using the Grok model you specified
            model: "grok-4-0709", 
        });
        
        // 6. Extract the text from the Grok response
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