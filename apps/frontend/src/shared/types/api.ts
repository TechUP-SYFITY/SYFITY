// REST와 Socket 공통 응답 타입을 정의한다.
export interface ApiError {
  code: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiFailureResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export type SocketAck<T = undefined> =
  | ({ success: true } & ([T] extends [undefined] ? { data?: undefined } : { data: T }))
  | ApiFailureResponse;

export class ApiClientError extends Error {
  code: string;
  status?: number;

  constructor(error: ApiError, status?: number) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = status;
  }
}
