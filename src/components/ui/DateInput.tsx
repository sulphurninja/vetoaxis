'use client';

import { useEffect, useRef, useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DateInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  calendarOnly?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
  className = '',
  calendarOnly = false,
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }

    const iso = parse(value, 'yyyy-MM-dd', new Date());
    if (isValid(iso) && format(iso, 'yyyy-MM-dd') === value) {
      setDisplayValue(format(iso, 'MM/dd/yyyy'));
      return;
    }

    const us = parse(value, 'MM/dd/yyyy', new Date());
    if (isValid(us) && format(us, 'MM/dd/yyyy') === value) {
      setDisplayValue(format(us, 'MM/dd/yyyy'));
    }
  }, [value]);

  const commitDisplay = (masked: string) => {
    if (masked.length !== 10) {
      onChange('');
      return;
    }

    const parsedDate = parse(masked, 'MM/dd/yyyy', new Date());
    if (isValid(parsedDate) && format(parsedDate, 'MM/dd/yyyy') === masked) {
      onChange(format(parsedDate, 'yyyy-MM-dd'));
      return;
    }

    onChange('');
  };

  const handleDisplayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = event.target.value.replace(/\D/g, '').slice(0, 8);
    let masked = rawDigits;
    if (rawDigits.length > 2) masked = `${rawDigits.slice(0, 2)}/${rawDigits.slice(2)}`;
    if (rawDigits.length > 4) masked = `${rawDigits.slice(0, 2)}/${rawDigits.slice(2, 4)}/${rawDigits.slice(4)}`;
    setDisplayValue(masked);
    commitDisplay(masked);
  };

  const handleHiddenDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = event.target.value;
    if (!isoDate) {
      onChange('');
      setDisplayValue('');
      return;
    }

    onChange(isoDate);
    const parsedDate = parse(isoDate, 'yyyy-MM-dd', new Date());
    if (isValid(parsedDate)) setDisplayValue(format(parsedDate, 'MM/dd/yyyy'));
  };

  const openPicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // Some browsers block showPicker on a hidden input. The overlay input still receives the click.
    }
    input.focus();
    input.click();
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        maxLength={10}
        onChange={handleDisplayChange}
        readOnly={calendarOnly}
        aria-label={placeholder}
        className={`h-10 bg-background pr-10 ${className}`}
      />
      <input
        type="date"
        ref={dateInputRef}
        value={/^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : ''}
        onChange={handleHiddenDateChange}
        className="absolute right-0 top-0 h-full w-10 cursor-pointer opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      <Button
        type="button"
        variant="ghost"
        className="absolute right-0 h-9 w-10 px-2"
        onClick={openPicker}
      >
        <CalendarIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
