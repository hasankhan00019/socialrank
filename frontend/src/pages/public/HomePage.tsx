import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  TrendingUp, Users, Globe, BarChart3, ArrowRight, 
  Award, Zap, Shield, Search, ExternalLink,
  ChevronRight, Star, Activity, Target
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// Platform colors mapping
const platformColors = {
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  twitter: 'bg-black',
  tiktok: 'bg-black',
  youtube: 'bg-red-600',
  linkedin: 'bg-blue-700'
};

const HomePage: React.FC = () => {
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch top institutions
  const { data: topInstitutions, isLoading: loadingTop } = useQuery(
    'topInstitutions',
    () => apiService.getTopInstitutions(),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
    }
  );

  // Fetch trending institutions
  const { data: trendingData, isLoading: loadingTrending } = useQuery(
    'trendingInstitutions',
    () => apiService.getTrendingInstitutions({ limit: 8 }),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const institutions = topInstitutions?.success ? topInstitutions.data : [];
  const trending = trendingData?.success ? trendingData.data : [];

  // Auto-slide for top institutions
  useEffect(() => {
    if (institutions.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % institutions.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [institutions.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to rankings with search
      window.location.href = `/rankings?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const fadeInVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const features = [
    {
      icon: Shield,
      title: 'Transparent Methodology',
      description: 'Open-source ranking algorithm based on engagement rates, follower growth, and platform diversity.',
      color: 'text-blue-600'
    },
    {
      icon: Activity,
      title: 'Real-time Data',
      description: 'Live social media metrics updated daily across all major platforms worldwide.',
      color: 'text-green-600'
    },
    {
      icon: Target,
      title: 'Global Coverage',
      description: `Comprehensive analysis of ${settings?.total_institutions || '500+'} institutions across 50+ countries.`,
      color: 'text-purple-600'
    }
  ];

  const stats = [
    { value: settings?.total_institutions || '500+', label: 'Universities Tracked' },
    { value: '6', label: 'Social Platforms' },
    { value: '50+', label: 'Countries' },
    { value: '1M+', label: 'Data Points Monthly' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.h1 
                variants={fadeInVariants}
                className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
              >
                {settings?.hero_title || 'Ranking Universities by'}
                <span className="block text-gradient">Social Media Influence</span>
              </motion.h1>

              <motion.p 
                variants={fadeInVariants}
                className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                {settings?.hero_description || 'Transparent, data-backed rankings of universities based on social media presence, engagement, and digital influence across all major platforms.'}
              </motion.p>

              {/* Search Bar */}
              <motion.form 
                variants={fadeInVariants}
                onSubmit={handleSearch}
                className="max-w-2xl mx-auto mb-8"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search universities (e.g., Harvard, MIT, Oxford)..."
                    className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-full focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors duration-200"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </motion.form>

              {/* CTA Buttons */}
              <motion.div 
                variants={fadeInVariants}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Link
                  to="/rankings"
                  className="btn-primary text-lg px-8 py-3 flex items-center space-x-2"
                >
                  <span>Explore Rankings</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/methodology"
                  className="btn-secondary text-lg px-8 py-3 flex items-center space-x-2"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span>Our Methodology</span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={fadeInVariants}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Top 5 Universities Showcase */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              🏆 Top Performing Universities
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the universities leading in social media engagement and digital influence worldwide.
            </p>
          </motion.div>

          {loadingTop ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading top universities..." />
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {institutions.slice(0, 5).map((institution, index) => (
                <motion.div
                  key={institution.id}
                  variants={fadeInVariants}
                  className={`relative group ${index === 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                >
                  <div className="card card-hover p-6 h-full">
                    {index === 0 && (
                      <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    )}

                    <div className="flex items-center space-x-4 mb-4">
                      <div className="text-2xl font-bold text-primary-600">
                        #{institution.rank_position}
                      </div>
                      {institution.logo_url ? (
                        <img
                          src={institution.logo_url}
                          alt={institution.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {institution.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {institution.name}
                        </h3>
                        <p className="text-gray-600 text-sm">{institution.country}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overall Score</span>
                        <span className="font-bold text-lg text-primary-600">
                          {institution.score}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-purple-600 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((institution.score / 100) * 100, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{institution.platform_count} Platforms</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <Link
                        to={`/institution/${institution.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>

                      {institution.website && (
                        <a
                          href={`https://${institution.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            className="text-center mt-12"
          >
            <Link
              to="/rankings"
              className="btn-primary text-lg px-8 py-3 inline-flex items-center space-x-2"
            >
              <span>View Full Rankings</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              📈 Trending This Month
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Universities with the highest growth in social media engagement and follower count.
            </p>
          </motion.div>

          {loadingTrending ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading trending universities..." />
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {trending.map((institution, index) => (
                <motion.div
                  key={institution.id}
                  variants={fadeInVariants}
                  className="card card-hover p-6 text-center"
                >
                  <div className="mb-4">
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={institution.name}
                        className="w-16 h-16 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto">
                        {institution.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1 text-center">
                    {institution.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">{institution.country}</p>

                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-semibold">
                      +{Math.round(institution.avg_growth)}% growth
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    {(institution.total_followers / 1000).toFixed(0)}K total followers
                  </p>

                  <Link
                    to={`/institution/${institution.id}`}
                    className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center space-x-1"
                  >
                    <span>View Details</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Trust SociaLearn Index?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built by researchers, for researchers. Our platform provides the most comprehensive 
              and transparent analysis of university social media performance.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInVariants}
                className="card p-8 text-center group hover:shadow-xl transition-shadow duration-300"
              >
                <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInVariants}
              className="text-3xl lg:text-4xl font-bold mb-4"
            >
              Ready to Explore University Rankings?
            </motion.h2>
            <motion.p 
              variants={fadeInVariants}
              className="text-xl opacity-90 mb-8 max-w-2xl mx-auto"
            >
              Discover how your institution ranks across social media platforms and 
              get insights to improve your digital engagement strategy.
            </motion.p>
            <motion.div 
              variants={fadeInVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                to="/rankings"
                className="bg-white text-primary-600 hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <BarChart3 className="h-5 w-5" />
                <span>View All Rankings</span>
              </Link>
              <Link
                to="/compare"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
              >
                Compare Universities
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
