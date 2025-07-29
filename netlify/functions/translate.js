// 1. Import the Google Generative AI client library
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 2. Initialize the client with your API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    // Make sure the request is a POST request
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 3. Get the data from the frontend
        const { action, code, inputLang, outputLang } = JSON.parse(event.body);

        let prompt;

        // 4. Build the prompt dynamically based on the selected action from the frontend
        switch (action) {
            case 'translate':
                prompt = `You are an expert coder and only provide true, accurate and code that is verified and extremely confident that will successfully work. You do not make up false or nonexistent commands for modules. Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include the markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text.`;
                break;
            case 'explain':
                prompt = `You are an expert coder and teacher. Explain the following ${inputLang} code in simple, clear terms. Provide a step-by-step breakdown of what it does.`;
                break;
            case 'debug':
                prompt = `You are an expert coder. Find and fix any bugs in the following ${inputLang} code. Provide the corrected code in a single code block, and then below it, very briefly explain what you changed and why. Never include markdown notation before or after the codeblock. Use text only.`;
                break;
            case 'add_comments':
                prompt = `You are an expert coder. Add detailed, line-by-line comments to the following ${inputLang} code. Return the full, commented code in a single code block. Never include markdown notation before or after the codeblock. Use text only.`;
                break;
            default:
                // Fallback just in case of an unknown action
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid action specified." }) };
        }
        
        // Append the user's code to the instruction prompt
        const fullPrompt = `${prompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;

        // 5. Select the Gemini model and call the API
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        
        // 6. Extract the text from the Gemini response
        const text = response.text();

        // 7. Return the result to the frontend
        return {
            statusCode: 200,
            // The key here ('pythonCode') must match what the frontend script expects
            body: JSON.stringify({ pythonCode: text }) 
        };

    } catch (error) {
        console.error("API call failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred while processing your request." })
        };
    }
};