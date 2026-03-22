import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { log } from '../utils/logger';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    log('error', error.message, {
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            p: 2,
          }}
        >
          <Card
            sx={{
              maxWidth: 480,
              width: '100%',
              p: 4,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              문제가 발생했습니다
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              예기치 않은 오류가 발생했습니다. 아래 버튼을 눌러 페이지를 다시 로드해 주세요.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={this.handleReload}
            >
              다시 시도
            </Button>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
