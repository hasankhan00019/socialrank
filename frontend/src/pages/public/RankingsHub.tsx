import React from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const RankingsHub: React.FC = () => {
  const { data, isLoading } = useQuery(['combinedRankings'], () => apiService.getCombinedRankings({ limit: 50 }));
  const rankings = data?.success ? (data.data as any)?.rankings ?? [] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-6">Global Combined Rankings</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600 uppercase text-xs">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: any) => (
                <tr key={`${r.id}-${r.rank_position}`} className="border-t">
                  <td className="px-4 py-3 font-semibold">#{r.rank_position}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.country}</td>
                  <td className="px-4 py-3">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RankingsHub;
