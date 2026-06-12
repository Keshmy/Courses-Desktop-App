/** أيام الأسبوع كما في قاعدة البيانات */
export const WEEK_DAYS = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
] as const

export type WeekDay = (typeof WEEK_DAYS)[number]
