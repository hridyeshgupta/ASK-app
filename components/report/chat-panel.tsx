'use client';

// components/report/chat-panel.tsx
//  "Chat-only edits — no inline PPT editing" + "Generation and edits are mutually exclusive"

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types/report';
import { ChatMessageItem } from './chat-message';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendIcon, Loader2Icon, MessageSquareIcon } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  isGenerating: boolean; // Disabled during generation — mutually exclusive
}

export function ChatPanel({ messages, onSendMessage, isLoading, isGenerating }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
        <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Edit via Chat</h3>
        {isGenerating && (
          <span className="ml-auto text-xs text-amber-500 font-medium">
            Editing disabled during generation
          </span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="space-y-2">
              <MessageSquareIcon className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Start a conversation to edit the report
              </p>
              <p className="text-xs text-muted-foreground/60">
                Describe the changes you&apos;d like to make
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span className="text-xs">Processing changes...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 p-4">
        <div className="flex gap-2">
          <Textarea
            id="chat-input"
            placeholder={isGenerating ? 'Wait for generation to complete...' : 'Describe your edit...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating || isLoading}
            rows={2}
            className="resize-none flex-1"
          />
          <Button
            id="chat-send"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isGenerating}
            className="h-auto self-end"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
