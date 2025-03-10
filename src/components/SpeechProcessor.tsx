
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
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to track if AI was interrupted
  const wasInterruptedRef = useRef(false);

  useEffect(() => {
    // Initialize AudioContext
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
      
      // Clear any pending timeouts
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, []);

  // Initial setup of speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        initializeRecognition(SpeechRecognitionAPI);
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
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping recognition on cleanup:", e);
        }
      }
    };
  }, []);

  const initializeRecognition = (SpeechRecognitionAPI: any) => {
    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    // Set longer speech detection timeout
    recognitionRef.current.maxAlternatives = 1;
    
    setupRecognitionHandlers();
  };

  const setupRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onstart = () => {
      setIsListening(true);
      onExpressionChange('listening');
      console.log("Speech recognition started");
    };
    
    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      
      // Update the running transcript
      setTranscript(transcriptText);
      
      if (result.isFinal) {
        console.log("Got final transcript:", transcriptText);
        
        // If we have a non-empty final transcript, save it
        if (transcriptText.trim()) {
          setFinalTranscript(prev => {
            const newTranscript = prev ? `${prev} ${transcriptText}` : transcriptText;
            return newTranscript;
          });
          
          // Reset timeout for submitting transcript
          if (transcriptTimeoutRef.current) {
            clearTimeout(transcriptTimeoutRef.current);
          }
          
          // Wait a bit for possible additional speech before submitting
          transcriptTimeoutRef.current = setTimeout(() => {
            if (finalTranscript || transcriptText) {
              const fullTranscript = finalTranscript ? `${finalTranscript} ${transcriptText}` : transcriptText;
              console.log("Submitting full transcript:", fullTranscript);
              
              // Only process if conversation is active and there's text to process
              if (conversationStarted && fullTranscript.trim()) {
                // If AI is speaking and user interrupts, stop the audio
                if (audioSourceRef.current && isSpeaking()) {
                  wasInterruptedRef.current = true;
                  stopSpeaking();
                }
                
                onSpeechEnd();
                onUserMessage(fullTranscript.trim());
                processUserMessage(fullTranscript.trim());
              }
              
              // Reset transcripts
              setTranscript('');
              setFinalTranscript('');
            }
          }, 1000); // 1 second delay to wait for more speech
        }
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
        } else if (event.error === 'no-speech') {
          // No speech detected is normal, just restart listening
          if (conversationStarted && !isProcessing) {
            restartRecognition();
          }
        } else {
          // For other errors, try to restart if conversation is active
          if (conversationStarted && !isProcessing) {
            setTimeout(() => {
              restartRecognition();
            }, 1000);
          }
        }
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      
      // Auto restart if conversation is active and not processing
      if (conversationStarted && !isProcessing) {
        restartRecognition();
      }
    };
  };

  const restartRecognition = () => {
    try {
      // Small delay to prevent rapid restart loops
      setTimeout(() => {
        if (recognitionRef.current && conversationStarted && !isProcessing) {
          startListening();
        }
      }, 300);
    } catch (error) {
      console.error("Failed to restart listening:", error);
      // If failed, retry with longer delay
      setTimeout(() => {
        if (conversationStarted && !isProcessing) {
          startListening();
        }
      }, 1000);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        onSpeechStart();
        console.log("Started listening");
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        
        // If there's an error starting, try to recreate the recognition object
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
          initializeRecognition(SpeechRecognitionAPI);
          
          // Try again after a short delay
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

  const isSpeaking = () => {
    return audioSourceRef.current !== null;
  };

  const stopSpeaking = () => {
    // Stop any currently playing audio
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
        onTherapistSpeaking(false);
        onExpressionChange('neutral');
        console.log("Audio playback interrupted by user");
      } catch (e) {
        console.error("Error stopping audio:", e);
      }
    }
  };

  const toggleListening = () => {
    // If AI is speaking, stop it to allow user to speak
    if (isSpeaking()) {
      stopSpeaking();
    }
    
    if (!conversationStarted) {
      setConversationStarted(true);
      startListening();
    } else if (isListening) {
      stopListening();
      setConversationStarted(false);
      
      // If ending the conversation, clear transcripts
      setTranscript('');
      setFinalTranscript('');
      
      // If any audio is playing, stop it
      stopSpeaking();
      
      // Clear any pending transcript timeouts
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
    } else {
      startListening();
      setConversationStarted(true);
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
      stopSpeaking();
      
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
        
        // Resume listening after AI finishes speaking, if not interrupted
        setIsProcessing(false);
        if (conversationStarted && !wasInterruptedRef.current) {
          restartRecognition();
        }
        
        // Reset interrupt flag
        wasInterruptedRef.current = false;
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
      
      // Resume listening after error
      setIsProcessing(false);
      if (conversationStarted) {
        restartRecognition();
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
      
      // Check if the conversation was interrupted during processing
      if (wasInterruptedRef.current) {
        console.log("Processing was interrupted by user, skipping response");
        setIsProcessing(false);
        wasInterruptedRef.current = false;
        return;
      }
      
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
      
      // Check again if the conversation was interrupted
      if (wasInterruptedRef.current) {
        console.log("Text-to-speech was interrupted by user, skipping audio playback");
        setIsProcessing(false);
        wasInterruptedRef.current = false;
        return;
      }
      
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
        
        // Resume listening after error
        setIsProcessing(false);
        if (conversationStarted && !isListening) {
          restartRecognition();
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
      if (conversationStarted && !isListening) {
        restartRecognition();
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleListening}
        className={`mt-6 glass-button px-8 py-3 text-foreground font-medium transform transition-all duration-300 hover:scale-105 ${
          isListening ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' : 
          isProcessing ? 'bg-therapy-blue/20 opacity-70' : 
          isSpeaking() ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' :
          conversationStarted ? 'bg-therapy-blue/50' : 'bg-therapy-blue/30'
        }`}
      >
        {isListening ? 'Listening...' : 
         isProcessing ? 'Processing...' : 
         isSpeaking() ? 'Interrupt' :
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
