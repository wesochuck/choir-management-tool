import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settingsService';
import './PublicLogo.css';

export default function PublicLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    settingsService.getLogoUrl()
      .then(url => setLogoUrl(url))
      .catch(() => setLogoUrl(null));
  }, []);

  if (!logoUrl) return null;

  return (
    <div className="public-logo-container">
      <img src={logoUrl} alt="Organization logo" className="public-logo-img" />
    </div>
  );
}
