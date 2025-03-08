
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

const Avatar = ({ expressionState = "neutral", isSpeaking = false }) => {
  const [currentExpression, setCurrentExpression] = useState(expressionState);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentExpression(expressionState);
  }, [expressionState]);

  // This function would be replaced with actual 3D avatar rendering
  const renderFace = () => {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Face shape */}
        <div className="w-48 h-64 bg-gradient-to-b from-[#FFE6E6] to-[#FFD6D6] rounded-[40%] relative">
          {/* Eyes */}
          <div className="absolute w-8 h-4 bg-white rounded-full top-[35%] left-[25%] flex items-center justify-center">
            <div 
              className={`w-4 h-4 bg-[#3B4252] rounded-full ${
                currentExpression === "thinking" ? "animate-pulse" : ""
              }`}
            />
          </div>
          <div className="absolute w-8 h-4 bg-white rounded-full top-[35%] right-[25%] flex items-center justify-center">
            <div 
              className={`w-4 h-4 bg-[#3B4252] rounded-full ${
                currentExpression === "thinking" ? "animate-pulse" : ""
              }`}
            />
          </div>

          {/* Mouth */}
          <div 
            className={`absolute w-16 h-4 rounded-full bottom-[25%] left-1/2 transform -translate-x-1/2 
              ${currentExpression === "happy" || currentExpression === "empathetic" 
                ? "border-t-4 border-[#3B4252]" 
                : currentExpression === "speaking"
                ? "bg-[#3B4252] animate-pulse" 
                : "border-b-4 border-[#3B4252]"}`}
          />
          
          {/* Eyebrows */}
          <div 
            className={`absolute w-10 h-1 bg-[#3B4252] top-[28%] left-[22%] transform ${
              currentExpression === "empathetic" ? "rotate-12" : currentExpression === "thinking" ? "-rotate-12" : ""
            }`}
          />
          <div 
            className={`absolute w-10 h-1 bg-[#3B4252] top-[28%] right-[22%] transform ${
              currentExpression === "empathetic" ? "-rotate-12" : currentExpression === "thinking" ? "rotate-12" : ""
            }`}
          />
        </div>
      </div>
    );
  };

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
      
      {renderFace()}
    </motion.div>
  );
};

export default Avatar;
