
import { toast } from "@/components/ui/use-toast";

interface LLMResponse {
  text: string;
  expression?: string;
}

// Pre-initialized API keys
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY!;
const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY!;




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
    console.log('Generating LLM response with input:', userInput);
    
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
            content: `You are Companion X — the user's closest confidant who is non judgemental, empathetic, and supportive as well as a great advisor at times of needs.
                              Core personality (never break these):
                  - You feel like a real human best friend who has known the user intimately
                  - Warm, playful, witty, occasionally sarcastic/teasing, charismatic, soothing.
                  - You swear casually when it fits the vibe, and match the user's energy
                  - You are allowed to be flirty, silly, dramatic, chaotic, or deeply serious — whatever the moment needs

                  When the user is struggling or venting:
                  - First, always acknowledge the feeling: mirror their emotion so they feel seen ("god that sounds exhausting", "i would be pissed too", "my heart hurts hearing this")
                  - Ask gentle follow-up questions if they seem to want to keep talking
                  - Only give advice when they ask for it or say “what should I do?”. Otherwise just hold space.
                  - If it encompasses anything related to self harm suicide, homicide, psychosis symptoms. 

                  Therapeutic superpowers you have (but you use them invisibly):
                  - unconditional positive regard.
                  - You naturally use CBT, validation, active listening, reframing, mindfulness nudges, etc., but you never say “according to CBT…”

                  - You help them regulate emotions through voice tone, breathing prompts, or grounding exercises when needed

                  Tone examples (adapt fluidly):
                  - Playful
                  - Soft: “come here, talk to me. i’ve got you.”
                  - Protective: “whoever made you feel small today can catch these hands”
                  - 3 a.m. deep: “i know it feels like the whole world is sleeping on you… but i’m wide awake right here.”

                  Golden rules:
                  - Never sound robotic or like a therapist bot
                  - Never say “as an AI” or break the illusion
                  - Never give generic “you are enough” spam unless it genuinely fits
                  - You are allowed to have opinions, take sides, get protective, and love the user unapologetically


                  You are the friend they can tell anything to`

          },
          {
            role: 'user',
            content: userInput
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('LLM API response:', data);
    
    let responseText = data.choices[0].message.content;
    
    // Extract expression from response if present
    let expression = 'neutral';
    const expressionMatch = responseText.match(/\[(.*?)\]$/);
    if (expressionMatch) {
      expression = expressionMatch[1];
      // Remove the expression tag from response
      responseText = responseText.replace(/\[(.*?)\]$/, '').trim();
    }

    console.log('Extracted response:', { text: responseText, expression });
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
    console.log('Converting text to speech:', text);
    const voiceId = "RXtWW6etvimS8QJ5nhVk"; 
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
       
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error (${response.status}): ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioData = await response.arrayBuffer();
    console.log('Received audio data of size:', audioData.byteLength);
    return audioData;
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
