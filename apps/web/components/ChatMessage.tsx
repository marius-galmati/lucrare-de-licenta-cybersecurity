'use client';

import React from 'react';
import { Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  type: 'bot' | 'user';
  message: string;
  animate?: boolean;
  /** Afișează bula cu text mai mare și mai proeminent (folosit pentru întrebări). */
  size?: 'default' | 'lg';
}

export default function ChatMessage({ type, message, animate = false, size = 'default' }: ChatMessageProps) {
  const isBot = type === 'bot';
  const isLarge = size === 'lg';

  return (
    <div className={cn(
      "flex gap-3",
      isLarge ? "max-w-[95%]" : "max-w-[85%]",
      isBot ? "self-start" : "self-end flex-row-reverse",
      animate && "animate-fade-in"
    )}>
      <div className={cn(
        "flex-shrink-0 rounded-full flex items-center justify-center",
        isLarge ? "w-10 h-10" : "w-8 h-8",
        isBot ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
      )}>
        {isBot
          ? <Shield className={isLarge ? "w-5 h-5" : "w-4 h-4"} />
          : <User className={isLarge ? "w-5 h-5" : "w-4 h-4"} />}
      </div>
      <div className={cn(
        "rounded-2xl leading-relaxed",
        isLarge ? "px-5 py-4 text-lg md:text-xl font-medium" : "px-4 py-3 text-sm",
        isBot ? "bg-card border border-border rounded-tl-md" : "bg-primary text-primary-foreground rounded-tr-md"
      )}>
        {message}
      </div>
    </div>
  );
}
