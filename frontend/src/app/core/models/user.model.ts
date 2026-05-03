import { SystemRole } from '../services/api/model/systemRole';

export interface User {
  uuid: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: SystemRole[];
}

// Re-export generated types so consumers can import from one place
export { LoginRequest } from '../services/api/model/loginRequest';
export { RefreshRequest } from '../services/api/model/refreshRequest';
export { TokenResponse } from '../services/api/model/tokenResponse';
