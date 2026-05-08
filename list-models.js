import dotenv from 'dotenv';

dotenv.config();

// The API key must be in your .env file as GEMINI_API_KEY
const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  if (!API_KEY) {
    console.error("❌ No API key found. Please make sure GEMINI_API_KEY is in your .env file.");
    return;
  }

  console.log("🔍 Fetching available models for your API key...");
  
  try {
    // Correct URL to list ALL models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ API Error:", data.error.message);
      return;
    }

    console.log("✅ Models available for your key:");
    
    // Filter to only show models that support text/content generation
    const validModels = data.models.filter(m => 
      m.supportedGenerationMethods.includes('generateContent')
    );

    validModels.forEach(m => {
      // Just print the clean model name
      console.log(`- ${m.name.replace('models/', '')}`);
    });
    
  } catch (err) {
    console.error("❌ Network Error:", err);
  }
}

listModels();
