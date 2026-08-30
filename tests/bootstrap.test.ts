import { describe, it, expect } from 'vitest';
import { APP_CONFIG, ROLES, ACCOUNT_STATUS } from '../src/lib/constants';

describe('Bootstrap Configuration', () => {
  it('should use Bogota timezone for business logic', () => {
    expect(APP_CONFIG.TIMEZONE).toBe('America/Bogota');
  });

  it('should define correct roles for V1', () => {
    expect(ROLES.COACH).toBe('coach');
    expect(ROLES.ATHLETE).toBe('athlete');
  });

  it('should include frozen status for account management', () => {
    expect(ACCOUNT_STATUS.FROZEN).toBe('frozen');
  });
});
