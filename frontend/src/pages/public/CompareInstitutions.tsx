import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const CompareInstitutions: React.FC = () => {
  const [query, setQuery] = useState('');
  const { data } = useQuery(['institutions', query], () => apiService.getInstitutions({ search: query, limit: 20 }));
  const institutions = data?.success ? (data.data as any)?.institutions ?? [] : [];

  const [selected, setSelected] = useState<any[]>([]);

  const toggleSelect = (inst: any) => {
    const exists = selected.find((s) => s.id === inst.id);
    if (exists) setSelected(selected.filter((s) => s.id !== inst.id));
    else if (selected.length < 3) setSelected([...selected, inst]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-4">Compare Institutions</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search institutions..."
        className="border p-2 rounded w-full mb-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Results</h2>
          <div className="bg-white border rounded">
            {institutions.map((inst: any) => (
              <button
                key={inst.id}
                onClick={() => toggleSelect(inst)}
                className="w-full text-left px-4 py-2 border-b last:border-b-0 hover:bg-gray-50"
              >
                {inst.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Selected ({selected.length}/3)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selected.map((inst: any) => (
              <div key={inst.id} className="bg-white border rounded p-4">
                <div className="font-semibold mb-2">{inst.name}</div>
                <div className="text-sm text-gray-600">{inst.country}</div>
                <div className="text-sm text-gray-600">Score: {inst.score ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareInstitutions;
