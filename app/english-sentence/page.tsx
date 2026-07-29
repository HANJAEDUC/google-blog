import { getEnglishSentences } from '@/lib/english-data';
import EnglishSentenceClient from './EnglishSentenceClient';

export const metadata = {
  title: 'EnglishSentence',
  description: '구글 스프레드시트 각 셀의 내용이 독립된 카드로 정리되는 영어 문장 공간입니다.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EnglishSentencePage() {
  const sentences = await getEnglishSentences();

  return <EnglishSentenceClient initialSentences={sentences} />;
}
