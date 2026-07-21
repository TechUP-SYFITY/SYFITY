import { describe, expect, it } from 'vitest';

import { ApiClientError } from './api';
import { createSocketError } from './socket';

describe('createSocketError', () => {
  it('Socket ack 오류를 ApiClientError로 변환한다', () => {
    const error = createSocketError({ code: 'AUTH_FORBIDDEN', message: '권한이 없습니다.' });

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: 'AUTH_FORBIDDEN', message: '권한이 없습니다.' });
  });
});
