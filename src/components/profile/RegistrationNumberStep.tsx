import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import StorefrontIcon from '@mui/icons-material/Storefront';

interface RegistrationNumberStepProps {
  registrationNumber: string;
  isChecking: boolean;
  onChangeRegistrationNumber: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheck: () => void;
}

export default function RegistrationNumberStep({
  registrationNumber,
  isChecking,
  onChangeRegistrationNumber,
  onCheck,
}: RegistrationNumberStepProps) {
  return (
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <StorefrontIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" fontWeight={700}>
          쿨피스 도매주문
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          사업자등록번호를 입력해주세요
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <TextField
          label="사업자등록번호"
          placeholder="000-00-00000"
          value={registrationNumber}
          onChange={onChangeRegistrationNumber}
          fullWidth
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onCheck()}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onCheck}
          disabled={!registrationNumber.trim() || isChecking}
        >
          {isChecking ? '확인 중...' : '확인'}
        </Button>
        {isChecking && <LinearProgress sx={{ mt: 1 }} />}
      </Paper>
    </>
  );
}
