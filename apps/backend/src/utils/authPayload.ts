const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthPayload = {
  id: string;
  email: string;
};

export function isAuthPayload(payload: unknown): payload is AuthPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'email' in payload &&
    typeof payload.id === 'string' &&
    UUID_PATTERN.test(payload.id) &&
    typeof payload.email === 'string' &&
    payload.email.length > 0
  );
}
