
import React, { useEffect, useState } from 'react';
import ConversationUI from '@/components/ConversationUI';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const { toast } = useToast();
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    // Check browser support for speech recognition
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }
    
    checkMicrophonePermission();
  }, [toast]);

  const checkMicrophonePermission = async () => {
    try {
      // First try to get existing permission state
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      setMicrophonePermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
      
      // Show dialog if permission is denied
      if (permissionStatus.state === 'denied') {
        setShowPermissionDialog(true);
      }
      
      // Listen for permission changes
      permissionStatus.onchange = () => {
        setMicrophonePermission(permissionStatus.state as 'granted' | 'denied' | 'prompt');
        
        if (permissionStatus.state === 'granted') {
          setShowPermissionDialog(false);
          toast({
            title: "Microphone access granted",
            description: "You can now start the conversation with your AI therapist.",
          });
        } else if (permissionStatus.state === 'denied') {
          setShowPermissionDialog(true);
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access to use the speech features.",
            variant: "destructive",
          });
        }
      };
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      // Fallback to getUserMedia
      requestMicrophoneAccess();
    }
  };
  
  const requestMicrophoneAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophonePermission('granted');
      setShowPermissionDialog(false);
      toast({
        title: "Microphone access granted",
        description: "You can now start the conversation with your AI therapist.",
      });
    } catch (err) {
      console.error('Microphone access error:', err);
      setMicrophonePermission('denied');
      setShowPermissionDialog(true);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use the speech features.",
        variant: "destructive",
      });
    }
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
        
        <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
          <AlertDialogContent className="bg-black/90 border border-therapy-cyan">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-therapy-cyan">Microphone Access Required</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                This app needs microphone access to enable voice conversations. Please allow microphone access in your browser settings:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Click the microphone/camera icon in your browser's address bar</li>
                  <li>Select "Allow" for microphone access</li>
                  <li>Refresh the page after allowing access</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 text-therapy-cyan hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                className="bg-therapy-cyan text-black hover:bg-therapy-cyan/90"
                onClick={() => {
                  requestMicrophoneAccess();
                }}
              >
                Try Again
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
