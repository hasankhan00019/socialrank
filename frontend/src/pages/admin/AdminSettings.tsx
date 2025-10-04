import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const AdminSettings: React.FC = () => {
  const { data, refetch } = useQuery(['settingsAll'], () => apiService.getAllSettings());
  const rows = data?.success ? data.data : [];
  const [editing, setEditing] = useState<Record<string, any>>({});

  const update = async (key: string) => {
    const value = editing[key];
    if (value === undefined) return;
    const res = await apiService.updateSetting(key, { value });
    if (res.success) refetch();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>
      <div className="bg-white border rounded divide-y">
        {rows.map((row: any) => (
          <div key={row.id} className="p-4">
            <div className="font-semibold">{row.setting_key}</div>
            <div className="text-sm text-gray-600 mb-2">{row.description}</div>
            <input
              className="border p-2 rounded w-full"
              defaultValue={row.setting_value}
              onChange={(e) => setEditing({ ...editing, [row.setting_key]: e.target.value })}
            />
            <button className="btn-primary mt-2" onClick={() => update(row.setting_key)}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSettings;
