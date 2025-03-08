
import React, { useState, useEffect, useRef } from 'react';
import { toast } from "@/components/ui/use-toast";

// Add SpeechRecognition to window interface
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechProcessorProps {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onUserMessage: (text: string) => void;
  onTherapistSpeaking: (speaking: boolean) => void;
  onExpressionChange: (expression: string) => void;
}

const SpeechProcessor: React.FC<SpeechProcessorProps> = ({
  onSpeechStart,
  onSpeechEnd,
  onUserMessage,
  onTherapistSpeaking,
  onExpressionChange
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initial setup of speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onstart = () => {
          setIsListening(true);
          onExpressionChange('listening');
        };
        
        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;
          setTranscript(transcriptText);
          
          if (result.isFinal) {
            onSpeechEnd();
            onUserMessage(transcriptText);
            setTranscript('');
            onExpressionChange('thinking');
            
            // Simulate AI processing and response
            simulateAIResponse(transcriptText);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          onSpeechEnd();
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    } else {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSpeechEnd, onSpeechStart, onUserMessage, onExpressionChange]);

  // Set up speech synthesis
  useEffect(() => {
    synthRef.current = new SpeechSynthesisUtterance();
    
    synthRef.current.onstart = () => {
      onTherapistSpeaking(true);
      onExpressionChange('speaking');
    };
    
    synthRef.current.onend = () => {
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
      
      // Resume listening after AI finishes speaking
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    };
    
    return () => {
      if (synthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [onTherapistSpeaking, onExpressionChange]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      onSpeechEnd();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        onSpeechStart();
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
  };

  // This function would be replaced with actual API calls to AI services
  const simulateAIResponse = (userInput: string) => {
    // Stop recognition while AI is "thinking"
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setTimeout(() => {
      let response = "I understand how you feel. Could you tell me more about that?";
      
      // Super simple response logic - would be replaced with actual AI
      if (userInput.toLowerCase().includes('hello') || userInput.toLowerCase().includes('hi')) {
        response = "Hello there! How are you feeling today?";
        onExpressionChange('happy');
      } else if (userInput.toLowerCase().includes('sad') || userInput.toLowerCase().includes('depress')) {
        response = "I'm sorry to hear you're feeling that way. Remember that it's okay to feel this way sometimes. Would you like to explore what might be contributing to these feelings?";
        onExpressionChange('empathetic');
      } else if (userInput.toLowerCase().includes('happy') || userInput.toLowerCase().includes('good')) {
        response = "I'm glad to hear you're doing well! What's contributing to your positive mood today?";
        onExpressionChange('happy');
      } else if (userInput.toLowerCase().includes('anxious') || userInput.toLowerCase().includes('worry')) {
        response = "When you're feeling anxious, it can be helpful to focus on your breathing. Would you like to try a brief breathing exercise together?";
        onExpressionChange('empathetic');
      }
      
      if (synthRef.current) {
        synthRef.current.text = response;
        synthRef.current.rate = 1.0;
        synthRef.current.pitch = 1.0;
        
        // Use a more pleasant voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Female') || voice.name.includes('Samantha')
        );
        
        if (preferredVoice) {
          synthRef.current.voice = preferredVoice;
        }
        
        window.speechSynthesis.speak(synthRef.current);
      }
    }, 1500); // Simulate thinking time
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleListening}
        className={`mt-6 glass-button px-8 py-3 text-foreground font-medium transform transition-all duration-300 hover:scale-105 ${
          isListening ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' : 'bg-therapy-blue/30'
        }`}
      >
        {isListening ? 'Listening...' : 'Start Conversation'}
      </button>
      
      {transcript && (
        <div className="mt-4 animate-fade-in glass-panel px-6 py-3 max-w-md text-sm text-center">
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default SpeechProcessor;
