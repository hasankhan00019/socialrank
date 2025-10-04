import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const InstitutionProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: instRes, isLoading } = useQuery(['institution', id], () => apiService.getInstitution(id as string), { enabled: Boolean(id) });
  const institution = instRes?.success ? instRes.data : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {isLoading ? (
        <div>Loading...</div>
      ) : !institution ? (
        <div>Institution not found.</div>
      ) : (
        <div>
          <div className="flex items-center gap-4 mb-6">
            {institution.logo_url ? (
              <img src={institution.logo_url} alt={institution.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center font-bold">
                {institution.name?.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{institution.name}</h1>
              <p className="text-gray-600">{institution.country} • {institution.institution_type}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-3">Latest Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(institution.latest_metrics || []).map((m: any) => (
              <div key={m.platform_id} className="border rounded-lg p-4 bg-white">
                <div className="font-semibold">{m.platform_name}</div>
                <div className="text-sm text-gray-600">Followers: {m.followers_count}</div>
                <div className="text-sm text-gray-600">Engagement: {m.engagement_rate}%</div>
                <div className="text-sm text-gray-600">Total Engagement: {m.total_engagement}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionProfile;
