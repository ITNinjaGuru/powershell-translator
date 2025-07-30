// Import all necessary client libraries
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Anthropic = require('@anthropic-ai/sdk');

// Initialize all API clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const xai = new OpenAI({
    baseURL: "https://api.xai.com/v1",
    apiKey: process.env.GROK_API_KEY,
});
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { ai_provider, action, code, inputLang, outputLang } = JSON.parse(event.body);

        let userPrompt;
        // This prompt-building logic is the same for all models
        switch (action) {
            case 'translate':
                userPrompt = `Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text.`;
                break;
            // NEW: Case for the optimize action
            case 'optimize':
                userPrompt = `Analyze the following ${inputLang} code and suggest optimizations for performance, readability, and best practices. Provide the optimized code in a single code block, and then below it, explain the changes you made.`;
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
        
        const fullPrompt = `${userPrompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;
        let resultText;
        const systemPrompt = "You are an expert programming assistant and cloud engineer.";

        // --- API ROUTER ---
        switch (ai_provider) {
            case 'grok':
                const grokCompletion = await xai.chat.completions.create({
                    messages: [{ role: "user", content: fullPrompt }],
                    model: "grok-3", 
                });
                resultText = grokCompletion.choices[0].message.content;
                break;

            case 'gemini':
                const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
                const geminiResult = await geminiModel.generateContent(fullPrompt);
                const geminiResponse = await geminiResult.response;
                resultText = geminiResponse.text();
                break;

            case 'chatgpt':
                const openaiCompletion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: fullPrompt }
                    ],
                    model: "gpt-4o", 
                });
                resultText = openaiCompletion.choices[0].message.content;
                break;
            
            case 'claude':
                const claudeCompletion = await anthropic.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: "user", content: fullPrompt }],
                });
                resultText = claudeCompletion.content[0].text;
                break;

            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid AI provider specified." }) };
        }

        // Return the final result to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ pythonCode: resultText }) 
        };

    } catch (error) {
        console.error("API call failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An error occurred with the selected AI provider." })
        };
    }
};