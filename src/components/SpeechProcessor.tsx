
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
  const [conversationStarted, setConversationStarted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error("Error creating AudioContext:", error);
        toast({
          title: "Audio Error",
          description: "Your browser doesn't support advanced audio features.",
          variant: "destructive"
        });
      }
    }
    
    return () => {
      // Clean up audio resources
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        } catch (e) {
          console.log("Error cleaning up audio source:", e);
        }
        audioSourceRef.current = null;
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          console.log("Error closing audio context:", e);
        }
      }
    };
  }, []);

  // Setup speech recognition
  useEffect(() => {
    // Initialize speech recognition
    if (!recognitionRef.current && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Set up speech recognition handlers
      setupRecognitionHandlers();
    }
    
    // Start/stop listening based on conversationStarted state
    if (conversationStarted && !isListening && !isProcessing) {
      startListening();
    } else if (!conversationStarted && isListening) {
      stopListening();
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping speech recognition on cleanup:", error);
        }
      }
    };
  }, [conversationStarted, isListening, isProcessing]);

  const setupRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      onExpressionChange('listening');
    };
    
    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      setTranscript(transcriptText);
      
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
      
      if (event.error === 'aborted') {
        // This happens during normal operation when restarting recognition
        return;
      }
      
      setIsListening(false);
      onSpeechEnd();
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use the speech feature.",
          variant: "destructive"
        });
        setConversationStarted(false);
      } else if (conversationStarted && !isProcessing) {
        // Auto-restart on non-fatal errors
        console.log("Auto-restarting recognition after error");
        setTimeout(() => startListening(), 1000);
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      
      // Auto-restart if conversation is active and we're not processing
      if (conversationStarted && !isProcessing) {
        console.log("Auto-restarting recognition after end");
        setTimeout(() => {
          if (conversationStarted && !isProcessing) {
            startListening();
          }
        }, 300);
      }
    };
  };

  const startListening = () => {
    if (!recognitionRef.current || isListening || isProcessing) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      onSpeechStart();
      console.log("Started listening");
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      // If recognition is in an invalid state, recreate it
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        recognitionRef.current = null;
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognitionAPI();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          setupRecognitionHandlers();
          
          // Try again
          setTimeout(() => {
            if (conversationStarted && !isProcessing) {
              startListening();
            }
          }, 500);
        }
      }
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
      console.log("Stopped listening");
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }
    
    setIsListening(false);
    onSpeechEnd();
  };

  const toggleConversation = () => {
    const newConversationState = !conversationStarted;
    setConversationStarted(newConversationState);
    
    if (newConversationState) {
      // Starting conversation
      if (!isListening && !isProcessing) {
        startListening();
      }
    } else {
      // Ending conversation
      if (isListening) {
        stopListening();
      }
      
      // Also stop AI from speaking if it is
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
          audioSourceRef.current = null;
          onTherapistSpeaking(false);
          onExpressionChange('neutral');
        } catch (e) {
          console.log("Error stopping audio:", e);
        }
      }
      
      setIsProcessing(false);
    }
  };

  // Play audio using AudioContext API
  const playAudio = async (audioData: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume AudioContext if it's suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Stop any currently playing audio
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        } catch (e) {
          // Ignore errors if already stopped
        }
      }
      
      // Create new audio source
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Store source reference for cleanup
      audioSourceRef.current = source;
      
      // Handle audio events
      onTherapistSpeaking(true);
      onExpressionChange('speaking');
      
      source.onended = () => {
        console.log("Audio playback ended naturally");
        onTherapistSpeaking(false);
        onExpressionChange('neutral');
        audioSourceRef.current = null;
        
        // Resume listening after AI finishes speaking
        setIsProcessing(false);
        
        // Only restart listening if conversation is still active
        if (conversationStarted) {
          setTimeout(() => {
            if (conversationStarted && !isListening && !isProcessing) {
              startListening();
            }
          }, 300);
        }
      };
      
      // Start playback
      source.start(0);
      console.log("Audio playback started successfully");
      
      return true;
    } catch (error) {
      console.error("Error playing audio with AudioContext:", error);
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
      
      toast({
        title: "Audio playback error",
        description: "Could not play the audio response. Please check your audio settings.",
        variant: "destructive"
      });
      
      // Continue the conversation even if audio fails
      setIsProcessing(false);
      if (conversationStarted) {
        setTimeout(() => {
          if (conversationStarted && !isListening && !isProcessing) {
            startListening();
          }
        }, 300);
      }
      
      return false;
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
      
      // Extract emotion from response
      const expressionMatch = llmResponse.text.match(/\[(.*?)\]$/);
      let responseText = llmResponse.text;
      let expression = llmResponse.expression || 'neutral';
      
      if (expressionMatch) {
        expression = expressionMatch[1];
        responseText = llmResponse.text.replace(/\[(.*?)\]$/, '').trim();
      }
      
      // Update expression based on LLM response
      onExpressionChange(expression);
      
      // Add therapist message to conversation
      onUserMessage(responseText);
      
      // Convert text to speech
      console.log("Converting text to speech...");
      const audioData = await convertTextToSpeech(responseText);
      
      if (audioData) {
        console.log("Audio data received, playing...");
        // Play the audio using AudioContext API
        await playAudio(audioData);
      } else {
        console.error("No audio data received");
        toast({
          title: "Text-to-speech error",
          description: "Failed to convert response to speech.",
          variant: "destructive"
        });
        
        // Resume listening after error if conversation is still active
        setIsProcessing(false);
        if (conversationStarted && !isListening) {
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
      
      // Resume listening after error if conversation is still active
      setIsProcessing(false);
      if (conversationStarted && !isListening) {
        startListening();
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleConversation}
        disabled={isProcessing}
        className={`mt-6 glass-button px-8 py-3 text-foreground font-medium transform transition-all duration-300 hover:scale-105 ${
          isListening ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' : 
          isProcessing ? 'bg-therapy-blue/20 opacity-70' : 
          conversationStarted ? 'bg-therapy-blue/50' : 'bg-therapy-blue/30'
        }`}
      >
        {isListening ? 'Listening...' : 
         isProcessing ? 'Processing...' : 
         conversationStarted ? 'End Conversation' : 'Start Conversation'}
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
