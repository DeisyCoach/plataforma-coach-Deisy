export const APP_CONFIG = {
  TIMEZONE: 'America/Bogota',
  CHECKIN_DAY_OF_WEEK: 6, // 6 = Sábado en JS (0=Dom, 1=Lun...)
} as const;

export const ROLES = {
  COACH: 'coach',
  ATHLETE: 'athlete',
  ADMIN: 'admin', // Preparado para futuro, no implementado en V1
} as const;

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export const CHECKIN_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  CLOSED: 'closed',
} as const;
