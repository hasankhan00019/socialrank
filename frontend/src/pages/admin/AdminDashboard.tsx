import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';
import ProtectedRoute from '../../components/auth/ProtectedRoute';

const AdminDashboard: React.FC = () => {
  const { data } = useQuery(['dashboardStats'], () => apiService.getDashboardStats());
  const stats = data?.success ? (data.data as any) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {!stats ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded p-4">
            <div className="text-gray-600">Institutions</div>
            <div className="text-2xl font-bold">{stats.overview.total_institutions}</div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-gray-600">Users</div>
            <div className="text-2xl font-bold">{stats.overview.total_users}</div>
          </div>
          <div className="bg-white border rounded p-4">
            <div className="text-gray-600">Published Posts</div>
            <div className="text-2xl font-bold">{stats.overview.published_posts}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
