
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { generateLLMResponse, convertTextToSpeech } from '@/utils/apiService';
import { streamResponseAndSpeak } from '@/utils/apiService';

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
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionCheckInProgress, setPermissionCheckInProgress] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startAttemptTimeoutRef = useRef<number | null>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);

  // Initialize AudioContext and check permissions
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
    
    // Check for microphone permission on component mount
    checkMicrophonePermission();
    
    // Add event listener for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
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
      if (startAttemptTimeoutRef.current) {
        window.clearTimeout(startAttemptTimeoutRef.current);
      }
      
      // Stop recognition if active
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try {
          stopListening(true);
        } catch (error) {
          console.error("Error stopping speech recognition on cleanup:", error);
        }
      }
    };
  }, []);
  
  // Handle page visibility changes
  const handleVisibilityChange = () => {
    // When the user returns to this tab
    if (document.visibilityState === 'visible') {
      // Check permissions again
      checkMicrophonePermission();
      
      // If conversation was active but recognition isn't, restart it
      if (conversationStarted && !isRecognitionActiveRef.current && !isProcessing) {
        // Recreate recognition instance to ensure it's fresh
        recreateRecognitionIfNeeded();
        
        // Add small delay before trying to restart
        setTimeout(() => {
          if (conversationStarted && !isRecognitionActiveRef.current && !isProcessing && permissionGranted) {
            startListening();
          }
        }, 500);
      }
    }
  };

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    // Avoid multiple simultaneous permission checks
    if (permissionCheckInProgress) return;
    
    setPermissionCheckInProgress(true);
    
    try {
      // Directly try to access microphone to trigger permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If we got here, permission was granted
      setPermissionGranted(true);
      
      // Clean up the stream
      stream.getTracks().forEach(track => track.stop());
      
      // Now safe to set up recognition
      setupRecognition();
    } catch (error) {
      console.error("Error getting microphone access:", error);
      setPermissionGranted(false);
      
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use the voice features.",
        variant: "destructive"
      });
      
      // Also end any active conversation
      if (conversationStarted) {
        setConversationStarted(false);
      }
    } finally {
      setPermissionCheckInProgress(false);
    }
  };

  // Setup speech recognition and handle conversation state
  useEffect(() => {
    if (!permissionGranted) return;
    
    // If we have permission but no recognition instance, set it up
    if (!recognitionRef.current) {
      setupRecognition();
    }
    
    // Manage listening state based on conversation status
    if (conversationStarted && !isListening && !isProcessing && !isRecognitionActiveRef.current) {
      // Add a small delay to avoid rapid start/stop cycles
      setTimeout(() => {
        if (conversationStarted && !isRecognitionActiveRef.current && !isProcessing) {
          startListening();
        }
      }, 300);
    } else if (!conversationStarted && (isListening || isRecognitionActiveRef.current)) {
      stopListening(true);
    }
  }, [conversationStarted, isListening, isProcessing, permissionGranted]);

  const setupRecognition = () => {
    // Initialize speech recognition if it doesn't exist yet and browser supports it
    if (!recognitionRef.current && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Set up speech recognition handlers
      setupRecognitionHandlers();
    }
  };

  const setupRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onstart = () => {
      console.info("Speech recognition started");
      setIsListening(true);
      isRecognitionActiveRef.current = true;
      onExpressionChange('listening');
    };
    
    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      const transcriptText = result[0].transcript;
      setTranscript(transcriptText);
      
      if (result.isFinal) {
        console.info("Final transcript:", transcriptText);
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
      isRecognitionActiveRef.current = false;
      onSpeechEnd();
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionGranted(false);
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use the speech feature.",
          variant: "destructive"
        });
        setConversationStarted(false);
        
        // Check permission again after a short delay
        setTimeout(() => {
          checkMicrophonePermission();
        }, 1000);
      } else if (conversationStarted && !isProcessing) {
        // Auto-restart on non-fatal errors after a brief delay
        if (startAttemptTimeoutRef.current) {
          window.clearTimeout(startAttemptTimeoutRef.current);
        }
        startAttemptTimeoutRef.current = window.setTimeout(() => {
          if (conversationStarted && !isProcessing && !isRecognitionActiveRef.current && permissionGranted) {
            console.info("Auto-restarting recognition after error");
            recreateRecognitionIfNeeded();
            startListening();
          }
        }, 1000);
      }
    };
    
    recognitionRef.current.onend = () => {
      console.info("Speech recognition ended");
      setIsListening(false);
      isRecognitionActiveRef.current = false;
      
      // Auto-restart if conversation is active and we're not processing
      if (conversationStarted && !isProcessing && permissionGranted) {
        console.info("Auto-restarting recognition after end");
        if (startAttemptTimeoutRef.current) {
          window.clearTimeout(startAttemptTimeoutRef.current);
        }
        startAttemptTimeoutRef.current = window.setTimeout(() => {
          if (conversationStarted && !isProcessing && !isRecognitionActiveRef.current && permissionGranted) {
            startListening();
          }
        }, 500);
      }
    };
  };

  const recreateRecognitionIfNeeded = () => {
    if (recognitionRef.current) {
      try {
        // Try to stop existing recognition instance
        stopListening(true);
      } catch (e) {
        console.log("Error stopping recognition during recreation:", e);
      }
      
      // Clear the reference to force creating a new instance
      recognitionRef.current = null;
    }
    
    // Create a new recognition instance
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      setupRecognitionHandlers();
    }
  };

  const startListening = () => {
    // Skip if recognition is not set up, already active, or we're processing a response
    if (!recognitionRef.current || isRecognitionActiveRef.current || isProcessing) return;
    
    // Double-check microphone permission before starting
    if (!permissionGranted) {
      checkMicrophonePermission();
      return;
    }
    
    try {
      // Make sure we don't have an existing recognition session
      if (isRecognitionActiveRef.current) {
        try {
          stopListening(true);
        } catch (e) {
          console.log("Error stopping existing recognition:", e);
        }
      }
      
      // Start a fresh recognition session
      recognitionRef.current.start();
      console.info("Started listening");
      onSpeechStart();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      
      // If recognition is in an invalid state, recreate it
      if (error instanceof DOMException && (error.name === 'InvalidStateError' || error.name === 'NotAllowedError')) {
        console.info("Recognition was in invalid state or not allowed, recreating it");
        recreateRecognitionIfNeeded();
        
        // Try again after a short delay
        if (startAttemptTimeoutRef.current) {
          window.clearTimeout(startAttemptTimeoutRef.current);
        }
        startAttemptTimeoutRef.current = window.setTimeout(() => {
          if (conversationStarted && !isProcessing && !isRecognitionActiveRef.current && permissionGranted) {
            startListening();
          }
        }, 800);
      }
    }
  };

  const stopListening = (force = false) => {
    if (!recognitionRef.current || (!isRecognitionActiveRef.current && !force)) return;
    
    try {
      recognitionRef.current.stop();
      console.info("Stopped listening");
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
      
      // If we can't stop it, recreate it for a fresh start next time
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        console.info("Recognition was in invalid state when stopping, recreating it");
        recreateRecognitionIfNeeded();
      }
    }
    
    isRecognitionActiveRef.current = false;
    setIsListening(false);
    onSpeechEnd();
  };

  const toggleConversation = async () => {
    // If conversation is already started, just stop it
    if (conversationStarted) {
      setConversationStarted(false);
      
      // Stop listening if active
      if (isRecognitionActiveRef.current) {
        stopListening(true);
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
      return;
    }
    
    // Starting a new conversation
    
    // If microphone permission not granted, check it now
    if (!permissionGranted) {
      await checkMicrophonePermission();
      // If that didn't work, don't proceed
      if (!permissionGranted) {
        return;
      }
    }
    
    // Start the conversation
    setConversationStarted(true);
    
    // Make sure we have a valid recognition instance
    if (!recognitionRef.current) {
      setupRecognition();
    } else {
      // If we already have one, recreate it to ensure it's fresh
      recreateRecognitionIfNeeded();
    }
    
    // Start listening after a short delay to let the UI update
    setTimeout(() => {
      if (!isRecognitionActiveRef.current && !isProcessing && permissionGranted) {
        startListening();
      }
    }, 500);
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
        console.info("Audio playback ended naturally");
        onTherapistSpeaking(false);
        onExpressionChange('neutral');
        audioSourceRef.current = null;
        
        // Resume listening after AI finishes speaking
        setIsProcessing(false);
        
        // Only restart listening if conversation is still active
        if (conversationStarted && permissionGranted) {
          if (startAttemptTimeoutRef.current) {
            window.clearTimeout(startAttemptTimeoutRef.current);
          }
          startAttemptTimeoutRef.current = window.setTimeout(() => {
            if (conversationStarted && !isListening && !isProcessing && !isRecognitionActiveRef.current && permissionGranted) {
              startListening();
            }
          }, 500);
        }
      };
      
      // Start playback
      source.start(0);
      console.info("Audio playback started successfully");
      
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
      if (conversationStarted && permissionGranted) {
        if (startAttemptTimeoutRef.current) {
          window.clearTimeout(startAttemptTimeoutRef.current);
        }
        startAttemptTimeoutRef.current = window.setTimeout(() => {
          if (conversationStarted && !isListening && !isProcessing && !isRecognitionActiveRef.current && permissionGranted) {
            startListening();
          }
        }, 500);
      }
      
      return false;
    }
  };

  const processUserMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    setIsProcessing(true);
    onExpressionChange('thinking');
    console.info("Processing user message:", userInput);

    // Stop listening while she’s responding
    stopListening();

    let displayedText = "";

    try {
      await streamResponseAndSpeak(
        userInput,

        // Text appears word-by-word instantly
        (chunk: string) => {
          displayedText += chunk;
          onUserMessage(displayedText);
          onExpressionChange('speaking');
        },

        // Voice starts almost immediately
        () => {
          onTherapistSpeaking(true);
          onExpressionChange('speaking');
        },

        // Everything finished
        () => {
          onTherapistSpeaking(false);
          onExpressionChange('neutral');
          setIsProcessing(false);

          // Resume listening
          if (conversationStarted && permissionGranted) {
            setTimeout(() => startListening(), 400);
          }
        }
      );
    } catch (error) {
      console.error("Streaming error:", error);
      toast({
        title: "Oops!",
        description: "I'm having a moment… try again ♡",
        variant: "destructive",
      });

      onTherapistSpeaking(false);
      onExpressionChange('neutral');
      setIsProcessing(false);

      if (conversationStarted && permissionGranted) {
        setTimeout(() => startListening(), 600);
      }
    }
  };
  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleConversation}
        disabled={isProcessing || permissionCheckInProgress}
        className={`mt-6 glass-button px-8 py-3 text-foreground font-medium transform transition-all duration-300 hover:scale-105 ${
          isListening ? 'bg-therapy-pink/30 ring-2 ring-therapy-pink' : 
          isProcessing ? 'bg-therapy-blue/20 opacity-70' : 
          permissionCheckInProgress ? 'bg-gray-500/20 opacity-70' :
          conversationStarted ? 'bg-therapy-cyan/50' : 'bg-therapy-cyan/30'
        }`}
      >
        {isListening ? 'Listening...' : 
         isProcessing ? 'Processing...' : 
         permissionCheckInProgress ? 'Checking microphone...' :
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
