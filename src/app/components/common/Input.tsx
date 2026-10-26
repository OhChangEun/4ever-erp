'use client';

import React, { useState } from 'react';

// InputLabel 컴포넌트 분리 (같은 파일에 정의한다고 가정)
interface InputLabelProps {
  label?: string;
  required?: boolean;
  htmlFor?: string;
}

export const InputLabel = ({ label, required, htmlFor }: InputLabelProps) => {
  if (!label) return null;

  return (
    <label
      htmlFor={htmlFor}
      className="text-[13px] text-gray-500 flex items-center mb-1 whitespace-nowrap"
    >
      {label}
      {required && <span className="pl-1 pt-0 text-red-500">*</span>}
    </label>
  );
};

// 기존 InputProps 인터페이스
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'outline';
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: string;
  maxLength?: number;
}

// 전화번호 포맷팅 함수 (handleChange 내부에서 사용)
const formatPhoneNumber = (value: string): string => {
  // 숫자만 남깁니다.
  const numbers = value.replace(/[^0-9]/g, '');

  if (numbers.length === 0) return '';

  let result = numbers;

  // 대한민국 휴대폰 번호 형식 (010-xxxx-xxxx)에 맞춰 하이픈 추가
  if (numbers.length > 3) {
    if (numbers.startsWith('02')) {
      // 서울 국번 (2자리)
      if (numbers.length < 6) {
        result = `${numbers.substring(0, 2)}-${numbers.substring(2)}`;
      } else if (numbers.length < 10) {
        result = `${numbers.substring(0, 2)}-${numbers.substring(2, 6)}-${numbers.substring(6)}`;
      } else {
        // 최대 10자리 (ex: 02-1234-5678)
        result = `${numbers.substring(0, 2)}-${numbers.substring(2, 6)}-${numbers.substring(6, 10)}`;
      }
    } else if (numbers.startsWith('01') && numbers.length >= 10) {
      // 휴대폰 번호 (10자리 또는 11자리)
      if (numbers.length < 11) {
        // 01x-xxx-xxxx (10자리)
        result = `${numbers.substring(0, 3)}-${numbers.substring(3, 6)}-${numbers.substring(6)}`;
      } else {
        // 01x-xxxx-xxxx (11자리)
        result = `${numbers.substring(0, 3)}-${numbers.substring(3, 7)}-${numbers.substring(7, 11)}`;
      }
    } else if (numbers.length < 7) {
      // 일반 유선 번호 (지역번호 3자리)
      result = `${numbers.substring(0, 3)}-${numbers.substring(3)}`;
    } else if (numbers.length < 11) {
      // 3-3-4 또는 3-4-4 패턴에 맞춰 유연하게 처리 (3-3-4는 10자리, 3-4-4는 11자리)
      // 0xx-xxx-xxxx 또는 0xx-xxxx-xxxx 형식 (ex: 031-123-4567 또는 031-1234-5678)
      result = `${numbers.substring(0, 3)}-${numbers.substring(3, 7)}-${numbers.substring(7, 11)}`;
    } else {
      // 11자리 초과 시 (ex: 010123456781) 11자리까지만 허용하고 포맷
      result = `${numbers.substring(0, 3)}-${numbers.substring(3, 7)}-${numbers.substring(7, 11)}`;
    }
  }

  // 최대 길이는 하이픈을 포함하여 13자리를 넘지 않도록 (010-xxxx-xxxx)
  return result.slice(0, 13);
};

export default function Input({
  label,
  error,
  maxLength = 20,
  variant = 'default',
  inputSize = 'md',
  className = '',
  icon,
  disabled,
  required,
  id,
  type = 'text',
  onChange,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = id;

  const base = 'w-full text-gray-800 focus:outline-none transition-colors placeholder-gray-400';

  const variants = {
    default: 'border border-gray-300 focus:border-blue-500 bg-white',
    outline: 'border border-blue-500 bg-white focus:border-blue-600',
  };

  const sizes = {
    sm: 'h-7 px-2 text-xs rounded-md',
    md: 'h-8 px-2.5 text-[13px] rounded-md',
    lg: 'h-10 px-3 text-sm rounded-md',
  };

  const disabledClasses = 'bg-gray-100 text-gray-400 border-gray-200';

  const iconPaddingLeft = icon && !disabled ? 'pl-8' : '';

  const appliedClasses = `
    ${base}
    ${sizes[inputSize]}
    ${iconPaddingLeft}
    ${disabled ? disabledClasses : variants[variant]}
    ${error ? 'border-red-500 focus:border-red-500' : ''}
    ${className}
  `;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    let newValue = value; // 변경된 값을 저장할 변수

    // 1. 전화번호 형식 포맷팅
    if (type === 'tel') {
      newValue = formatPhoneNumber(value);

      const newEvent = {
        ...e,
        target: {
          ...e.target,
          value: newValue, // 포맷팅된 값으로 변경
        },
      } as React.ChangeEvent<HTMLInputElement>; // 타입 단언 필요

      onChange?.(newEvent);
      return;
    }

    // 2. 숫자만 허용 (type='number'로 설정 시)
    if (type === 'number') {
      // 숫자 입력 시 type="number" 대신 text를 사용하고 정규식으로 제어하는 경우
      if (/^\d*$/.test(value)) {
        newValue = value.slice(0, maxLength); // 입력 자리수 제한

        const newEvent = {
          ...e,
          target: {
            ...e.target,
            value: newValue, // 숫자만, 길이 제한된 값
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange?.(newEvent);
      }
      return;
    }

    // 3. 일반 text 처리 (maxLength 적용)
    newValue = value.slice(0, maxLength);

    // 일반 텍스트도 길이 제한이 적용된 값으로 이벤트 전달
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: newValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    onChange?.(newEvent);
  };

  return (
    <div className="flex flex-col">
      {/* Label - 분리된 InputLabel 컴포넌트 사용 */}
      <InputLabel label={label} required={required} htmlFor={inputId} />

      {/* Input */}
      <div className="relative flex items-center">
        {icon && !disabled && (
          <i
            className={`${icon} absolute left-2.5 z-1 text-sm pointer-events-none transition-colors ${
              isFocused ? 'text-blue-500' : 'text-gray-400'
            }`}
          />
        )}
        <input
          id={inputId} // InputLabel과의 연결을 위해 id 적용
          // type='tel'일 때도 포맷팅을 위해 type="text"로 렌더링
          type={type === 'number' || type === 'tel' ? 'text' : type}
          // maxLength는 포맷팅 시 직접 제어하므로 props에서 제거
          className={appliedClasses}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...(type !== 'tel' ? { maxLength } : {})}
          {...props}
        />
        {/* Error Message */}
        {error && (
          <span className="absolute left-1 bottom-[-18px] text-xs text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}
