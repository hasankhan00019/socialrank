import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const BlogPage: React.FC = () => {
  const { data, isLoading } = useQuery(['blog'], () => apiService.getBlogPosts({ limit: 10 }));
  const posts = data?.success ? (data.data as any)?.posts ?? [] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-6">Insights & Updates</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : posts.length === 0 ? (
        <div>No posts yet.</div>
      ) : (
        <div className="space-y-6">
          {posts.map((p: any) => (
            <Link key={p.id} to={`/blog/${p.slug}`} className="block bg-white p-6 rounded-lg shadow hover:shadow-md">
              <h2 className="text-xl font-semibold mb-1">{p.title}</h2>
              <p className="text-gray-600">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPage;
