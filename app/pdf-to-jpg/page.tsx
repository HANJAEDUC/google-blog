import PdfConverterClient from './PdfConverterClient';

export const metadata = {
  title: 'PDF to JPG 변환기 | Dailywords',
  description: '서버 업로드 없이 100% 브라우저 내부에서 안전하고 빠르게 PDF를 JPG 이미지로 변환합니다.',
};

export default function PdfToJpgPage() {
  return <PdfConverterClient />;
}
