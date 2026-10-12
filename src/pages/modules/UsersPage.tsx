import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ModulePlaceholder } from '../../components/common/ModulePlaceholder.tsx';

export const UsersPage: React.FC = () => {
  return (
    <ModulePlaceholder
      title="User & Access Control Management"
      description="User directory, assigned security roles, and active account status."
      requiredPermission="users.view"
      icon={ShieldCheck}
    />
  );
};
