
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
          console.log("Speech recognition started");
        };
        
        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptText = result[0].transcript;
          setTranscript(transcriptText);
          console.log("Transcript:", transcriptText);
          
          if (result.isFinal) {
            console.log("Final transcript:", transcriptText);
            onSpeechEnd();
            onUserMessage(transcriptText);
            setTranscript('');
            processUserMessage(transcriptText);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          
          // Don't stop listening on aborted errors, they happen when restarting
          if (event.error !== 'aborted') {
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
          }
        };
        
        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended");
          setIsListening(false);
          
          // Auto restart if not processing - this helps with browser limitations
          if (!isProcessing) {
            try {
              startListening();
            } catch (error) {
              console.error("Failed to restart listening:", error);
            }
          }
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
  }, [onSpeechEnd, onSpeechStart, onUserMessage, onExpressionChange, isProcessing]);

  const startListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        onSpeechStart();
        console.log("Started listening");
      } else {
        console.error("Speech recognition not initialized");
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      // Try to recreate recognition if it fails
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognitionAPI();
        setTimeout(() => startListening(), 100);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("Stopped listening");
      } catch (error) {
        console.error("Error stopping speech recognition:", error);
      }
    }
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
    if (!userInput.trim()) return;
    
    setIsProcessing(true);
    onExpressionChange('thinking');
    console.log("Processing user message:", userInput);
    
    // Stop recognition while AI is processing
    stopListening();
    
    try {
      // Get response from LLM
      console.log("Generating LLM response...");
      const llmResponse = await generateLLMResponse(userInput);
      console.log("LLM response received:", llmResponse);
      
      // Update expression based on LLM response
      if (llmResponse.expression) {
        onExpressionChange(llmResponse.expression);
      }
      
      // Add therapist message to conversation
      const therapistMessage = {
        text: llmResponse.text,
        sender: 'therapist',
        timestamp: new Date()
      };
      
      // Update parent component with therapist message
      onUserMessage(therapistMessage.text);
      
      // Convert text to speech
      console.log("Converting text to speech...");
      const audioData = await convertTextToSpeech(llmResponse.text);
      
      if (audioData && audioRef.current) {
        console.log("Audio data received, playing...");
        // Create a blob from the audio data
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        // Play the audio
        audioRef.current.src = url;
        await audioRef.current.play().catch(err => {
          console.error("Error playing audio:", err);
          toast({
            title: "Audio playback error",
            description: "Could not play the audio response. Please check your audio settings.",
            variant: "destructive"
          });
          
          // Resume listening after error
          setIsProcessing(false);
          if (!isListening) {
            startListening();
          }
        });
      } else {
        console.error("No audio data received");
        toast({
          title: "Text-to-speech error",
          description: "Failed to convert response to speech.",
          variant: "destructive"
        });
        
        // Resume listening after error
        setIsProcessing(false);
        if (!isListening) {
          startListening();
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive"
      });
      
      // Resume listening after error
      setIsProcessing(false);
      if (!isListening) {
        startListening();
      }
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
