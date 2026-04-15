'use client';

// components/generate/company-selector.tsx
//  "select company"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BuildingIcon } from 'lucide-react';

// Hardcoded companies for static UI
const COMPANIES = [
  'Acme Corporation',
  'GlobalTech Industries',
  'Pinnacle Financial',
  'Vertex Holdings',
  'Meridian Capital',
  'Atlas Infrastructure',
  'Quantum Ventures',
  'Horizon Partners',
];

interface CompanySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CompanySelector({ value, onChange, disabled }: CompanySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="company-selector" className="text-sm font-medium flex items-center gap-2">
        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        Company
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="company-selector" className="w-full">
          <SelectValue placeholder="Select a company..." />
        </SelectTrigger>
        <SelectContent>
          {COMPANIES.map((company) => (
            <SelectItem key={company} value={company}>
              {company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
