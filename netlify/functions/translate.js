// 1. Import the OpenAI client library
const { OpenAI } = require("openai");

// 2. Initialize the client with your API key from environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
                userPrompt = `You are a coding expert. Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text.`;
                break;
            case 'explain':
                userPrompt = `You are a coding expert. Explain the following ${inputLang} code in simple, clear terms. Use markdown for formatting. Provide a step-by-step breakdown of what it does.`;
                break;
            case 'debug':
                userPrompt = `You are a coding expert. Find and fix any bugs in the following ${inputLang} code. Provide the corrected code in a single code block, and then below it, explain what you changed and why.`;
                break;
            case 'add_comments':
                userPrompt = `You are a coding expert. Add detailed, line-by-line comments to the following ${inputLang} code. Return the full, commented code in a single code block.`;
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid action specified." }) };
        }
        
        // Append the user's code to the instruction prompt
        const fullPrompt = `${userPrompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;

        // 5. Call the OpenAI Chat Completions API
        const completion = await openai.chat.completions.create({
            // Using gpt-3.5-turbo is a good, cost-effective starting point.
            // You can upgrade to "gpt-4" or other models later.
            model: "gpt-4o", 
            messages: [
                { role: "system", content: "You are an expert programmer and assistant." },
                { role: "user", content: fullPrompt }
            ],
        });
        
        // 6. Extract the text from the OpenAI response
        const result = completion.choices[0].message.content;

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