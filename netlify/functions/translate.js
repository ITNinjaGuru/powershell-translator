// Import all necessary client libraries
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { user_api_key, ai_provider, model_version, action, code, inputLang, outputLang } = JSON.parse(event.body);

        if (!user_api_key) {
            return { statusCode: 400, body: JSON.stringify({ error: "API key is missing." }) };
        }


        let userPrompt;
        // This prompt-building logic is the same for all models
        switch (action) {
            case 'translate':
                userPrompt = `Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text. If comment or remark is added, it must be commented out so it does not affect the code.`;
                break;
            // NEW: Case for the optimize action
            case 'optimize':
                userPrompt = `Analyze the following ${inputLang} code and suggest optimizations for performance, efficiency, security and best practices. Do not include markdown delimiters like \`\`\`python or \`\`\`. Provide the optimized code in a single code block, and then below it, a commented out explain the changes you made. I emphasize the commenting out of these notes.`;
                break;
            case 'explain':
                userPrompt = `Explain the following ${inputLang} code in simple, clear terms. Use markdown for formatting. Provide a step-by-step breakdown of what it does. Do not include markdown delimiters like \`\`\`python or \`\`\`. The comments should be commented out so they do not affect the code.`;
                break;
            case 'debug':
                userPrompt = `Find and fix any bugs in the following ${inputLang} code. Provide the corrected code in a single code block, and then below it, explain what you changed and why in a commented out section.  Do not include markdown delimiters like \`\`\`python or \`\`\`. The comments should be commented out so they do not affect the code.`;
                break;
            case 'add_comments':
                userPrompt = `Add detailed, line-by-line comments to the following ${inputLang} code. Return the full, commented code in a single code block. Do not include markdown delimiters like \`\`\`python or \`\`\`. The comments should be commented out so they do not affect the code.`;
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid action specified." }) };
        }
        
        const fullPrompt = `${userPrompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;
        let resultText;
        const systemPrompt = "You are an expert programming assistant and cloud engineer.";

        switch (ai_provider) {
            case 'gemini':
                const genAI = new GoogleGenerativeAI(user_api_key);
                const geminiModel = genAI.getGenerativeModel({ model: model_version });
                const geminiResult = await geminiModel.generateContent(fullPrompt);
                const geminiResponse = await geminiResult.response;
                resultText = geminiResponse.text();
                break;

            case 'chatgpt':
                const openai = new OpenAI({ apiKey: user_api_key });
                const openaiCompletion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: fullPrompt }],
                    model: model_version, 
                });
                resultText = openaiCompletion.choices[0].message.content;
                break;
            
            case 'claude':
                const anthropic = new Anthropic({ apiKey: user_api_key });
                const claudeCompletion = await anthropic.messages.create({
                    model: model_version,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: "user", content: fullPrompt }],
                });
                resultText = claudeCompletion.content[0].text;
                break;

            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid AI provider specified." }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ pythonCode: resultText }) 
        };

    } catch (error) {
        console.error("API call failed:", error);
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An error occurred with the selected AI provider: ${errorMessage}` })
        };
    }
};
