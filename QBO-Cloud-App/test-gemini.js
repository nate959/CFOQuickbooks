const { generateText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

async function main() {
  const secretKey = "AIzaSyDWblhJuAs3QEWznHHOY6OJCz-7KGGG8SA";
  
  const googleProvider = createGoogleGenerativeAI({
    apiKey: secretKey,
  });

  try {
    console.log("Generating text...");
    const { text } = await generateText({
      model: googleProvider('gemini-2.5-flash'),
      system: "You are an AI.",
      messages: [{role: 'user', content: 'Hello'}],
    });
    console.log("RESPONSE:", text);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();
