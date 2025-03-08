
import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

const expressions = [
  "neutral",
  "happy",
  "listening",
  "thinking",
  "speaking",
  "empathetic",
];

interface AvatarProps {
  expressionState?: string;
  isSpeaking?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ expressionState = "neutral", isSpeaking = false }) => {
  const [currentExpression, setCurrentExpression] = useState(expressionState);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentExpression(expressionState);
  }, [expressionState]);

  return (
    <motion.div
      ref={avatarRef}
      className="relative w-64 h-64 rounded-full overflow-hidden glass-panel flex items-center justify-center"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: [0, -5, 0]
      }}
      transition={{
        y: {
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        },
        scale: { duration: 0.5 },
        opacity: { duration: 0.5 }
      }}
    >
      {/* Pulse circles when speaking */}
      {isSpeaking && (
        <>
          <div className="pulse-ring opacity-50"></div>
          <div className="pulse-ring opacity-30" style={{ animationDelay: "0.5s" }}></div>
          <div className="pulse-ring opacity-10" style={{ animationDelay: "1s" }}></div>
        </>
      )}
      
      {/* Modern AI assistant image */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img 
          src="/lovable-uploads/07d8bf0e-b85b-4e06-8e19-1058cb514108.png" 
          alt="AI Assistant" 
          className="w-full h-full object-cover"
        />
        
        {/* Optional: Add a call-to-action button overlay that responds to the expression state */}
        {currentExpression === "neutral" && (
          <div className="absolute bottom-4 w-full flex justify-center">
            <div className="bg-white/80 backdrop-blur-sm text-black px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium">
              <span className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                <motion.span 
                  className="block w-2 h-2 bg-white"
                  animate={{ 
                    height: [2, 6, 2],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              </span>
              Try a call
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Avatar;
