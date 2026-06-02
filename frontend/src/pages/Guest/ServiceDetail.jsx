import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShieldCheck, Clock, CreditCard } from 'lucide-react';
import { getServiceById } from '../../services/extraServiceApi';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await getServiceById(id);
        
        if (res.ok && res.data.success) {
          setService(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch service details');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 py-20 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Service Not Found</h2>
          <p className="text-gray-500 mb-6">{error || "The service you are looking for doesn't exist or is currently unavailable."}</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Services
        </button>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="md:w-1/2 relative h-64 md:h-auto min-h-[400px]">
            <img 
              src={service.imageUrl} 
              alt={service.name} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden" />
          </div>

          {/* Content Section */}
          <div className="md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white">
            <div className="inline-block bg-blue-50 text-blue-700 font-semibold px-4 py-1.5 rounded-full text-sm mb-6 w-max">
              Premium Service
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
              {service.name}
            </h1>
            
            <div className="text-3xl font-black text-blue-600 mb-6">
              ${service.price.toFixed(2)}
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              {service.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-medium text-sm">Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <Clock size={20} />
                </div>
                <span className="font-medium text-sm">Time Efficient</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                  <CheckCircle size={20} />
                </div>
                <span className="font-medium text-sm">Trusted Pros</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <CreditCard size={20} />
                </div>
                <span className="font-medium text-sm">Secure Payment</span>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <button 
                onClick={() => alert('This would add the service to your active booking or redirect to booking page with this service pre-selected.')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1"
              >
                Add to My Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
