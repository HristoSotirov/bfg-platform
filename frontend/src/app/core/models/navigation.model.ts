// Re-export SystemRole from generated API model
export { SystemRole } from '../services/api/model/systemRole';

export interface NavigationItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  requiredRoles: string[];
  requiredAnyRole?: boolean;
}
