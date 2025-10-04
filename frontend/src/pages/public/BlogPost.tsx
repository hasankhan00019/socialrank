import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { apiService } from '../../services/api';

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery(['blogPost', slug], () => apiService.getBlogPost(slug as string), { enabled: Boolean(slug) });
  const post = data?.success ? data.data : null;

  if (isLoading) return <div className="max-w-3xl mx-auto p-6">Loading...</div>;
  if (!post) return <div className="max-w-3xl mx-auto p-6">Post not found.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      {post.featured_image && (
        <img src={post.featured_image} alt={post.title} className="w-full h-auto rounded mb-6" />
      )}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
};

export default BlogPost;
