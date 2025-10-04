import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const AdminBlog: React.FC = () => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  const { data, refetch } = useQuery(['adminBlogPosts'], () => apiService.get('/blog/admin/all'));
  const posts = data?.success ? data.data : [];

  const create = async () => {
    const res = await apiService.createBlogPost({ title, slug, content, status });
    if (res.success) {
      setTitle(''); setSlug(''); setContent(''); setStatus('draft');
      refetch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold mb-4">Blog Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-2">Create New Post</h2>
          <input className="border p-2 w-full mb-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="border p-2 w-full mb-2" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <textarea className="border p-2 w-full mb-2 h-40" placeholder="Content (HTML)" value={content} onChange={(e) => setContent(e.target.value)} />
          <select className="border p-2 w-full mb-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn-primary w-full" onClick={create}>Create</button>
        </div>
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-2">All Posts</h2>
          <div className="divide-y">
            {posts?.map((p: any) => (
              <div key={p.id} className="py-3">
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-gray-600">{p.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBlog;
