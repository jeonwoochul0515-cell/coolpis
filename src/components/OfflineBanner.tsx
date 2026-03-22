import { useState, useEffect, useRef } from 'react';
import Alert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setMessage('인터넷 연결이 끊겼습니다. 일부 기능이 제한될 수 있습니다.');
      setShow(true);
    } else if (wasOffline.current) {
      // Just came back online
      setMessage('연결이 복구되었습니다.');
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        wasOffline.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <Slide direction="down" in={show} mountOnEnter unmountOnExit>
      <Alert
        severity={isOnline ? 'success' : 'warning'}
        sx={{
          borderRadius: 0,
          justifyContent: 'center',
          fontWeight: 600,
        }}
      >
        {message}
      </Alert>
    </Slide>
  );
}
