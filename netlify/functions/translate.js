const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { code } = JSON.parse(event.body);
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        const prompt = `You are a coding and scripting expert.  You verify your code before releasing it to your customers.  Your job is to translate the following PowerShell script into Python. Provide only the raw, tested and verified accurate, Python code as the output, with no explanations or markdown formatting. PowerShell Script: \n\n${code}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const pythonCode = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ pythonCode: pythonCode.trim() })
        };

    } catch (error) {
        console.error("Error during translation:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to translate script.' })
        };
    }
};