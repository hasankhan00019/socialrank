import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const AdminInstitutions: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery(['adminInstitutions', search], () => apiService.getInstitutions({ search, limit: 50 }));
  const institutions = data?.success ? (data.data as any)?.institutions ?? [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Institutions</h1>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="border p-2 rounded" />
          <button className="btn-secondary" onClick={() => refetch()}>Search</button>
        </div>
      </div>
      <div className="bg-white border rounded">
        {institutions.map((i: any) => (
          <div key={i.id} className="px-4 py-3 border-b last:border-b-0 flex items-center justify-between">
            <div>
              <div className="font-semibold">{i.name}</div>
              <div className="text-gray-600 text-sm">{i.country} • {i.institution_type}</div>
            </div>
            <a href={`/institution/${i.id}`} className="text-primary-600">View</a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminInstitutions;
