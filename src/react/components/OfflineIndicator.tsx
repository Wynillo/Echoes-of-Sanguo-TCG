import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div role="status" aria-live="polite" className="offline-indicator">
      {t('status.offline')}
    </div>
  );
}
