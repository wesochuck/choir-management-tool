import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';

interface PublicLogoProps {
  variant?: 'header' | 'default';
}

export default function PublicLogo({ variant = 'default' }: PublicLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    settingsService
      .getLogoUrl()
      .then((url) => setLogoUrl(url))
      .catch(() => setLogoUrl(null));
  }, []);

  if (logoUrl === undefined) {
    if (variant === 'header') {
      return <div className="flex size-8 items-center justify-center" />;
    }
    return <div className="mb-8 flex min-h-[100px] justify-center" />;
  }

  if (!logoUrl) return null;

  if (variant === 'header') {
    return (
      <div className="flex items-center">
        <img src={logoUrl} alt="Organization logo" className="max-h-8 max-w-8 object-contain" />
      </div>
    );
  }

  return (
    <div className="mb-8 flex justify-center">
      <img
        src={logoUrl}
        alt="Organization logo"
        className="max-h-[100px] max-w-[90%] object-contain sm:max-h-[80px]"
      />
    </div>
  );
}
