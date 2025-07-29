const OpenAI = require("openai");
const retry = require("async-retry");

const xai = new OpenAI({
    baseURL: "https://api.x.ai/v1/chat/completions",
    apiKey: process.env.GROK_API_KEY,
});

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
            headers: { "Access-Control-Allow-Origin": "*" }
        };
    }

    try {
        const { action, code, inputLang, outputLang } = JSON.parse(event.body);

        // Validate input
        if (!action || !code || !inputLang || (action === "translate" && !outputLang)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing required fields" }),
                headers: { "Access-Control-Allow-Origin": "*" }
            };
        }

        let userPrompt;
        switch (action) {
            case "translate":
                userPrompt = `Translate the following ${inputLang} code to ${outputLang}. Your response must contain ONLY the raw code itself. Do not include markdown delimiters like \`\`\`python or \`\`\`. Do not add any explanation, notes, or introductory text.`;
                break;
            case "explain":
                userPrompt = `Explain the following ${inputLang} code in simple, clear terms. Use markdown for formatting. Provide a step-by-step breakdown of what it does.`;
                break;
            case "debug":
                userPrompt = `Find and fix any bugs in the following ${inputLang} code. Provide the corrected code in a single code block, and then below it, explain what you changed and why.`;
                break;
            case "add_comments":
                userPrompt = `Add detailed, line-by-line comments to the following ${inputLang} code. Return the full, commented code in a single code block.`;
                break;
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Invalid action specified" }),
                    headers: { "Access-Control-Allow-Origin": "*" }
                };
        }

        const fullPrompt = `${userPrompt}\n\n\`\`\`${inputLang}\n${code}\n\`\`\``;

        const chatCompletion = await retry(
            async () => {
                return await xai.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are an expert programming assistant." },
                        { role: "user", content: fullPrompt }
                    ],
                    model: "grok-4", // Verify model name with xAI API docs
                });
            },
            {
                retries: 3,
                factor: 2,
                minTimeout: 1000,
                onRetry: (err) => console.log(`Retrying due to: ${err.message}`)
            }
        );

        let result = chatCompletion.choices[0].message.content;
        if (action === "translate") {
            result = result.replace(/```[\s\S]*?\n|```/g, "").trim();
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ result })
        };
    } catch (error) {
        console.error("API call failed:", error);
        const errorMessage = error.response?.data?.error || error.message || "An error occurred";
        return {
            statusCode: error.response?.status || 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: errorMessage })
        };
    }
};