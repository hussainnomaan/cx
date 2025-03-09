
import { toast } from "@/components/ui/use-toast";

interface LLMResponse {
  text: string;
  expression?: string;
}

// Pre-initialized API keys
const groqApiKey = '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';
const elevenLabsApiKey = 'sk_e47c0ef8a36ab64a793f871e54e14ca1c214c1e9eac65a61';

// Getters for API keys (kept for backwards compatibility)
export const getLlamaApiKey = () => groqApiKey;
export const getElevenLabsApiKey = () => elevenLabsApiKey;

// These setters are kept for backwards compatibility but won't be used in the frontend
export const setLlamaApiKey = (key: string) => {
  // This is now a no-op as we're using pre-initialized keys
  console.log('API keys are pre-initialized, this setter has no effect');
};

export const setElevenLabsApiKey = (key: string) => {
  // This is now a no-op as we're using pre-initialized keys
  console.log('API keys are pre-initialized, this setter has no effect');
};

export async function generateLLMResponse(userInput: string): Promise<LLMResponse> {
  try {
    // Using Groq API with Llama 3.3 70B model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an empathetic AI therapist. Respond to the user with compassion and understanding. Keep responses concise (under 100 words) and include an appropriate emotion tag at the end of your response in brackets like [happy], [sad], [empathetic], [neutral], [thinking], or [concerned].'
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.choices[0].message.content;
    
    // Extract expression from response if present
    let expression = 'neutral';
    const expressionMatch = responseText.match(/\[(.*?)\]$/);
    if (expressionMatch) {
      expression = expressionMatch[1];
      // Remove the expression tag from response
      responseText = responseText.replace(/\[(.*?)\]$/, '').trim();
    }

    return {
      text: responseText,
      expression: expression
    };
  } catch (error) {
    console.error('Error generating LLM response:', error);
    toast({
      title: "Error generating response",
      description: "There was a problem connecting to the Groq API.",
      variant: "destructive"
    });
    return {
      text: "I'm having trouble connecting to my thinking capabilities. Could you try again?",
      expression: "concerned"
    };
  }
}

export async function convertTextToSpeech(text: string): Promise<ArrayBuffer | null> {
  try {
    const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Aria voice
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error converting text to speech:', error);
    toast({
      title: "Text-to-speech error",
      description: "There was a problem generating speech from text.",
      variant: "destructive"
    });
    return null;
  }
}
