import React, { useState } from 'react';
import { apiService } from '../../services/api';

const AdminRankings: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const recalc = async (publish: boolean) => {
    setBusy(true);
    const res = await apiService.post('/rankings/recalculate', { publish });
    setResult(res);
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-4">Ranking Control</h1>
      <div className="flex gap-2">
        <button className="btn-secondary" disabled={busy} onClick={() => recalc(false)}>Preview Recalc</button>
        <button className="btn-primary" disabled={busy} onClick={() => recalc(true)}>Recalc & Publish</button>
      </div>
      {result && (
        <pre className="bg-gray-50 p-4 rounded mt-4 text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default AdminRankings;
