import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';

export default function PublicLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    settingsService
      .getLogoUrl()
      .then((url) => setLogoUrl(url))
      .catch(() => setLogoUrl(null));
  }, []);

  if (logoUrl === undefined) {
    return <div className="mb-8 flex min-h-[100px] justify-center" />;
  }

  if (!logoUrl) return null;

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
