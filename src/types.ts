export interface Dhikr {
  id: string;
  text: string;
  count: number;
  target: number;
  color: string;
  keywords: string[];
  lastIncrement?: number;
}

export type RecognitionMode = 'auto' | 'google' | 'vosk';

export const INITIAL_DHIKRS: Dhikr[] = [
  {
    id: '1',
    text: 'سبحان الله',
    count: 0,
    target: 33,
    color: '#2DD4BF',
    keywords: ['سبحان الله', 'سبحان', 'الله']
  },
  {
    id: '2',
    text: 'الحمد لله',
    count: 0,
    target: 33,
    color: '#FACC15',
    keywords: ['الحمد لله', 'الحمد', 'لله']
  },
  {
    id: '3',
    text: 'لا إله إلا الله',
    count: 0,
    target: 33,
    color: '#34D399',
    keywords: ['لا اله الا الله', 'لا', 'اله', 'الا', 'الله']
  },
  {
    id: '4',
    text: 'الله أكبر',
    count: 0,
    target: 33,
    color: '#38BDF8',
    keywords: ['الله اكبر', 'الله', 'اكبر']
  }
];
