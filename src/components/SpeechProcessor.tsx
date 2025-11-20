import React, { useState, useEffect, useRef } from 'react';
import { toast } from "@/components/ui/use-toast";
import { streamResponseAndSpeak } from '@/utils/apiService';

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

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);

  // Permission + Recognition Setup
  useEffect(() => {
    const checkPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionGranted(true);
        setupRecognition();
      } catch {
        toast({ title: "Mic access needed", description: "Please allow microphone", variant: "destructive" });
      }
    };
    checkPermission();
  }, []);

  const setupRecognition = () => {
    if (recognitionRef.current || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      isRecognitionActiveRef.current = true;
      onExpressionChange('listening');
      onSpeechStart();
    };

    recognitionRef.current.onresult = (e: any) => {
      const result = e.results[e.resultIndex];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        setTranscript('');
        onSpeechEnd();
        onUserMessage(text);
        processUserMessage(text);
      }
    };

    recognitionRef.current.onerror = () => {
      if (conversationStarted && !isProcessing) setTimeout(startListening, 500);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      isRecognitionActiveRef.current = false;
      if (conversationStarted && !isProcessing) {
        setTimeout(startListening, 400);
      }
    };
  };

  const startListening = () => {
    if (!recognitionRef.current || isRecognitionActiveRef.current || isProcessing) return;
    try {
      recognitionRef.current.start();
    } catch {}
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleConversation = () => {
    if (conversationStarted) {
      setConversationStarted(false);
      stopListening();
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
    } else {
      setConversationStarted(true);
      setTimeout(startListening, 300);
    }
  };

  // THIS IS THE ONLY FUNCTION THAT SHOULD HANDLE VOICE + TEXT
  const processUserMessage = async (userInput: string) => {
    if (!userInput.trim()) return;

    setIsProcessing(true);
    onExpressionChange('thinking');
    stopListening();

    let fullResponse = "";

    try {
      await streamResponseAndSpeak(
        userInput,
        (chunk) => {
          fullResponse += chunk;
        },
        () => {
          onTherapistSpeaking(true);
          onExpressionChange('speaking');
        },
        () => {
          onUserMessage(fullResponse);        // One clean message
          onTherapistSpeaking(false);
          onExpressionChange('neutral');
          setIsProcessing(false);
          if (conversationStarted) {
            setTimeout(startListening, 500);
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast({ title: "Oops", description: "Try again ♡", variant: "destructive" });
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
      setIsProcessing(false);
      if (conversationStarted) setTimeout(startListening, 600);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        onClick={toggleConversation}
        disabled={isProcessing}
        className={`mt-6 glass-button px-8 py-3 font-medium transition-all hover:scale-105 ${
          isListening ? 'bg-pink-500/40 ring-4 ring-pink-400' :
          isProcessing ? 'bg-blue-500/30' :
          conversationStarted ? 'bg-cyan-500/50' : 'bg-cyan-500/30'
        }`}
      >
        {isListening ? 'Listening...' :
         isProcessing ? 'Thinking...' :
         conversationStarted ? 'End Chat' : 'Start Talking'}
      </button>

      {transcript && (
        <div className="mt-4 glass-panel px-6 py-3 text-sm">
          <p>{transcript}...</p>
        </div>
      )}
    </div>
  );
};

export default SpeechProcessor;
