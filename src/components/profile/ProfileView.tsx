import type React from 'react';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import type { BusinessProfile } from '../../types/profile';

interface FormData {
  registrationNumber: string;
  businessName: string;
  representative: string;
  businessType: string;
  businessCategory: string;
  address: string;
  phone: string;
}

interface ProfileViewProps {
  profile: BusinessProfile;
  form: FormData;
  isEditing: boolean;
  isSaving: boolean;
  monthlyOrderCount: number;
  monthlyOrderTotal: number;
  monthlyPaymentTotal: number;
  onChangeField: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdate: (e: React.FormEvent) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onNavigateHome: () => void;
  onLogout: () => void;
}

export default function ProfileView({
  form,
  isEditing,
  isSaving,
  monthlyOrderCount,
  monthlyOrderTotal,
  monthlyPaymentTotal,
  onChangeField,
  onUpdate,
  onStartEditing,
  onCancelEditing,
  onNavigateHome,
  onLogout,
}: ProfileViewProps) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onNavigateHome} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          내 사업자 정보
        </Typography>
        {!isEditing && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={onStartEditing}
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
        <Box component="form" onSubmit={onUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="사업자등록번호"
            value={form.registrationNumber}
            fullWidth
            disabled
          />
          <TextField
            label="상호명"
            value={form.businessName}
            onChange={onChangeField('businessName')}
            fullWidth
            disabled={!isEditing}
          />
          <TextField
            label="대표자"
            value={form.representative}
            onChange={onChangeField('representative')}
            fullWidth
            disabled={!isEditing}
          />
          <TextField
            label="업태"
            value={form.businessType}
            onChange={onChangeField('businessType')}
            fullWidth
            disabled={!isEditing}
          />
          <TextField
            label="종목"
            value={form.businessCategory}
            onChange={onChangeField('businessCategory')}
            fullWidth
            disabled={!isEditing}
          />
          <TextField
            label="사업장 소재지"
            value={form.address}
            onChange={onChangeField('address')}
            fullWidth
            disabled={!isEditing}
          />
          <TextField
            label="전화번호"
            value={form.phone}
            onChange={onChangeField('phone')}
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
                  onClick={onCancelEditing}
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
          <Button variant="contained" size="large" onClick={onNavigateHome}>
            제품 목록으로 이동
          </Button>
          <Button
            variant="text"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            로그아웃
          </Button>
        </Box>
      )}
    </>
  );
}
