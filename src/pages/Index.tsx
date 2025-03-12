
import React, { useEffect } from 'react';
import ConversationUI from '@/components/ConversationUI';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Check browser support for speech recognition
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }
    
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        toast({
          title: "Microphone access granted",
          description: "You can now start the conversation with your AI therapist.",
        });
      })
      .catch((err) => {
        console.error('Microphone access error:', err);
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use the speech features.",
          variant: "destructive",
        });
      });
  }, [toast]);

  return (
    <div className="min-h-screen futuristic-gradient-bg overflow-hidden">
      <motion.div
        className="w-full min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <ConversationUI />
        
        {/* Footer */}
        <footer className="w-full text-center py-4 text-xs text-therapy-cyan/80">
          <p>AI Therapist is for demonstration purposes only and not a substitute for professional help.</p>
          <p className="mt-1">
            If you're experiencing a mental health crisis, please contact a mental health professional.
          </p>
        </footer>
      </motion.div>
    </div>
  );
};

export default Index;
