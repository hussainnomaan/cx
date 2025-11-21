
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Avatar from './Avatar';
import SpeechProcessor from './SpeechProcessor';

interface Message {
  text: string;
  sender: 'user' | 'therapist';
  timestamp: Date;
}

const ConversationUI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expression, setExpression] = useState<string>('neutral');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  useEffect(() => {
    // Add initial greeting
    setTimeout(() => {
      const initialMessage: Message = {
        text: "Hello I'm X, I'm here to listen to you. Anything on your mind lately?",
        sender: 'therapist',
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }, 1000);
  }, []);

  const handleUserMessage = (text: string) => {
    // Handle different message senders
    if (typeof text !== 'string') return;
    
    // Determine if this is a user or therapist message based on context
    const isUserMessage = !isSpeaking && !expression.includes('thinking');
    
    const newMessage: Message = {
      text,
      sender: isUserMessage ? 'user' : 'therapist',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    console.log(`Added ${isUserMessage ? 'user' : 'therapist'} message:`, text);
  };

  const handleSpeechStart = () => {
    setIsUserSpeaking(true);
  };

  const handleSpeechEnd = () => {
    setIsUserSpeaking(false);
  };

  const handleTherapistSpeaking = (speaking: boolean) => {
    setIsSpeaking(speaking);
    console.log("Therapist speaking:", speaking);
  };

  const handleExpressionChange = (newExpression: string) => {
    setExpression(newExpression);
    console.log("Expression changed:", newExpression);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="blob bg-therapy-cyan/40"></div>
        <div className="blob bg-therapy-yellow/40"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        <motion.div 
          className="flex flex-col items-center justify-center py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-7xl font-bold gradient-text mb-2">Tara</h1>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Your AI Best Friend
          </p>
          
          {/* Avatar */}
          <div className="relative my-6">
            <Avatar 
              expressionState={expression} 
              isSpeaking={isSpeaking} 
            />
          </div>
          
          {/* Speech processor */}
          <SpeechProcessor 
            onSpeechStart={handleSpeechStart}
            onSpeechEnd={handleSpeechEnd}
            onUserMessage={handleUserMessage}
            onTherapistSpeaking={handleTherapistSpeaking}
            onExpressionChange={handleExpressionChange}
          />
          
          {/* Chat log */}
          <motion.div 
            className="mt-8 w-full max-w-2xl glass-panel p-6 max-h-60 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div 
                      className={`rounded-2xl px-4 py-2 max-w-xs ${
                        msg.sender === 'user' 
                          ? 'bg-therapy-cyan/20 border border-therapy-cyan/40 mr-2' 
                          : 'bg-therapy-yellow/20 border border-therapy-yellow/40 ml-2'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm">Your conversation will appear here</p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConversationUI;
