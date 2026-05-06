import { useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
  value: string[];           // Array of 6 single-char strings
  onChange: (val: string[]) => void;
  shake?: boolean;
  disabled?: boolean;
}

export default function OtpInput({ value, onChange, shake = false, disabled = false }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (idx: number) => {
    if (idx >= 0 && idx < 6) refs.current[idx]?.focus();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[idx] = ch;
    onChange(next);
    if (ch && idx < 5) focusBox(idx + 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        const next = [...value];
        next[idx] = '';
        onChange(next);
      } else {
        focusBox(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusBox(idx - 1);
    } else if (e.key === 'ArrowRight') {
      focusBox(idx + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...value];
    for (let i = 0; i < 6; i++) next[i] = text[i] || '';
    onChange(next);
    focusBox(Math.min(text.length, 5));
  };

  return (
    <div
      className={`reg-otp-row${shake ? ' reg-otp-shake' : ''}`}
      role="group"
      aria-label="OTP input"
    >
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] || ''}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled}
          aria-label={`OTP digit ${idx + 1}`}
          className={`reg-otp-box${value[idx] ? ' reg-otp-box-filled' : ''}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
