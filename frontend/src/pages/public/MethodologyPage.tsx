import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const MethodologyPage: React.FC = () => {
  const { data } = useQuery(['publicSettings'], () => apiService.getPublicSettings());
  const settings = data?.success ? (data.data as any) : {};

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-6">Methodology</h1>
      <p className="text-gray-700 mb-4">
        We compute platform scores using normalized follower and engagement metrics, and combine them using configurable platform weights.
      </p>
      <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
{`
Follower_Score = (Followers / MaxFollowers) × 50
Engagement_Score = (Engagement / MaxEngagement) × 50
Platform_Score = Follower_Score + Engagement_Score
Total_Score = Σ (Platform_Score × Platform_Weight)
`}
      </pre>
      <h2 className="text-xl font-semibold mt-6 mb-2">Current Weights</h2>
      <ul className="list-disc list-inside text-gray-700">
        <li>Instagram: 1.2</li>
        <li>TikTok: 1.3</li>
        <li>Facebook: 1.0</li>
        <li>YouTube: 1.1</li>
        <li>LinkedIn: 0.9</li>
        <li>Twitter/X: 0.8</li>
      </ul>
      {settings?.methodology_content && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Admin-defined Content</h3>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">{JSON.stringify(settings.methodology_content, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default MethodologyPage;
