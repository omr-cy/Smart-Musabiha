export type RecognitionMode = 'google' | 'vosk' | 'auto';

export interface Dhikr {
  id: string;
  text: string;
  count: number;
  target: number;
  color: string;
  keywords: string[];
}

export const INITIAL_DHIKRS: Dhikr[] = [
  {
    id: '1',
    text: 'سبحان الله',
    count: 0,
    target: 33,
    color: '#2DD4BF', // Teal
    keywords: ['سبحان الله', 'سبحان لله', 'سبحان', 'سوبحان الله', 'سوبحان', 'سبحانالله']
  },
  {
    id: '2',
    text: 'الحمد لله',
    count: 0,
    target: 33,
    color: '#FACC15', // Yellow
    keywords: ['الحمد لله', 'الحمدلله', 'الحمد لله رب العالمين', 'الحمد', 'المد لله', 'الحمدلله']
  },
  {
    id: '3',
    text: 'الله أكبر',
    count: 0,
    target: 33,
    color: '#34D399', // Emerald
    keywords: ['الله أكبر', 'الله اكبر', 'اكبر', 'أكبر', 'الله كبر', 'اللهاكبر']
  },
  {
    id: '4',
    text: 'لا إله إلا الله',
    count: 0,
    target: 100,
    color: '#38BDF8', // Sky
    keywords: [
      'لا إله إلا الله', 
      'لا اله الا الله', 
      'لا اله إلا الله', 
      'لا إله الا الله', 
      'لا اله الا الله وحده لا شريك له',
      'لااله الاالله',
      'لااله الا الله',
      'لا اله الاالله',
      'لاالهالاالله'
    ]
  },
  {
    id: '5',
    text: 'أستغفر الله',
    count: 0,
    target: 100,
    color: '#A78BFA', // Violet
    keywords: ['أستغفر الله', 'استغفر الله', 'استغفرالله', 'أستغفرالله', 'استغفر', 'أستغفر', 'استغفرالله']
  },
  {
    id: '6',
    text: 'لا حول ولا قوة إلا بالله',
    count: 0,
    target: 100,
    color: '#FB923C', // Orange
    keywords: [
      'لا حول ولا قوة إلا بالله', 
      'لا حول ولا قوة الا بالله', 
      'لاحول ولاقوة الا بالله', 
      'لا حول ولا قوه الا بالله', 
      'لاحول ولاقوة',
      'لاحول ولا قوة الا بالله',
      'لا حول ولاقوة الا بالله'
    ]
  }
];
