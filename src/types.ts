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
    keywords: ['سبحان الله', 'سبحان لله', 'سبحان', 'سوبحان الله', 'سوبحان']
  },
  {
    id: '2',
    text: 'الحمد لله',
    count: 0,
    target: 33,
    color: '#FACC15', // Yellow
    keywords: ['الحمد لله', 'الحمدلله', 'الحمد لله رب العالمين', 'الحمد', 'المد لله']
  },
  {
    id: '3',
    text: 'الله أكبر',
    count: 0,
    target: 33,
    color: '#34D399', // Emerald
    keywords: ['الله أكبر', 'الله اكبر', 'اكبر', 'أكبر', 'الله كبر']
  },
  {
    id: '4',
    text: 'لا إله إلا الله',
    count: 0,
    target: 100,
    color: '#38BDF8', // Sky
    keywords: ['لا إله إلا الله', 'لا اله الا الله', 'لا اله إلا الله', 'لا إله الا الله', 'توحيد', 'لا اله']
  }
];
