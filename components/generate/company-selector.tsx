'use client';

// components/generate/company-selector.tsx
// Uses react-select Creatable — user can select an existing company or create a new one.
// Pranavi: "react select… this has a creatable option… so either you select the company name
//          from the dropdown or you create a new one"

import { useState, useEffect, useCallback } from 'react';
import CreatableSelect from 'react-select/creatable';
import { Label } from '@/components/ui/label';
import { BuildingIcon } from 'lucide-react';

interface CompanyOption {
  value: string;   // company ID (UUID) for existing, or the typed name for new
  label: string;   // company name
  __isNew__?: boolean;
}

interface CompanySelectorProps {
  value: string;
  onChange: (value: string, companyId?: string) => void;
  disabled?: boolean;
  module?: string;
  /** If true, only allows selecting existing companies (no create). Used on Generate step. */
  creatableDisabled?: boolean;
}

export function CompanySelector({
  value,
  onChange,
  disabled,
  module = 'pc',
  creatableDisabled = false,
}: CompanySelectorProps) {
  const [options, setOptions] = useState<CompanyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CompanyOption | null>(null);

  // Fetch companies from DB
  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/companies?module=${module}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const opts: CompanyOption[] = (data.companies || []).map(
        (c: { id: string; name: string }) => ({
          value: c.id,
          label: c.name,
        }),
      );
      setOptions(opts);

      // If we have a current value, find and set the matching option
      if (value) {
        const match = opts.find(
          (o) => o.label === value || o.value === value,
        );
        if (match) setSelectedOption(match);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [module, value]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Handle selecting an existing company
  const handleChange = (option: CompanyOption | null) => {
    setSelectedOption(option);
    if (option) {
      onChange(option.label, option.value);
    } else {
      onChange('');
    }
  };

  // Handle creating a new company
  const handleCreate = async (inputValue: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputValue, module }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      const newOption: CompanyOption = {
        value: data.company.id,
        label: data.company.name,
      };
      setOptions((prev) => [...prev, newOption]);
      setSelectedOption(newOption);
      onChange(newOption.label, newOption.value);
    } catch (err) {
      console.error('Failed to create company:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom styles to match shadcn/ui theme
  // Note: CSS vars use oklch() so we reference --color-* (Tailwind mapped) not hsl(var(--*))
  const customStyles = {
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
      ...base,
      backgroundColor: 'var(--color-background)',
      borderColor: state.isFocused ? 'var(--color-ring)' : 'var(--color-border)',
      borderRadius: 'calc(var(--radius) - 2px)',
      minHeight: '40px',
      boxShadow: state.isFocused ? '0 0 0 2px color-mix(in oklch, var(--color-ring) 20%, transparent)' : 'none',
      '&:hover': {
        borderColor: 'var(--color-border)',
      },
      fontSize: '14px',
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      backgroundColor: 'var(--color-popover)',
      border: '1px solid var(--color-border)',
      borderRadius: 'calc(var(--radius) - 2px)',
      boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15), 0 4px 10px -4px rgb(0 0 0 / 0.1)',
      zIndex: 9999,
      position: 'absolute' as const,
      marginTop: '4px',
      overflow: 'hidden',
    }),
    menuList: (base: Record<string, unknown>) => ({
      ...base,
      padding: '4px 0',
      backgroundColor: 'var(--color-popover)',
    }),
    option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--color-primary)'
        : state.isFocused
          ? 'var(--color-accent)'
          : 'transparent',
      color: state.isSelected ? 'var(--color-primary-foreground)' : 'var(--color-popover-foreground)',
      fontSize: '14px',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--color-accent)',
      },
    }),
    singleValue: (base: Record<string, unknown>) => ({
      ...base,
      color: 'var(--color-foreground)',
    }),
    input: (base: Record<string, unknown>) => ({
      ...base,
      color: 'var(--color-foreground)',
    }),
    placeholder: (base: Record<string, unknown>) => ({
      ...base,
      color: 'var(--color-muted-foreground)',
      fontSize: '14px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
      ...base,
      color: 'var(--color-muted-foreground)',
      '&:hover': {
        color: 'var(--color-foreground)',
      },
    }),
  };

  return (
    <div className="space-y-2" style={{ position: 'relative', zIndex: 50 }}>
      <Label htmlFor="company-selector" className="text-sm font-medium flex items-center gap-2">
        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        Company
      </Label>
      {creatableDisabled ? (
        <CreatableSelect
          inputId="company-selector"
          options={options}
          value={selectedOption}
          onChange={handleChange}
          isDisabled={disabled}
          isLoading={isLoading}
          placeholder="Select a company..."
          isValidNewOption={() => false}
          styles={customStyles}
          noOptionsMessage={() => 'No companies found. Upload documents first.'}
          isClearable
          openMenuOnFocus
        />
      ) : (
        <CreatableSelect
          inputId="company-selector"
          options={options}
          value={selectedOption}
          onChange={handleChange}
          onCreateOption={handleCreate}
          isDisabled={disabled}
          isLoading={isLoading}
          placeholder="Select or type to create a company..."
          formatCreateLabel={(input) => `Create "${input}"`}
          styles={customStyles}
          isClearable
          openMenuOnFocus
        />
      )}
    </div>
  );
}
