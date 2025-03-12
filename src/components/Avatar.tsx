
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
      className="relative w-64 h-64 rounded-full overflow-hidden glass-panel flex items-center justify-center border-2 border-therapy-cyan neon-shadow"
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
      
      {/* Futuristic AI avatar with live gradient */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
          {/* Dynamic gradient background */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-therapy-cyan via-therapy-black to-therapy-yellow animate-gradient-x">
            {/* Inner dynamic effects */}
            <div className="absolute inset-0 w-full h-full opacity-70 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-white/20 to-transparent animate-pulse"></div>
          </div>
          
          {/* Geometric pattern overlay */}
          <div className="absolute inset-0 w-full h-full grid grid-cols-8 grid-rows-8 gap-[1px] opacity-20">
            {Array.from({ length: 64 }).map((_, i) => (
              <div 
                key={i} 
                className="bg-white/10 backdrop-blur-sm"
                style={{ animationDelay: `${i * 0.05}s` }}
              ></div>
            ))}
          </div>
          
          {/* Expression-based elements */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Eyes representation */}
            <div className="flex space-x-12 mb-8">
              <motion.div 
                className="w-8 h-3 rounded-full bg-therapy-yellow backdrop-blur-md"
                animate={{ 
                  height: currentExpression === "thinking" ? [3, 5, 3] : 3,
                  width: currentExpression === "happy" ? 10 : 8
                }}
                transition={{ 
                  repeat: currentExpression === "thinking" ? Infinity : 0,
                  duration: 1.5
                }}
              />
              <motion.div 
                className="w-8 h-3 rounded-full bg-therapy-yellow backdrop-blur-md"
                animate={{ 
                  height: currentExpression === "thinking" ? [3, 5, 3] : 3,
                  width: currentExpression === "happy" ? 10 : 8
                }}
                transition={{ 
                  repeat: currentExpression === "thinking" ? Infinity : 0,
                  duration: 1.5
                }}
              />
            </div>
            
            {/* Mouth/speaker visualization */}
            <motion.div 
              className="w-24 h-4 rounded-full bg-therapy-cyan backdrop-blur-md overflow-hidden"
              animate={{ 
                width: currentExpression === "happy" ? 32 : 24,
                height: isSpeaking ? [4, 6, 3, 7, 4] : 4
              }}
              transition={{ 
                repeat: isSpeaking ? Infinity : 0,
                duration: 1
              }}
            >
              {isSpeaking && (
                <motion.div 
                  className="w-full h-full bg-gradient-to-r from-therapy-cyan to-therapy-yellow"
                  animate={{
                    x: ["-25%", "0%", "25%", "0%", "-25%"]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1
                  }}
                />
              )}
            </motion.div>
          </div>
          
          {/* Particle effects */}
          <div className="absolute inset-0 w-full h-full">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-therapy-cyan/70"
                initial={{ 
                  x: Math.random() * 100 - 50, 
                  y: Math.random() * 100 - 50,
                  opacity: 0
                }}
                animate={{ 
                  x: Math.random() * 100 - 50,
                  y: Math.random() * 100 - 50,
                  opacity: [0, 1, 0]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3 + Math.random() * 2,
                  delay: i * 0.5
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Call-to-action button overlay */}
        {currentExpression === "neutral" && (
          <div className="absolute bottom-4 w-full flex justify-center">
            <div className="bg-therapy-black/80 backdrop-blur-sm text-therapy-yellow px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium border border-therapy-cyan/40">
              <span className="w-4 h-4 bg-therapy-cyan rounded-full flex items-center justify-center">
                <motion.span 
                  className="block w-2 h-2 bg-therapy-black"
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
