
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { generateLLMResponse, convertTextToSpeech } from '@/utils/apiService';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      audioRef.current.onplay = () => {
        onTherapistSpeaking(true);
        onExpressionChange('speaking');
      };
      
      audioRef.current.onended = () => {
        onTherapistSpeaking(false);
        onExpressionChange('neutral');
        
        // Resume listening after AI finishes speaking
        if (!isListening && !isProcessing) {
          startListening();
        }
      };
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onTherapistSpeaking, onExpressionChange, isListening, isProcessing]);

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
            processUserMessage(transcriptText);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          onSpeechEnd();
          
          // Show toast for permission denied
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            toast({
              title: "Microphone access denied",
              description: "Please allow microphone access to use the speech feature.",
              variant: "destructive"
            });
          }
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

  const startListening = () => {
    try {
      recognitionRef.current?.start();
      setIsListening(true);
      onSpeechStart();
    } catch (error) {
      console.error('Speech recognition error:', error);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    onSpeechEnd();
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const processUserMessage = async (userInput: string) => {
    setIsProcessing(true);
    onExpressionChange('thinking');
    
    // Stop recognition while AI is processing
    stopListening();
    
    try {
      // Get response from LLM
      const llmResponse = await generateLLMResponse(userInput);
      
      // Update expression based on LLM response
      if (llmResponse.expression) {
        onExpressionChange(llmResponse.expression);
      }
      
      // Convert text to speech
      const audioData = await convertTextToSpeech(llmResponse.text);
      
      if (audioData && audioRef.current) {
        // Create a blob from the audio data
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        // Play the audio
        audioRef.current.src = url;
        audioRef.current.play();
      } else {
        // If text-to-speech fails, resume listening after a delay
        setTimeout(() => {
          if (!isListening && !isProcessing) {
            startListening();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive"
      });
      
      // Resume listening after a delay
      setTimeout(() => {
        if (!isListening && !isProcessing) {
          startListening();
        }
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`mt-6 glass-button px-8 py-3 text-foreground font-medium transform transition-all duration-300 hover:scale-105 ${
          isListening ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' : isProcessing ? 'bg-therapy-blue/20 opacity-70' : 'bg-therapy-blue/30'
        }`}
      >
        {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Start Conversation'}
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
