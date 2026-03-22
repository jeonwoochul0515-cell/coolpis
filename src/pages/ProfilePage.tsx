import { useState, useRef, useEffect } from 'react';
import Container from '@mui/material/Container';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { fileToDataUrl, extractBusinessInfo } from '../services/ocr';
import { findProfileByRegNumber, saveProfile } from '../services/profileStore';
import { getOrdersByUid } from '../services/orderStore';
import { getPaymentsByRegNumber } from '../services/paymentStore';
import { useNavigate } from 'react-router-dom';
import type { BusinessProfile } from '../types/profile';
import { getErrorMessage } from '../utils/errorMessage';
import RegistrationNumberStep from '../components/profile/RegistrationNumberStep';
import BusinessProfileForm from '../components/profile/BusinessProfileForm';
import ProfileView from '../components/profile/ProfileView';

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
      setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.');
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

  const handleCancelEditing = () => {
    // 수정 취소 → 원래 프로필로 복원
    if (profile) {
      setForm({
        registrationNumber: profile.registrationNumber || '',
        businessName: profile.businessName || '',
        representative: profile.representative || '',
        businessType: profile.businessType || '',
        businessCategory: profile.businessCategory || '',
        address: profile.address || '',
        phone: profile.phone || '',
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    clearProfile();
    await logout();
  };

  const canRegister = form.registrationNumber.trim() && form.phone.trim() && !isOcr && !isSaving;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>

      {step === 'input-reg-number' && (
        <RegistrationNumberStep
          registrationNumber={form.registrationNumber}
          isChecking={isChecking}
          onChangeRegistrationNumber={handleChange('registrationNumber')}
          onCheck={handleCheck}
        />
      )}

      {step === 'register' && (
        <BusinessProfileForm
          form={form}
          preview={preview}
          isOcr={isOcr}
          isSaving={isSaving}
          canRegister={!!canRegister}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          onChangeField={handleChange}
          onFileChange={handleFileChange}
          onRegister={handleRegister}
          onBack={() => setStep('input-reg-number')}
        />
      )}

      {step === 'view' && profile && (
        <ProfileView
          profile={profile}
          form={form}
          isEditing={isEditing}
          isSaving={isSaving}
          monthlyOrderCount={monthlyOrderCount}
          monthlyOrderTotal={monthlyOrderTotal}
          monthlyPaymentTotal={monthlyPaymentTotal}
          onChangeField={handleChange}
          onUpdate={handleUpdate}
          onStartEditing={() => setIsEditing(true)}
          onCancelEditing={handleCancelEditing}
          onNavigateHome={() => navigate('/')}
          onLogout={handleLogout}
        />
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
