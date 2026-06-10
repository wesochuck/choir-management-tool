import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';

export default function PublicLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    settingsService.getLogoUrl()
      .then(url => setLogoUrl(url))
      .catch(() => setLogoUrl(null));
  }, []);

  if (logoUrl === undefined) {
    return <div className="flex justify-center mb-8 min-h-[100px]" />;
  }

  if (!logoUrl) return null;

  return (
    <div className="flex justify-center mb-8">
      <img src={logoUrl} alt="Organization logo" className="max-h-[100px] max-w-[90%] object-contain sm:max-h-[80px]" />
    </div>
  );
}
