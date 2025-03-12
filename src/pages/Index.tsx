
import React, { useEffect, useState } from 'react';
import ConversationUI from '@/components/ConversationUI';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const { toast } = useToast();
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  useEffect(() => {
    // Check browser support for speech recognition
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
    }
    
    // Check if microphone permissions are already granted
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(permissionStatus => {
          setMicrophonePermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            setMicrophonePermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
            
            if (permissionStatus.state === 'granted') {
              toast({
                title: "Microphone access granted",
                description: "You can now start the conversation with your AI therapist.",
              });
            } else if (permissionStatus.state === 'denied') {
              toast({
                title: "Microphone access denied",
                description: "Please allow microphone access to use the speech features.",
                variant: "destructive",
              });
            }
          };
        })
        .catch(error => {
          console.error('Error checking microphone permission:', error);
          // Fallback to getUserMedia
          requestMicrophoneAccess();
        });
    } else {
      // Fallback for browsers that don't support permissions API
      requestMicrophoneAccess();
    }
  }, [toast]);
  
  const requestMicrophoneAccess = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setMicrophonePermission('granted');
        toast({
          title: "Microphone access granted",
          description: "You can now start the conversation with your AI therapist.",
        });
      })
      .catch((err) => {
        console.error('Microphone access error:', err);
        setMicrophonePermission('denied');
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use the speech features.",
          variant: "destructive",
        });
      });
  };

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
