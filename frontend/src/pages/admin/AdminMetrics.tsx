import React, { useRef, useState } from 'react';
import { apiService } from '../../services/api';

const AdminMetrics: React.FC = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setMessage('');
    setProgress(0);
    const res = await apiService.upload('/metrics/bulk-upload', file, setProgress);
    setMessage(res.success ? 'Upload complete' : res.message);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-4">Metrics Upload</h1>
      <input type="file" ref={fileRef} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
      <button className="btn-primary ml-2" onClick={onUpload}>Upload</button>
      {progress > 0 && <div className="mt-2 text-sm">Progress: {progress}%</div>}
      {message && <div className="mt-2 text-sm">{message}</div>}
    </div>
  );
};

export default AdminMetrics;
