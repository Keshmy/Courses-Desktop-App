const ACTION_LABELS: Record<string, string> = {
  'student.create': 'إضافة طالب',
  'student.update': 'تعديل طالب',
  'student.toggle': 'تفعيل/تعطيل طالب',
  'enrollment.create': 'تسجيل في مجموعة',
  'enrollment.change_group': 'تغيير مجموعة',
  'enrollment.status': 'تغيير حالة تسجيل',
  'payment.create': 'تسجيل دفعة',
  'finance.create': 'قيد مالي',
  'finance.delete': 'حذف قيد مالي',
  'salary.pay_teacher': 'دفع راتب مدرس',
  'salary.pay_employee': 'دفع راتب موظف',
  'teacher.create': 'إضافة مدرس',
  'teacher.update': 'تعديل مدرس',
  'teacher.toggle': 'تفعيل/تعطيل مدرس',
  'subject.create': 'إضافة مادة',
  'subject.update': 'تعديل مادة',
  'subject.toggle': 'تفعيل/تعطيل مادة',
  'group.create': 'إضافة مجموعة',
  'group.update': 'تعديل مجموعة',
  'group.toggle': 'تفعيل/تعطيل مجموعة',
  'employee.create': 'إضافة موظف',
  'employee.update': 'تعديل موظف',
  'employee.toggle': 'تفعيل/تعطيل موظف',
  'settings.update': 'تحديث إعدادات',
  'settings.backup': 'نسخة احتياطية',
  'settings.restore': 'استعادة نسخة',
  'settings.upload_logo': 'تحديث الشعار'
}

export function activityActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}
