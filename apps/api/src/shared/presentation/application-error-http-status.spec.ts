import { HttpStatus } from '@nestjs/common';

import { ApplicationError } from '../application/application-error';
import { getApplicationErrorHttpStatus } from './application-error-http-status';

describe('getApplicationErrorHttpStatus', () => {
  it('maps forbidden management authorization failures to HTTP 403', () => {
    expect(
      getApplicationErrorHttpStatus(
        new ApplicationError('forbidden', 'Management scope is missing.'),
      ),
    ).toBe(HttpStatus.FORBIDDEN);
  });
});
