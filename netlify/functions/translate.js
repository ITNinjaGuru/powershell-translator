// Import AI SDKs
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
        if (!model_version) {
            return { statusCode: 400, body: JSON.stringify({ error: "Model version is missing." }) };
        }

        // Truncate overly large code/description to avoid token errors
        const safeCode = code.length > 8000 ? code.substring(0, 8000) + "\n// ... truncated ..." : code;

        let userPrompt;
        switch (action) {
            case 'create':
                userPrompt = `Generate a new ${outputLang} script based on the following description. The script MUST be complete, functional, and ready to run. Your response MUST contain ONLY the raw code itself. Do not add any explanation, notes, or markdown delimiters.`;
                break;
            case 'translate':
                userPrompt = `Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. If you add any remarks, they MUST be commented out.`;
                break;
            case 'optimize':
                userPrompt = `Analyze the following ${inputLang} code and suggest optimizations for performance, efficiency, security, and best practices. Provide the optimized code, then below it, a commented-out explanation of the changes.`;
                break;
            case 'explain':
                userPrompt = `Explain the following ${inputLang} code step-by-step. All explanations MUST be commented out in the output.`;
                break;
            case 'debug':
                userPrompt = `Find and fix any bugs in the following ${inputLang} code. Provide the corrected code, then below it, a commented-out explanation of changes.`;
                break;
            case 'add_comments':
                userPrompt = `Add detailed, line-by-line comments to the following ${inputLang} code. All comments MUST be commented out in the output.`;
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ error: "Invalid action specified." }) };
        }

        // Build the final prompt without triple backticks
        const fullPrompt = `${userPrompt}\n\n${safeCode}`;
        const systemPrompt = "You are a senior software engineer and world-class expert programming assistant.";

        let resultText;
        switch (ai_provider) {
            case 'gemini': {
                const genAI = new GoogleGenerativeAI(user_api_key);
                const geminiModel = genAI.getGenerativeModel({ model: model_version });
                const geminiResult = await geminiModel.generateContent(fullPrompt);
                const geminiResponse = await geminiResult.response;
                resultText = geminiResponse.text();
                break;
            }
            case 'chatgpt': {
                const openai = new OpenAI({ apiKey: user_api_key });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: fullPrompt }
                    ],
                    model: model_version
                });
                resultText = completion.choices[0].message.content;
                break;
            }
            case 'claude': {
                const anthropic = new Anthropic({ apiKey: user_api_key });
                const claudeCompletion = await anthropic.messages.create({
                    model: model_version,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: "user", content: fullPrompt }],
                });
                resultText = claudeCompletion.content[0].text;
                break;
            }
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
