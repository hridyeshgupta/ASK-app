'use client';

// components/generate/prompt-input.tsx
//  "optional prompt"

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquareIcon } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="prompt-input" className="text-sm font-medium flex items-center gap-2">
        <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
        Custom Prompt
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </Label>
      <Textarea
        id="prompt-input"
        placeholder="Add any specific instructions or focus areas for the report generation..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        className="resize-none"
      />
    </div>
  );
}
