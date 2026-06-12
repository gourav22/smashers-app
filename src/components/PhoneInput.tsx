'use client';

import { useState } from 'react';

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const priorityCountries: Country[] = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
];

const otherCountries: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
];

const allCountries = [...priorityCountries, ...otherCountries];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

export default function PhoneInput({ value, onChange, required = false, className = '' }: PhoneInputProps) {
  // Parse existing value if provided
  const getInitialCountry = () => {
    if (value) {
      const country = allCountries.find(c => value.startsWith(c.dial));
      return country || priorityCountries[0];
    }
    return priorityCountries[0];
  };

  const getInitialPhone = () => {
    if (value) {
      const country = allCountries.find(c => value.startsWith(c.dial));
      if (country) {
        return value.substring(country.dial.length).trim();
      }
      return value;
    }
    return '';
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(getInitialCountry);
  const [phoneNumber, setPhoneNumber] = useState(getInitialPhone);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    onChange(`${country.dial} ${phoneNumber}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setPhoneNumber(num);
    onChange(`${selectedCountry.dial} ${num}`);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Country Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="h-full px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2 min-w-[100px]"
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="text-sm text-gray-700">{selectedCountry.dial}</span>
          <span className="text-gray-400">▼</span>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto w-72">
            {/* Priority Countries */}
            <div className="border-b border-gray-200">
              {priorityCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country)}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-gray-900"
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-sm text-gray-600">{country.dial}</span>
                </button>
              ))}
            </div>

            {/* Other Countries */}
            <div>
              {otherCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country)}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-gray-900"
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-sm text-gray-600">{country.dial}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        required={required}
        placeholder="6 12345678"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
      />
    </div>
  );
}
