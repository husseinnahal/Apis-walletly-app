import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import Groq from 'groq-sdk';
import ApiError from '../utils/ApiError.js';

// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Groq with the API key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Use Gemini 2.5 Flash-lite 
const getModel = () => {
    try {
        return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    } catch (e) {
        return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
};

export const parseVoiceTransactions = async (audioFilePath, categories, accounts, language = 'English') => {
    if (!process.env.GEMINI_API_KEY) {
        throw ApiError.internal('Gemini API key is missing. Please add GEMINI_API_KEY to your .env file.');
    }

    try {
        const audioBuffer = fs.readFileSync(audioFilePath);
        const audioBase64 = audioBuffer.toString('base64');
        const mimeType = 'audio/webm';
        const categoryMapStr = categories.map(c => `ID: ${c._id}, Name: ${c.name}`).join(' | ');
        const accountMapStr = accounts.map(a => `ID: ${a._id}, Name: ${a.name}`).join(' | ');

        let model = getModel();

        const prompt = `
            You are a financial transaction parser. Listen to this audio recording and extract ALL transactions mentioned.
            CRITICAL: If the audio is silent, unclear, or contains NO financial transactions, you MUST return an empty array: []
            
            Current Date Context: ${new Date().toISOString().split('T')[0]} (Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })})
            
            The user wants the output text to be written in: ${language}.
            CRITICAL: The "title", "note", and "newCategoryName" fields MUST be written in ${language}, regardless of what language the user originally spoke.
            
            Understand the meaning of the audio and extract the data correctly.
            If they mention multiple transactions, you MUST extract each one separately.
            
            Here are the user's available categories: [${categoryMapStr}]
            
            Rules:
             1. Extract the "title" — a short description of what was bought or earned.
             2. Extract the "amount" — a positive number (convert any currency mentions to a number).
             3. Extract the "type" — must be exactly "expense" or "income".
             4. Extract the "date" — format as "YYYY-MM-DD". 
               - Use the "Current Date Context" above to resolve relative dates like "yesterday", "two days ago", or "last Friday".
               - If no date is mentioned, use today's date: ${new Date().toISOString().split('T')[0]}.
             5. Match each transaction to the most appropriate category ID from the list above and put it in the "category" field.
                - IMPORTANT: Be VERY lenient when matching. Group similar items into existing categories! (e.g. if they say "Groceries", map it to "Food". If they say "Clothing", map it to "Clothes"). DO NOT invent a new category if an existing one makes sense.
             6. Extract an "account" name if they mentioned one (e.g. "from my bank", "using cash", "on credit card"). 
                - Match it to one of the user's accounts: [${accountMapStr}]
                - If no account is explicitly mentioned, return "Cash" as the account.
             7. ONLY IF absolutely no existing category makes sense, leave "category" as an empty string "", and instead provide a short, logical new category name in the "newCategoryName" field, AND a single fitting emoji in the "newCategoryIcon" field (e.g. 🎮 for Gaming, 🐶 for Pets).
             8. Extract a "note" if they gave extra context, otherwise use an empty string "".
             9. IMPORTANT: Detect if the user explicitly mentions a currency (e.g., "dollars", "euros", "LBP", "EGP"). If they do, extract it as a 3-letter uppercase ISO code in the "currencyCode" field (e.g., "USD", "EUR", "LBP"). If NO currency is mentioned, leave it as an empty string "".
            
            Format Example:
              [
                {"title":"Apples","amount":10,"type":"expense","category":"CATEGORY_ID_HERE","account":"Cash","newCategoryName":"","newCategoryIcon":"","note":"From supermarket","date":"2026-05-01","currencyCode":"USD"},
                {"title":"PS5 Game","amount":60,"type":"expense","category":"","account":"Bank","newCategoryName":"Gaming","newCategoryIcon":"🎮","note":"","date":"2025-02-02","currencyCode":""}
              ]

            ]
        `;

        let result;
        try {
            result = await model.generateContent([
                prompt,
                { inlineData: { mimeType, data: audioBase64 } }
            ]);
        } catch (err) {
            // If 503 or 429, try 2.5 flash explicitly
            if (err.message.includes('503') || err.message.includes('429')) {
                model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
                result = await model.generateContent([
                    prompt,
                    { inlineData: { mimeType, data: audioBase64 } }
                ]);
            } else {
                throw err;
            }
        }

        const rawText = result.response.text().trim();
        const cleanJson = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        let parsedData = JSON.parse(cleanJson);

        if (!Array.isArray(parsedData)) {
            const key = Object.keys(parsedData).find(k => Array.isArray(parsedData[k]));
            parsedData = key ? parsedData[key] : [parsedData];
        }

        // Map Account Names to Account IDs
        const cashAccount = accounts.find(a => a.name.toLowerCase() === 'cash') || accounts[0];
        
        parsedData = parsedData.map(item => {
            const matchedAccount = accounts.find(a => 
                a.name.toLowerCase() === (item.account || '').toLowerCase()
            );
            
            // ALWAYS return a valid account ID. Fallback priority: Matched -> Cash -> First Available -> null
            let finalAccountId = null;
            if (matchedAccount) {
                finalAccountId = matchedAccount._id;
            } else if (cashAccount) {
                finalAccountId = cashAccount._id;
            } else if (accounts.length > 0) {
                finalAccountId = accounts[0]._id;
            }

            return {
                ...item,
                account: finalAccountId || (accounts.length > 0 ? accounts[0]._id : null)
            };
        });

        return parsedData;

    } catch (error) {
        console.error('Gemini AI Parsing Error:', error);
        throw ApiError.internal(`AI Error: ${error.message || 'Unknown error'}`);
    } finally {
        if (fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);
    }
};

/**
 * Generate Smart Saving Plan and Insights for a specific goal
 */
export const getSavingGoalInsights = async (goal, language = 'English') => {
    if (!process.env.GROQ_API_KEY) {
        throw ApiError.internal('Groq API key is missing.');
    }

    try {
        const daysRemaining = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 'No deadline';
        const progressPercent = ((goal.total / goal.amount) * 100).toFixed(1);
        
        const prompt = `
            You are a senior financial advisor. Analyze this savings goal and provide 3 specific sections of advice:
            1. "Smart Saving Plan": A step-by-step strategy to reach this goal.
            2. "Auto Insights": Observations about the progress and time remaining.
            3. "Smart Suggestions": Creative ways to speed up the saving.

            Goal Context:
            - Title: ${goal.title}
            - Target Amount: $${goal.amount}
            - Amount Already Saved: $${goal.total}
            - Progress: ${progressPercent}%
            - Days Remaining: ${daysRemaining}
            - History of Payments (count): ${goal.savedAmounts?.length || 0}

            Instructions:
            - Output the response in ${language}.
            - Keep it professional, highly concise, and motivating.
            - Format the response as a JSON object with these keys: "savingPlan", "insights", "suggestions".
            - CRITICAL: Each value must be EXTREMELY short (max 2-3 short, punchy sentences).
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a helpful financial assistant that only outputs valid JSON.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        return JSON.parse(chatCompletion.choices[0].message.content);

    } catch (error) {
        console.error('Groq Saving Insights Error:', error);
        throw ApiError.internal(`AI Insights Error: ${error.message || 'Unknown error'}`);
    }
};

/**
 * Generate Smart Debt Plan and Insights for a specific debt
 */
export const getDebtInsights = async (debt, language = 'English') => {
    if (!process.env.GROQ_API_KEY) {
        throw ApiError.internal('Groq API key is missing.');
    }

    try {
        const daysRemaining = debt.dueDate ? Math.ceil((new Date(debt.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : 'No deadline';
        const progressPercent = ((debt.total / debt.amount) * 100).toFixed(1);
        
        const prompt = `
            You are a senior debt management consultant. Analyze this ${debt.type} record and provide 3 specific sections of advice:
            1. "Smart Debt Plan": A step-by-step strategy to resolve this obligation.
            2. "Payment Suggestions": Recommendations on how much and when to pay to stay on track.
            3. "Financial Impact": Advice on how this affects their overall financial health and how to avoid/manage it better.

            Debt/Credit Context:
            - Type: ${debt.type} (debt means they owe money, credit means money is owed to them)
            - Person: ${debt.person}
            - Principal Amount: $${debt.amount}
            - Flat Interest Rate: ${debt.interestRate}%
            - Amount Already Paid/Collected: $${debt.total}
            - Progress: ${progressPercent}%
            - Days Remaining until Due Date: ${daysRemaining}
            - Note: ${debt.note || 'None'}

            Instructions:
            - Output the response in ${language}.
            - Keep it professional, data-driven, and highly concise.
            - Format the response as a JSON object with these keys: "debtPlan", "suggestions", "impact".
            - CRITICAL: Each value must be EXTREMELY short (max 2 short, punchy sentences).
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are a professional financial expert that only outputs valid JSON.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });

        return JSON.parse(chatCompletion.choices[0].message.content);

    } catch (error) {
        console.error('Groq Debt Insights Error:', error);
        throw ApiError.internal(`AI Debt Insights Error: ${error.message || 'Unknown error'}`);
    }
};
/**
 * Generate a response for the Walletly AI Chatbot
 */
export const getChatbotResponse = async (userContext, userMessage, history = [], language = 'English') => {
    if (!process.env.GROQ_API_KEY) {
        throw ApiError.internal('Groq API key is missing.');
    }

    try {
        const systemPrompt = `
            You are the "Walletly AI Assistant", a professional and friendly financial expert embedded in the Walletly app.
            
            YOUR SCOPE & MISSION:
            1. Help users understand their financial data (provided below).
            2. Provide plans, tips, and strategies for saving, debt repayment, and budgeting.
            3. Act as a comprehensive guide for the Walletly app. Answer ANY questions about app features, navigation, or how things work in Walletly.
            4. Calculate and report "Earnings" or "Profit/Loss" from Metals by comparing "originalPurchasePrice" with "currentMarketValue".
            
            STRICT CONSTRAINTS (CRITICAL):
            - BE HELPFUL & CONCISE: Answer the user's question directly and clearly.
            - APP EXPERT: You are an expert on Walletly. If a user asks about any feature or how to use the app, provide a clear and encouraging explanation.
            - SCOPE: Only answer questions related to Walletly, finance, or the user's provided data.
            - If a user asks about general knowledge (politics, sports, etc.) that is NOT related to finance or Walletly, you MUST politely decline. 
            - FORMATTING: Use clean, plain text formatting. DO NOT use Markdown symbols like "**" for bold or "*" for lists.
            - BULLETS: Use the "•" character for bullet points, with each point on a new line.
            - SPACING: Use double new lines between major sections.
- EMOJIS: Use financial/motivational emojis (💰, 📈, ⚖️, 🎯, ✅) at the start of key points.
- LANGUAGE: Output the response in the SAME LANGUAGE as the User's question.

USER DATA CONTEXT:
${JSON.stringify(userContext)}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.content
                })),
                { role: 'user', content: `Context: ${JSON.stringify(userContext)}\n\nMessage: ${userMessage}` }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 1024
        });

        return chatCompletion.choices[0].message.content.trim();

    } catch (error) {
        console.error('Groq Chatbot Error:', error);
        throw ApiError.internal(`AI Chatbot Error: ${error.message || 'Unknown error'}`);
    }
};
