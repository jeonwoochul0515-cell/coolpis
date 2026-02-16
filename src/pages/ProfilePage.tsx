import { useState, useRef } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useProfile } from '../context/ProfileContext';
import { fileToDataUrl, runOcr, parseBusinessRegistration } from '../services/ocr';
import { findProfileByRegNumber, saveProfile } from '../services/profileStore';
import { useNavigate } from 'react-router-dom';
import type { BusinessProfile } from '../types/profile';
import { getErrorMessage } from '../utils/errorMessage';

type Step = 'input-reg-number' | 'register';

export default function ProfilePage() {
  const { setProfile, uid } = useProfile();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('input-reg-number');
  const [regNumber, setRegNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // 등록 폼
  const [preview, setPreview] = useState<string | null>(null);
  const [isOcr, setIsOcr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 사업자등록번호 포맷팅
  const formatRegNumber = (input: string) => {
    const normalized = input.replace(/[^0-9]/g, '');
    if (normalized.length === 10) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}`;
    }
    return input.trim();
  };

  // 첫 화면: 사업자등록번호 확인
  const handleCheck = async () => {
    if (!regNumber.trim() || !uid) return;
    setIsChecking(true);
    setError(null);

    try {
      const formatted = formatRegNumber(regNumber);
      console.log('[확인] 조회 시작:', formatted);
      const existing = await findProfileByRegNumber(formatted);

      if (existing) {
        console.log('[확인] 기존 회원 발견:', existing.profile.registrationNumber);
        await saveProfile(uid, existing.profile);
        await setProfile(existing.profile);
        navigate('/');
      } else {
        console.log('[확인] 미등록 → 등록화면으로 이동');
        setRegNumber(formatted);
        setStep('register');
      }
    } catch (err) {
      console.error('[확인] 에러:', err);
      setError(getErrorMessage(err, '조회 중 오류가 발생했습니다.'));
    } finally {
      setIsChecking(false);
    }
  };

  // 이미지 선택 → OCR 자동 실행
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) handleOcr(file);
  };

  const handleOcr = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setIsOcr(true);
    setError(null);

    try {
      const dataUrl = await fileToDataUrl(file);
      const text = await runOcr(dataUrl);
      const parsed = parseBusinessRegistration(text);
      // OCR에서 사업자등록번호 인식되면 업데이트
      if (parsed.registrationNumber) {
        setRegNumber(parsed.registrationNumber);
      }
      setInfo('사업자등록증 인식이 완료되었습니다.');
    } catch (err) {
      setError(getErrorMessage(err, 'OCR 처리 중 오류가 발생했습니다.'));
    } finally {
      setIsOcr(false);
    }
  };

  // 등록 완료
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setIsSaving(true);
    setError(null);

    try {
      const profile: BusinessProfile = {
        businessName: '',
        representative: '',
        registrationNumber: formatRegNumber(regNumber),
        businessType: '',
        businessCategory: '',
        address: '',
        phone,
        registeredAt: new Date().toISOString(),
      };
      console.log('[등록] 프로필 저장 시작:', profile.registrationNumber, 'uid:', uid);
      await setProfile(profile);
      console.log('[등록] 저장 완료, 상품화면으로 이동');
      navigate('/');
    } catch (err) {
      console.error('[등록] 에러:', err);
      setError(getErrorMessage(err, '등록에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const canRegister = regNumber.trim() && phone.trim() && !isOcr && !isSaving;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>

      {/* 첫 화면: 사업자등록번호 입력 */}
      {step === 'input-reg-number' && (
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
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCheck}
              disabled={!regNumber.trim() || isChecking}
            >
              {isChecking ? '확인 중...' : '확인'}
            </Button>
            {isChecking && <LinearProgress sx={{ mt: 1 }} />}
          </Paper>
        </>
      )}

      {/* 등록 화면: 사업자등록증 + 전화번호 */}
      {step === 'register' && (
        <>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            신규 사업자 등록
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            사업자등록증을 업로드하고 전화번호를 입력해주세요.
          </Typography>

          {/* 사업자등록증 업로드 */}
          <Paper
            sx={{
              p: 3, textAlign: 'center', border: '2px dashed',
              borderColor: preview ? 'primary.main' : 'grey.300',
              cursor: 'pointer', mb: 1,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="사업자등록증"
                style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }}
              />
            ) : (
              <Box>
                <UploadFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  사업자등록증 이미지를 클릭하여 업로드
                </Typography>
              </Box>
            )}
          </Paper>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<PhotoCameraIcon />}
            onClick={() => cameraInputRef.current?.click()}
            sx={{ mb: 2 }}
          >
            카메라 촬영
          </Button>

          {isOcr && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                텍스트 인식 중...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* 전화번호 + 등록 버튼 */}
          <Paper sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="사업자등록번호"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                fullWidth
                disabled
              />
              <TextField
                label="전화번호 *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                fullWidth
                autoFocus
                helperText="연락 가능한 전화번호를 입력하세요"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                disabled={!canRegister}
              >
                {isSaving ? '등록 중...' : '등록 완료'}
              </Button>
            </Box>
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button variant="text" onClick={() => setStep('input-reg-number')}>
              ← 돌아가기
            </Button>
          </Box>
        </>
      )}

      <Snackbar open={!!info} autoHideDuration={3000} onClose={() => setInfo(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setInfo(null)}>{info}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="warning" variant="filled" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Container>
  );
}
