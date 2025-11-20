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

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);

  // One-time mic permission
  useEffect(() => {
    const init = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setupRecognition();
      } catch {
        toast({ title: "Mic needed", description: "Allow microphone to talk", variant: "destructive" });
      }
    };
    init();
  }, []);

  const setupRecognition = () => {
    if (recognitionRef.current) return;
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      isRecognitionActiveRef.current = true;
      onExpressionChange('listening');
      onSpeechStart();
    };

    recognitionRef.current.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        setTranscript('');
        onSpeechEnd();
        onUserMessage(text);
        processUserMessage(text.trim());
      }
    };

    recognitionRef.current.onerror = () => restartListening();
    recognitionRef.current.onend = () => {
      setIsListening(false);
      isRecognitionActiveRef.current = false;
      if (conversationStarted && !isProcessing) restartListening();
    };
  };

  const restartListening = () => {
    if (!conversationStarted || isProcessing || isRecognitionActiveRef.current) return;
    setTimeout(() => {
      try { recognitionRef.current?.start(); } catch {}
    }, 300);
  };

  const startListening = () => {
    if (isRecognitionActiveRef.current || !recognitionRef.current) return;
    try { recognitionRef.current.start(); } catch {}
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const toggleConversation = () => {
    if (conversationStarted) {
      setConversationStarted(false);
      stopListening();
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
    } else {
      setConversationStarted(true);
      setIsProcessing(false);
      setTimeout(startListening, 400);
    }
  };

  const processUserMessage = async (userInput: string) => {
    if (!userInput) return;

    setIsProcessing(true);
    onExpressionChange('thinking');
    stopListening();

    let fullText = "";

    try {
      await streamResponseAndSpeak(
        userInput,
        (chunk) => {
          fullText += chunk;
        },
        () => {
          onTherapistSpeaking(true);
          onExpressionChange('speaking');
        },
        () => {
          onUserMessage(fullText);
          onTherapistSpeaking(false);
          onExpressionChange('neutral');
          setIsProcessing(false);

          // ← THIS LINE KEEPS THE CONVERSATION GOING FOREVER
          if (conversationStarted) {
            setTimeout(startListening, 600);
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast({ title: "Try again", description: "I got stuck, let’s keep going ♡", variant: "destructive" });
      onTherapistSpeaking(false);
      onExpressionChange('neutral');
      setIsProcessing(false);
      if (conversationStarted) setTimeout(startListening, 800);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-6">
      <button
        onClick={toggleConversation}
        className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
          conversationStarted
            ? isListening
              ? 'bg-pink-500 text-white animate-pulse'
              : isProcessing
              ? 'bg-blue-500 text-white'
              : 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}
      >
        {conversationStarted
          ? isListening
            ? 'Listening…'
            : isProcessing
            ? 'Speaking…'
            : 'End Conversation'
          : 'Start Talking'}
      </button>

      {transcript && (
        <div className="bg-white/10 backdrop-blur rounded-2xl px-6 py-3 text-lg animate-pulse">
          {transcript}...
        </div>
      )}
    </div>
  );
};

export default SpeechProcessor;
