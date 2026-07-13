// Room 기능에서 REST 요청과 화면 상태가 공유하는 타입을 정의한다.
// 요청/응답 shape는 @syfity/shared의 canonical DTO를 그대로 재사용한다.
import type {
  CreateRoomRequest as SharedCreateRoomRequest,
  CreateRoomResponse as SharedCreateRoomResponse,
  GetRoomResponse as SharedGetRoomResponse,
  JoinRoomRequest as SharedJoinRoomRequest,
  JoinRoomResponse as SharedJoinRoomResponse,
  RecentRoomsResponse as SharedRecentRoomsResponse,
  UpdateRoomRequest as SharedUpdateRoomRequest,
  UpdateRoomResponse as SharedUpdateRoomResponse,
} from '@syfity/shared';

export type CreateRoomRequest = SharedCreateRoomRequest;
export type CreateRoomResponse = SharedCreateRoomResponse['data'];
export type JoinRoomRequest = SharedJoinRoomRequest;
export type JoinRoomResponse = SharedJoinRoomResponse['data'];
export type RecentRoomsResponse = SharedRecentRoomsResponse['data'];
export type RoomResponse = SharedGetRoomResponse['data'];
export type UpdateRoomRequest = SharedUpdateRoomRequest;
export type UpdateRoomResponse = SharedUpdateRoomResponse['data'];
