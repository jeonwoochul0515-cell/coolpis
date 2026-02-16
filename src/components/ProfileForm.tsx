import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import SaveIcon from '@mui/icons-material/Save';
import type { BusinessProfile } from '../types/profile';

interface Props {
  initialData: Partial<BusinessProfile>;
  onSave: (profile: BusinessProfile) => void;
  isProcessing?: boolean;
}

export default function ProfileForm({ initialData, onSave, isProcessing }: Props) {
  const [form, setForm] = useState({
    businessName: '',
    representative: '',
    registrationNumber: '',
    businessType: '',
    businessCategory: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      businessName: initialData.businessName || prev.businessName,
      representative: initialData.representative || prev.representative,
      registrationNumber: initialData.registrationNumber || prev.registrationNumber,
      businessType: initialData.businessType || prev.businessType,
      businessCategory: initialData.businessCategory || prev.businessCategory,
      address: initialData.address || prev.address,
    }));
  }, [initialData]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      registeredAt: new Date().toISOString(),
    });
  };

  const isValid = form.businessName && form.representative && form.phone && !isProcessing;

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        사업자 정보
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="상호명 *"
          value={form.businessName}
          onChange={handleChange('businessName')}
          fullWidth
        />
        <TextField
          label="대표자 *"
          value={form.representative}
          onChange={handleChange('representative')}
          fullWidth
        />
        <TextField
          label="사업자등록번호"
          value={form.registrationNumber}
          onChange={handleChange('registrationNumber')}
          placeholder="000-00-00000"
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
          disabled={!isValid}
        >
          프로필 저장
        </Button>
      </Box>
    </Paper>
  );
}
