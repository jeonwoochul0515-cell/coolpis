import type React from 'react';
import type { RefObject } from 'react';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import SaveIcon from '@mui/icons-material/Save';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface FormData {
  registrationNumber: string;
  businessName: string;
  representative: string;
  businessType: string;
  businessCategory: string;
  address: string;
  phone: string;
}

interface BusinessProfileFormProps {
  form: FormData;
  preview: string | null;
  isOcr: boolean;
  isSaving: boolean;
  canRegister: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  onChangeField: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRegister: (e: React.FormEvent) => void;
  onBack: () => void;
}

export default function BusinessProfileForm({
  form,
  preview,
  isOcr,
  isSaving,
  canRegister,
  fileInputRef,
  cameraInputRef,
  onChangeField,
  onFileChange,
  onRegister,
  onBack,
}: BusinessProfileFormProps) {
  return (
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
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onFileChange} />

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
        <Box component="form" onSubmit={onRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          />
          <TextField
            label="대표자"
            value={form.representative}
            onChange={onChangeField('representative')}
            fullWidth
          />
          <TextField
            label="업태"
            value={form.businessType}
            onChange={onChangeField('businessType')}
            fullWidth
          />
          <TextField
            label="종목"
            value={form.businessCategory}
            onChange={onChangeField('businessCategory')}
            fullWidth
          />
          <TextField
            label="사업장 소재지"
            value={form.address}
            onChange={onChangeField('address')}
            fullWidth
          />
          <TextField
            label="전화번호 *"
            value={form.phone}
            onChange={onChangeField('phone')}
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
        <Button variant="text" onClick={onBack}>
          ← 돌아가기
        </Button>
      </Box>
    </>
  );
}
