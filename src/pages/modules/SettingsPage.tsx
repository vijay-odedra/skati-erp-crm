import React from 'react';
import { Settings } from 'lucide-react';
import { ModulePlaceholder } from '../../components/common/ModulePlaceholder.tsx';

export const SettingsPage: React.FC = () => {
  return (
    <ModulePlaceholder
      title="System Settings"
      description="Organization profile, factory units, numbering sequences, and system configurations."
      requiredPermission="settings.view"
      icon={Settings}
    />
  );
};
