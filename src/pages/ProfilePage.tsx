import { useState, useRef, useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { fileToDataUrl, extractBusinessInfo } from '../services/ocr';
import { findProfileByRegNumber, saveProfile } from '../services/profileStore';
import { getOrdersByUid } from '../services/orderStore';
import { getPaymentsByRegNumber } from '../services/paymentStore';
import { useNavigate } from 'react-router-dom';
import type { BusinessProfile } from '../types/profile';
import { getErrorMessage } from '../utils/errorMessage';

type Step = 'input-reg-number' | 'register' | 'view';

export default function ProfilePage() {
  const { setProfile, uid, profile, isRegistered, clearProfile } = useProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(isRegistered ? 'view' : 'input-reg-number');
  const [isChecking, setIsChecking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 등록 폼 — 모든 필드
  const [form, setForm] = useState({
    registrationNumber: '',
    businessName: '',
    representative: '',
    businessType: '',
    businessCategory: '',
    address: '',
    phone: '',
  });

  // 등록된 프로필이 있으면 폼에 기존 데이터 채우기
  useEffect(() => {
    if (isRegistered && profile) {
      setForm({
        registrationNumber: profile.registrationNumber || '',
        businessName: profile.businessName || '',
        representative: profile.representative || '',
        businessType: profile.businessType || '',
        businessCategory: profile.businessCategory || '',
        address: profile.address || '',
        phone: profile.phone || '',
      });
      setStep('view');
    }
  }, [isRegistered, profile]);
  const [preview, setPreview] = useState<string | null>(null);
  const [isOcr, setIsOcr] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 이번달 주문 요약
  const [monthlyOrderCount, setMonthlyOrderCount] = useState(0);
  const [monthlyOrderTotal, setMonthlyOrderTotal] = useState(0);
  const [monthlyPaymentTotal, setMonthlyPaymentTotal] = useState(0);

  useEffect(() => {
    if (!uid || !profile?.registrationNumber) return;
    (async () => {
      try {
        const [orders, payments] = await Promise.all([
          getOrdersByUid(uid),
          getPaymentsByRegNumber(profile.registrationNumber),
        ]);
        const now = new Date();
        const thisMonth = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        const thisMonthPayments = payments.filter((p) => {
          const d = new Date(p.createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
        setMonthlyOrderCount(thisMonth.length);
        setMonthlyOrderTotal(thisMonth.reduce((sum, o) => sum + o.totalPrice, 0));
        setMonthlyPaymentTotal(thisMonthPayments.reduce((sum, p) => sum + p.amount, 0));
      } catch (err) {
        console.error('주문 요약 조회 실패:', err);
      }
    })();
  }, [uid, profile?.registrationNumber]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const formatRegNumber = (input: string) => {
    const normalized = input.replace(/[^0-9]/g, '');
    if (normalized.length === 10) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}`;
    }
    return input.trim();
  };

  // 첫 화면: 사업자등록번호 확인
  const handleCheck = async () => {
    if (!form.registrationNumber.trim() || !uid) return;
    setIsChecking(true);
    setError(null);

    try {
      const formatted = formatRegNumber(form.registrationNumber);
      const existing = await findProfileByRegNumber(formatted);

      if (existing) {
        await saveProfile(uid, existing.profile);
        await setProfile(existing.profile);
        navigate('/');
      } else {
        setForm((prev) => ({ ...prev, registrationNumber: formatted }));
        setStep('register');
      }
    } catch (err) {
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
      const parsed = await extractBusinessInfo(dataUrl);
      // OCR 결과로 폼 자동 채움 (이미 입력한 값은 보존)
      setForm((prev) => ({
        ...prev,
        registrationNumber: parsed.registrationNumber || prev.registrationNumber,
        businessName: parsed.businessName || prev.businessName,
        representative: parsed.representative || prev.representative,
        businessType: parsed.businessType || prev.businessType,
        businessCategory: parsed.businessCategory || prev.businessCategory,
        address: parsed.address || prev.address,
      }));
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
      const newProfile: BusinessProfile = {
        ...form,
        registrationNumber: formatRegNumber(form.registrationNumber),
        registeredAt: new Date().toISOString(),
      };
      await setProfile(newProfile);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, '등록에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  // 프로필 수정 저장
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !profile) return;
    setIsSaving(true);
    setError(null);

    try {
      const updated: BusinessProfile = {
        ...form,
        registrationNumber: profile.registrationNumber, // 사업자번호는 변경 불가
        registeredAt: profile.registeredAt,
      };
      await setProfile(updated);
      setIsEditing(false);
      setInfo('프로필이 수정되었습니다.');
    } catch (err) {
      setError(getErrorMessage(err, '수정에 실패했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const canRegister = form.registrationNumber.trim() && form.phone.trim() && !isOcr && !isSaving;

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
              value={form.registrationNumber}
              onChange={handleChange('registrationNumber')}
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
              disabled={!form.registrationNumber.trim() || isChecking}
            >
              {isChecking ? '확인 중...' : '확인'}
            </Button>
            {isChecking && <LinearProgress sx={{ mt: 1 }} />}
          </Paper>
        </>
      )}

      {/* 등록 화면: 사업자등록증 + 전체 정보 */}
      {step === 'register' && (
        <>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            신규 사업자 등록
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            사업자등록증을 업로드하면 정보가 자동으로 입력됩니다.
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
                텍스트 인식 중... 아래 정보를 먼저 입력하셔도 됩니다.
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* 전체 정보 폼 */}
          <Paper sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="사업자등록번호"
                value={form.registrationNumber}
                fullWidth
                disabled
              />
              <TextField
                label="상호명"
                value={form.businessName}
                onChange={handleChange('businessName')}
                fullWidth
              />
              <TextField
                label="대표자"
                value={form.representative}
                onChange={handleChange('representative')}
                fullWidth
              />
              <TextField
                label="업태"
                value={form.businessType}
                onChange={handleChange('businessType')}
                fullWidth
              />
              <TextField
                label="종목"
                value={form.businessCategory}
                onChange={handleChange('businessCategory')}
                fullWidth
              />
              <TextField
                label="사업장 소재지"
                value={form.address}
                onChange={handleChange('address')}
                fullWidth
              />
              <TextField
                label="전화번호 *"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="010-0000-0000"
                fullWidth
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

      {/* 내 정보 확인/수정 */}
      {step === 'view' && profile && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => navigate('/')} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
              내 사업자 정보
            </Typography>
            {!isEditing && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditing(true)}
              >
                수정
              </Button>
            )}
          </Box>

          {/* 이번달 주문 요약 카드 */}
          <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              이번달 주문 요약
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>{monthlyOrderCount}건</Typography>
                <Typography variant="caption" color="text.secondary">주문 건수</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>{monthlyOrderTotal.toLocaleString()}원</Typography>
                <Typography variant="caption" color="text.secondary">주문 총액</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="h6" fontWeight={700} color={(monthlyOrderTotal - monthlyPaymentTotal) > 0 ? 'error.main' : 'success.main'}>
                  {(monthlyOrderTotal - monthlyPaymentTotal).toLocaleString()}원
                </Typography>
                <Typography variant="caption" color="text.secondary">미수금</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="사업자등록번호"
                value={form.registrationNumber}
                fullWidth
                disabled
              />
              <TextField
                label="상호명"
                value={form.businessName}
                onChange={handleChange('businessName')}
                fullWidth
                disabled={!isEditing}
              />
              <TextField
                label="대표자"
                value={form.representative}
                onChange={handleChange('representative')}
                fullWidth
                disabled={!isEditing}
              />
              <TextField
                label="업태"
                value={form.businessType}
                onChange={handleChange('businessType')}
                fullWidth
                disabled={!isEditing}
              />
              <TextField
                label="종목"
                value={form.businessCategory}
                onChange={handleChange('businessCategory')}
                fullWidth
                disabled={!isEditing}
              />
              <TextField
                label="사업장 소재지"
                value={form.address}
                onChange={handleChange('address')}
                fullWidth
                disabled={!isEditing}
              />
              <TextField
                label="전화번호"
                value={form.phone}
                onChange={handleChange('phone')}
                fullWidth
                disabled={!isEditing}
              />

              {isEditing && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={isSaving || !form.phone.trim()}
                      sx={{ flex: 1 }}
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        // 수정 취소 → 원래 프로필로 복원
                        setForm({
                          registrationNumber: profile.registrationNumber || '',
                          businessName: profile.businessName || '',
                          representative: profile.representative || '',
                          businessType: profile.businessType || '',
                          businessCategory: profile.businessCategory || '',
                          address: profile.address || '',
                          phone: profile.phone || '',
                        });
                        setIsEditing(false);
                      }}
                    >
                      취소
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </Paper>

          {!isEditing && (
            <Box sx={{ textAlign: 'center', mt: 3, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
              <Button variant="contained" size="large" onClick={() => navigate('/')}>
                제품 목록으로 이동
              </Button>
              <Button
                variant="text"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={async () => {
                  clearProfile();
                  await logout();
                }}
              >
                로그아웃
              </Button>
            </Box>
          )}
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
