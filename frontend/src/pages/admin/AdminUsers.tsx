import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const AdminUsers: React.FC = () => {
  const { data } = useQuery(['adminUsers'], () => apiService.getUsers());
  const users = data?.success ? data.data : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="bg-white border rounded">
        {users.map((u: any) => (
          <div key={u.id} className="px-4 py-3 border-b last:border-b-0 flex items-center justify-between">
            <div>
              <div className="font-semibold">{u.name}</div>
              <div className="text-gray-600 text-sm">{u.email} • {u.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUsers;
