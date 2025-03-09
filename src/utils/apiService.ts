
import { toast } from "@/components/ui/use-toast";

interface LLMResponse {
  text: string;
  expression?: string;
}

// This will be replaced with actual API key from user input
let llamaApiKey = '';
let elevenLabsApiKey = '';

export const setLlamaApiKey = (key: string) => {
  llamaApiKey = key;
};

export const setElevenLabsApiKey = (key: string) => {
  elevenLabsApiKey = key;
};

export const getLlamaApiKey = () => llamaApiKey;
export const getElevenLabsApiKey = () => elevenLabsApiKey;

export async function generateLLMResponse(userInput: string): Promise<LLMResponse> {
  try {
    if (!llamaApiKey) {
      return {
        text: "Please provide your LLM API key to enable intelligent responses.",
        expression: "neutral"
      };
    }

    // For now, we'll use a simple call - replace with actual API endpoint when provided
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
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
      description: "There was a problem connecting to the LLM API.",
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
    if (!elevenLabsApiKey) {
      toast({
        title: "ElevenLabs API key missing",
        description: "Please provide your ElevenLabs API key for text-to-speech capability.",
        variant: "destructive"
      });
      return null;
    }

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
